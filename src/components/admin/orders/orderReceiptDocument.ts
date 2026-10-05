import type { ReceiptData } from "~/lib/receiptResolver";
import { formatOrderAddress } from "~/lib/adminOrders";

/**
 * Admin-local version of receiptResolver.ts's `buildReceiptHtmlDocument` /
 * `downloadReceiptHtml` (that shared file is read-only for the Orders
 * module): same self-contained printable HTML, plus what the storefront
 * order now carries — coupon and Charmiss Coin as separate lines, the
 * free-gift line, payment detail/reference and the optional
 * ที่อยู่ออกใบเสร็จรับเงิน. Still built only from `ReceiptData`.
 */
function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function buildOrderReceiptHtml(data: ReceiptData, formatCurrency: (n: number) => string): string {
  const { order, totals, payment } = data;
  const billTo = order.billingAddress;
  const itemRows = data.items
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.name)}${item.variantLabel ? `<br><span class="muted">${escapeHtml(item.variantLabel)}</span>` : ""}${item.isFreeGift ? `<br><span class="gift">ของแถมฟรี</span>` : ""}</td>
          <td class="num">${item.qty}</td>
          <td class="num">${escapeHtml(formatCurrency(item.unitPrice))}</td>
          <td class="num">${item.isFreeGift ? "ฟรี" : escapeHtml(formatCurrency(item.lineTotal))}</td>
        </tr>`,
    )
    .join("");
  const line = (label: string, value: string) => `<div><span>${escapeHtml(label)}</span><span>${escapeHtml(value)}</span></div>`;

  return `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8" />
<title>${escapeHtml(data.receiptNumber)}</title>
<style>
  body { font-family: -apple-system, "Segoe UI", sans-serif; color: #2b2b33; max-width: 720px; margin: 40px auto; padding: 0 24px; }
  h1 { color: #e91e63; font-size: 24px; margin: 0 0 4px; }
  .muted { color: #8b8b96; font-size: 12px; }
  .gift { color: #1e8e3e; font-size: 12px; font-weight: 600; }
  .row { display: flex; justify-content: space-between; gap: 16px; margin-top: 24px; }
  table { width: 100%; border-collapse: collapse; margin-top: 24px; }
  th, td { text-align: left; padding: 8px 4px; border-bottom: 1px solid #eee; font-size: 14px; }
  th.num, td.num { text-align: right; }
  .totals { margin-top: 16px; width: 100%; max-width: 320px; margin-left: auto; }
  .totals div { display: flex; justify-content: space-between; gap: 12px; padding: 4px 0; font-size: 14px; }
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
      <div><strong>เลขที่คำสั่งซื้อ:</strong> ${escapeHtml(order.orderNumber)}</div>
      <div><strong>วันที่:</strong> ${escapeHtml(data.receiptDate)}</div>
    </div>
    <div>
      <div><strong>ลูกค้า:</strong> ${escapeHtml(data.customer.name)}</div>
      <div>${escapeHtml(data.customer.email)}</div>
      <div>${escapeHtml(data.customer.phone)}</div>
    </div>
  </div>
  <div class="row">
    <div>
      <div><strong>ที่อยู่ออกใบเสร็จรับเงิน</strong></div>
      ${
        billTo
          ? `<div>${escapeHtml(billTo.recipientName)}</div><div>${escapeHtml(billTo.phone)}</div><div>${escapeHtml(formatOrderAddress(billTo))}</div>`
          : `<div class="muted">ออกในชื่อลูกค้า</div>`
      }
    </div>
    <div>
      <div><strong>ที่อยู่จัดส่ง</strong></div>
      <div>${escapeHtml(data.shipping.address.recipientName)}</div>
      <div>${escapeHtml(formatOrderAddress(data.shipping.address))}</div>
    </div>
  </div>
  <table>
    <thead><tr><th>สินค้า</th><th class="num">จำนวน</th><th class="num">ราคา/หน่วย</th><th class="num">รวม</th></tr></thead>
    <tbody>${itemRows}</tbody>
  </table>
  <div class="totals">
    ${line("ยอดรวมสินค้า", formatCurrency(totals.subtotal))}
    ${totals.couponDiscount > 0 ? line(`ส่วนลดคูปอง${totals.couponCode ? ` (${totals.couponCode})` : ""}`, `-${formatCurrency(totals.couponDiscount)}`) : ""}
    ${totals.coinDiscount > 0 ? line(`ส่วนลด Charmiss Coin (${totals.coinsRedeemed.toLocaleString("th-TH")} คอยน์)`, `-${formatCurrency(totals.coinDiscount)}`) : ""}
    ${line("ค่าจัดส่ง (DHL)", totals.shippingFee > 0 ? formatCurrency(totals.shippingFee) : "ฟรี")}
    <div class="grand"><span>ยอดรวมทั้งหมด</span><span>${escapeHtml(formatCurrency(totals.grandTotal))}</span></div>
  </div>
  <div class="row">
    <div>
      <div><strong>ช่องทางชำระเงิน:</strong> ${escapeHtml(payment.method)}${payment.detail ? ` (${escapeHtml(payment.detail)})` : ""}</div>
      ${payment.transactionId ? `<div class="muted">เลขอ้างอิง ${escapeHtml(payment.transactionId)}</div>` : ""}
    </div>
  </div>
  <footer>ขอบคุณที่อุดหนุน Charmiss</footer>
</body>
</html>`;
}

/** Real file save via the browser's own download mechanism — no server round-trip, no library. */
export function downloadOrderReceiptHtml(data: ReceiptData, formatCurrency: (n: number) => string): void {
  const blob = new Blob([buildOrderReceiptHtml(data, formatCurrency)], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${data.receiptNumber}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
