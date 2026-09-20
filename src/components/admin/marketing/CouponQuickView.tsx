import { Show } from "solid-js";
import { StatusBadge } from "~/components/admin/StatusBadge";
import { formatAdminCurrency } from "~/lib/adminDashboard";
import { MARKETING_STATUS_META, formatMarketingDate, formatCouponDiscount, type Coupon } from "~/lib/adminMarketing";

/** Phase 07 #21 — Coupon Quick View, same Right Drawer pattern as every other Marketing entity. */
export function CouponQuickView(props: { coupon: Coupon }) {
  const c = () => props.coupon;

  return (
    <div class="flex flex-col gap-5">
      <div>
        <p class="text-base font-mono font-semibold text-ink">{c().code}</p>
        <p class="text-sm text-ink-gray">{c().description}</p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <StatusBadge tone={MARKETING_STATUS_META[c().status].tone}>{MARKETING_STATUS_META[c().status].label}</StatusBadge>
      </div>

      <div class="flex flex-col gap-1.5 rounded-card bg-surface-gray/60 p-3 text-sm">
        <div class="flex items-center justify-between">
          <span class="text-ink-gray">ส่วนลด</span>
          <span class="font-semibold text-ink">{formatCouponDiscount(c())}</span>
        </div>
        <Show when={c().minSpend}>
          <div class="flex items-center justify-between">
            <span class="text-ink-gray">ยอดซื้อขั้นต่ำ</span>
            <span class="font-medium text-ink">{formatAdminCurrency(c().minSpend!)}</span>
          </div>
        </Show>
        <Show when={c().maxDiscount}>
          <div class="flex items-center justify-between">
            <span class="text-ink-gray">ส่วนลดสูงสุด</span>
            <span class="font-medium text-ink">{formatAdminCurrency(c().maxDiscount!)}</span>
          </div>
        </Show>
        <div class="flex items-center justify-between">
          <span class="text-ink-gray">การใช้งาน</span>
          <span class="font-medium text-ink">
            {c().usageCount.toLocaleString("th-TH")}
            {c().usageLimit ? ` / ${c().usageLimit!.toLocaleString("th-TH")}` : ""}
          </span>
        </div>
        <Show when={c().perCustomerLimit}>
          <div class="flex items-center justify-between">
            <span class="text-ink-gray">จำกัดต่อลูกค้า</span>
            <span class="font-medium text-ink">{c().perCustomerLimit} ครั้ง</span>
          </div>
        </Show>
        <div class="flex items-center justify-between">
          <span class="text-ink-gray">เริ่ม</span>
          <span class="font-medium text-ink">{formatMarketingDate(c().startDate)} {c().startTime}</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-ink-gray">สิ้นสุด</span>
          <span class="font-medium text-ink">{formatMarketingDate(c().endDate)} {c().endTime}</span>
        </div>
      </div>

      <div class="flex items-center justify-between text-xs text-ink-placeholder">
        <span>สร้างเมื่อ {c().createdAt}</span>
        <span>แก้ไขล่าสุด {c().updatedAt}</span>
      </div>
    </div>
  );
}
