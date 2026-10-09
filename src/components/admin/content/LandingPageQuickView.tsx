import { For, Show } from "solid-js";
import { mediaImage } from "~/lib/media";
import { StatusBadge } from "~/components/admin/StatusBadge";
import { ImageIcon } from "~/components/admin/icons";
import { useAdminProducts } from "~/lib/adminProductStore";
import { formatAdminCurrency } from "~/lib/adminDashboard";
import { formatMarketingDateTime } from "~/lib/adminMarketing";
import { LANDING_PAGE_STATUS_META, type LandingPage, promotionPageHref } from "~/lib/adminContent";
import { HOMEPAGE_SECTION_TYPE_META } from "~/lib/adminHomepage";

/** Landing Page Architecture & Promotion Page Migration — was `PromotionPageQuickView.tsx`. Same reused `QuickViewDrawer` pattern as Product/Order, no new drawer shape. */
export function LandingPageQuickView(props: { page: LandingPage }) {
  const p = () => props.page;
  const productStore = useAdminProducts();
  const previewProducts = () =>
    p()
      .products.slice(0, 4)
      .map((ref) => productStore.getById(ref.productId))
      .filter((x) => x !== undefined);

  /** §27 Hero preview — an enabled `hero` Section (Section Builder) takes precedence over the flat `banners` field, same precedence Preview/PromotionPageView use. */
  const heroSection = () => p().sections.find((s) => s.type === "hero" && s.enabled);
  /** Prefers the first *image* asset (this is a static `<img>` thumbnail, not a player) — a video/YouTube-only Hero Banner falls back to its legacy `banners.desktop`, same as before this field existed. */
  const heroImage = () =>
    heroSection()?.assets.find((a) => a.type === "image")?.source || heroSection()?.assets.find((a) => a.type === "video")?.poster || mediaImage(heroSection()?.banners.desktop) || mediaImage(p().banners.desktop);
  const sectionTypeCounts = () => {
    const counts = new Map<string, number>();
    for (const s of p().sections) counts.set(s.type, (counts.get(s.type) ?? 0) + 1);
    return [...counts.entries()];
  };

  return (
    <div class="flex flex-col gap-4">
      <div class="aspect-[3/1] w-full overflow-hidden rounded-media bg-surface-gray/60">
        <Show when={heroImage()} fallback={<div class="flex size-full items-center justify-center text-ink-placeholder"><ImageIcon class="size-8" /></div>}>
          <img src={heroImage()} alt="" class="size-full object-cover" />
        </Show>
      </div>

      <div>
        <p class="text-base font-semibold text-ink">{p().name}</p>
        <p class="text-sm text-ink-gray">{promotionPageHref(p())}</p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <StatusBadge tone={LANDING_PAGE_STATUS_META[p().status].tone}>{LANDING_PAGE_STATUS_META[p().status].label}</StatusBadge>
        <Show when={p().isHomepage}>
          <StatusBadge tone="info">หน้าแรก</StatusBadge>
        </Show>
      </div>

      <div class="grid grid-cols-2 gap-3 rounded-card bg-surface-gray/60 p-3 text-sm">
        <Field label="เริ่ม" value={formatMarketingDateTime(p().startDate, p().startTime)} />
        <Field label="สิ้นสุด" value={formatMarketingDateTime(p().endDate, p().endTime)} />
        <Field label="จำนวนสินค้า" value={p().sections.length > 0 ? "-" : p().products.length.toLocaleString("th-TH")} />
        <Field label="ส่วนเนื้อหา" value={`${p().sections.length.toLocaleString("th-TH")} ส่วน`} />
        <Field label="สร้างเมื่อ" value={p().createdAt || "-"} />
        <Field label="แก้ไขล่าสุด" value={p().updatedAt || "-"} />
      </div>

      <Show when={sectionTypeCounts().length > 0}>
        <div class="flex flex-col gap-2">
          <p class="text-xs text-ink-placeholder">ส่วนเนื้อหาในหน้านี้</p>
          <div class="flex flex-wrap gap-2">
            <For each={sectionTypeCounts()}>
              {([type, count]) => (
                <StatusBadge tone="neutral">
                  {HOMEPAGE_SECTION_TYPE_META[type as keyof typeof HOMEPAGE_SECTION_TYPE_META].label} ({count})
                </StatusBadge>
              )}
            </For>
          </div>
        </div>
      </Show>

      <Show when={p().sections.length === 0}>
        <div class="flex flex-col gap-2">
          <p class="text-xs text-ink-placeholder">ตัวอย่างสินค้า</p>
          <Show when={previewProducts().length > 0} fallback={<p class="text-sm text-ink-gray">ยังไม่ได้เลือกสินค้า</p>}>
            <div class="flex flex-col gap-2">
              <For each={previewProducts()}>
                {(product) => (
                  <div class="flex items-center gap-3">
                    <img src={product!.image} alt="" class="size-10 shrink-0 rounded-media object-cover" />
                    <div class="min-w-0 flex-1">
                      <p class="truncate text-sm text-ink">{product!.name}</p>
                      <p class="text-xs text-ink-gray">{formatAdminCurrency(product!.price)}</p>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </div>
      </Show>

      <Show when={p().description}>
        <p class="line-clamp-4 whitespace-pre-line text-sm text-ink-gray">{p().description}</p>
      </Show>
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
