import { For, Show } from "solid-js";
import { StatusBadge } from "~/components/admin/StatusBadge";
import { formatAdminCurrency } from "~/lib/adminDashboard";
import { useAdminProducts } from "~/lib/adminProductStore";
import { MARKETING_STATUS_META, formatMarketingDate, type FlashSale } from "~/lib/adminMarketing";

/** Phase 07 #25 — Flash Sale Quick View: per-item Original/Sale price + discount %, same Right Drawer pattern. */
export function FlashSaleQuickView(props: { flashSale: FlashSale }) {
  const f = () => props.flashSale;
  const productStore = useAdminProducts();

  return (
    <div class="flex flex-col gap-5">
      <div>
        <p class="text-base font-semibold text-ink">{f().name}</p>
        <p class="text-sm text-ink-gray">{f().items.length} สินค้าเข้าร่วม</p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <StatusBadge tone={MARKETING_STATUS_META[f().status].tone}>{MARKETING_STATUS_META[f().status].label}</StatusBadge>
      </div>

      <div class="flex flex-col gap-1.5 rounded-card bg-surface-gray/60 p-3 text-sm">
        <div class="flex items-center justify-between">
          <span class="text-ink-gray">เริ่ม</span>
          <span class="font-medium text-ink">{formatMarketingDate(f().startDate)} {f().startTime}</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-ink-gray">สิ้นสุด</span>
          <span class="font-medium text-ink">{formatMarketingDate(f().endDate)} {f().endTime}</span>
        </div>
      </div>

      <div class="flex flex-col gap-3">
        <p class="text-xs font-semibold uppercase tracking-wide text-ink-placeholder">สินค้าในแคมเปญ</p>
        <For each={f().items}>
          {(item) => {
            const product = productStore.getById(item.productId);
            const discountPct = product ? Math.round((1 - item.salePrice / product.price) * 100) : 0;
            return (
              <div class="flex gap-3">
                <img src={product?.image} alt="" class="size-11 shrink-0 rounded-media object-cover" />
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-medium text-ink">{product?.name ?? item.productId}</p>
                  <p class="text-xs text-ink-gray">
                    <span class="text-ink-placeholder line-through">{product ? formatAdminCurrency(product.price) : ""}</span>{" "}
                    <span class="font-semibold text-system-red">{formatAdminCurrency(item.salePrice)}</span>
                    {discountPct > 0 ? ` (-${discountPct}%)` : ""}
                  </p>
                  <Show when={item.saleLimit}>
                    <p class="text-xs text-ink-gray">ขายแล้ว {item.soldCount} / {item.saleLimit}</p>
                  </Show>
                </div>
              </div>
            );
          }}
        </For>
      </div>

      <div class="flex items-center justify-between text-xs text-ink-placeholder">
        <span>สร้างเมื่อ {f().createdAt}</span>
        <span>แก้ไขล่าสุด {f().updatedAt}</span>
      </div>
    </div>
  );
}
