// The exact crops `HeroBanner.tsx` imports for its three live slides — the seed hero section below reuses them so Admin shows what `/` really shows.
import heroBanner1Desktop from "~/assets/images/hero/hero-banner-1-desktop.webp";
import heroBanner1Tablet from "~/assets/images/hero/hero-banner-1-tablet.webp";
import heroBanner1Mobile from "~/assets/images/hero/hero-banner-1-mobile.webp";
import heroJuicyCheekDesktop from "~/assets/images/hero/hero-banner-2-desktop.webp";
import heroJuicyCheekTablet from "~/assets/images/hero/hero-banner-2-tablet.webp";
import heroJuicyCheekMobile from "~/assets/images/hero/hero-banner-2-mobile.webp";
import heroAcneBalanceDesktop from "~/assets/images/hero/hero-banner-3-desktop.webp";
import heroAcneBalanceTablet from "~/assets/images/hero/hero-banner-3-tablet.webp";
import heroAcneBalanceMobile from "~/assets/images/hero/hero-banner-3-mobile.webp";
import { BUILTIN_SECTION_TYPES, HOMEPAGE_SECTION_TYPE_META, emptyBanners, emptyCta, type HeroAsset, type HomepageSection, type HomepageSectionType } from "./pageSections";

/**
 * Phase 10.2 — Content Management: Homepage. The storefront's bespoke home
 * blocks (Flash Sale, Best Sellers, coupons, New Arrivals, Trending, Reviews,
 * FAQ) are built-in section types now (`BUILTIN_SECTION_TYPES`): they keep
 * their own components and data, and the page's one ordered `sections` list
 * decides where they sit and whether they show.
 * `hero` is the one exception to "rendered by the generic block renderer":
 * `HeroBanner.tsx` reads enabled `hero` sections directly (as the carousel's
 * slide list) instead of `HomepageSections.tsx` rendering them inline.
 *
 * Landing Page Admin Management — the generic Section/Destination
 * architecture below (`HomepageSection`, `HomepageDestination`,
 * `normalizeHomepageSection`, `resolveHomepageDestinationHref`, ...) moved to
 * `./pageSections` so `adminContent.ts`'s `LandingPage` could reuse it
 * without a circular import; everything is re-exported here unchanged so no
 * existing import site (`~/lib/adminHomepage`) needed to change. Only
 * Homepage's own thing — `HomepageContent`, its normalizer, and the seed
 * baseline builder — still lives in this file.
 */
export * from "./pageSections";

/**
 * Promotion Page / Homepage Architecture §8/§37 — Homepage's own `sections`
 * live directly on its `PromotionPage` record (`adminContent.ts`) now, so
 * the separate `HomepageContent` wrapper type + normalizer that used to back
 * `adminHomepageStore.tsx`'s two independent draft/published snapshots are
 * gone (not deprecated-in-place — nothing reads them anymore). This file's
 * remaining job is just `buildHomepageSectionBaseline()`, the seed content
 * both `adminContent.ts`'s Homepage seed row and (transitively) every fresh
 * install's `/` render from.
 */
const TODAY_LABEL = "18 ก.ย. 2569";

export const HOMEPAGE_HERO_SECTION_ID = "home-sec-hero-1";

/** `HeroBanner.tsx`'s three slides (iconic-glow / juicy-cheek / acne-balance), Desktop 1920×640 + Tablet 1024×768 + Mobile 750×1000 each. Fixed ids — same baseline-purity rule as `makeSection`. */
export function buildLiveHeroAssets(): HeroAsset[] {
  return [
    { id: "hero-asset-iconic-glow", type: "image", source: heroBanner1Desktop, tabletSource: heroBanner1Tablet, mobileSource: heroBanner1Mobile },
    { id: "hero-asset-juicy-cheek", type: "image", source: heroJuicyCheekDesktop, tabletSource: heroJuicyCheekTablet, mobileSource: heroJuicyCheekMobile },
    { id: "hero-asset-acne-balance", type: "image", source: heroAcneBalanceDesktop, tabletSource: heroAcneBalanceTablet, mobileSource: heroAcneBalanceMobile },
  ];
}

/**
 * Fixed, hand-picked ids (not `genHomepageSectionId()`) — this function must
 * be *pure*: `adminContent.ts`'s Homepage seed row calls it once to build
 * that row's initial `sections`, and every independent provider tree that
 * falls back to `buildMockPromotionPages()` (Admin's own store, the
 * storefront's read-only mirror) gets the byte-identical result. An
 * incrementing counter would hand back a "different" baseline every call; a
 * fixed id per seed section is what makes that byte-identical result
 * possible.
 */
function makeSection(partial: Partial<HomepageSection> & { id: string; type: HomepageSectionType; name: string }): HomepageSection {
  return {
    enabled: true,
    eyebrow: "",
    title: "",
    description: "",
    banners: emptyBanners(),
    assets: [],
    cta: emptyCta(),
    contentLayout: "image-text",
    productSource: "manual",
    products: [],
    collectionId: "",
    categoryId: "",
    createdAt: TODAY_LABEL,
    updatedAt: TODAY_LABEL,
    ...partial,
  };
}

/**
 * §23 — the seed content for the one `PromotionPage` where `isHomepage` is
 * `true` (`adminContent.ts`) — so a brand-new browser's Home page already
 * looks reasonable instead of showing nothing until an admin saves once.
 * The `product` section here reproduces the old hardcoded "Featured
 * Collection" section exactly (same title, same `featured` source) so
 * replacing that static component with this data-driven one is a zero
 * visual change by default. Storefront sync — `hero` carries the three
 * live slides (same images, same order) so Admin shows the carousel
 * customers actually see, but still ships disabled: while no hero is
 * enabled `HeroBanner.tsx` renders its own built-in slides (eager first
 * image, per-slide alt text) — enabling this would swap `/` onto
 * `AdminHeroSlide`, which is an admin opt-in, not a seed default.
 */
export function buildHomepageSectionBaseline(): HomepageSection[] {
  return [
    makeSection({
      id: HOMEPAGE_HERO_SECTION_ID,
      type: "hero",
      name: "แบนเนอร์สไลด์หน้าแรก",
      enabled: false,
      assets: buildLiveHeroAssets(),
    }),
    makeSection({
      id: "home-sec-product-featured",
      type: "product",
      name: "สินค้าแนะนำ",
      title: "คอลเลคชั่น Glow in motion",
      productSource: "featured",
    }),
    makeSection({
      id: "home-sec-promo-banner-1",
      type: "promotion_banner",
      name: "แบนเนอร์โปรโมชั่น (ตัวอย่าง)",
      enabled: false,
      title: "",
      description: "",
    }),
    makeSection({
      id: "home-sec-content-1",
      type: "content",
      name: "รูปพร้อมข้อความ (ตัวอย่าง)",
      enabled: false,
      title: "สะสม Charmiss Coins",
      description: "แลกรับของรางวัล ส่วนลด และสิทธิพิเศษทุกการสั่งซื้อ",
      cta: { label: "สมัครฟรี", destination: { type: "internal", path: "/account" } },
    }),
    ...buildBuiltinSections(),
  ];
}

/**
 * The homepage's built-in blocks in today's on-page order (after the editable
 * sections), all shown. Fixed ids for the same purity reason as `makeSection`;
 * the seed baseline ends with these and `upgradePromotionPageSeeds` (v5)
 * appends them to a homepage saved before they became sections, so `/` keeps
 * rendering exactly as it did when they were hardcoded in `routes/index.tsx`.
 */
export function buildBuiltinSections(): HomepageSection[] {
  return BUILTIN_SECTION_TYPES.map((type) =>
    makeSection({ id: `home-sec-builtin-${type.replace(/_/g, "-")}`, type, name: HOMEPAGE_SECTION_TYPE_META[type].label }),
  );
}
