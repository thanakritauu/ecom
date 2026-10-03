import { Show } from "solid-js";
import { Dynamic } from "solid-js/web";
import { Carousel } from "../shared/Carousel";
import { Artwork } from "../shared/Artwork";
import { Button } from "../shared/Button";
import { useHomepageContent } from "~/lib/homepageContent";
import { useStorefrontDestinationLookups } from "~/lib/storefrontDestinationLookups";
import { resolveHomepageDestinationHref, getYoutubeEmbedUrl, type HomepageSection, type HeroAsset } from "~/lib/adminHomepage";
import heroBanner1Desktop from "~/assets/images/hero/hero-banner-1-desktop.webp";
import heroBanner1Tablet from "~/assets/images/hero/hero-banner-1-tablet.webp";
import heroBanner1Mobile from "~/assets/images/hero/hero-banner-1-mobile.webp";
import heroJuicyCheekDesktop from "~/assets/images/hero/hero-banner-2-desktop.webp";
import heroJuicyCheekTablet from "~/assets/images/hero/hero-banner-2-tablet.webp";
import heroJuicyCheekMobile from "~/assets/images/hero/hero-banner-2-mobile.webp";
import heroAcneBalanceDesktop from "~/assets/images/hero/hero-banner-3-desktop.webp";
import heroAcneBalanceTablet from "~/assets/images/hero/hero-banner-3-tablet.webp";
import heroAcneBalanceMobile from "~/assets/images/hero/hero-banner-3-mobile.webp";
import { BANNER_ASPECT_CLASS } from "~/components/shared/ResponsiveBanner";

/**
 * Each Hero frame is one flattened photo with its headline baked in — per
 * the direction doc we treat that as a single media asset rather than
 * pulling text back out of it. Only the first slide is `loading="eager"`
 * (it's the one visible on load); the rest lazy-load like any other
 * below-the-fold-ish image since they're just one swipe/autoplay-tick away.
 *
 * Hero Banner — Responsive Artwork (Phase 01 Update). This project's own
 * Desktop/Tablet/Mobile box shapes — 3:1 / 4:3 / 3:4 — not one ratio shrunk
 * by width at every size. All three default slides (iconic-glow, juicy-cheek,
 * acne-balance) now have real Design-provided crops at exactly this
 * standard's own sizes (1920×640 / 1024×768 / 750×1000) — with image ratio
 * == box ratio at every breakpoint, `objectFit="contain"` and `cover` render
 * pixel-identical (no letterboxing to begin with), so every slide shares the
 * same `objectFit` with no per-slide special case. The former
 * "kiss-signal-gloss" slide (one flattened photo, no responsive crops) was
 * dropped per explicit request rather than carried forward.
 */
const HERO_ASPECT_CLASS = BANNER_ASPECT_CLASS;

const heroSlides = [
  {
    id: "iconic-glow",
    content: (
      <Artwork
        kind="image"
        src={heroBanner1Desktop}
        tabletSrc={heroBanner1Tablet}
        mobileSrc={heroBanner1Mobile}
        alt="Charmiss Charming Iconic Glow Cushion SPF50+ PA++++ — ผิวน้ำกลิ้ง โกลว์เรียกแสง คุชชั่นผิวฉ่ำ สูตรใหม่"
        loading="eager"
        objectFit="contain"
        class={HERO_ASPECT_CLASS}
      />
    ),
  },
  {
    id: "juicy-cheek",
    content: (
      <Artwork
        kind="image"
        src={heroJuicyCheekDesktop}
        tabletSrc={heroJuicyCheekTablet}
        mobileSrc={heroJuicyCheekMobile}
        alt="Charmiss Juicy Cheek Cushion Blush SPF15 PA+++ — แท็บซ้ำ ไม่กินรองพื้น #คุชชั่นบลัชไอคอล"
        loading="lazy"
        objectFit="contain"
        class={HERO_ASPECT_CLASS}
      />
    ),
  },
  {
    id: "acne-balance",
    content: (
      <Artwork
        kind="image"
        src={heroAcneBalanceDesktop}
        tabletSrc={heroAcneBalanceTablet}
        mobileSrc={heroAcneBalanceMobile}
        alt="Charmiss Acne Balance Toner Pad — แพดจบสิว กู้ผิวไบรท์ #โทนเนอร์แพดชาร์มิส"
        loading="lazy"
        objectFit="contain"
        class={HERO_ASPECT_CLASS}
      />
    ),
  },
];

/**
 * §8/§10/§23 — an admin `hero`-type section (enabled, in Published content)
 * becomes one carousel slide, image + a text/CTA overlay built from its
 * Title/Description/CTA fields; the original three flattened-photo slides
 * above stay completely untouched and are only used as the fallback when
 * there are zero enabled hero sections — so a homepage nobody has edited
 * yet looks exactly as it always has.
 */
/**
 * `headingLevel` — Landing Page Frontend Polish §17/§35: a page rendered
 * through the Section Builder has no other page-level heading, so its Hero
 * (when present) must be the document's one `<h1>`; Homepage already has no
 * page-level heading of its own either, so it keeps this prop's default
 * (`"h2"`) unchanged rather than gaining a second, redundant `<h1>`.
 */
export function AdminHeroSlide(props: { section: HomepageSection; asset?: HeroAsset; headingLevel?: "h1" | "h2" }) {
  const lookups = useStorefrontDestinationLookups();
  const href = () => resolveHomepageDestinationHref(props.section.cta.destination, lookups);
  const Heading = () => (props.headingLevel === "h1" ? "h1" : "h2");
  const alt = () => props.section.title || props.section.name;

  return (
    <div class="relative">
      <Show
        when={props.asset}
        fallback={
          <Artwork
            kind="image"
            src={props.section.banners.desktop || props.section.banners.tablet || props.section.banners.mobile}
            tabletSrc={props.section.banners.tablet || undefined}
            mobileSrc={props.section.banners.mobile || undefined}
            alt={alt()}
            objectFit="contain"
            class={HERO_ASPECT_CLASS}
          />
        }
      >
        {(asset) => (
          <Show
            when={asset().type === "youtube"}
            fallback={
              <Show
                when={asset().type === "video"}
                fallback={
                  <Artwork
                    kind="image"
                    src={asset().source}
                    tabletSrc={asset().tabletSource || undefined}
                    mobileSrc={asset().mobileSource || undefined}
                    alt={alt()}
                    objectFit="contain"
                    class={HERO_ASPECT_CLASS}
                  />
                }
              >
                <Artwork kind="video" src={asset().source} poster="" fallbackImage={props.section.banners.desktop || ""} alt={alt()} objectFit="contain" class={HERO_ASPECT_CLASS} />
              </Show>
            }
          >
            <Artwork kind="youtube" src={getYoutubeEmbedUrl(asset().source) ?? ""} alt={alt()} objectFit="contain" class={HERO_ASPECT_CLASS} />
          </Show>
        )}
      </Show>
      <Show when={props.section.eyebrow || props.section.title || props.section.description || (href() && props.section.cta.label)}>
        <div class="absolute inset-x-0 bottom-0 flex flex-col items-start gap-2 bg-gradient-to-t from-ink/60 to-transparent p-4 text-white sm:p-8">
          <Show when={props.section.eyebrow}>
            <p class="text-xs font-semibold uppercase tracking-wide sm:text-sm">{props.section.eyebrow}</p>
          </Show>
          <Show when={props.section.title}>
            <Dynamic component={Heading()} class="text-lg font-bold sm:text-2xl">
              {props.section.title}
            </Dynamic>
          </Show>
          <Show when={props.section.description}>
            <p class="max-w-md text-sm sm:text-base">{props.section.description}</p>
          </Show>
          <Show when={href() && props.section.cta.label}>
            <Button href={href()!} variant="white" size="sm">
              {props.section.cta.label}
            </Button>
          </Show>
        </div>
      </Show>
    </div>
  );
}

export function HeroBanner() {
  const homepage = useHomepageContent();
  const heroSections = () => homepage.sections().filter((s) => s.type === "hero" && s.enabled);
  /** A section with `assets` populated contributes one carousel slide per asset (Hero Banner — Multi-Asset Support); a section with none falls back to its legacy single `banners` image, unchanged. */
  const slides = () =>
    heroSections().length > 0
      ? heroSections().flatMap((s) =>
          s.assets.length > 0
            ? s.assets.map((asset) => ({ id: `${s.id}-${asset.id}`, content: <AdminHeroSlide section={s} asset={asset} /> }))
            : [{ id: s.id, content: <AdminHeroSlide section={s} /> }],
        )
      : heroSlides;

  return (
    <section aria-label="โปรโมชั่นเด่น">
      <Carousel slides={slides()} label="แบนเนอร์โปรโมชั่นหลัก" autoPlay={6000} />
    </section>
  );
}
