import type { AdminOrder, OrderAddress, OrderCustomer, OrderLineItem, OrderPaymentInfo, OrderShippingInfo, OrderTotals } from "./adminOrders";

/**
 * Order + Receipt Phase §16 — Receipt is a Derived View, never a second
 * dataset: no `receiptStore`, no persisted Receipt record, no independently
 * editable Receipt fields. Every value here is read straight off the one
 * `AdminOrder` the caller already has (`useAdminOrders().orders()`), so
 * "Receipt Total = Order Total" etc. (§23) holds by construction — there is
 * nothing else it could read from.
 *
 * §03/§23 — deliberately uses `order.customer` (the historical snapshot),
 * never a live lookup into the Customer Store: a receipt is a record of what
 * was true at purchase time. Order Detail's own "Customer" section is the
 * place that resolves the *current* Customer Store record (with a link into
 * Customer Management) — a receipt must never silently change if that
 * customer's profile is edited later.
 */
export type ReceiptData = {
  order: AdminOrder;
  receiptNumber: string;
  receiptDate: string;
  customer: OrderCustomer;
  items: OrderLineItem[];
  totals: OrderTotals;
  payment: OrderPaymentInfo;
  shipping: OrderShippingInfo;
  /** ที่อยู่ออกใบกำกับภาษี — the order's billing address, or the shipping address when the customer kept "ใช้ที่อยู่เดียวกับที่อยู่จัดส่ง" (storefront Checkout default). */
  billing: OrderAddress;
};

/**
 * §19 — deterministic, never random, and never a second stored id: every
 * `AdminOrder.orderNumber` in this catalog already follows `ORD-<year>-<seq>`
 * (see `adminOrders.ts`'s `ORDER_SEEDS`), so the exact same `<seq>` reused
 * under an `RC-` prefix is a one-line, collision-free derivation — no lookup
 * table, no counter to persist. Same value on every call for the same order.
 */
export function getReceiptNumber(order: Pick<AdminOrder, "orderNumber">): string {
  const match = order.orderNumber.match(/^ORD-(\d{4})-(\d+)$/);
  if (!match) return `RC-${order.orderNumber}`;
  const [, year, seq] = match;
  return `RC-${year}-${seq.padStart(6, "0")}`;
}

export function getReceiptData(orderId: string, orders: AdminOrder[]): ReceiptData | undefined {
  const order = orders.find((o) => o.id === orderId);
  if (!order) return undefined;
  return {
    order,
    receiptNumber: getReceiptNumber(order),
    // A receipt is dated when payment actually happened, not when the cart was created; falls back to `createdAt` for the one status (`pending_payment`) that has no `paidDate` yet.
    receiptDate: order.payment.paidDate ?? order.createdAt,
    customer: order.customer,
    items: order.items,
    totals: order.totals,
    payment: order.payment,
    shipping: order.shipping,
    billing: order.billingAddress ?? order.shipping.address,
  };
}
