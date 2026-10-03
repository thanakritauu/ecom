import heroBanner2 from "~/assets/images/hero/hero-banner-2.png";
import { emptyBanners, emptyCta, type HomepageSection, type HomepageSectionType } from "./pageSections";

/**
 * Phase 10.2 — Content Management: Homepage. Five section types cover every
 * "flexible content area" the spec asks Admin to manage; the storefront's
 * existing bespoke sections (Flash Sale's countdown, Best Sellers' tab
 * filter, Coupon's claim flow, Category rail, Membership CTA, Reviews,
 * FAQ) stay exactly as they are today — none of those are in this list, so
 * none of them become admin-editable data, and none of their code changes.
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
    campaignId: "",
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
 * visual change by default; `hero` ships disabled so `HeroBanner.tsx`'s
 * existing 3-slide carousel is untouched unless an admin opts in.
 */
export function buildHomepageSectionBaseline(): HomepageSection[] {
  return [
    makeSection({
      id: "home-sec-hero-1",
      type: "hero",
      name: "Hero Banner (ตัวอย่าง)",
      enabled: false,
      title: "New Year New Glow",
      description: "เริ่มต้นปีใหม่ด้วยผิวที่เปล่งประกาย",
      banners: { desktop: heroBanner2, tablet: heroBanner2, mobile: heroBanner2 },
      cta: { label: "ช้อปเลย", destination: { type: "internal", path: "/products" } },
    }),
    makeSection({
      id: "home-sec-product-featured",
      type: "product",
      name: "Product Section: Featured",
      title: "คอลเลคชั่น Glow in motion",
      productSource: "featured",
    }),
    makeSection({
      id: "home-sec-promo-banner-1",
      type: "promotion_banner",
      name: "Promotion Banner (ตัวอย่าง)",
      enabled: false,
      title: "",
      description: "",
    }),
    makeSection({
      id: "home-sec-content-1",
      type: "content",
      name: "Content Block (ตัวอย่าง)",
      enabled: false,
      title: "สะสม Charmiss Coins",
      description: "แลกรับของรางวัล ส่วนลด และสิทธิพิเศษทุกการสั่งซื้อ",
      cta: { label: "สมัครฟรี", destination: { type: "internal", path: "/account" } },
    }),
  ];
}
