import { Show } from "solid-js";
import { A } from "@solidjs/router";
import { Header } from "~/components/shared/Header";
import { Footer } from "~/components/shared/Footer";
import { Container } from "~/components/shared/Container";
import { AdminHeroSlide } from "~/components/home/HeroBanner";
import { HomepageSections, useSectionProducts } from "~/components/home/HomepageSections";
import { ListingHeading } from "~/components/products/ListingHeading";
import { ProductCollectionListing } from "~/components/products/ProductCollectionListing";
import type { HomepageSection } from "~/lib/pageSections";
import { useProductCatalog } from "~/lib/productCatalog";
import type { PromotionPage } from "~/lib/adminContent";
import { ResponsiveBanner } from "~/components/shared/ResponsiveBanner";

/**
 * §14/§18/§20 — the real customer-facing Landing Page. Two rendering paths,
 * chosen purely by whether `page.sections` has anything in it (never a
 * separate "which renderer" flag an admin has to set):
 *
 * - `sections.length === 0` (every page created before the Section Builder
 *   existed): flat Hero Banner → centred Title + Description → the shared
 *   product listing (view/sort + grid), same as every nav page.
 * - exactly one enabled product section and no hero (Flash Sale, ขายดี,
 *   มาใหม่, กำลังฮิต): the same listing layout, fed by that section.
 * - `sections.length > 0`: renders via `HomepageSections` — the *exact* same
 *   renderer the real Homepage uses ("Admin Preview ≈ Frontend Render",
 *   §18, extended to the real page too) — with an enabled `hero`-type
 *   Section (via `AdminHeroSlide`) taking over the top banner instead of the
 *   flat `banners` field. The flat fields stay in the data (never deleted)
 *   but go unused once a page adopts the Section Builder, so switching back
 *   is just deleting the sections again.
 */
/** Video id from a YouTube watch / short / embed / youtu.be link; undefined if it isn't one. */
function youtubeId(url: string): string | undefined {
  const match = url.trim().match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return match?.[1];
}

/** The one product section's products, title and intro, as a listing. */
function SectionListing(props: { section: HomepageSection }) {
  const products = useSectionProducts(props.section);
  return (
    <>
      <ListingHeading title={props.section.title || props.section.name} description={props.section.description} />
      <ProductCollectionListing products={products()} flashSale={props.section.productSource === "flash_sale"} />
    </>
  );
}

export function PromotionPageView(props: { page: PromotionPage }) {
  const p = () => props.page;
  const catalog = useProductCatalog();
  const hasSections = () => p().sections.length > 0;
  const heroSection = () => p().sections.find((s) => s.type === "hero" && s.enabled);
  const products = () => catalog.getByIds(p().products.map((ref) => ref.productId));
  // A page that is just one product section (Flash Sale, ขายดี, มาใหม่, กำลังฮิต) is a product listing, not a section-built page.
  const listingSection = () => {
    const enabled = p().sections.filter((s) => s.enabled);
    return !heroSection() && enabled.length === 1 && enabled[0].type === "product" ? enabled[0] : undefined;
  };

  return (
    <>
      <Header />
      <Show
        when={hasSections() && !listingSection()}
        fallback={
          <>
            {/* A YouTube video takes the banner's place (the banner stays saved, just hidden). */}
            <Show
              when={!hasSections() && youtubeId(p().videoUrl)}
              fallback={
                <Show when={!hasSections() && (p().banners.desktop || p().banners.tablet || p().banners.mobile)}>
                  <div class="w-full overflow-hidden bg-surface-gray/40">
                    <ResponsiveBanner banners={p().banners} alt={p().title || p().name} loading="eager" />
                  </div>
                </Show>
              }
            >
              {(id) => (
                <div class="aspect-video w-full bg-ink">
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${id()}?rel=0&playsinline=1`}
                    title={p().title || p().name}
                    class="size-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowfullscreen
                  />
                </div>
              )}
            </Show>

            {/* Listing layout (same as every nav page): centred heading + intro, then view/sort, then the products. */}
            <main class="flex flex-col overflow-x-hidden bg-white pb-6 pt-6 sm:pt-8 lg:pt-10">
              <Container width="wide" class="flex flex-col gap-3 sm:gap-4">
                <Show
                  when={listingSection()}
                  fallback={
                    <>
                      <ListingHeading title={p().title || p().name} description={p().description} />
                      <ProductCollectionListing products={products()} />
                    </>
                  }
                >
                  {(section) => <SectionListing section={section()} />}
                </Show>
              </Container>
            </main>
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
