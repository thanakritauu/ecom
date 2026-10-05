import { For, Show } from "solid-js";
import { StatusBadge } from "~/components/admin/StatusBadge";
import { useAdminProducts } from "~/lib/adminProductStore";
import { formatAdminCurrency } from "~/lib/adminDashboard";
import { MARKETING_STATUS_META, PROMOTION_TYPE_META, formatMarketingDate, formatPromotionDiscount, type Promotion } from "~/lib/adminMarketing";

/** Phase 07 #10 — Promotion Quick View: same "reused everywhere" Quick View pattern as Product/Order. */
export function PromotionQuickView(props: { promotion: Promotion }) {
  const p = () => props.promotion;
  const productStore = useAdminProducts();
  const gift = () => (p().giftProductId ? productStore.getById(p().giftProductId!) : undefined);
  const scopeProducts = () => p().productIds.map((id) => productStore.getById(id)).filter((x) => x !== undefined);

  return (
    <div class="flex flex-col gap-5">
      <div>
        <p class="text-base font-semibold text-ink">{p().name}</p>
        <p class="text-sm text-ink-gray">{PROMOTION_TYPE_META[p().type].label}</p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <StatusBadge tone={MARKETING_STATUS_META[p().status].tone}>{MARKETING_STATUS_META[p().status].label}</StatusBadge>
      </div>

      <div class="flex flex-col gap-1.5 rounded-card bg-surface-gray/60 p-3 text-sm">
        <div class="flex items-center justify-between">
          <span class="text-ink-gray">ส่วนลด</span>
          <span class="text-right font-semibold text-ink">{formatPromotionDiscount(p(), gift()?.name)}</span>
        </div>
        <Show when={p().minSpend}>
          <div class="flex items-center justify-between">
            <span class="text-ink-gray">ยอดซื้อขั้นต่ำ</span>
            <span class="font-medium text-ink">{formatAdminCurrency(p().minSpend!)}</span>
          </div>
        </Show>
        <div class="flex items-center justify-between">
          <span class="text-ink-gray">แสดงในตะกร้า</span>
          <span class="font-medium text-ink">{p().showInCart ? "แสดง" : "ไม่แสดง"}</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-ink-gray">เริ่ม</span>
          <span class="font-medium text-ink">{formatMarketingDate(p().startDate)} {p().startTime}</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-ink-gray">สิ้นสุด</span>
          <span class="font-medium text-ink">{formatMarketingDate(p().endDate)} {p().endTime}</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-ink-gray">ใช้งานแล้ว</span>
          <span class="font-medium text-ink">{p().usageCount.toLocaleString("th-TH")} ครั้ง</span>
        </div>
      </div>

      <Show when={p().type === "gift_with_purchase"}>
        <div class="flex flex-col gap-2">
          <p class="text-xs font-semibold uppercase tracking-wide text-ink-placeholder">ของแถม</p>
          <Show when={gift()} fallback={<p class="text-sm text-ink-gray">ยังไม่ได้เลือกสินค้าของแถม</p>}>
            {(g) => (
              <div class="flex items-center gap-3">
                <img src={g().image} alt="" class="size-10 shrink-0 rounded-media object-cover" />
                <p class="min-w-0 flex-1 truncate text-sm text-ink">{g().name}</p>
                <span class="shrink-0 text-sm font-medium text-ink">x{p().giftQty ?? 1}</span>
              </div>
            )}
          </Show>
        </div>
      </Show>

      <div class="flex flex-col gap-2">
        <p class="text-xs font-semibold uppercase tracking-wide text-ink-placeholder">สินค้าที่เข้าร่วม</p>
        <Show when={p().productIds.length > 0} fallback={<p class="text-sm text-ink-gray">ทุกสินค้า</p>}>
          <div class="flex flex-col gap-2">
            <For each={scopeProducts()}>
              {(product) => (
                <div class="flex items-center gap-3">
                  <img src={product!.image} alt="" class="size-10 shrink-0 rounded-media object-cover" />
                  <p class="min-w-0 flex-1 truncate text-sm text-ink">{product!.name}</p>
                </div>
              )}
            </For>
          </div>
        </Show>
      </div>

      <Show when={p().description}>
        <div>
          <p class="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-placeholder">รายละเอียด</p>
          <p class="text-sm text-ink-gray">{p().description}</p>
        </div>
      </Show>

      <div class="flex items-center justify-between text-xs text-ink-placeholder">
        <span>สร้างเมื่อ {p().createdAt}</span>
        <span>แก้ไขล่าสุด {p().updatedAt}</span>
      </div>
    </div>
  );
}
