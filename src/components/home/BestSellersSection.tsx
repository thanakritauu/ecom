import { createMemo, createSignal, For } from "solid-js";
import { Container } from "../shared/Container";
import { SectionHeader } from "../shared/SectionHeader";
import { ProductRail } from "../shared/ProductRail";
import { isBestSeller, productFilterTabs } from "~/lib/products";
import { useProductCatalog } from "~/lib/productCatalog";

export function BestSellersSection() {
  const catalog = useProductCatalog();
  const [activeTab, setActiveTab] = createSignal<(typeof productFilterTabs)[number]["id"]>("all");

  const bestSellers = createMemo(() => catalog.products().filter(isBestSeller));
  const filtered = createMemo(() =>
    activeTab() === "all"
      ? bestSellers()
      : bestSellers().filter((p) => p.category === activeTab()),
  );

  return (
    <section aria-labelledby="best-sellers-heading" class="py-10 lg:py-16">
      <Container width="wide" class="flex flex-col gap-6">
        <SectionHeader title="สินค้าขายดี" href="/best-sellers" headingId="best-sellers-heading">
          <div class="scroll-rail !mx-0 !px-0" role="tablist" aria-label="กรองสินค้าขายดีตามหมวดหมู่">
            <For each={productFilterTabs}>
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
                  class="flex min-h-[44px] shrink-0 items-center rounded-pill border px-6 py-1 text-base font-medium whitespace-nowrap"
                >
                  {tab.label}
                </button>
              )}
            </For>
          </div>
        </SectionHeader>
        <p class="sr-only" aria-live="polite">
          แสดงสินค้า {filtered().length} รายการ
        </p>
        <ProductRail products={filtered()} columns={5} />
      </Container>
    </section>
  );
}
