import { For } from "solid-js";
import { StatusBadge } from "~/components/admin/StatusBadge";
import { formatAdminCurrency } from "~/lib/adminDashboard";
import { useAdminProducts } from "~/lib/adminProductStore";
import { MARKETING_STATUS_META, formatMarketingDate, type Bundle } from "~/lib/adminMarketing";

/** Phase 07 #28 — Bundle Quick View: Regular Total/Bundle Price/Savings computed live from current product prices, same Right Drawer pattern. */
export function BundleQuickView(props: { bundle: Bundle }) {
  const b = () => props.bundle;
  const productStore = useAdminProducts();
  const regularTotal = () => b().items.reduce((sum, item) => sum + (productStore.getById(item.productId)?.price ?? 0) * item.qty, 0);
  const savings = () => Math.max(0, regularTotal() - b().bundlePrice);

  return (
    <div class="flex flex-col gap-5">
      <div>
        <p class="text-base font-semibold text-ink">{b().name}</p>
        <p class="text-sm text-ink-gray">{b().items.length} สินค้าในเซ็ต</p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <StatusBadge tone={MARKETING_STATUS_META[b().status].tone}>{MARKETING_STATUS_META[b().status].label}</StatusBadge>
      </div>

      <div class="flex flex-col gap-1.5 rounded-card bg-surface-gray/60 p-3 text-sm">
        <div class="flex items-center justify-between">
          <span class="text-ink-gray">ราคารวมปกติ</span>
          <span class="text-ink line-through">{formatAdminCurrency(regularTotal())}</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-ink-gray">ราคาเซ็ต</span>
          <span class="font-semibold text-system-red">{formatAdminCurrency(b().bundlePrice)}</span>
        </div>
        <div class="flex items-center justify-between pt-1 text-base font-bold text-ink">
          <span>ประหยัด</span>
          <span>{formatAdminCurrency(savings())}</span>
        </div>
      </div>

      <div class="flex flex-col gap-3">
        <p class="text-xs font-semibold uppercase tracking-wide text-ink-placeholder">สินค้าในเซ็ต</p>
        <For each={b().items}>
          {(item) => {
            const product = productStore.getById(item.productId);
            return (
              <div class="flex items-center gap-3">
                <img src={product?.image} alt="" class="size-10 shrink-0 rounded-media object-cover" />
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm text-ink">{product?.name ?? item.productId}</p>
                </div>
                <span class="shrink-0 text-xs text-ink-gray">x{item.qty}</span>
              </div>
            );
          }}
        </For>
      </div>

      <div class="flex items-center justify-between text-xs text-ink-placeholder">
        <span>สร้างเมื่อ {b().createdAt}</span>
        <span>แก้ไขล่าสุด {b().updatedAt}</span>
      </div>
    </div>
  );
}
