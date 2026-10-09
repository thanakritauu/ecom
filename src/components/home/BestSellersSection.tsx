import { createMemo, createSignal, For, Show } from "solid-js";
import { Container } from "../shared/Container";
import { SectionHeader } from "../shared/SectionHeader";
import { ProductRail } from "../shared/ProductRail";
import { EmptyState } from "../shared/EmptyState";
import { isBestSeller } from "~/lib/products";
import { useProductCatalog } from "~/lib/productCatalog";
import { useNavigationContent } from "~/lib/navigationContent";

/**
 * "สินค้าขายดี" with a tab per category in the top menu (same names and
 * order as the Header's category row, so hiding or renaming a menu item in
 * Admin's จัดการเมนู changes the tabs too). "ทั้งหมด" is the curated best-seller
 * rail; a category tab shows that category's products by units sold. The
 * header's "ดูทั้งหมด" goes where the selected tab's menu item goes.
 * Categories with no product yet get no tab.
 */
export function BestSellersSection() {
  const catalog = useProductCatalog();
  const navigation = useNavigationContent();
  const [activeTab, setActiveTab] = createSignal<string>("all");

  const bestSellers = createMemo(() => catalog.products().filter(isBestSeller));
  const categoryTabs = createMemo(() => {
    const flat = navigation.visibleTree().flatMap((item) => [item, ...item.children]);
    const seen = new Set<string>();
    return flat
      .filter((item) => item.targetType === "category" && item.targetId && !seen.has(item.targetId) && seen.add(item.targetId))
      .map((item) => ({ id: item.targetId!, label: item.label, href: item.href }))
      .filter((tab) => catalog.products().some((p) => p.categoryId === tab.id));
  });
  const tabs = createMemo(() => [{ id: "all", label: "ทั้งหมด", href: "/promotion/best-sellers" }, ...categoryTabs()]);
  // The picked category can disappear (menu item hidden in Admin): fall back to "ทั้งหมด".
  const current = createMemo(() => tabs().find((t) => t.id === activeTab()) ?? tabs()[0]);
  const filtered = createMemo(() =>
    current().id === "all"
      ? bestSellers()
      : catalog
          .products()
          .filter((p) => p.categoryId === current().id)
          .sort((a, b) => (b.soldCount ?? 0) - (a.soldCount ?? 0)),
  );

  // Nothing to merchandise in any tab: the whole section hides. A single empty tab gets the shared empty state.
  return (
    <Show when={bestSellers().length > 0 || categoryTabs().length > 0}>
      <section aria-labelledby="best-sellers-heading" class="pb-8 pt-0 sm:pb-11 lg:pb-14">
        {/* Figma 124:6526 — 88px header (title + 34px tabs), 24px to the cards, 56px below them */}
        <Container width="wide" class="flex flex-col gap-4 sm:gap-5 lg:gap-6">
          <SectionHeader title="สินค้าขายดี" href={current().href} headingId="best-sellers-heading">
            <div class="scroll-rail !mx-0 !px-0" role="tablist" aria-label="กรองสินค้าขายดีตามหมวดหมู่">
              <For each={tabs()}>
                {(tab) => (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={current().id === tab.id}
                    onClick={(e) => {
                      setActiveTab(tab.id);
                      // Keep the picked tab fully visible in the sideways-scrolling row (scrolls the row only, never the page).
                      const btn = e.currentTarget;
                      const rail = btn.parentElement!;
                      const left = btn.offsetLeft - rail.offsetLeft;
                      if (left < rail.scrollLeft) rail.scrollTo({ left, behavior: "smooth" });
                      else if (left + btn.offsetWidth > rail.scrollLeft + rail.clientWidth)
                        rail.scrollTo({ left: left + btn.offsetWidth - rail.clientWidth, behavior: "smooth" });
                    }}
                    classList={{
                      "bg-brand-pink text-white border-brand-pink": current().id === tab.id,
                      "bg-white text-brand-pink border-brand-pink": current().id !== tab.id,
                    }}
                    class="flex min-h-[44px] shrink-0 items-center rounded-pill border px-6 py-1 text-base font-medium whitespace-nowrap lg:min-h-0 lg:py-[3px] lg:leading-[normal]"
                  >
                    {tab.label}
                  </button>
                )}
              </For>
            </div>
          </SectionHeader>
          <p class="sr-only" aria-live="polite">
            แสดงสินค้า {Math.min(filtered().length, 10)} รายการ
          </p>
          <Show
            when={filtered().length > 0}
            fallback={<EmptyState size="compact" title="ยังไม่มีสินค้าขายดีในหมวดนี้" description="ลองเลือกดูหมวดอื่น" />}
          >
            <ProductRail products={filtered()} rows={2} swipe />
          </Show>
        </Container>
      </section>
    </Show>
  );
}
