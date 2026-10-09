import type { MediaValue } from "~/lib/media";
import { ResponsiveMedia } from "./MediaView";

/**
 * The Home hero's banner standard, shared by every banner on the site
 * (Home hero, Promotion / Landing Pages such as Sanrio, and Promotion
 * Banner sections): three real crops — mobile 3:4 (≤767px),
 * tablet 4:3 (≤1023px), desktop 3:1 (750×1000 / 1024×768 / 1920×640) —
 * each shown whole in a box of its own ratio. A missing size falls back to
 * the next one up. Each crop may be an image (plain string) or a video
 * (`MediaItem`); rendering is `ResponsiveMedia`.
 */
export const BANNER_ASPECT_CLASS = "aspect-[3/4] md:aspect-[4/3] lg:aspect-[3/1]";

export function ResponsiveBanner(props: {
  banners: { desktop: MediaValue; tablet: MediaValue; mobile: MediaValue };
  alt: string;
  class?: string;
  loading?: "eager" | "lazy";
}) {
  return (
    <ResponsiveMedia
      media={props.banners}
      alt={props.alt}
      loading={props.loading}
      objectFit="contain"
      class={`${BANNER_ASPECT_CLASS} ${props.class ?? ""}`}
    />
  );
}
