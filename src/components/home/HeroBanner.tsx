import { Show } from "solid-js";
import { Dynamic } from "solid-js/web";
import { Carousel } from "../shared/Carousel";
import { Artwork } from "../shared/Artwork";
import { Button } from "../shared/Button";
import { useHomepageContent } from "~/lib/homepageContent";
import { useStorefrontDestinationLookups } from "~/lib/storefrontDestinationLookups";
import { resolveHomepageDestinationHref, type HomepageSection } from "~/lib/adminHomepage";
import heroBanner1 from "~/assets/images/hero/hero-banner-1.png";
import heroBanner2 from "~/assets/images/hero/hero-banner-2.png";
import heroBanner3 from "~/assets/images/hero/hero-banner-3.png";

/**
 * Each Hero frame is one flattened photo with its headline baked in — per
 * the direction doc we treat that as a single media asset rather than
 * pulling text back out of it. Only the first slide is `loading="eager"`
 * (it's the one visible on load); the rest lazy-load like any other
 * below-the-fold-ish image since they're just one swipe/autoplay-tick away.
 *
 * All three source photos are the same 2880×1200 (2.4:1) frame, and the box
 * is pinned to that same ratio at every breakpoint (instead of switching to
 * a taller 4:5/16:9 box on smaller screens) — so responsive resizing just
 * scales the whole banner down by width, with height following proportionally
 * and `contain` never having to crop anything to fill a mismatched box.
 */
const heroSlides = [
  {
    id: "iconic-glow",
    content: (
      <Artwork
        kind="image"
        src={heroBanner1}
        alt="Charmiss Charming Iconic Glow Cushion SPF50+ PA++++ — ผิวน้ำกลิ้ง โกลว์เรียกแสง คุชชั่นผิวฉ่ำ สูตรใหม่"
        loading="eager"
        aspectRatio="2.4/1"
        objectFit="contain"
      />
    ),
  },
  {
    id: "kiss-signal-gloss",
    content: (
      <Artwork
        kind="image"
        src={heroBanner2}
        alt="Charmiss Kiss Signal Gloss — กลอสนางฟ้า No.1"
        loading="lazy"
        aspectRatio="2.4/1"
        objectFit="contain"
      />
    ),
  },
  {
    id: "juicy-cheek",
    content: (
      <Artwork
        kind="image"
        src={heroBanner3}
        alt="Charmiss Juicy Cheek Cushion Blush SPF15 PA+++ — แท็บซ้ำ ไม่กินรองพื้น #คุชชั่นบลัชไอดอล"
        loading="lazy"
        aspectRatio="2.4/1"
        objectFit="contain"
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
export function AdminHeroSlide(props: { section: HomepageSection; headingLevel?: "h1" | "h2" }) {
  const lookups = useStorefrontDestinationLookups();
  const href = () => resolveHomepageDestinationHref(props.section.cta.destination, lookups);
  const Heading = () => (props.headingLevel === "h1" ? "h1" : "h2");

  return (
    <div class="relative">
      <Artwork
        kind="image"
        src={props.section.banners.desktop || props.section.banners.tablet || props.section.banners.mobile}
        tabletSrc={props.section.banners.tablet || undefined}
        mobileSrc={props.section.banners.mobile || undefined}
        alt={props.section.title || props.section.name}
        aspectRatio="2.4/1"
        objectFit="cover"
      />
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
  const slides = () => (heroSections().length > 0 ? heroSections().map((s) => ({ id: s.id, content: <AdminHeroSlide section={s} /> })) : heroSlides);

  return (
    <section aria-label="โปรโมชั่นเด่น">
      <Carousel slides={slides()} label="แบนเนอร์โปรโมชั่นหลัก" autoPlay={6000} />
    </section>
  );
}
