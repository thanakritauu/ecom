import legacyHero1 from "~/assets/images/hero/hero-banner-1.png";
import legacyHero2 from "~/assets/images/hero/hero-banner-2.png";
import legacyHero3 from "~/assets/images/hero/hero-banner-3.png";
import legacyHero4 from "~/assets/images/hero/hero-banner-4.png";
import hero1Desktop from "~/assets/images/hero/hero-banner-1-desktop.webp";
import hero1Tablet from "~/assets/images/hero/hero-banner-1-tablet.webp";
import hero1Mobile from "~/assets/images/hero/hero-banner-1-mobile.webp";

type BannerSet = { desktop: string; tablet: string; mobile: string };

/** Hero 1's real desktop / tablet / mobile crops (1920×640 / 1024×768 / 750×1000) — the placeholder every seeded banner uses for now. */
export const HERO1_BANNERS: BannerSet = { desktop: hero1Desktop, tablet: hero1Tablet, mobile: hero1Mobile };

const LEGACY_SEED_IMAGES = new Set([legacyHero1, legacyHero2, legacyHero3, legacyHero4]);

/**
 * Seeded banners used to be one flat `hero-banner-N.png` stretched across
 * all three sizes. Any banner set made only of those legacy seed photos
 * (seed data or a stored copy of it) becomes Hero 1's proper 3-size set, so
 * every banner on the site renders the same 3-breakpoint way as the Home
 * hero. Anything an admin uploaded is left exactly as it is.
 */
export function upgradeSeedBanners(b: BannerSet): BannerSet {
  const filled = [b.desktop, b.tablet, b.mobile].filter(Boolean);
  return filled.length > 0 && filled.every((src) => LEGACY_SEED_IMAGES.has(src)) ? { ...HERO1_BANNERS } : b;
}
