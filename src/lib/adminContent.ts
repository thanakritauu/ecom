import type { StatusTone } from "~/components/admin/StatusBadge";
import { isValidDateRange } from "./adminMarketing";
import { normalizeHomepageSection, type HomepageSection, type HomepageDestination } from "./pageSections";
import heroBanner1 from "~/assets/images/hero/hero-banner-1.png";
import heroBanner2 from "~/assets/images/hero/hero-banner-2.png";
import heroBanner3 from "~/assets/images/hero/hero-banner-3.png";

/**
 * Landing Page Architecture & Promotion Page Migration — this file's
 * `PromotionPage*` names are the original, still-load-bearing implementation
 * (storage key, seed data, every existing route/import) and stay exactly as
 * they are: renaming them would touch every consumer for zero functional
 * gain and risk exactly the "blind rename" the migration spec warns against.
 * `LandingPage*` (type aliases here, value aliases at the bottom of this
 * file, after the real declarations exist) is the new *public* vocabulary —
 * plain aliases to the same type/functions, not a second parallel system —
 * so new code (the `/admin/content/landing-pages` routes, `LandingPageForm`,
 * etc.) can speak Landing Page terminology while reading and writing the
 * exact same `charmiss:admin:content:promotionPages` data every existing
 * Banner/Campaign/Homepage destination and every already-saved page still
 * relies on. There is one Source of Truth (this file); `LandingPage` is just
 * its new name.
 */
export type LandingPage = PromotionPage;
export type LandingPageStatus = PromotionPageStatus;
export type LandingPageNavigation = PromotionPageNavigation;
export type LandingPageFormValues = PromotionPageFormValues;

/**
 * Phase 10 — Content Management: Promotion Pages (now generalized as
 * "Landing Page" — see the migration note above). One admin-settable status
 * field (not derived from "now" vs. schedule dates — a scheduler that flips
 * this on its own would be the "Real Promotion Engine" #32 forbids), same
 * shape convention as `MarketingStatus`.
 */
export type PromotionPageStatus = "draft" | "scheduled" | "published" | "unpublished";

export const PROMOTION_PAGE_STATUS_META: Record<PromotionPageStatus, { label: string; tone: StatusTone }> = {
  draft: { label: "แบบร่าง", tone: "neutral" },
  scheduled: { label: "ตั้งเวลาไว้", tone: "info" },
  published: { label: "เผยแพร่แล้ว", tone: "success" },
  unpublished: { label: "ยกเลิกการเผยแพร่", tone: "warning" },
};

export type PromotionPageBanners = {
  desktop: string;
  tablet: string;
  mobile: string;
};

/**
 * Nav-integration add-on — whether/how this page surfaces as a Frontend Top
 * Navigation item. `icon` is a key into `PROMOTION_NAV_ICON_OPTIONS`
 * (`~/lib/promotionNavIcons`), never an uploaded asset — there is no "upload
 * an icon" system, by design (§3's own "Important"). `order` only ranks
 * *this* item among other nav-enabled Promotion Pages, not the whole nav.
 */
export type PromotionPageNavigation = {
  enabled: boolean;
  label: string;
  icon: string;
  order: number;
  /**
   * §8 Navigation Settings — Parent. Optional and, for this phase, DATA ONLY:
   * a dropdown in `LandingPageForm` lets an admin pick another nav-enabled
   * page as this one's parent, but `Header.tsx`/`MobileMenu.tsx` keep
   * rendering a single flat row per nav-enabled page exactly as before — no
   * nested/mega-menu rendering is built against this field yet. Storing it
   * now (rather than not at all) means adding that rendering later is
   * additive, not a data-model change.
   */
  parentId?: string;
};

/**
 * One product entry on the page — `variantIds` lets an admin narrow which
 * variants of that product show on this specific page (§16), always a real
 * array so `.length`/`.includes()` never hits `undefined` the way a bare
 * `AdminVariant.images` once did. Order on the page *is* array order, so
 * reordering is just moving entries in `PromotionPage.products` — no
 * separate numeric `sortOrder` field to keep in sync with it.
 */
export type PromotionPageProductRef = {
  productId: string;
  variantIds: string[];
};

export type PromotionPage = {
  id: string;
  name: string;
  /** URL-safe, unique across pages — the future customer route (§31) is `/promotion/:slug`. */
  slug: string;
  status: PromotionPageStatus;
  banners: PromotionPageBanners;
  navigation: PromotionPageNavigation;
  title: string;
  description: string;
  products: PromotionPageProductRef[];
  /**
   * Landing Page Admin Management §9/§24 — Page Section Builder. Purely
   * additive: every page created before this phase normalizes to `[]` (see
   * `normalizePromotionPage`) and keeps rendering exactly as it did via the
   * flat `banners`/`title`/`description`/`products` fields above, which stay
   * fully intact and untouched. Reuses the exact same `HomepageSection`
   * model Homepage's own section builder already established — not a second,
   * Landing-Page-specific section type.
   */
  sections: HomepageSection[];
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  createdAt: string;
  updatedAt: string;
};

/** `input.value` characters the browser's date/time inputs never produce, so plain ASCII lowercase + hyphen is the whole alphabet a slug needs. Matches the spec's own example: "9.9 Beauty Sale" → "9-9-beauty-sale". */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * §16 root-cause guard, applied at the `PromotionPage` level the same way
 * `normalizeVariant()` guards `AdminVariant.images` — anything that comes
 * back out of `localStorage` may predate a field the current shape relies
 * on, so every page is normalized before a component ever reads it.
 */
export function normalizePromotionPage(p: Partial<PromotionPage> & { id: string }): PromotionPage {
  return {
    id: p.id,
    name: p.name ?? "",
    slug: p.slug ?? "",
    status: p.status ?? "draft",
    banners: {
      desktop: p.banners?.desktop ?? "",
      tablet: p.banners?.tablet ?? "",
      mobile: p.banners?.mobile ?? "",
    },
    navigation: {
      enabled: p.navigation?.enabled ?? false,
      label: p.navigation?.label ?? "",
      icon: p.navigation?.icon ?? "",
      order: typeof p.navigation?.order === "number" && Number.isFinite(p.navigation.order) ? p.navigation.order : 0,
      parentId: p.navigation?.parentId || undefined,
    },
    title: p.title ?? "",
    description: p.description ?? "",
    products: Array.isArray(p.products)
      ? p.products.map((ref) => ({ productId: ref.productId, variantIds: Array.isArray(ref.variantIds) ? ref.variantIds : [] }))
      : [],
    sections: Array.isArray(p.sections) ? p.sections.map(normalizeHomepageSection) : [],
    startDate: p.startDate ?? "",
    startTime: p.startTime ?? "00:00",
    endDate: p.endDate ?? "",
    endTime: p.endTime ?? "23:59",
    createdAt: p.createdAt ?? "",
    updatedAt: p.updatedAt ?? "",
  };
}

export type PromotionPageFormValues = Omit<PromotionPage, "id" | "createdAt" | "updatedAt">;

/** §9 — Slug ห้ามว่าง, ห้ามซ้ำ. Case-insensitive; `excludeId` lets Edit compare against every *other* page. */
export function isSlugTaken(pages: PromotionPage[], slug: string, excludeId?: string): boolean {
  const target = slug.trim().toLowerCase();
  return pages.some((p) => p.id !== excludeId && p.slug.trim().toLowerCase() === target);
}

/**
 * §28 — a Draft can be saved with almost nothing filled in; only *Publish*
 * demands the page is actually presentable. Returns Thai messages ready to
 * show as-is (toast and/or inline), empty array = safe to publish.
 */
export function validatePublishRequirements(values: Pick<PromotionPageFormValues, "name" | "slug" | "title" | "banners" | "navigation" | "products" | "startDate" | "startTime" | "endDate" | "endTime">): string[] {
  const errors: string[] = [];
  if (!values.name.trim()) errors.push("กรุณากรอกชื่อหน้า");
  if (!values.slug.trim()) errors.push("กรุณากรอก Slug");
  if (!values.title.trim()) errors.push("กรุณากรอก Title");
  if (!values.banners.desktop) errors.push("กรุณาอัปโหลด Desktop Banner");
  if (values.products.length === 0) errors.push("กรุณาเลือกสินค้าอย่างน้อย 1 รายการ");
  if (values.navigation.enabled && !values.navigation.label.trim()) errors.push("กรุณากรอก Menu Label สำหรับ Top Navigation");
  if (values.startDate && values.endDate && !isValidDateRange(values.startDate, values.startTime, values.endDate, values.endTime)) {
    errors.push("ช่วงวันที่ไม่ถูกต้อง");
  }
  return errors;
}

/**
 * Nav add-on §7/§14 — one shared "can a shopper see this right now" rule,
 * reused by both the Frontend Top Navigation derivation and the `/promotion/
 * :slug` route's own visibility gate, so the two can never disagree about
 * what "live" means. Deliberately just a date comparison against the real
 * clock — not a scheduler that mutates `status` itself (that would be the
 * "Real Promotion Engine" §32 keeps forbidding); `status` stays exactly what
 * the admin last set it to.
 *
 * Landing Page Admin Management §7 — "Expired" is not a 5th `status` value
 * (the admin never has to remember to flip a page to some new enum member);
 * it's this same live rule additionally checking `endDate`, so a `published`
 * page whose end date has passed stops showing on the frontend on its own,
 * the same way a `scheduled` page starts showing on its own once its start
 * date arrives. The frontend never hardcodes any of this — it only ever
 * calls this one function.
 */
export function isPromotionPageVisible(p: Pick<PromotionPage, "status" | "startDate" | "startTime" | "endDate" | "endTime">, nowMs: number = Date.now()): boolean {
  if (p.status === "published") {
    if (p.endDate) {
      const end = new Date(`${p.endDate}T${p.endTime || "23:59"}`).getTime();
      if (Number.isFinite(end) && nowMs > end) return false;
    }
    return true;
  }
  if (p.status === "scheduled" && p.startDate) {
    const start = new Date(`${p.startDate}T${p.startTime || "00:00"}`).getTime();
    if (!Number.isFinite(start) || nowMs < start) return false;
    if (p.endDate) {
      const end = new Date(`${p.endDate}T${p.endTime || "23:59"}`).getTime();
      if (Number.isFinite(end) && nowMs > end) return false;
    }
    return true;
  }
  return false;
}

/** Nav add-on §7 — visible in the nav needs both the opt-in toggle *and* the same live-visibility rule the page itself uses. */
export function isPromotionPageInNav(p: Pick<PromotionPage, "status" | "startDate" | "startTime" | "endDate" | "endTime" | "navigation">, nowMs: number = Date.now()): boolean {
  return p.navigation.enabled && p.navigation.label.trim() !== "" && isPromotionPageVisible(p, nowMs);
}

const TODAY_LABEL = "17 ก.ย. 2569";

/**
 * Architecture Cleanup & Source of Truth §18 — a minimal, fixed-id
 * `HomepageSection` (Product Section, sourced from one of the Product
 * Store's auto-curated groups — see `~/lib/products`'s `isBestSeller`/
 * `isNewArrival`/`isTrending`/`isFeatured`) for the three seed Landing Pages
 * below that replace `nav.ts`'s old hardcoded "มาใหม่"/"กำลังฮิต"/"โปรโมชั่น"
 * links. Fixed string-literal id (never `genHomepageSectionId()`, which is
 * runtime-only and non-deterministic) — same "baseline builder purity" rule
 * every other seed in this file already follows.
 */
function seedAutoProductSection(id: string, title: string, productSource: "new_arrival" | "trending" | "featured"): HomepageSection {
  return {
    id,
    type: "product",
    name: title,
    enabled: true,
    eyebrow: "",
    title,
    description: "",
    banners: { desktop: "", tablet: "", mobile: "" },
    cta: { label: "", destination: { type: "none" } },
    contentLayout: "image-text",
    productSource,
    products: [],
    collectionId: "",
    campaignId: "",
    createdAt: TODAY_LABEL,
    updatedAt: TODAY_LABEL,
  };
}

/**
 * Landing Page migration — root-cause fix: this used to hand out ids from an
 * incrementing `let nextId` counter, which is fine as long as
 * `buildMockPromotionPages()` is only ever called once per process, but
 * breaks the "baseline builder purity" rule every other content module
 * (`adminCategories.ts`, `adminBanners.ts`, `adminCampaigns.ts`,
 * `adminCollections.ts`) already follows — a fixed id per seed, so calling
 * this function from two independent provider trees (Admin's own store *and*
 * the customer-side read-only fallback this migration adds in
 * `promotionPages.tsx`) always produces byte-identical output. `promo-page-
 * 001` specifically must stay exactly that string — `adminHomepage.ts`'s own
 * Hero section baseline already references it by id.
 */
const PROMOTION_PAGE_SEEDS: (Omit<PromotionPage, "createdAt" | "updatedAt"> & { id: string })[] = [
  {
    id: "promo-page-001",
    name: "9.9 Beauty Sale",
    slug: "9-9-beauty-sale",
    status: "published",
    banners: { desktop: heroBanner1, tablet: heroBanner1, mobile: heroBanner1 },
    navigation: { enabled: true, label: "9.9", icon: "tag", order: 1 },
    title: "Beauty Sale",
    description: "รวมไอเทมดูแลผิวและสุขภาพในราคาพิเศษ ลดสูงสุด 50% เฉพาะวันที่ 9.9 นี้เท่านั้น",
    products: [
      { productId: "best-1", variantIds: [] },
      { productId: "best-3", variantIds: [] },
      { productId: "feature-1", variantIds: [] },
      { productId: "trend-1", variantIds: [] },
    ],
    sections: [],
    startDate: "2026-09-09",
    startTime: "00:00",
    endDate: "2026-09-09",
    endTime: "23:59",
  },
  {
    id: "promo-page-002",
    name: "แคมเปญวันหยุดยาว",
    slug: "long-weekend-campaign",
    status: "scheduled",
    banners: { desktop: heroBanner2, tablet: heroBanner2, mobile: "" },
    navigation: { enabled: true, label: "วันหยุดยาว", icon: "gift", order: 2 },
    title: "Long Weekend Glow",
    description: "เตรียมผิวสวยก่อนวันหยุดยาว พร้อมส่วนลดพิเศษเฉพาะแคมเปญนี้",
    products: [
      { productId: "best-5", variantIds: [] },
      { productId: "feature-2", variantIds: [] },
    ],
    sections: [],
    startDate: "2026-09-25",
    startTime: "00:00",
    endDate: "2026-09-27",
    endTime: "23:59",
  },
  {
    id: "promo-page-003",
    name: "Charmiss x Sanrio Collection",
    slug: "charmiss-x-sanrio",
    status: "published",
    banners: { desktop: heroBanner3, tablet: heroBanner3, mobile: heroBanner3 },
    navigation: { enabled: true, label: "Sanrio", icon: "star", order: 3 },
    title: "Charmiss x Sanrio",
    description: "คอลเลกชันลิขสิทธิ์แท้ Sanrio จำนวนจำกัด ช้อปก่อนหมด",
    products: [
      { productId: "best-1", variantIds: ["coral"] },
      { productId: "best-3", variantIds: [] },
      { productId: "new-2", variantIds: [] },
    ],
    sections: [],
    startDate: "2026-09-01",
    startTime: "00:00",
    endDate: "2026-10-31",
    endTime: "23:59",
  },
  {
    id: "promo-page-004",
    name: "แคมเปญร่างทดสอบ",
    slug: "draft-test-campaign",
    status: "draft",
    banners: { desktop: "", tablet: "", mobile: "" },
    navigation: { enabled: true, label: "ร่าง", icon: "fire", order: 4 },
    title: "",
    description: "",
    products: [],
    sections: [],
    startDate: "",
    startTime: "00:00",
    endDate: "",
    endTime: "23:59",
  },
  {
    id: "promo-page-005",
    name: "โปรปีใหม่ที่ผ่านมา",
    slug: "new-year-promo-2026",
    status: "unpublished",
    banners: { desktop: heroBanner2, tablet: "", mobile: "" },
    navigation: { enabled: true, label: "ปีใหม่", icon: "sparkle", order: 5 },
    title: "New Year New Glow",
    description: "แคมเปญปีใหม่ที่ปิดไปแล้ว เก็บไว้เป็นข้อมูลอ้างอิง",
    products: [{ productId: "best-1", variantIds: [] }],
    sections: [],
    startDate: "2026-01-01",
    startTime: "00:00",
    endDate: "2026-01-15",
    endTime: "23:59",
  },
  {
    id: "promo-page-006",
    name: "สินค้ามาใหม่",
    slug: "new-arrivals",
    status: "published",
    banners: { desktop: "", tablet: "", mobile: "" },
    navigation: { enabled: true, label: "มาใหม่", icon: "sparkle", order: 6 },
    title: "สินค้ามาใหม่",
    description: "อัปเดตสินค้าใหม่ล่าสุดจาก Charmiss",
    products: [],
    sections: [seedAutoProductSection("landing-sec-new-arrivals-001", "สินค้ามาใหม่ทั้งหมด", "new_arrival")],
    startDate: "",
    startTime: "00:00",
    endDate: "",
    endTime: "23:59",
  },
  {
    id: "promo-page-007",
    name: "กำลังฮิต",
    slug: "trending",
    status: "published",
    banners: { desktop: "", tablet: "", mobile: "" },
    navigation: { enabled: true, label: "กำลังฮิต", icon: "fire", order: 7 },
    title: "กำลังฮิตสัปดาห์นี้",
    description: "สินค้าที่กำลังเป็นที่นิยมในตอนนี้",
    products: [],
    sections: [seedAutoProductSection("landing-sec-trending-001", "สินค้ากำลังฮิต", "trending")],
    startDate: "",
    startTime: "00:00",
    endDate: "",
    endTime: "23:59",
  },
  {
    id: "promo-page-008",
    name: "โปรโมชั่น",
    slug: "promotions",
    status: "published",
    banners: { desktop: "", tablet: "", mobile: "" },
    navigation: { enabled: true, label: "โปรโมชั่น", icon: "tag", order: 8 },
    title: "โปรโมชั่นแนะนำ",
    description: "รวมสินค้าและโปรโมชั่นแนะนำจาก Charmiss",
    products: [],
    sections: [seedAutoProductSection("landing-sec-promotions-001", "สินค้าแนะนำ", "featured")],
    startDate: "",
    startTime: "00:00",
    endDate: "",
    endTime: "23:59",
  },
];

export function buildMockPromotionPages(): PromotionPage[] {
  return PROMOTION_PAGE_SEEDS.map((seed) => ({ ...seed, createdAt: TODAY_LABEL, updatedAt: TODAY_LABEL }));
}

const linksToPage = (destination: HomepageDestination | undefined, pageId: string) => destination?.type === "landingPage" && destination.landingPageId === pageId;

/**
 * §26 — before a Landing Page is deleted, this checks every other place a
 * `landingPage` `HomepageDestination` could point at it (a Banner's CTA, a
 * Campaign's CTA, a Homepage section's CTA/linked-Campaign CTA, or another
 * Landing Page's own Section CTA) and returns a human-readable list so the
 * delete confirmation can warn the admin instead of silently leaving a
 * dangling `/promotion/:slug` link behind. Structural parameter types (not
 * `Banner`/`Campaign` imports) keep this file's only dependency direction
 * intact — this module is depended on by `adminBanners.ts`/
 * `adminCampaigns.ts`, never the other way around.
 */
export function findLandingPageReferences(
  pageId: string,
  refs: {
    banners: { name: string; destination: HomepageDestination }[];
    campaigns: { name: string; cta: { destination: HomepageDestination } }[];
    homepageSections: HomepageSection[];
    allPages: PromotionPage[];
  },
): string[] {
  const hits: string[] = [];
  for (const b of refs.banners) {
    if (linksToPage(b.destination, pageId)) hits.push(`Banner "${b.name}"`);
  }
  for (const c of refs.campaigns) {
    if (linksToPage(c.cta.destination, pageId)) hits.push(`Campaign "${c.name}"`);
  }
  for (const s of refs.homepageSections) {
    if (linksToPage(s.cta.destination, pageId)) hits.push(`Homepage Section "${s.name}"`);
  }
  for (const p of refs.allPages) {
    if (p.id === pageId) continue;
    for (const s of p.sections) {
      if (linksToPage(s.cta.destination, pageId)) hits.push(`Landing Page "${p.name}"`);
    }
  }
  return hits;
}

/**
 * Landing Page Architecture & Promotion Page Migration — value aliases,
 * placed here (after the real declarations) rather than at the top of the
 * file, since `const`/function exports are not hoisted the way `type`
 * aliases are. See the migration note above `LandingPage` for why these
 * exist and why they point at the exact same implementation.
 */
export const LANDING_PAGE_STATUS_META = PROMOTION_PAGE_STATUS_META;
export const normalizeLandingPage = normalizePromotionPage;
export const isLandingPageVisible = isPromotionPageVisible;
export const isLandingPageInNav = isPromotionPageInNav;
export const buildMockLandingPages = buildMockPromotionPages;
