import { For, Show } from "solid-js";
import { A } from "@solidjs/router";
import { Container } from "../shared/Container";
import { ProductRail } from "../shared/ProductRail";
import { ProductCard } from "../shared/ProductCard";
import { Button } from "../shared/Button";
import { isBestSeller, isFlashSale, isNewArrival, isTrending, isFeatured } from "~/lib/products";
import type { Product } from "~/lib/types";
import type { PromotionPageProductRef } from "~/lib/adminContent";
import { useStorefrontDestinationLookups } from "~/lib/storefrontDestinationLookups";
import { useProductCatalog } from "~/lib/productCatalog";
import { useCollectionContent } from "~/lib/collectionContent";
import { useCategoryContent } from "~/lib/categoryContent";
import { resolveHomepageDestinationHref, type HomepageSection, type HomepageProductSource, type HomepageDestination } from "~/lib/adminHomepage";
import { ResponsiveBanner } from "~/components/shared/ResponsiveBanner";
import { ResponsiveMedia } from "~/components/shared/MediaView";
import { EmptyState } from "~/components/shared/EmptyState";
import { FlashSaleSection } from "./FlashSaleSection";
import { BestSellersSection } from "./BestSellersSection";
import { CouponSection } from "./CouponSection";
import { NewArrivalsSection } from "./NewArrivalsSection";
import { TrendingSection } from "./TrendingSection";
import { ReviewsSection } from "./ReviewsSection";
import { FAQSection } from "./FAQSection";

/** Architecture Cleanup & Source of Truth — filters the *live* Product Store list instead of pointing at a separately-curated array per source; membership itself is still the same seed-id-derived signal `~/lib/products`'s `isBestSeller`/etc. always used. */
function productsForSource(source: Exclude<HomepageProductSource, "manual" | "collection" | "category">, products: Product[]): Product[] {
  switch (source) {
    case "best_seller":
      return products.filter(isBestSeller);
    case "flash_sale":
      return products.filter(isFlashSale);
    case "new_arrival":
      return products.filter(isNewArrival);
    case "trending":
      return products.filter(isTrending);
    case "featured":
      return products.filter(isFeatured);
  }
}

function resolveProductRefs(refs: PromotionPageProductRef[], catalog: ReturnType<typeof useProductCatalog>): Product[] {
  return catalog.getByIds(refs.map((ref) => ref.productId));
}

/** §22/§23 — the one renderer both the real storefront and the Admin Preview dialog use, so what Admin previews is byte-for-byte what ships. `hero` sections aren't handled here — `HeroBanner.tsx` reads those directly as its carousel slide list. Built-in types (Flash Sale ... FAQ) render their own home component. */
export function HomepageSections(props: {
  sections: HomepageSection[];
  /** Caps every Product section at this many rows of 5 cards — set by the storefront Homepage only; Landing Pages/Admin previews leave it unset and show every product. */
  productRows?: number;
  /** Home only — product rows swipe sideways on mobile/tablet; everywhere else they're a 2-column grid. */
  swipe?: boolean;
  /**
   * Home only — a product section with no products hides entirely (an empty merchandising rail on Home reads as broken).
   * Landing Pages and Admin previews keep the section and show the shared empty state instead.
   */
  hideEmptyProductSections?: boolean;
}) {
  const visible = () => props.sections.filter((s) => s.enabled && s.type !== "hero");
  return (
    <For each={visible()}>
      {(section) => (
        <HomepageSectionBlock section={section} productRows={props.productRows} swipe={props.swipe} hideEmptyProductSections={props.hideEmptyProductSections} />
      )}
    </For>
  );
}

function useDestinationHref(destination: HomepageDestination) {
  const lookups = useStorefrontDestinationLookups();
  return resolveHomepageDestinationHref(destination, lookups);
}

/**
 * §10.5/§10.6/§6/§31 — "product" sections with `productSource: "collection"`
 * resolve their list live from `~/lib/adminCollections`'s data (via the
 * read-only storefront provider), and `"category"` resolves live from the
 * Product Catalog filtered by `categoryId` (`useProductCatalog().getByCategory`)
 * — neither ever copies a product id array into the section itself; every
 * other source behaves exactly as Phase 10.2 already had it.
 *
 * Landing Page Frontend Polish §28 / §32 — a `collectionId`/`categoryId`
 * that no longer resolves (deleted Category, deleted/unpublished Collection)
 * never crashes the section; it just falls back to an empty list, and —
 * dev-build only — logs a warning so the gap is visible to whoever is
 * editing content, without any user-facing error.
 */
export function useSectionProducts(section: HomepageSection) {
  const collections = useCollectionContent();
  const categories = useCategoryContent();
  const catalog = useProductCatalog();
  return () => {
    if (section.type !== "product") return resolveProductRefs(section.products, catalog);
    if (section.productSource === "collection") {
      const collection = collections.getUsableById(section.collectionId);
      if (!collection && section.collectionId && import.meta.env.DEV) {
        console.warn(`[LandingPage] Section "${section.name}" references missing/unpublished Product Collection "${section.collectionId}"`);
      }
      return collection ? resolveProductRefs(collection.products, catalog) : [];
    }
    if (section.productSource === "category") {
      const category = categories.getById(section.categoryId);
      if (!category && section.categoryId && import.meta.env.DEV) {
        console.warn(`[LandingPage] Section "${section.name}" references a missing Category "${section.categoryId}"`);
      }
      return category ? catalog.getByCategory(category.id) : [];
    }
    if (section.productSource !== "manual") return productsForSource(section.productSource, catalog.products());
    return resolveProductRefs(section.products, catalog);
  };
}

function HomepageSectionBlock(props: { section: HomepageSection; productRows?: number; swipe?: boolean; hideEmptyProductSections?: boolean }) {
  switch (props.section.type) {
    case "product":
      return <ProductSectionBlock section={props.section} productRows={props.productRows} swipe={props.swipe} hideEmpty={props.hideEmptyProductSections} />;
    case "promotion_banner":
      return <PromotionBannerBlock section={props.section} />;
    case "content":
      return <ContentSectionBlock section={props.section} />;
    case "cta":
      return <CtaSectionBlock section={props.section} />;
    // Built-in blocks: the existing components, pulling their own data; only the heading can be overridden.
    case "flash_sale":
      return <FlashSaleSection />;
    case "best_sellers":
      return <BestSellersSection title={props.section.title} />;
    case "coupons":
      return <CouponSection title={props.section.title} />;
    case "new_arrivals":
      return <NewArrivalsSection title={props.section.title} />;
    case "trending":
      return <TrendingSection title={props.section.title} />;
    case "reviews":
      return <ReviewsSection title={props.section.title} />;
    case "faq":
      return <FAQSection title={props.section.title} />;
    default:
      return null;
  }
}

/**
 * §10/§11 (Product Collection) vs §12/§13 (Product Grid) — same `"product"`
 * section type and the same `ProductCard`, but two different layouts chosen
 * by `productSource`: `"manual"` (a Product Grid — a hand-picked, usually
 * larger, flat list) gets a plain responsive CSS grid (2 columns on mobile,
 * per §13), while `"collection"` and every auto-curated source (a Product
 * Collection showcase) keeps the existing `ProductRail` — grid on tablet/
 * desktop, horizontal swipeable rail on mobile, per §11.
 */
function ProductSectionBlock(props: { section: HomepageSection; productRows?: number; swipe?: boolean; hideEmpty?: boolean }) {
  const products = useSectionProducts(props.section);
  const gridProducts = () => (props.productRows ? products().slice(0, props.productRows * 5) : products());
  const href = () => useDestinationHref(props.section.cta.destination);
  const isGrid = () => props.section.productSource === "manual";
  const flashSale = () => props.section.productSource === "flash_sale";
  const emptyMessage = () => {
    if (props.section.productSource === "collection") return "ยังไม่มีสินค้าในคอลเลกชันนี้";
    if (props.section.productSource === "category") return "ยังไม่มีสินค้าในหมวดหมู่นี้";
    return "ยังไม่มีสินค้าในส่วนนี้";
  };

  return (
    <Show when={products().length > 0 || !props.hideEmpty}>
      <section class="py-6 sm:py-8 lg:py-10">
        <Container width="wide" class="flex flex-col gap-3 sm:gap-4">
          {/* Figma 124:6380 — title 32px Bold, centered (24 / 28px below lg, still centered) */}
          <div class="flex flex-col items-center gap-1 text-center">
            <Show when={props.section.eyebrow}>
              <p class="text-xs font-semibold uppercase tracking-wide text-brand-pink sm:text-sm">{props.section.eyebrow}</p>
            </Show>
            <h2 class="text-2xl font-bold leading-[normal] text-ink sm:text-[28px] lg:text-[32px]">{props.section.title || props.section.name}</h2>
            <Show when={props.section.description}>
              <p class="text-ink-gray">{props.section.description}</p>
            </Show>
          </div>
          <Show when={products().length > 0} fallback={<EmptyState size="compact" title={emptyMessage()} description="กลับมาดูใหม่เร็วๆ นี้" />}>
            <Show
              when={isGrid()}
              fallback={<ProductRail products={products()} columns={5} rows={props.productRows} swipe={props.swipe} flashSale={flashSale()} />}
            >
              <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5 xl:gap-6">
                <For each={gridProducts()}>{(product) => <ProductCard product={product} />}</For>
              </div>
            </Show>
          </Show>
          <Show when={href() && props.section.cta.label}>
            <Button href={href()!} variant="outline" class="mx-auto">
              {props.section.cta.label}
            </Button>
          </Show>
        </Container>
      </section>
    </Show>
  );
}

function BannerPicture(props: { banners: HomepageSection["banners"]; alt: string; class?: string }) {
  return (
    <ResponsiveMedia media={props.banners} alt={props.alt} objectFit="cover" class={`w-full ${props.class ?? ""}`} />
  );
}

function PromotionBannerBlock(props: { section: HomepageSection }) {
  const href = () => useDestinationHref(props.section.cta.destination);
  const hasBanner = () => props.section.banners.desktop || props.section.banners.tablet || props.section.banners.mobile;

  // No banner image: no section at all (an empty padded band would leave a blank gap in the page).
  return (
    <Show when={hasBanner()}>
      <section class="py-6 sm:py-8 lg:py-10">
        <Container width="wide">
          <A href={href() ?? "#"} class="block overflow-hidden rounded-card transition-opacity duration-150 hover:opacity-90">
            <ResponsiveBanner banners={props.section.banners} alt={props.section.title || props.section.name} />
          </A>
        </Container>
      </section>
    </Show>
  );
}

/** §16 — a bare Heading/Description/Button block, no banner and no products; the plain "please do this next" section a Content section's image would otherwise force onto every use case. */
function CtaSectionBlock(props: { section: HomepageSection }) {
  const href = () => useDestinationHref(props.section.cta.destination);

  return (
    <section class="py-6 sm:py-8 lg:py-16">
      <Container width="wide" class="flex flex-col items-center gap-3 rounded-card bg-surface-pink/30 px-6 py-10 text-center">
        <Show when={props.section.eyebrow}>
          <p class="text-xs font-semibold uppercase tracking-wide text-brand-pink sm:text-sm">{props.section.eyebrow}</p>
        </Show>
        <h2 class="text-[22px] font-bold text-ink sm:text-2xl lg:text-[28px]">{props.section.title || props.section.name}</h2>
        <Show when={props.section.description}>
          <p class="max-w-xl text-ink-gray">{props.section.description}</p>
        </Show>
        <Show when={href() && props.section.cta.label}>
          <Button href={href()!} variant="primary">
            {props.section.cta.label}
          </Button>
        </Show>
      </Container>
    </section>
  );
}

/**
 * §15 — three predefined layouts, chosen by `section.contentLayout` (never a
 * freeform arrangement): "image-text" (image left on desktop, the original,
 * still-default layout — every section saved before this field existed
 * normalizes to this one, so it looks exactly as before), "text-image"
 * (mirrored — image right), and "full-width" (no side-by-side split at all:
 * banner full-bleed on top, text block centered underneath, for a
 * full-bleed editorial moment rather than an image+copy pairing).
 */
function ContentSectionBlock(props: { section: HomepageSection }) {
  const href = () => useDestinationHref(props.section.cta.destination);
  const hasBanner = () => props.section.banners.desktop || props.section.banners.tablet || props.section.banners.mobile;
  const layout = () => props.section.contentLayout;

  const textBlock = (
    <div
      class="flex flex-1 flex-col items-center gap-3 px-6 py-8 text-center"
      classList={{ "lg:items-start lg:text-left": layout() !== "full-width" }}
    >
      <Show when={props.section.eyebrow}>
        <p class="text-xs font-semibold uppercase tracking-wide text-brand-pink sm:text-sm">{props.section.eyebrow}</p>
      </Show>
      <h2 class="text-[22px] font-bold text-ink sm:text-2xl lg:text-[28px]">{props.section.title || props.section.name}</h2>
      <Show when={props.section.description}>
        <p class="text-ink-gray">{props.section.description}</p>
      </Show>
      <Show when={href() && props.section.cta.label}>
        <Button href={href()!} variant="primary">
          {props.section.cta.label}
        </Button>
      </Show>
    </div>
  );

  return (
    <section class="py-6 sm:py-8 lg:py-16">
      <Container width="wide" class="overflow-hidden rounded-card bg-surface-pink/30">
        <Show
          when={layout() === "full-width"}
          fallback={
            <div class="flex flex-col items-center gap-6 lg:flex-row" classList={{ "lg:flex-row-reverse": layout() === "text-image" }}>
              <Show when={hasBanner()}>
                <div class="w-full lg:w-1/2">
                  <BannerPicture banners={props.section.banners} alt={props.section.title || props.section.name} class="aspect-[16/9]" />
                </div>
              </Show>
              {textBlock}
            </div>
          }
        >
          <Show when={hasBanner()}>
            <BannerPicture banners={props.section.banners} alt={props.section.title || props.section.name} class="aspect-[16/9] lg:aspect-[21/9]" />
          </Show>
          {textBlock}
        </Show>
      </Container>
    </section>
  );
}
