import { For, Show } from "solid-js";
import { A } from "@solidjs/router";
import { Header } from "~/components/shared/Header";
import { Footer } from "~/components/shared/Footer";
import { Container } from "~/components/shared/Container";
import { ProductCard } from "~/components/shared/ProductCard";
import { AdminHeroSlide } from "~/components/home/HeroBanner";
import { HomepageSections } from "~/components/home/HomepageSections";
import { useProductCatalog } from "~/lib/productCatalog";
import type { PromotionPage } from "~/lib/adminContent";

/**
 * §14/§18/§20 — the real customer-facing Landing Page. Two rendering paths,
 * chosen purely by whether `page.sections` has anything in it (never a
 * separate "which renderer" flag an admin has to set):
 *
 * - `sections.length === 0` (every page created before the Section Builder
 *   existed, including all 5 migrated seeds): the original flat Hero Banner
 *   → Title → Description → Product Grid, byte-for-byte unchanged — zero
 *   behavior change for existing pages.
 * - `sections.length > 0`: renders via `HomepageSections` — the *exact* same
 *   renderer the real Homepage uses ("Admin Preview ≈ Frontend Render",
 *   §18, extended to the real page too) — with an enabled `hero`-type
 *   Section (via `AdminHeroSlide`) taking over the top banner instead of the
 *   flat `banners` field. The flat fields stay in the data (never deleted)
 *   but go unused once a page adopts the Section Builder, so switching back
 *   is just deleting the sections again.
 */
export function PromotionPageView(props: { page: PromotionPage }) {
  const p = () => props.page;
  const catalog = useProductCatalog();
  const hasSections = () => p().sections.length > 0;
  const heroSection = () => p().sections.find((s) => s.type === "hero" && s.enabled);
  const products = () => catalog.getByIds(p().products.map((ref) => ref.productId));

  return (
    <>
      <Header />
      <Show
        when={hasSections()}
        fallback={
          <>
            <Show when={p().banners.desktop || p().banners.tablet || p().banners.mobile}>
              <div class="w-full overflow-hidden bg-surface-gray/40">
                <picture>
                  <Show when={p().banners.mobile}>{(src) => <source media="(max-width: 767px)" srcset={src()} />}</Show>
                  <Show when={p().banners.tablet}>{(src) => <source media="(max-width: 1023px)" srcset={src()} />}</Show>
                  <img
                    src={p().banners.desktop || p().banners.tablet || p().banners.mobile}
                    alt={p().title || p().name}
                    class="aspect-[16/9] w-full object-cover sm:aspect-[16/6]"
                  />
                </picture>
              </div>
            </Show>

            <Container width="wide" class="flex flex-col gap-8 py-10">
              <div class="flex flex-col gap-2 text-center">
                <h1 class="text-2xl font-bold text-ink sm:text-3xl">{p().title || p().name}</h1>
                <Show when={p().description}>
                  <p class="text-ink-gray">{p().description}</p>
                </Show>
              </div>

              <Show when={products().length > 0} fallback={<p class="py-10 text-center text-ink-gray">ยังไม่มีสินค้าในหน้านี้</p>}>
                <div class="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
                  <For each={products()}>{(product) => <ProductCard product={product} variant="grid" />}</For>
                </div>
              </Show>
            </Container>
          </>
        }
      >
        <Show when={heroSection()} fallback={<h1 class="sr-only">{p().title || p().name}</h1>}>
          {(section) => <AdminHeroSlide section={section()} headingLevel="h1" />}
        </Show>
        <HomepageSections sections={p().sections} />
      </Show>
      <Footer />
    </>
  );
}

export function PromotionPageLoading() {
  return (
    <>
      <Header />
      <Container width="wide" class="flex min-h-[50vh] items-center justify-center py-20">
        <p class="text-sm text-ink-gray">กำลังโหลด...</p>
      </Container>
      <Footer />
    </>
  );
}

/** Existing Not Found shape (matches `NotFoundState` in `ProductDetailView.tsx`), just Promotion-specific copy instead of Product copy. */
export function PromotionPageNotFound(props: { slug: string }) {
  return (
    <>
      <Header />
      <Container width="wide" class="flex min-h-[50vh] flex-col items-center justify-center gap-4 py-20 text-center">
        <h1 class="text-2xl font-bold text-ink">ไม่พบโปรโมชั่นนี้</h1>
        <p class="text-ink-gray">({props.slug}) ไม่มีอยู่ หรืออาจถูกยกเลิกการเผยแพร่ไปแล้ว</p>
        <A href="/" class="text-brand-pink underline">
          กลับหน้าหลัก
        </A>
      </Container>
      <Footer />
    </>
  );
}
