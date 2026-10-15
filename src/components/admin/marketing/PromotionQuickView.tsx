import { For, Show } from "solid-js";
import { formatAudience } from "~/lib/marketingAudience";
import { formatCombinable, MARKETING_TOOL_META, promotionTool } from "~/lib/adminMarketing";
import { StatusBadge } from "~/components/admin/StatusBadge";
import { useAdminProducts } from "~/lib/adminProductStore";
import {
  MARKETING_PHASE_META,
  PROMOTION_CONDITION_META,
  formatMarketingDateTime,
  formatPromotionDiscount,
  marketingPhase,
  promotionCondition,
  promotionHasProductScope,
  isStorefrontPromotion,
  type Promotion,
} from "~/lib/adminMarketing";
import { PromotionGiftTiers } from "./PromotionGiftTiers";
import { PromotionBuyGetView, PromotionBundleView } from "./PromotionItems";

/** Promotion Quick View, Products' Quick View layout. */
export function PromotionQuickView(props: { promotion: Promotion }) {
  const p = () => props.promotion;
  const productStore = useAdminProducts();
  const productName = (id: string) => productStore.getById(id)?.name;
  const scopeProducts = () => p().productIds.map((id) => productStore.getById(id)).filter((x) => x !== undefined);
  const phase = () => MARKETING_PHASE_META[marketingPhase(p())];

  return (
    <div class="flex flex-col gap-4">
      <div>
        <p class="text-base font-semibold text-ink">{p().name}</p>
        <p class="mt-1 text-xl font-bold text-ink">{formatPromotionDiscount(p(), productName)}</p>
        <p class="text-sm text-ink-gray">{MARKETING_TOOL_META[promotionTool(p())].label}</p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <StatusBadge tone={phase().tone}>{phase().label}</StatusBadge>
        <Show when={p().showInCart}>
          <StatusBadge tone="info">แสดงในตะกร้า</StatusBadge>
        </Show>
      </div>

      <div class="grid grid-cols-2 gap-3 rounded-card bg-surface-gray/60 p-3 text-sm">
        <Show when={isStorefrontPromotion(p())}>
          <Field label="นับจาก" value={PROMOTION_CONDITION_META[promotionCondition(p())].label} />
        </Show>
        <Show when={promotionHasProductScope(p().type)}>
          <Field label="สินค้าที่เข้าร่วม" value={p().productIds.length === 0 ? "ทั้งร้าน" : `${p().productIds.length} สินค้า`} />
        </Show>
        <Field label="กลุ่มลูกค้า" value={formatAudience(p().audience)} />
        <Field label="ใช้ร่วมกับโปรอื่น" value={formatCombinable(p().combinableWith)} />
        <Field label="เริ่ม" value={formatMarketingDateTime(p().startDate, p().startTime)} />
        <Field label="สิ้นสุด" value={formatMarketingDateTime(p().endDate, p().endTime)} />
      </div>

      <Show when={p().type === "gift_with_purchase"}>
        <div class="flex flex-col gap-2">
          <p class="text-sm font-semibold text-ink">ของแถม</p>
          <PromotionGiftTiers promotion={p()} />
        </div>
      </Show>

      <Show when={p().type === "buy_x_get_y"}>
        <PromotionBuyGetView buyItems={p().buyItems ?? []} getItems={p().getItems ?? []} />
      </Show>

      <Show when={p().type === "bundle"}>
        <div class="flex flex-col gap-2">
          <p class="text-sm font-semibold text-ink">สินค้าในเซ็ต</p>
          <PromotionBundleView promotion={p()} />
        </div>
      </Show>

      <Show when={promotionHasProductScope(p().type) && p().productIds.length > 0}>
        <div class="flex flex-col gap-2">
          <p class="text-sm font-semibold text-ink">สินค้าที่เข้าร่วม</p>
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

      <p class="text-xs text-ink-placeholder">แก้ไขล่าสุด {p().updatedAt}</p>
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
