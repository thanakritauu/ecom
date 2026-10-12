import type { StatusTone } from "~/components/admin/StatusBadge";
import { isValidDateRange } from "./adminMarketing";
import { normalizeHomepageSection, isHomepageSectionType, isBuiltinSectionType, validateHeroAssets, isValidYoutubeUrl, type HomepageSection, type HomepageDestination } from "./pageSections";
import { buildBuiltinSections, buildHomepageSectionBaseline, buildLiveHeroAssets, HOMEPAGE_HERO_SECTION_ID } from "./adminHomepage";
import heroBanner1 from "~/assets/images/hero/hero-banner-1.png";
import heroBanner2 from "~/assets/images/hero/hero-banner-2.png";
import heroBanner3 from "~/assets/images/hero/hero-banner-3.png";
import { upgradeSeedBanners } from "./seedBanners";
import { mediaErrors, normalizeMediaSet, type MediaValue } from "./media";

/**
 * Landing Page Architecture & Promotion Page Migration, extended by
 * Promotion Page / Homepage Architecture — this file's `PromotionPage*`
 * names are the original, still-load-bearing implementation (storage key,
 * seed data, the actual entity this whole architecture is named after) and
 * stay exactly as they are: renaming them would touch every consumer for
 * zero functional gain and risk exactly the "blind rename" the migration
 * spec warns against. `LandingPage*` (type aliases here, value aliases at
 * the bottom of this file, after the real declarations exist) is an older
 * interim public vocabulary from before "Promotion Page" was settled on as
 * the one customer-facing page entity's final name — plain aliases to the
 * same type/functions, not a second parallel system — kept only so the
 * `LandingPageForm`/`LandingPageQuickView`/... component names (and the
 * `/admin/promotion-pages` routes built on them) don't need a pure-rename
 * diff for zero functional gain. There is one Source of Truth (this file);
 * `LandingPage` and `PromotionPage` are the same entity, `isHomepage: true`
 * on it is Homepage — never a second entity of either kind.
 */
export type LandingPage = PromotionPage;
export type LandingPageStatus = PromotionPageStatus;
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

/** Each crop is an image (plain string) or a video (`MediaItem`), see `~/lib/media`. */
export type PromotionPageBanners = {
  desktop: MediaValue;
  tablet: MediaValue;
  mobile: MediaValue;
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
  /** URL-safe, unique across pages — the customer route is `/promotion/:slug` (ignored for the one page where `isHomepage` is true — see below). */
  slug: string;
  /**
   * Promotion Page / Homepage Architecture — Homepage is not a separate
   * entity; it is the one `PromotionPage` where this is `true`. At most one
   * page may have `isHomepage: true` at a time (enforced by
   * `adminContentStore.tsx`'s `add`/`update`). That page's `slug` is kept
   * for data hygiene only — the customer route `/` resolves it directly
   * (see `homepageContent.tsx`), never `/promotion/:slug`.
   */
  isHomepage: boolean;
  status: PromotionPageStatus;
  banners: PromotionPageBanners;
  /**
   * Navigation Architecture (Blueprint v1 FINAL) — a Promotion Page owns no
   * navigation data. It used to carry its own `navigation: {enabled, label,
   * icon, order, parentId}` object; that field is removed outright (not
   * deprecated-in-place, and never replaced by another nested navigation
   * object on this type). Whether/how this page appears in a customer menu
   * is decided entirely by a separate `NavigationItem` (`~/lib/adminNavigation`)
   * whose `targetType` is `"promotion_page"` and `targetId` is this page's
   * `id` — this page is only ever a navigation *target*.
   */
  title: string;
  description: string;
  /** YouTube link shown at the top of a flat page in place of the banner (the banner stays saved, just hidden). Empty = banner as usual. */
  videoUrl: string;
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
/**
 * Seed section ids that have been removed from the baseline for good (the
 * homepage "9.9 Beauty Sale" section). A browser that saved Admin
 * content before the removal still has them in localStorage — they're
 * dropped here, on every read, so they disappear from Admin's Homepage
 * editor and the storefront alike and aren't written back on the next save.
 */
const RETIRED_SECTION_IDS = new Set(["home-sec-campaign-99"]);

const SEED_VIDEO_URLS: Record<string, string> = { "promo-page-003": "https://www.youtube.com/watch?v=xv8R0w-4Sqw" };

export function normalizePromotionPage(p: Partial<PromotionPage> & { id: string }): PromotionPage {
  return {
    id: p.id,
    name: p.name ?? "",
    slug: p.slug ?? "",
    isHomepage: p.isHomepage ?? false,
    status: p.status ?? "draft",
    banners: upgradeSeedBanners(normalizeMediaSet(p.banners)),
    title: p.title ?? "",
    description: p.description ?? "",
    // A page saved before `videoUrl` existed picks up its seeded video (Iconic Glow → Charmiss x Sanrio).
    videoUrl: p.videoUrl ?? SEED_VIDEO_URLS[p.id] ?? "",
    products: Array.isArray(p.products)
      ? p.products.map((ref) => ({ productId: ref.productId, variantIds: Array.isArray(ref.variantIds) ? ref.variantIds : [] }))
      : [],
    // Sections of a removed type (the old "campaign" section, which embedded a now-deleted Campaign) are dropped the same way.
    sections: Array.isArray(p.sections)
      ? p.sections.filter((sec) => sec && !RETIRED_SECTION_IDS.has(sec.id) && (sec.type === undefined || isHomepageSectionType(sec.type))).map(normalizeHomepageSection)
      : [],
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

/** §35 — a Promotion Page slug must never create routing ambiguity with an existing static route. Checked against the first path segment only (so `/products` blocks a page slugged `products`, and `/product/:slug` blocks one slugged `product`). */
const RESERVED_SLUGS = ["products", "product", "cart", "checkout", "account", "login", "register", "admin"];
export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.includes(slug.trim().toLowerCase());
}

/** §34 — at most one Promotion Page may be the Homepage at a time. `excludeId` lets Edit compare against every *other* page (so saving the Homepage's own record doesn't flag itself). */
export function isHomepageAssigned(pages: PromotionPage[], excludeId?: string): boolean {
  return pages.some((p) => p.id !== excludeId && p.isHomepage);
}

/** The customer URL exactly as the storefront routes it — `/` for the Homepage, `/promotion/{slug}` for every other page. The one place Admin spells it out. */
export function promotionPageHref(p: Pick<PromotionPage, "isHomepage" | "slug">): string {
  return p.isHomepage ? "/" : `/promotion/${p.slug}`;
}

/**
 * §28/§33 — a Draft can be saved with almost nothing filled in; only
 * *Publish* demands the page is actually presentable. Returns Thai messages
 * ready to show as-is (toast and/or inline), empty array = safe to publish.
 *
 * Promotion Page / Homepage Architecture §33 — a page composed with the
 * Page Section Builder (`sections.length > 0`) renders entirely from its
 * sections (`PromotionPageView`'s own render branch), so the legacy flat
 * "Desktop Banner"/"at least 1 product" requirements only make sense for a
 * page still using the flat fields — requiring them unconditionally would
 * incorrectly block publishing a perfectly valid section-built page
 * (including Homepage, which always uses sections).
 */
/** Every video crop needs its poster before saving. `owner` prefixes the message, e.g. a section name. */
function bannerMediaErrors(banners: PromotionPageBanners, owner?: string): string[] {
  const prefix = owner ? `${owner}: ` : "";
  return [
    ...mediaErrors(banners.desktop, `${prefix}แบนเนอร์เดสก์ท็อป`),
    ...mediaErrors(banners.tablet, `${prefix}แบนเนอร์แท็บเล็ต`),
    ...mediaErrors(banners.mobile, `${prefix}แบนเนอร์มือถือ`),
  ];
}

export function validatePublishRequirements(
  values: Pick<PromotionPageFormValues, "name" | "slug" | "title" | "banners" | "videoUrl" | "products" | "sections" | "startDate" | "startTime" | "endDate" | "endTime" | "isHomepage">,
): string[] {
  const errors: string[] = [];
  if (!values.name.trim()) errors.push("กรุณากรอกชื่อหน้า");
  if (!values.slug.trim()) errors.push("กรุณากรอก Slug");
  else if (!values.isHomepage && isReservedSlug(values.slug)) errors.push("Slug นี้ซ้ำกับหน้าอื่นของเว็บไซต์ กรุณาเลือก Slug อื่น");
  if (values.sections.length === 0) {
    if (!values.title.trim()) errors.push("กรุณากรอกหัวข้อ");
    // A YouTube video takes the banner's place on the storefront (`PromotionPageView`), so it satisfies the banner requirement on its own.
    if (!values.banners.desktop && !values.videoUrl.trim()) errors.push("กรุณาอัปโหลดแบนเนอร์เดสก์ท็อป หรือใส่ลิงก์วิดีโอ YouTube");
    if (values.products.length === 0) errors.push("กรุณาเลือกสินค้าอย่างน้อย 1 รายการ");
    errors.push(...bannerMediaErrors(values.banners));
  }
  if (values.videoUrl.trim() && !isValidYoutubeUrl(values.videoUrl)) errors.push("ลิงก์วิดีโอ YouTube ไม่ถูกต้อง");
  if (values.startDate && values.endDate && !isValidDateRange(values.startDate, values.startTime, values.endDate, values.endTime)) {
    errors.push("วันสิ้นสุดต้องอยู่หลังวันเริ่ม");
  }
  for (const section of values.sections) {
    if (section.type === "hero") errors.push(...validateHeroAssets(section.assets));
    errors.push(...bannerMediaErrors(section.banners, section.name || section.title));
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
function seedAutoProductSection(
  id: string,
  title: string,
  productSource: "new_arrival" | "trending" | "featured" | "best_seller" | "flash_sale",
  /** Shown under the section title — the page's one-line intro, like Charmiss x Sanrio's. */
  description = "",
): HomepageSection {
  return {
    id,
    type: "product",
    name: title,
    enabled: true,
    eyebrow: "",
    title,
    description,
    banners: { desktop: "", tablet: "", mobile: "" },
    assets: [],
    cta: { label: "", destination: { type: "none" } },
    contentLayout: "image-text",
    productSource,
    products: [],
    collectionId: "",
    categoryId: "",
    createdAt: TODAY_LABEL,
    updatedAt: TODAY_LABEL,
  };
}

/**
 * Landing Page migration — root-cause fix: this used to hand out ids from an
 * incrementing `let nextId` counter, which is fine as long as
 * `buildMockPromotionPages()` is only ever called once per process, but
 * breaks the "baseline builder purity" rule every other content module
 * (`adminCategories.ts`,
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
    isHomepage: false,
    name: "9.9 Beauty Sale",
    slug: "9-9-beauty-sale",
    // Storefront sync — the 9.9 campaign is over (ended 9 ก.ย.) and nothing on the storefront links to it any more.
    status: "unpublished",
    banners: { desktop: heroBanner1, tablet: heroBanner1, mobile: heroBanner1 },
    title: "Beauty Sale",
    description: "รวมไอเทมดูแลผิวและสุขภาพในราคาพิเศษ ลดสูงสุด 50% เฉพาะวันที่ 9.9 นี้เท่านั้น",
    videoUrl: "",
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
    isHomepage: false,
    name: "แคมเปญวันหยุดยาว",
    slug: "long-weekend-campaign",
    status: "scheduled",
    banners: { desktop: heroBanner2, tablet: heroBanner2, mobile: "" },
    title: "Long Weekend Glow",
    description: "เตรียมผิวสวยก่อนวันหยุดยาว พร้อมส่วนลดพิเศษเฉพาะแคมเปญนี้",
    videoUrl: "",
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
    isHomepage: false,
    name: "Charmiss x Sanrio Collection",
    slug: "iconic-glow",
    status: "published",
    banners: { desktop: heroBanner3, tablet: heroBanner3, mobile: heroBanner3 },
    title: "Charming Iconic Glow",
    description:
      "CHARMISS CHARMING ICONIC GLOW CUSHION SPF50+ PA++++\nที่สุดงานผิวโกลว์แห่งปี ที่ใช้แล้วรอดกับทุกสภาพผิว\nคุชชั่นผิวโกลว์เรียกแสง เผยเสน่ห์แรงทุกองศา",
    videoUrl: SEED_VIDEO_URLS["promo-page-003"],
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
    isHomepage: false,
    name: "แคมเปญร่างทดสอบ",
    slug: "draft-test-campaign",
    status: "draft",
    banners: { desktop: "", tablet: "", mobile: "" },
    title: "",
    description: "",
    videoUrl: "",
    products: [],
    sections: [],
    startDate: "",
    startTime: "00:00",
    endDate: "",
    endTime: "23:59",
  },
  {
    id: "promo-page-005",
    isHomepage: false,
    name: "โปรปีใหม่ที่ผ่านมา",
    slug: "new-year-promo-2026",
    status: "unpublished",
    banners: { desktop: heroBanner2, tablet: "", mobile: "" },
    title: "New Year New Glow",
    description: "แคมเปญปีใหม่ที่ปิดไปแล้ว เก็บไว้เป็นข้อมูลอ้างอิง",
    videoUrl: "",
    products: [{ productId: "best-1", variantIds: [] }],
    sections: [],
    startDate: "2026-01-01",
    startTime: "00:00",
    endDate: "2026-01-15",
    endTime: "23:59",
  },
  {
    id: "promo-page-006",
    isHomepage: false,
    name: "สินค้ามาใหม่",
    slug: "new-arrivals",
    status: "published",
    banners: { desktop: "", tablet: "", mobile: "" },
    title: "สินค้ามาใหม่",
    description: "อัปเดตสินค้าใหม่ล่าสุดจาก Charmiss",
    videoUrl: "",
    products: [],
    sections: [seedAutoProductSection("landing-sec-new-arrivals-001", "สินค้ามาใหม่", "new_arrival", "อัปเดตสินค้าใหม่ล่าสุดจาก Charmiss")],
    startDate: "",
    startTime: "00:00",
    endDate: "",
    endTime: "23:59",
  },
  // Same template as "สินค้ามาใหม่" (promo-page-006) — one auto product section — for the nav's Flash Sale / ขายดี.
  {
    id: "promo-page-009",
    isHomepage: false,
    name: "Flash Sale",
    slug: "flash-sale",
    status: "published",
    banners: { desktop: "", tablet: "", mobile: "" },
    title: "Flash Sale",
    description: "ดีลราคาพิเศษเวลาจำกัด รีบช้อปก่อนหมดเวลา",
    videoUrl: "",
    products: [],
    sections: [seedAutoProductSection("landing-sec-flash-sale-001", "สินค้า Flash Sale", "flash_sale", "ดีลราคาพิเศษเวลาจำกัด รีบช้อปก่อนหมดเวลา")],
    startDate: "",
    startTime: "00:00",
    endDate: "",
    endTime: "23:59",
  },
  {
    id: "promo-page-010",
    isHomepage: false,
    name: "สินค้าขายดี",
    slug: "best-sellers",
    status: "published",
    banners: { desktop: "", tablet: "", mobile: "" },
    title: "สินค้าขายดี",
    description: "สินค้าที่ลูกค้า Charmiss เลือกซื้อมากที่สุด",
    videoUrl: "",
    products: [],
    sections: [seedAutoProductSection("landing-sec-best-sellers-001", "สินค้าขายดี", "best_seller", "สินค้าที่ลูกค้า Charmiss เลือกซื้อมากที่สุด")],
    startDate: "",
    startTime: "00:00",
    endDate: "",
    endTime: "23:59",
  },
  {
    id: "promo-page-007",
    isHomepage: false,
    name: "กำลังฮิต",
    slug: "trending",
    status: "published",
    banners: { desktop: "", tablet: "", mobile: "" },
    title: "กำลังฮิตสัปดาห์นี้",
    description: "สินค้าที่กำลังเป็นที่นิยมในตอนนี้",
    videoUrl: "",
    products: [],
    sections: [seedAutoProductSection("landing-sec-trending-001", "สินค้ากำลังฮิต", "trending", "สินค้าที่กำลังเป็นที่นิยมในตอนนี้")],
    startDate: "",
    startTime: "00:00",
    endDate: "",
    endTime: "23:59",
  },
  {
    id: "promo-page-008",
    isHomepage: false,
    name: "โปรโมชั่น",
    slug: "promotions",
    status: "published",
    banners: { desktop: "", tablet: "", mobile: "" },
    title: "โปรโมชั่นแนะนำ",
    description: "รวมสินค้าและโปรโมชั่นแนะนำจาก Charmiss",
    videoUrl: "",
    products: [],
    sections: [seedAutoProductSection("landing-sec-promotions-001", "สินค้าแนะนำ", "featured")],
    startDate: "",
    startTime: "00:00",
    endDate: "",
    endTime: "23:59",
  },
  /**
   * Promotion Page / Homepage Architecture §8/§37 — the one Promotion Page
   * with `isHomepage: true`. Its `sections` reproduce, byte-for-byte, the
   * pre-migration `adminHomepage.ts`'s `buildHomepageSectionBaseline()` (the
   * same baseline `adminHomepageStore.tsx`/`homepageContent.tsx` used to
   * seed their own now-removed separate draft/published snapshots), so
   * folding Homepage into this store is a pure architectural move — the
   * actual rendered content on `/` does not change. `slug`/`banners`/
   * `title`/`description`/`products` are unused by the customer route (`/`
   * always renders via `sections`, never the legacy flat fields) but kept
   * populated for data hygiene and so this row looks sane in the Admin list.
   */
  {
    id: "promo-page-home",
    isHomepage: true,
    name: "หน้าแรก",
    slug: "home",
    status: "published",
    banners: { desktop: "", tablet: "", mobile: "" },
    title: "หน้าแรก",
    description: "",
    videoUrl: "",
    products: [],
    sections: buildHomepageSectionBaseline(),
    startDate: "",
    startTime: "00:00",
    endDate: "",
    endTime: "23:59",
  },
];

/** Seed pages added after launch (nav Flash Sale / ขายดี). A browser that already saved its pages gets them appended once, by id — an existing page is never overwritten. */
const LATE_SEED_PAGE_IDS = ["promo-page-009", "promo-page-010"];

export function withLateSeedPages(stored: PromotionPage[]): PromotionPage[] {
  const missing = buildMockPromotionPages().filter((p) => LATE_SEED_PAGE_IDS.includes(p.id) && !stored.some((s) => s.id === p.id));
  return missing.length ? [...stored, ...missing] : stored;
}

/**
 * Storefront sync seed upgrade. Bump `PROMOTION_PAGE_SEED_VERSION` whenever a
 * seed change must also reach a browser that already saved its pages;
 * `adminContentStore.tsx` runs this once per version step (tracked under its
 * own localStorage key) and writes the result back. Each step only touches a
 * record still in its old seed shape, so an admin's own edits survive.
 *  - v2: 9.9 page → unpublished (expired); Homepage's disabled sample hero →
 *    the three live `HeroBanner.tsx` slides, enabled.
 *  - v4: Iconic Glow page slug `charmiss-x-sanrio` → `iconic-glow` (the old
 *    URL keeps working via `LEGACY_PROMOTION_SLUGS`).
 *  - v5: the homepage's hardcoded blocks (Flash Sale ... FAQ) became built-in
 *    sections; a homepage without any gets them appended, enabled, in the old
 *    on-page order, so `/` renders exactly as before.
 */
export const PROMOTION_PAGE_SEED_VERSION = 5;

/** Retired slugs → their current slug, so `/promotion/<old>` redirects instead of 404ing on links shared before a rename. */
export const LEGACY_PROMOTION_SLUGS: Record<string, string> = { "charmiss-x-sanrio": "iconic-glow" };

export function upgradePromotionPageSeeds(stored: PromotionPage[], fromVersion: number): PromotionPage[] {
  const v3 = fromVersion >= 3 ? stored : upgradeToV3(stored, fromVersion);
  const v4 = fromVersion >= 4 ? v3 : upgradeToV4(v3);
  if (fromVersion >= 5) return v4;
  // v5 — built-in home blocks join the homepage's section list (after everything already there).
  // The hero carousel used to sit on top whatever its list position, and now follows the list, so it moves to the front.
  return v4.map((p) => {
    if (!p.isHomepage || p.sections.some((sec) => isBuiltinSectionType(sec.type))) return p;
    const hero = p.sections.find((sec) => sec.type === "hero");
    const ordered = hero ? [hero, ...p.sections.filter((sec) => sec !== hero)] : p.sections;
    return { ...p, sections: [...ordered, ...buildBuiltinSections()] };
  });
}

function upgradeToV4(v3: PromotionPage[]): PromotionPage[] {
  // v4 — only the untouched seed slug moves, and only if nothing else already took the new one.
  const target = LEGACY_PROMOTION_SLUGS["charmiss-x-sanrio"];
  if (v3.some((p) => p.slug === target)) return v3;
  return v3.map((p) => (p.id === "promo-page-003" && p.slug === "charmiss-x-sanrio" ? { ...p, slug: target } : p));
}

function upgradeToV3(stored: PromotionPage[], fromVersion: number): PromotionPage[] {
  return stored.map((p) => {
    // v2 briefly shipped the hero enabled, which routed `/` through `AdminHeroSlide` — v3 turns that untouched seed back off.
    if (fromVersion === 2 && p.isHomepage) {
      return {
        ...p,
        sections: p.sections.map((sec) =>
          sec.id === HOMEPAGE_HERO_SECTION_ID && sec.enabled && sec.assets.every((a) => a.id.startsWith("hero-asset-")) ? { ...sec, enabled: false } : sec,
        ),
      };
    }
    if (p.id === "promo-page-001" && p.status === "published" && p.endDate === "2026-09-09") return { ...p, status: "unpublished" };
    if (p.isHomepage) {
      return {
        ...p,
        sections: p.sections.map((sec) =>
          sec.id === HOMEPAGE_HERO_SECTION_ID && !sec.enabled && sec.assets.length === 0 && sec.title === "New Year New Glow"
            ? { ...sec, name: "แบนเนอร์สไลด์หน้าแรก", enabled: false, title: "", description: "", banners: { desktop: "", tablet: "", mobile: "" }, assets: buildLiveHeroAssets(), cta: { label: "", destination: { type: "none" } } }
            : sec,
        ),
      };
    }
    return p;
  });
}

export function buildMockPromotionPages(): PromotionPage[] {
  return PROMOTION_PAGE_SEEDS.map((seed) => ({ ...seed, createdAt: TODAY_LABEL, updatedAt: TODAY_LABEL }));
}

const linksToPage = (destination: HomepageDestination | undefined, pageId: string) => destination?.type === "landingPage" && destination.landingPageId === pageId;

/**
 * §26/§44 — before a Landing Page is deleted, this checks every other place
 * a `landingPage` `HomepageDestination` could point at it (another
 * Promotion Page's own Section CTA) and returns a human-readable list so the
 * delete confirmation can warn the admin instead of silently leaving a
 * dangling `/promotion/:slug` link behind.
 *
 * Promotion Page / Homepage Architecture — Homepage is now just another row
 * in `refs.allPages` (the `allPages` loop below already walks its
 * `sections`), so there is no separate `homepageSections` param to pass
 * anymore — one fewer thing every call site needed to assemble.
 */
export function findLandingPageReferences(
  pageId: string,
  refs: {
    allPages: PromotionPage[];
  },
): string[] {
  const hits: string[] = [];
  for (const p of refs.allPages) {
    if (p.id === pageId) continue;
    for (const s of p.sections) {
      if (linksToPage(s.cta.destination, pageId)) hits.push(`${p.isHomepage ? "หน้าแรก" : "หน้าแคมเปญ"} "${p.name}"`);
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
export const buildMockLandingPages = buildMockPromotionPages;
