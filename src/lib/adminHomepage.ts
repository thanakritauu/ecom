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
import { emptyBanners, emptyCta, type HeroAsset, type HomepageSection, type HomepageSectionType } from "./pageSections";

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
  ];
}

/**
 * Storefront sync — the homepage sections `routes/index.tsx` renders as
 * fixed components (not from Admin data), in their real on-page order.
 * Admin's Homepage editor lists them as read-only "ส่วนคงที่" cards around
 * the editable sections so the page mirrors `/` top to bottom. `editable`
 * marks the one slot where this page's own `sections` are rendered
 * (Hero carousel first, then `HomepageSections`) — everything else is
 * hardcoded in its component and can only change in code.
 */
export type HomepageFixedSection = {
  id: string;
  label: string;
  /** Short Thai description of what the live section shows / where its data comes from. */
  note: string;
  /** "ดูทั้งหมด" target on the storefront, when the section has one. */
  href?: string;
  editable?: boolean;
};

export const HOMEPAGE_FIXED_SECTIONS: HomepageFixedSection[] = [
  { id: "hero", label: "แบนเนอร์สไลด์", note: "สไลด์ใหญ่บนสุด ตอนนี้หน้าร้านแสดง 3 สไลด์เริ่มต้น (Iconic Glow, Juicy Cheek, Acne Balance) เปิดส่วนแบนเนอร์สไลด์ของหน้านี้เมื่อต้องการเปลี่ยน", editable: true },
  { id: "sections", label: "ส่วนที่แก้ไขได้", note: "ส่วนอื่นของหน้านี้ (เช่น คอลเลคชั่น Glow in motion) แสดงต่อจากแบนเนอร์สไลด์ตามลำดับด้านล่าง", editable: true },
  { id: "flash-sale", label: "Flash Sale", note: "สินค้า Flash Sale พร้อมนับถอยหลัง ดึงจากสินค้าที่ตั้ง Flash Sale ไว้ ถ้าไม่มีสินค้าจะซ่อนเอง", href: "/promotion/flash-sale" },
  { id: "best-sellers", label: "สินค้าขายดี", note: "สินค้าขายดีพร้อมแท็บกรองหมวด", href: "/promotion/best-sellers" },
  { id: "coupon", label: "คูปองส่วนลด", note: "คูปองที่ตั้งให้แสดงหน้าแรก พร้อมปุ่มเก็บคูปองและเก็บทั้งหมด" },
  { id: "new-arrivals", label: "มาใหม่", note: "สินค้ามาใหม่", href: "/promotion/new-arrivals" },
  { id: "trending", label: "กำลังฮิตสัปดาห์นี้", note: "สินค้ากำลังฮิต", href: "/promotion/trending" },
  { id: "reviews", label: "#CharmissReviews", note: "คะแนน 4.9 จากรีวิวจริง 10,000+ รีวิว พร้อมคลิปรีวิวจาก TikTok" },
  { id: "faq", label: "คำถามที่พบบ่อย", note: "คำถามที่พบบ่อยตามรายการด้านล่าง" },
];
