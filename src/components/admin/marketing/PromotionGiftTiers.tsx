import { For, Show } from "solid-js";
import { useAdminProducts } from "~/lib/adminProductStore";
import { formatPromotionThreshold, promotionCondition, promotionGiftTiers, type Promotion } from "~/lib/adminMarketing";

/** Read-only tier list of a "ซื้อครบรับของแถม" promo (Quick View + detail page). One tier reads as a plain gift row. */
export function PromotionGiftTiers(props: { promotion: Promotion; size?: "sm" | "md" }) {
  const productStore = useAdminProducts();
  const tiers = () => promotionGiftTiers(props.promotion);
  const condition = () => promotionCondition(props.promotion);
  const thumb = () => (props.size === "md" ? "size-11" : "size-10");

  return (
    <Show when={tiers().length > 0} fallback={<p class="text-sm text-ink-gray">ยังไม่ได้ตั้งขั้นของแถม</p>}>
      <ol class="flex flex-col gap-3">
        <For each={tiers()}>
          {(tier, i) => {
            const product = () => productStore.getById(tier.giftProductId);
            return (
              <li class="flex items-center gap-3">
                <Show when={product()} fallback={<span class={`${thumb()} shrink-0 rounded-media bg-surface-gray`} />}>
                  {(p) => <img src={p().image} alt="" class={`${thumb()} shrink-0 rounded-media object-cover`} />}
                </Show>
                <div class="min-w-0 flex-1">
                  <p class="text-xs text-ink-gray">
                    <Show when={tiers().length > 1}>ขั้นที่ {i() + 1} </Show>ซื้อครบ {formatPromotionThreshold(condition(), tier.threshold)}
                  </p>
                  <p class="truncate text-sm font-medium text-ink">{product()?.name ?? "ไม่พบสินค้านี้ในระบบ"}</p>
                </div>
                <span class="shrink-0 text-sm font-medium text-ink">{tier.giftQty} ชิ้น</span>
              </li>
            );
          }}
        </For>
      </ol>
    </Show>
  );
}
