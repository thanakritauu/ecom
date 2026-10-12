import { Show } from "solid-js";
import { StatusBadge } from "~/components/admin/StatusBadge";
import { ProductSkuRefList } from "~/components/admin/ProductSkuPicker";
import { CouponCard, type Coupon as TicketCoupon } from "~/components/shared/CouponCard";
import {
  MARKETING_PHASE_META,
  COUPON_DISCOUNT_TYPE_META,
  formatCouponAmount,
  formatCouponCap,
  formatCouponDiscount,
  formatCouponLimit,
  formatCouponMinSpend,
  formatCouponUsage,
  formatCouponPlacement,
  formatMarketingDateShort,
  formatMarketingDateTime,
  marketingPhase,
  type Coupon,
} from "~/lib/adminMarketing";

/** An Admin coupon as the storefront ticket draws it (Quick View, detail page). */
export function adminCouponTicket(c: Coupon): TicketCoupon {
  return {
    id: c.id,
    amountLabel: formatCouponAmount(c),
    capLabel: formatCouponCap(c),
    image: c.image,
    minSpendLabel: formatCouponMinSpend(c),
    expiryLabel: `หมดอายุ ${formatMarketingDateShort(c.endDate)}`,
  };
}

/** Coupon Quick View, Products' Quick View layout with the storefront ticket as its picture. */
export function CouponQuickView(props: { coupon: Coupon; usageCount: number }) {
  const c = () => props.coupon;
  const phase = () => MARKETING_PHASE_META[marketingPhase(c())];

  return (
    <div class="flex flex-col gap-4">
      <div class="px-1 pt-1">
        <CouponCard
          coupon={adminCouponTicket(c())}
          display
        />
      </div>

      <div>
        <p class="text-base font-semibold text-ink">{c().code}</p>
        <p class="mt-1 text-xl font-bold text-ink">{formatCouponDiscount(c())}</p>
        <p class="text-sm text-ink-gray">{formatCouponMinSpend(c())}</p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <StatusBadge tone={phase().tone}>{phase().label}</StatusBadge>
      </div>

      <div class="grid grid-cols-2 gap-3 rounded-card bg-surface-gray/60 p-3 text-sm">
        <Field label="แสดงที่" value={formatCouponPlacement(c())} />
        <Field label="ประเภทส่วนลด" value={COUPON_DISCOUNT_TYPE_META[c().discountType].label} />
        <Field label="ใช้แล้ว" value={`${formatCouponUsage(props.usageCount, c().usageLimit)} ครั้ง`} />
        <Field label="จำกัดจำนวนครั้ง" value={formatCouponLimit(c().usageLimit)} />
        <Field label="จำกัดต่อลูกค้า" value={formatCouponLimit(c().perCustomerLimit)} />
        <Field label="เริ่ม" value={formatMarketingDateTime(c().startDate, c().startTime)} />
        <Field label="สิ้นสุด" value={formatMarketingDateTime(c().endDate, c().endTime)} />
      </div>

      <div class="flex flex-col gap-2">
        <p class="text-sm font-semibold text-ink">ใช้ได้กับสินค้า</p>
        <Show when={c().productScope !== undefined} fallback={<p class="text-sm text-ink-gray">ทั้งร้าน</p>}>
          <ProductSkuRefList refs={c().productScope!} />
        </Show>
      </div>

      <p class="text-xs text-ink-placeholder">แก้ไขล่าสุด {c().updatedAt}</p>
    </div>
  );
}

function Field(props: { label: string; value: string }) {
  return (
    <div>
      <p class="text-xs text-ink-placeholder">{props.label}</p>
      <p class="font-medium text-ink">{props.value}</p>
    </div>
  );
}
