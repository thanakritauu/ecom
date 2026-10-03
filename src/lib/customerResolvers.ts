import type { AdminOrder } from "./adminOrders";

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
