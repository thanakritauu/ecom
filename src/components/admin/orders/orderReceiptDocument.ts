import type { ReceiptData } from "~/lib/receiptResolver";
import { formatOrderAddress } from "~/lib/adminOrders";
import { formatTaxBranch, formatTaxId, taxIdLabel, vatBreakdown } from "~/lib/taxInvoice";
import { SELLER } from "~/lib/sellerInfo";

/**
 * The downloadable receipt: a self-contained printable HTML file built only
 * from `ReceiptData` — coupon and Charmiss Coin as separate lines, the
 * free-gift line, payment detail/reference and the ที่อยู่ออกใบกำกับภาษี
 * (billing address, or the shipping address when none was given), headed by
 * the buyer's name, เลขประจำตัวผู้เสียภาษี and สาขา when a tax invoice was asked for.
 */
function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function buildOrderReceiptHtml(data: ReceiptData, formatCurrency: (n: number) => string): string {
  const { order, totals, payment } = data;
  const billTo = data.billing;
  // Asked for a tax invoice: the buyer's name (company + สาขา) and 13-digit number head the block.
  const taxBuyer = data.taxInvoice;
  // Prices include VAT: a tax invoice shows the total split into before-VAT + 7% VAT.
  const vat = taxBuyer ? vatBreakdown(totals.grandTotal) : undefined;
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
<title>${escapeHtml(data.documentTitle)} ${escapeHtml(data.receiptNumber)}</title>
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
  <div><strong>${escapeHtml(data.documentTitle)}</strong></div>
  <div class="muted">${escapeHtml(SELLER.name)} (${escapeHtml(SELLER.branch)})<br>${escapeHtml(SELLER.address)}<br>${SELLER.taxId ? `เลขประจำตัวผู้เสียภาษี ${escapeHtml(formatTaxId(SELLER.taxId))} ` : ""}โทร ${escapeHtml(SELLER.phone)}</div>
  <div class="row">
    <div>
      <div><strong>เลขที่:</strong> ${escapeHtml(data.receiptNumber)}</div>
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
      <div><strong>ที่อยู่ออกใบกำกับภาษี</strong></div>
      ${taxBuyer ? `<div>${escapeHtml(taxBuyer.name)}${formatTaxBranch(taxBuyer) ? ` (${escapeHtml(formatTaxBranch(taxBuyer)!)})` : ""}</div><div>${escapeHtml(taxIdLabel(taxBuyer.type))} ${escapeHtml(formatTaxId(taxBuyer.taxId))}</div>` : `<div>${escapeHtml(billTo.recipientName)}</div>`}<div>${escapeHtml(billTo.phone)}</div><div>${escapeHtml(formatOrderAddress(billTo))}</div>
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
    ${vat ? `${line("มูลค่าก่อนภาษีมูลค่าเพิ่ม", formatCurrency(vat.beforeVat))}${line("ภาษีมูลค่าเพิ่ม 7%", formatCurrency(vat.vat))}` : ""}
  </div>
  <div class="row">
    <div>
      <div><strong>ช่องทางชำระเงิน:</strong> ${escapeHtml(payment.method)}${payment.detail ? ` ${escapeHtml(payment.detail)}` : ""}</div>
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
  a.download = `${data.taxInvoice ? "tax-invoice" : "receipt"}-${data.receiptNumber}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
