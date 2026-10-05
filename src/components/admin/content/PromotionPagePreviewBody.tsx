import { createMemo, Show } from "solid-js";
import { useSectionProducts } from "~/components/home/HomepageSections";
import { ListingHeading } from "~/components/products/ListingHeading";
import { ProductCollectionListing } from "~/components/products/ProductCollectionListing";
import { ResponsiveBanner } from "~/components/shared/ResponsiveBanner";
import { extractYoutubeVideoId, type HomepageSection } from "~/lib/pageSections";
import type { PromotionPageBanners, PromotionPageProductRef } from "~/lib/adminContent";
import { useProductCatalog } from "~/lib/productCatalog";

/**
 * Storefront sync — `PromotionPageView.tsx` renders a page one of two ways,
 * and this mirrors which one, so the inline Live Preview never shows a
 * section-builder layout for a page customers see as a product listing:
 *
 * - Listing mode: no sections at all (flat page), or exactly one enabled
 *   Product section and no Hero (Flash Sale, ขายดี, มาใหม่, กำลังฮิต). Top
 *   media is the YouTube video when `videoUrl` is set (flat pages only),
 *   otherwise the banner; then the centred heading + the product listing.
 * - Section mode: everything else — `HomepageSectionsPreview`'s default body.
 *
 * `listingSectionOf` is the same rule `PromotionPageView` applies; the caller
 * uses it to decide whether to pass this body in at all.
 */
export function listingSectionOf(sections: HomepageSection[]): HomepageSection | undefined {
  const enabled = sections.filter((s) => s.enabled);
  const hasHero = enabled.some((s) => s.type === "hero");
  return !hasHero && enabled.length === 1 && enabled[0].type === "product" ? enabled[0] : undefined;
}

export function isListingModePage(sections: HomepageSection[]): boolean {
  return sections.length === 0 || !!listingSectionOf(sections);
}

export function PromotionPagePreviewBody(props: {
  name: string;
  title: string;
  description: string;
  banners: PromotionPageBanners;
  videoUrl: string;
  products: PromotionPageProductRef[];
  sections: HomepageSection[];
}) {
  const catalog = useProductCatalog();
  const isFlat = () => props.sections.length === 0;
  const listingSection = createMemo(() => listingSectionOf(props.sections));
  const videoId = () => (isFlat() ? extractYoutubeVideoId(props.videoUrl) : null);
  const invalidVideo = () => isFlat() && props.videoUrl.trim() !== "" && !videoId();
  const hasBanner = () => isFlat() && !!(props.banners.desktop || props.banners.tablet || props.banners.mobile);
  const flatProducts = () => catalog.getByIds(props.products.map((ref) => ref.productId));

  return (
    <>
      <Show
        when={videoId()}
        fallback={
          <Show
            when={!invalidVideo()}
            fallback={
              <div class="flex aspect-video w-full flex-col items-center justify-center gap-1 bg-ink/80 px-4 text-center text-white">
                <span class="text-2xl leading-none">▶</span>
                <span class="text-sm font-medium">ลิงก์ YouTube ไม่ถูกต้อง — หน้าร้านจะแสดงแบนเนอร์แทน</span>
              </div>
            }
          >
            <Show when={hasBanner()}>
              <div class="w-full overflow-hidden bg-surface-gray/40">
                <ResponsiveBanner banners={props.banners} alt={props.title || props.name} />
              </div>
            </Show>
          </Show>
        }
      >
        {(id) => (
          <div class="aspect-video w-full bg-ink">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${id()}?rel=0&playsinline=1`}
              title={props.title || props.name}
              class="size-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen
            />
          </div>
        )}
      </Show>

      <div class="flex flex-col gap-3 bg-white px-3 pb-6 pt-6 sm:gap-4">
        <Show
          when={listingSection()}
          keyed
          fallback={
            <>
              <ListingHeading title={props.title || props.name || "Title"} description={props.description} />
              <ProductCollectionListing products={flatProducts()} />
            </>
          }
        >
          {(section) => <SectionListingPreview section={section} />}
        </Show>
      </div>
    </>
  );
}

/** Keyed by the section object, so every in-form edit remounts it and `useSectionProducts` re-reads the current source. */
function SectionListingPreview(props: { section: HomepageSection }) {
  const products = useSectionProducts(props.section);
  return (
    <>
      <ListingHeading title={props.section.title || props.section.name} description={props.section.description} />
      <ProductCollectionListing products={products()} />
    </>
  );
}
