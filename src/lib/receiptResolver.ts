import type { AdminOrder, OrderCustomer, OrderLineItem, OrderPaymentInfo, OrderShippingInfo, OrderTotals } from "./adminOrders";

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
  };
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/**
 * §21 — the "Download Receipt" action's actual file: a self-contained HTML
 * document (Charmiss's own printable design, inline CSS, no external
 * assets/fonts to fetch) built from the exact same `ReceiptData` the on-
 * screen Receipt Preview renders — never a second, hand-typed copy of the
 * numbers. Deliberately not a PDF: no PDF library exists in this project
 * (`package.json` has none) and adding one just for this one prototype
 * action would be exactly the "ห้ามเพิ่ม PDF library ขนาดใหญ่โดยไม่จำเป็น"
 * this phase forbids. An `.html` file opens and prints identically in any
 * browser, which covers the same real need.
 */
export function buildReceiptHtmlDocument(data: ReceiptData, formatCurrency: (n: number) => string): string {
  const itemRows = data.items
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.name)}${item.variantLabel ? `<br><span class="muted">${escapeHtml(item.variantLabel)}</span>` : ""}</td>
          <td class="num">${item.qty}</td>
          <td class="num">${escapeHtml(formatCurrency(item.unitPrice))}</td>
          <td class="num">${escapeHtml(formatCurrency(item.lineTotal))}</td>
        </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8" />
<title>${escapeHtml(data.receiptNumber)}</title>
<style>
  body { font-family: -apple-system, "Segoe UI", sans-serif; color: #2b2b33; max-width: 720px; margin: 40px auto; padding: 0 24px; }
  h1 { color: #e91e63; font-size: 24px; margin: 0 0 4px; }
  .muted { color: #8b8b96; font-size: 12px; }
  .row { display: flex; justify-content: space-between; gap: 16px; margin-top: 24px; }
  table { width: 100%; border-collapse: collapse; margin-top: 24px; }
  th, td { text-align: left; padding: 8px 4px; border-bottom: 1px solid #eee; font-size: 14px; }
  th.num, td.num { text-align: right; }
  .totals { margin-top: 16px; width: 100%; max-width: 280px; margin-left: auto; }
  .totals div { display: flex; justify-content: space-between; padding: 4px 0; font-size: 14px; }
  .totals .grand { font-weight: 700; font-size: 16px; border-top: 1px solid #333; margin-top: 6px; padding-top: 8px; }
  footer { margin-top: 40px; text-align: center; color: #8b8b96; font-size: 13px; }
</style>
</head>
<body>
  <h1>CHARMISS</h1>
  <p class="muted">ใบเสร็จรับเงิน / Receipt</p>
  <div class="row">
    <div>
      <div><strong>เลขที่ใบเสร็จ:</strong> ${escapeHtml(data.receiptNumber)}</div>
      <div><strong>เลขที่คำสั่งซื้อ:</strong> ${escapeHtml(data.order.orderNumber)}</div>
      <div><strong>วันที่:</strong> ${escapeHtml(data.receiptDate)}</div>
    </div>
    <div>
      <div><strong>ลูกค้า:</strong> ${escapeHtml(data.customer.name)}</div>
      <div>${escapeHtml(data.customer.email)}</div>
      <div>${escapeHtml(data.customer.phone)}</div>
    </div>
  </div>
  <table>
    <thead><tr><th>สินค้า</th><th class="num">จำนวน</th><th class="num">ราคา/หน่วย</th><th class="num">รวม</th></tr></thead>
    <tbody>${itemRows}</tbody>
  </table>
  <div class="totals">
    <div><span>ยอดรวมสินค้า</span><span>${escapeHtml(formatCurrency(data.totals.subtotal))}</span></div>
    ${data.totals.discount > 0 ? `<div><span>ส่วนลด</span><span>-${escapeHtml(formatCurrency(data.totals.discount))}</span></div>` : ""}
    <div><span>ค่าจัดส่ง</span><span>${data.totals.shippingFee > 0 ? escapeHtml(formatCurrency(data.totals.shippingFee)) : "ฟรี"}</span></div>
    <div class="grand"><span>ยอดรวมทั้งหมด</span><span>${escapeHtml(formatCurrency(data.totals.grandTotal))}</span></div>
  </div>
  <div class="row">
    <div><strong>ช่องทางชำระเงิน:</strong> ${escapeHtml(data.payment.method)}</div>
  </div>
  <footer>ขอบคุณที่อุดหนุน Charmiss</footer>
</body>
</html>`;
}

/** Triggers a real file save via the browser's own download mechanism — no server round-trip, no library. */
export function downloadReceiptHtml(data: ReceiptData, formatCurrency: (n: number) => string): void {
  const html = buildReceiptHtmlDocument(data, formatCurrency);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${data.receiptNumber}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
