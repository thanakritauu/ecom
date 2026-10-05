import { Show } from "solid-js";
import { formatAdminCurrency } from "~/lib/adminDashboard";
import { computeCoinsEarned } from "~/lib/cartSelectors";
import type { AdminOrder } from "~/lib/adminOrders";
import { useAdminCustomers } from "~/lib/adminCustomerStore";

/**
 * One totals breakdown for Order Detail, Quick View and the Receipt —
 * same rows as the shopper's own order detail (ส่วนลดคูปอง / ส่วนลด
 * Charmiss Coin as separate lines, DHL ฿60 below ฿990 of products), so the
 * three Admin screens can't drift from each other or from the storefront.
 * Coins earned is display-only (no loyalty backend), computed with the
 * shared `computeCoinsEarned` on the amount paid for merchandise × the
 * customer's tier multiplier (their current Customer record).
 */
export function OrderTotalsBreakdown(props: { order: Pick<AdminOrder, "totals" | "orderStatus" | "paymentStatus" | "customerId">; showCoinsEarned?: boolean }) {
  const customers = useAdminCustomers();
  const t = () => props.order.totals;
  const coinsEarned = () => computeCoinsEarned(t().grandTotal - t().shippingFee, customers.getById(props.order.customerId)?.tier ?? "glow");
  const showCoins = () => props.showCoinsEarned !== false && props.order.orderStatus !== "cancelled" && props.order.paymentStatus !== "refunded" && coinsEarned() > 0;

  return (
    <div class="flex flex-col gap-1.5 text-sm">
      <Line label="ยอดรวมสินค้า" value={formatAdminCurrency(t().subtotal)} />
      <Show when={t().couponDiscount > 0}>
        <Line label={`ส่วนลดคูปอง${t().couponCode ? ` (${t().couponCode})` : ""}`} value={`-${formatAdminCurrency(t().couponDiscount)}`} />
      </Show>
      <Show when={t().coinDiscount > 0}>
        <Line label={`ส่วนลด Charmiss Coin (${t().coinsRedeemed.toLocaleString("th-TH")} คอยน์)`} value={`-${formatAdminCurrency(t().coinDiscount)}`} />
      </Show>
      <Line label="ค่าจัดส่ง (DHL)" value={t().shippingFee > 0 ? formatAdminCurrency(t().shippingFee) : "ฟรี"} />
      <div class="flex items-center justify-between pt-1 text-base font-bold text-ink">
        <span>ยอดรวมทั้งหมด</span>
        <span>{formatAdminCurrency(t().grandTotal)}</span>
      </div>
      <Show when={showCoins()}>
        <div class="flex items-center justify-between gap-3">
          <span class="text-ink-gray">{props.order.orderStatus === "completed" ? "คอยน์ที่ลูกค้าได้รับ" : "คอยน์ที่จะได้รับเมื่อส่งสำเร็จ"}</span>
          <span class="font-semibold text-success">+{coinsEarned().toLocaleString("th-TH")} คอยน์</span>
        </div>
      </Show>
    </div>
  );
}

function Line(props: { label: string; value: string }) {
  return (
    <div class="flex items-center justify-between gap-3">
      <span class="text-ink-gray">{props.label}</span>
      <span class="shrink-0 text-ink">{props.value}</span>
    </div>
  );
}
