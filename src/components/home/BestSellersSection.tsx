import { createMemo, createSignal, For } from "solid-js";
import { Container } from "../shared/Container";
import { SectionHeader } from "../shared/SectionHeader";
import { ProductRail } from "../shared/ProductRail";
import { isBestSeller } from "~/lib/products";
import { useProductCatalog } from "~/lib/productCatalog";
import { useCategoryContent } from "~/lib/categoryContent";

/** Product / Category / Brand / Collection Source-of-Truth Cleanup (§4) — this quick-filter tab row used to match the legacy `Product.category` 3-value enum against a hardcoded `productFilterTabs` list; both are now derived from the real, active Category store (`categoryId`-based), the same live relationship every other classification surface uses. Same "ทั้งหมด/ตา/แก้ม/ปาก" tabs render by default since those Categories' names are unchanged — "คิ้ว" now also appears since it's a real active Category the old hardcoded list simply never included. */
export function BestSellersSection() {
  const catalog = useProductCatalog();
  const categories = useCategoryContent();
  const [activeTab, setActiveTab] = createSignal<string>("all");

  const bestSellers = createMemo(() => catalog.products().filter(isBestSeller));
  // Only categories that actually have a best seller get a tab — a new, still-empty category never shows an empty tab.
  const tabs = createMemo(() => [
    { id: "all", label: "ทั้งหมด" },
    ...categories
      .categories()
      .filter((c) => c.status === "active" && bestSellers().some((p) => p.categoryId === c.id))
      .map((c) => ({ id: c.id, label: c.name })),
  ]);
  const filtered = createMemo(() =>
    activeTab() === "all"
      ? bestSellers()
      : bestSellers().filter((p) => p.categoryId === activeTab()),
  );

  return (
    <section aria-labelledby="best-sellers-heading" class="pb-8 pt-0 sm:pb-11 lg:pb-14">
      {/* Figma 124:6526 — 88px header (title + 34px tabs), 24px to the cards, 56px below them */}
      <Container width="wide" class="flex flex-col gap-4 sm:gap-5 lg:gap-6">
        <SectionHeader title="สินค้าขายดี" href="/promotion/best-sellers" headingId="best-sellers-heading">
          <div class="scroll-rail !mx-0 !px-0" role="tablist" aria-label="กรองสินค้าขายดีตามหมวดหมู่">
            <For each={tabs()}>
              {(tab) => (
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab() === tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  classList={{
                    "bg-brand-pink text-white border-brand-pink": activeTab() === tab.id,
                    "bg-white text-brand-pink border-brand-pink": activeTab() !== tab.id,
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
        <ProductRail products={filtered()} rows={2} swipe />
      </Container>
    </section>
  );
}
