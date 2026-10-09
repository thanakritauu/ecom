import { orderCoinMovements, type AdminOrder } from "./adminOrders";
import type { Customer } from "./adminCustomers";

/**
 * Phase 05 §25 — the one place every Customer↔Order derived number is
 * computed, so List/Quick View/Detail/Dashboard can never disagree about
 * what "Total Orders"/"Total Spent" means for a customer. Pure functions
 * over a live `AdminOrder[]` (the caller's `useAdminOrders().orders()`),
 * same "take the live store snapshot as a parameter" shape as
 * `~/lib/masterDataRelations`'s `productsInCategory` — never a second,
 * independently-stored copy on the Customer record itself.
 */
export function getCustomerOrders(customerId: string, orders: AdminOrder[]): AdminOrder[] {
  return orders.filter((o) => o.customerId === customerId);
}

export function getCustomerOrderCount(customerId: string, orders: AdminOrder[]): number {
  return getCustomerOrders(customerId, orders).length;
}

/** A cancelled order never actually charged the customer, so it never counts toward lifetime spend — a refunded one still does (the money moved at purchase time; the refund is a separate later event, same historical-snapshot treatment `AdminOrder.totals` already gets elsewhere). */
export function getCustomerTotalSpent(customerId: string, orders: AdminOrder[]): number {
  return getCustomerOrders(customerId, orders)
    .filter((o) => o.orderStatus !== "cancelled")
    .reduce((sum, o) => sum + o.totals.grandTotal, 0);
}

export function getCustomerAverageOrderValue(customerId: string, orders: AdminOrder[]): number {
  const count = getCustomerOrderCount(customerId, orders);
  if (count === 0) return 0;
  return getCustomerTotalSpent(customerId, orders) / count;
}

/**
 * `orders` is always seeded/persisted newest-first (see `adminOrders.ts`'s
 * `ORDER_SEEDS` ordering — there is no "create order" flow anywhere in this
 * Admin that could append an older one later), and `AdminOrder.createdAt` is
 * a display-only Thai date label, never a sortable value — so the first
 * match in seed/store order *is* the most recent order, the same assumption
 * `RecentOrdersTable`/`orders/index.tsx` already rely on implicitly.
 */
export function getCustomerLastOrder(customerId: string, orders: AdminOrder[]): AdminOrder | undefined {
  return getCustomerOrders(customerId, orders)[0];
}

/** One line of a customer's coin history. `balance` = coins after this line; a pending line doesn't change it yet. */
export type CustomerCoinEntry = {
  key: string;
  /** Display label ("2 ต.ค. 2569"), same as every other Admin date. */
  date: string;
  label: string;
  orderId?: string;
  orderNumber?: string;
  coins: number;
  state: "earned" | "pending" | "used";
  balance: number;
};

export type CustomerCoinHistory = {
  /** Newest first. */
  entries: CustomerCoinEntry[];
  balance: number;
  totalEarned: number;
  totalUsed: number;
  pending: number;
};

/**
 * Coin history with the storefront's own rules and wording (`/account/points`
 * via `orderCoinMovements`): coins used at checkout unless the order was
 * cancelled; earned on delivery (pending until then); nothing on an unpaid or
 * cancelled order. A CRM member also gets the carry-over line, which is
 * whatever the balance holds beyond what the orders credited, dated at
 * `memberSince` (their first web sign-in). Any other gap is shown as an
 * adjustment so the running balance always lands on the current balance.
 */
export function getCustomerCoinHistory(customer: Customer, orders: AdminOrder[]): CustomerCoinHistory {
  const tier = customer.tier ?? "glow";
  // Oldest first to build the running balance; within one order the redeem (checkout) comes before the earn (delivery).
  const fromOrders = [...getCustomerOrders(customer.id, orders)]
    .sort((a, b) => a.placedAt.localeCompare(b.placedAt))
    .flatMap((o) => {
      const m = orderCoinMovements(o, tier);
      const list: Omit<CustomerCoinEntry, "balance">[] = [];
      if (m.used > 0) list.push({ key: `${o.id}-used`, date: o.createdAt, label: "ใช้เป็นส่วนลด", orderId: o.id, orderNumber: o.orderNumber, coins: -m.used, state: "used" });
      if (m.state && m.earned > 0)
        list.push({
          key: `${o.id}-earned`,
          date: o.createdAt,
          label: m.state === "earned" ? "ได้รับจากคำสั่งซื้อ" : "รอรับเมื่อได้รับสินค้า",
          orderId: o.id,
          orderNumber: o.orderNumber,
          coins: m.earned,
          state: m.state,
        });
      return list;
    });

  const balance = customer.loyaltyPoints ?? 0;
  const credited = fromOrders.filter((e) => e.state !== "pending").reduce((sum, e) => sum + e.coins, 0);
  const gap = balance - credited;
  const opening: Omit<CustomerCoinEntry, "balance">[] =
    gap === 0
      ? []
      : [
          customer.source === "crm_migrated" && gap > 0
            ? { key: "crm-carry-over", date: customer.memberSince || "-", label: "ย้ายคอยน์จาก Charmiss Club CRM", coins: gap, state: "earned" }
            : { key: "adjustment", date: customer.memberSince || "-", label: "ปรับยอดคอยน์", coins: gap, state: gap > 0 ? "earned" : "used" },
        ];

  let running = 0;
  const withBalance = [...opening, ...fromOrders].map((e) => {
    if (e.state !== "pending") running += e.coins;
    return { ...e, balance: running };
  });

  return {
    entries: withBalance.reverse(),
    balance,
    totalEarned: withBalance.filter((e) => e.state === "earned").reduce((sum, e) => sum + e.coins, 0),
    totalUsed: withBalance.filter((e) => e.state === "used").reduce((sum, e) => sum - e.coins, 0),
    pending: withBalance.filter((e) => e.state === "pending").reduce((sum, e) => sum + e.coins, 0),
  };
}
