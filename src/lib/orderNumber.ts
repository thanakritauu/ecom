/**
 * Order numbers — one format across the storefront, Admin and the backend:
 * `ORD-<year>-<sequence>` (e.g. ORD-2026-1024, same as `AdminOrder.orderNumber`
 * and what `receiptResolver.ts` parses). The backend assigns the real
 * sequence; until then checkout reserves a mock one from the clock.
 */
export function generateOrderNumber(now = new Date()): string {
  return `ORD-${now.getFullYear()}-${String(now.getTime()).slice(-4)}`;
}
