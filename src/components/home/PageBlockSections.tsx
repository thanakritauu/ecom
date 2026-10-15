import { createMemo, createSignal, For, onCleanup, onMount, Show, type JSX } from "solid-js";
import { A } from "@solidjs/router";
import { Container } from "../shared/Container";
import { Carousel } from "../shared/Carousel";
import { MediaView } from "../shared/MediaView";
import { CountdownTimer } from "../shared/CountdownTimer";
import { ProductCard } from "../shared/ProductCard";
import { ChevronIcon } from "../shared/ChevronIcon";
import { Button } from "../shared/Button";
import { useStorefrontDestinationLookups } from "~/lib/storefrontDestinationLookups";
import { useProductCatalog } from "~/lib/productCatalog";
import { hasMedia } from "~/lib/media";
import {
  countdownEndsAtMs,
  countdownSettings,
  dividerSettings,
  gridSettings,
  productGridSettings,
  resolveHomepageDestinationHref,
  sliderSettings,
  type DividerSize,
  type HomepageDestination,
  type HomepageSection,
  type ProductGridColumns,
  type SectionMediaItem,
} from "~/lib/pageSections";

/**
 * Storefront renderers for the page-builder section types (`banner_slider`,
 * `banner_grid`, `countdown_banner`, `product_grid`, `divider`). Mounted by
 * `HomepageSections`, so the homepage, หน้าแคมเปญ and every admin preview
 * render them the same way.
 */

function useHref() {
  const lookups = useStorefrontDestinationLookups();
  return (destination: HomepageDestination) => resolveHomepageDestinationHref(destination, lookups);
}

/** Wraps `children` in a link when `href` resolves, a plain box otherwise. */
function MaybeLink(props: { href?: string; label: string; class?: string; children: JSX.Element }) {
  return (
    <Show when={props.href} fallback={<div class={props.class}>{props.children}</div>}>
      {(href) => (
        <A href={href()} aria-label={props.label} class={`block ${props.class ?? ""}`}>
          {props.children}
        </A>
      )}
    </Show>
  );
}

/** One picture/video boxed at `ratio` (width / height), never cropped: anything of another shape sits centred on the neutral background. */
function MediaBox(props: { item: SectionMediaItem; ratio: number; alt: string; eager?: boolean }) {
  return (
    <div class="relative w-full bg-surface-gray" style={{ "aspect-ratio": String(props.ratio) }}>
      <MediaView media={props.item.media} alt={props.alt} objectFit="contain" loading={props.eager ? "eager" : "lazy"} class="absolute inset-0" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* แบนเนอร์สไลด์                                                        */
/* ------------------------------------------------------------------ */

/**
 * Full content width; the slider's height is fixed by the FIRST slide's own
 * aspect ratio (measured in admin when the file was chosen), so the page
 * never jumps between slides. Other shapes are contained, not cropped.
 * Swipe is the shared `Carousel`'s native scroll-snap; its autoplay already
 * pauses on hover/touch/focus and never runs under prefers-reduced-motion.
 */
export function BannerSliderBlock(props: { section: HomepageSection }) {
  const href = useHref();
  const settings = () => sliderSettings(props.section);
  const slides = () => settings().slides.filter((slide) => hasMedia(slide.media));
  const ratio = () => slides()[0]?.aspect || 16 / 9;
  const label = () => props.section.title || props.section.name || "แบนเนอร์";
  const altOf = (slide: SectionMediaItem) => slide.alt || label();
  const slideContent = (slide: SectionMediaItem, index: number) => (
    <MaybeLink href={href(slide.destination)} label={altOf(slide)}>
      <MediaBox item={slide} ratio={ratio()} alt={altOf(slide)} eager={index === 0} />
    </MaybeLink>
  );
  // Built once per slide list (Carousel reads `slides` several times).
  const carouselSlides = createMemo(() => slides().map((slide, i) => ({ id: slide.id, content: slideContent(slide, i) })));

  return (
    <Show when={slides().length > 0}>
      <section class="py-6 sm:py-8 lg:py-10">
        <Container width="wide">
          <div class="overflow-hidden rounded-card bg-surface-gray">
            <Show when={slides().length > 1} fallback={slideContent(slides()[0], 0)}>
              {/* Keyed on the options so an admin preview picks up autoplay changes (Carousel reads them on mount). */}
              <Show when={`${settings().autoplay}-${settings().intervalSeconds}`} keyed>
                {(_key) => (
                  <Carousel
                    label={label()}
                    showDots={settings().showDots}
                    showArrows={settings().showArrows}
                    autoPlay={settings().autoplay ? settings().intervalSeconds * 1000 : false}
                    slides={carouselSlides()}
                  />
                )}
              </Show>
            </Show>
          </div>
        </Container>
      </section>
    </Show>
  );
}

/* ------------------------------------------------------------------ */
/* แบนเนอร์หลายรูป                                                      */
/* ------------------------------------------------------------------ */

/**
 * 2 or 3 tiles in one row, all boxed at the first tile's ratio (contained,
 * never cropped). Mobile: 2 columns stay 2 columns; 3 columns turn into a
 * sideways swipe rail (one big tile + a peek of the next) from below `md`,
 * since three tiles in a 375px row are too small to read.
 */
export function BannerGridBlock(props: { section: HomepageSection }) {
  const href = useHref();
  const settings = () => gridSettings(props.section);
  const tiles = () => settings().tiles.slice(0, settings().columns).filter((tile) => hasMedia(tile.media));
  const ratio = () => tiles()[0]?.aspect || 1;
  const threeUp = () => settings().columns === 3;
  const altOf = (tile: SectionMediaItem) => tile.alt || props.section.title || props.section.name || "แบนเนอร์";

  return (
    <Show when={tiles().length > 0}>
      <section class="py-6 sm:py-8 lg:py-10">
        <Container width="wide">
          <div
            classList={{
              "grid grid-cols-2 gap-3 sm:gap-4 lg:gap-6": !threeUp(),
              "scroll-rail md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0 lg:gap-6": threeUp(),
            }}
          >
            <For each={tiles()}>
              {(tile) => (
                <MaybeLink
                  href={href(tile.destination)}
                  label={altOf(tile)}
                  class={`overflow-hidden rounded-card transition-opacity duration-150 lg:hover:opacity-90 ${threeUp() ? "w-[72%] max-w-[360px] md:w-auto md:max-w-none" : ""}`}
                >
                  <MediaBox item={tile} ratio={ratio()} alt={altOf(tile)} />
                </MaybeLink>
              )}
            </For>
          </div>
        </Container>
      </section>
    </Show>
  );
}

/* ------------------------------------------------------------------ */
/* แบนเนอร์นับถอยหลัง                                                   */
/* ------------------------------------------------------------------ */

/**
 * Title, subtitle, the Flash Sale's boxed HH:MM:SS timer and a CTA, on the
 * uploaded image (darkened for legibility) or the brand pink. When the time
 * is up it hides itself, or swaps the timer for the admin's "หมดเวลาแล้ว"
 * text. An empty/invalid end time counts as ended.
 */
export function CountdownBannerBlock(props: { section: HomepageSection }) {
  const href = useHref();
  const settings = () => countdownSettings(props.section);
  const endsAt = () => countdownEndsAtMs(settings().endsAt);
  const [now, setNow] = createSignal(Date.now());
  onMount(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    onCleanup(() => clearInterval(id));
  });
  const ended = () => !Number.isFinite(endsAt()) || endsAt() <= now();
  const visible = () => !ended() || settings().afterEnd === "message";
  const useImage = () => settings().background === "image" && !!settings().image;
  const ctaHref = () => href(props.section.cta.destination);

  return (
    <Show when={visible()}>
      <section class="py-6 sm:py-8 lg:py-10">
        <Container width="wide">
          <div class="relative overflow-hidden rounded-card" classList={{ "bg-gradient-to-br from-[#f42b59] to-brand-pink": !useImage(), "bg-ink": useImage() }}>
            <Show when={useImage()}>
              <img src={settings().image} alt="" loading="lazy" class="absolute inset-0 size-full object-cover" />
              <div aria-hidden="true" class="absolute inset-0 bg-black/40" />
            </Show>
            <div class="relative flex min-h-[220px] flex-col items-center justify-center gap-3 px-6 py-8 text-center text-white sm:min-h-[260px] lg:min-h-[320px] lg:gap-4 lg:py-10">
              <Show when={props.section.title}>
                <h2 class="text-[22px] font-bold leading-[1.4] sm:text-2xl lg:text-[28px]">{props.section.title}</h2>
              </Show>
              <Show when={props.section.description}>
                <p class="max-w-xl text-sm leading-[1.75] text-white/90 sm:text-base">{props.section.description}</p>
              </Show>
              <Show
                when={!ended()}
                fallback={<p class="rounded-pill bg-white/20 px-4 py-1.5 text-base font-medium">{settings().endedText || "หมดเวลาแล้ว"}</p>}
              >
                <CountdownTimer endsAt={endsAt()} size="full" label="เหลือเวลา" />
              </Show>
              <Show when={ctaHref() && props.section.cta.label}>
                <Button href={ctaHref()!} variant="white" class="mt-1">
                  {props.section.cta.label}
                </Button>
              </Show>
            </div>
          </div>
        </Container>
      </section>
    </Show>
  );
}

/* ------------------------------------------------------------------ */
/* การ์ดสินค้า                                                          */
/* ------------------------------------------------------------------ */

const GRID_COLUMNS_CLASS: Record<ProductGridColumns, string> = {
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
  4: "md:grid-cols-3 lg:grid-cols-4",
  5: "md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
};

/** Rail card width on desktop: exactly `columns` cards across (rail gap is 16px). */
const RAIL_ITEM_CLASS: Record<ProductGridColumns, string> = {
  2: "lg:w-[calc((100%-1rem)/2)]",
  3: "lg:w-[calc((100%-2rem)/3)]",
  4: "lg:w-[calc((100%-3rem)/4)]",
  5: "lg:w-[calc((100%-4rem)/5)]",
};

/**
 * Hand-picked products (product or SKU level, in the admin's order) on the
 * real storefront `ProductCard`, so flash / promo prices from the catalog
 * show as everywhere else. A SKU-level pick opens the card on that option.
 * Products that are no longer on sale drop out; with none left the section
 * hides.
 */
export function ProductGridBlock(props: { section: HomepageSection }) {
  const href = useHref();
  const catalog = useProductCatalog();
  const settings = () => productGridSettings(props.section);
  const items = createMemo(() =>
    props.section.products.flatMap((ref) => {
      const product = catalog.getById(ref.productId);
      return product ? [{ product, variantId: ref.variantIds[0] as string | undefined }] : [];
    }),
  );
  const shown = () => {
    const s = settings();
    return s.layout === "grid" && s.maxRows > 0 ? items().slice(0, s.maxRows * s.columns) : items();
  };
  const viewAllHref = () => href(props.section.cta.destination);
  const viewAllLabel = () => props.section.cta.label.trim() || "ดูทั้งหมด";
  let railRef: HTMLDivElement | undefined;
  const scrollRail = (dir: -1 | 1) => railRef?.scrollBy({ left: dir * railRef.clientWidth * 0.8, behavior: "smooth" });

  return (
    <Show when={items().length > 0}>
      <section class="py-6 sm:py-8 lg:py-10">
        <Container width="wide" class="flex flex-col gap-3 sm:gap-4">
          <Show when={props.section.title || viewAllHref()}>
            <div class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4">
              <h2 class="min-w-0 text-[22px] font-bold leading-[normal] text-ink sm:text-[24px] lg:text-[28px]">{props.section.title}</h2>
              <Show when={viewAllHref()}>
                <A href={viewAllHref()!} class="flex min-h-[44px] items-center gap-1 whitespace-nowrap text-base text-ink lg:hover:text-brand-pink sm:text-lg">
                  {viewAllLabel()}
                  <ChevronIcon direction="right" class="size-5 sm:size-6" />
                </A>
              </Show>
            </div>
          </Show>

          <Show
            when={settings().layout === "rail"}
            fallback={
              <div class={`grid grid-cols-2 gap-3 sm:gap-4 lg:gap-5 xl:gap-6 ${GRID_COLUMNS_CLASS[settings().columns]}`}>
                <For each={shown()}>{(item) => <ProductCard product={item.product} initialVariantId={item.variantId} />}</For>
              </div>
            }
          >
            <div class="relative">
              {/* pt-2/pb-3 keep the cards' shadow inside the scroll box (it clips both axes), negative margins keep the layout spacing. */}
              <div ref={railRef} class="scroll-rail -mb-3 -mt-2 pb-3 pt-2 scroll-smooth">
                <For each={shown()}>
                  {(item) => (
                    <div class={`w-[44%] min-w-[150px] max-w-[260px] md:w-[30%] lg:max-w-none ${RAIL_ITEM_CLASS[settings().columns]}`}>
                      <ProductCard product={item.product} initialVariantId={item.variantId} />
                    </div>
                  )}
                </For>
              </div>
              <Show when={shown().length > settings().columns}>
                <div class="pointer-events-none absolute inset-x-0 top-1/3 hidden items-center justify-between lg:flex">
                  <button type="button" onClick={() => scrollRail(-1)} aria-label="สินค้าก่อนหน้า" class="pointer-events-auto -ml-5 flex size-11 items-center justify-center rounded-pill bg-white/50 text-ink shadow-card backdrop-blur-sm transition-colors duration-200 lg:hover:bg-white/80">
                    <ChevronIcon direction="left" />
                  </button>
                  <button type="button" onClick={() => scrollRail(1)} aria-label="สินค้าถัดไป" class="pointer-events-auto -mr-5 flex size-11 items-center justify-center rounded-pill bg-white/50 text-ink shadow-card backdrop-blur-sm transition-colors duration-200 lg:hover:bg-white/80">
                    <ChevronIcon direction="right" />
                  </button>
                </div>
              </Show>
            </div>
          </Show>
        </Container>
      </section>
    </Show>
  );
}

/* ------------------------------------------------------------------ */
/* เส้นคั่น / ระยะห่าง                                                  */
/* ------------------------------------------------------------------ */

/** Total height S 16 / M 32 / L 64px on mobile, 24 / 48 / 96px from `sm`. */
const DIVIDER_SPACE_CLASS: Record<DividerSize, string> = {
  s: "py-2 sm:py-3",
  m: "py-4 sm:py-6",
  l: "py-8 sm:py-12",
};

export function DividerBlock(props: { section: HomepageSection }) {
  const settings = () => dividerSettings(props.section);
  return (
    <div aria-hidden="true" class={DIVIDER_SPACE_CLASS[settings().size]}>
      <Show when={settings().line}>
        <Container width="wide">
          <hr class="border-t border-border" />
        </Container>
      </Show>
    </div>
  );
}
