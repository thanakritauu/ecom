import { Show } from "solid-js";
import { Artwork } from "./Artwork";

/**
 * The Home hero's banner standard, shared by every banner on the site
 * (Home hero, Promotion / Landing Pages such as Sanrio, Campaign and
 * Promotion Banner sections): three real crops — mobile 3:4 (≤767px),
 * tablet 4:3 (≤1023px), desktop 3:1 (750×1000 / 1024×768 / 1920×640) —
 * swapped by `<picture>` (Artwork), each shown whole in a box of its own
 * ratio. A missing size falls back to the next one up.
 */
export const BANNER_ASPECT_CLASS = "aspect-[3/4] md:aspect-[4/3] lg:aspect-[3/1]";

export function ResponsiveBanner(props: {
  banners: { desktop: string; tablet: string; mobile: string };
  alt: string;
  class?: string;
  loading?: "eager" | "lazy";
}) {
  const desktop = () => props.banners.desktop || props.banners.tablet || props.banners.mobile;
  return (
    <Show when={desktop()}>
      {(src) => (
        <Artwork
          kind="image"
          src={src()}
          tabletSrc={props.banners.tablet || props.banners.desktop || undefined}
          mobileSrc={props.banners.mobile || props.banners.tablet || undefined}
          alt={props.alt}
          loading={props.loading}
          objectFit="contain"
          class={`${BANNER_ASPECT_CLASS} ${props.class ?? ""}`}
        />
      )}
    </Show>
  );
}
