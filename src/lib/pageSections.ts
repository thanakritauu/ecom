import type { PromotionPageProductRef } from "./adminContent";
import { upgradeSeedBanners } from "./seedBanners";
import { isVideoMedia, mediaErrors, mediaImage, mediaSrc, normalizeMedia, normalizeMediaSet, type MediaValue } from "./media";

/**
 * Landing Page Admin Management — moved out of `adminHomepage.ts` (which
 * re-exports everything here for full backward compatibility — no existing
 * import site anywhere in the app needed to change) so this generic
 * "Section" architecture can be shared by BOTH the Homepage (`HomepageContent`,
 * still in `adminHomepage.ts`) and Landing Pages (`LandingPage.sections`, in
 * `adminContent.ts`) without a circular import: `adminContent.ts` needs
 * `HomepageSection`/`normalizeHomepageSection` from here, and this file only
 * ever needs a *type* from `adminContent.ts` (`PromotionPageProductRef`,
 * erased at compile time) — never a value from it, so there is no real
 * runtime cycle. One Section model, one Destination model, reused by every
 * page-like content surface in the project — not a second parallel system
 * per surface.
 */

/**
 * Built-in sections: the storefront's bespoke home blocks (Flash Sale with its
 * countdown, Best Sellers' category tabs, the coupon claim band, ...). Each one
 * renders its existing component and pulls its own data exactly as before;
 * a section record only controls where it sits, whether it shows, and an
 * optional heading override (`title`, empty = the component's own heading).
 */
export const BUILTIN_SECTION_TYPES = ["flash_sale", "best_sellers", "coupons", "new_arrivals", "trending", "reviews", "faq"] as const;
export type BuiltinSectionType = (typeof BUILTIN_SECTION_TYPES)[number];

/** Section types added with the page builder (หน้าแคมเปญ + หน้าแรก share them). Each keeps its own settings object on the section, see `HomepageSection`. */
export const BLOCK_SECTION_TYPES = ["banner_slider", "banner_grid", "countdown_banner", "product_grid", "divider"] as const;
export type BlockSectionType = (typeof BLOCK_SECTION_TYPES)[number];

export type HomepageSectionType = "hero" | "promotion_banner" | "product" | "content" | "cta" | BlockSectionType | BuiltinSectionType;

/** Palette group in the page builder. */
export type SectionTypeGroup = "media" | "products" | "builtin" | "content";

/** Icon key; `SectionTypeIcon` (admin/content/SectionTypeIcon.tsx) draws it. */
export type SectionIconName = "hero" | "banner" | "slider" | "grid" | "countdown" | "products" | "content" | "cta" | "divider" | "flash" | "coupon" | "star" | "faq";

export type SectionTypeMeta = { label: string; description: string; group: SectionTypeGroup; icon: SectionIconName };

/**
 * The one registry of section types: label (admin + builder palette), a
 * one-line description, the palette group and an icon key. Every surface
 * that lists or names section types reads this.
 */
export const SECTION_TYPE_META: Record<HomepageSectionType, SectionTypeMeta> = {
  hero: { label: "แบนเนอร์หลัก", description: "แบนเนอร์ใหญ่บนสุดของหน้า ใส่รูป วิดีโอ หรือ YouTube ได้หลายสไลด์", group: "media", icon: "hero" },
  promotion_banner: { label: "แบนเนอร์โปรโมชั่น", description: "แบนเนอร์รูปเดียว ตั้งรูปแยกเดสก์ท็อป แท็บเล็ต มือถือ และกดไปลิงก์ได้", group: "media", icon: "banner" },
  banner_slider: { label: "แบนเนอร์สไลด์", description: "หลายรูปหรือวิดีโอเลื่อนต่อกัน รูปเต็มความกว้างไม่ถูกตัด แต่ละสไลด์มีลิงก์ของตัวเอง", group: "media", icon: "slider" },
  banner_grid: { label: "แบนเนอร์หลายรูป", description: "รูป 2 หรือ 3 รูปเรียงในแถวเดียว แต่ละรูปมีลิงก์ของตัวเอง", group: "media", icon: "grid" },
  countdown_banner: { label: "แบนเนอร์นับถอยหลัง", description: "แบนเนอร์พร้อมนาฬิกานับถอยหลังถึงเวลาที่ตั้ง และปุ่มชวนคลิก", group: "media", icon: "countdown" },
  product: { label: "รายการสินค้า", description: "สินค้าจากกลุ่มสินค้าพิเศษ หมวดหมู่ หรือให้ระบบเลือกอัตโนมัติ", group: "products", icon: "products" },
  product_grid: { label: "การ์ดสินค้า", description: "เลือกสินค้าหรือตัวเลือกสินค้าเอง จัดเป็นตารางหรือแถวเลื่อนแนวนอน", group: "products", icon: "products" },
  content: { label: "รูปพร้อมข้อความ", description: "รูปคู่กับหัวข้อ ข้อความ และปุ่ม", group: "content", icon: "content" },
  cta: { label: "ปุ่มชวนคลิก", description: "หัวข้อ ข้อความสั้น และปุ่มเดียว", group: "content", icon: "cta" },
  divider: { label: "เส้นคั่น / ระยะห่าง", description: "เว้นระยะระหว่างส่วน เลือกใส่เส้นคั่นได้", group: "content", icon: "divider" },
  flash_sale: { label: "Flash Sale", description: "สินค้าแฟลชเซลพร้อมนับถอยหลัง ดึงข้อมูลอัตโนมัติ", group: "builtin", icon: "flash" },
  best_sellers: { label: "สินค้าขายดี", description: "สินค้าขายดีพร้อมแท็บหมวด ดึงข้อมูลอัตโนมัติ", group: "builtin", icon: "products" },
  coupons: { label: "คูปองส่วนลด", description: "คูปองที่ตั้งให้แสดงหน้าแรก พร้อมปุ่มเก็บคูปอง", group: "builtin", icon: "coupon" },
  new_arrivals: { label: "มาใหม่", description: "สินค้ามาใหม่ ดึงข้อมูลอัตโนมัติ", group: "builtin", icon: "products" },
  trending: { label: "กำลังฮิตสัปดาห์นี้", description: "สินค้ากำลังฮิต ดึงข้อมูลอัตโนมัติ", group: "builtin", icon: "products" },
  reviews: { label: "รีวิวลูกค้า", description: "คะแนนรีวิวและคลิปรีวิวจาก TikTok", group: "builtin", icon: "star" },
  faq: { label: "คำถามที่พบบ่อย", description: "คำถามที่พบบ่อยชุดเดียวกับหน้าช่วยเหลือ", group: "builtin", icon: "faq" },
};

/** Kept for every existing import site; same object as `SECTION_TYPE_META`. */
export const HOMEPAGE_SECTION_TYPE_META: Record<HomepageSectionType, SectionTypeMeta> = SECTION_TYPE_META;

/** Palette order in the builder (and any "add section" menu). */
export const SECTION_TYPE_ORDER: HomepageSectionType[] = [
  "hero",
  "banner_slider",
  "promotion_banner",
  "banner_grid",
  "countdown_banner",
  "product_grid",
  "product",
  "content",
  "cta",
  "divider",
  ...BUILTIN_SECTION_TYPES,
];

export const SECTION_TYPE_GROUP_LABEL: Record<SectionTypeGroup, string> = {
  media: "แบนเนอร์และสื่อ",
  products: "สินค้า",
  content: "ข้อความและการจัดหน้า",
  builtin: "ส่วนสำเร็จรูป",
};

/**
 * `note`: what the block shows and where its data comes from (Admin card + form).
 * `defaultTitle`: the component's own heading, used when `title` is empty;
 * absent = the heading is artwork (Flash Sale's wordmark) and can't be changed.
 */
export const BUILTIN_SECTION_META: Record<BuiltinSectionType, { note: string; defaultTitle?: string }> = {
  flash_sale: { note: "ดึงสินค้าแฟลชเซลอัตโนมัติ พร้อมนับถอยหลัง ถ้าไม่มีสินค้าแฟลชเซลจะซ่อนเอง" },
  best_sellers: { note: "ดึงสินค้าขายดีอัตโนมัติ พร้อมแท็บกรองตามหมวดในเมนู", defaultTitle: "สินค้าขายดี" },
  coupons: { note: "ดึงคูปองที่ตั้งให้แสดงหน้าแรกอัตโนมัติ พร้อมปุ่มเก็บคูปอง ถ้าไม่มีคูปองจะซ่อนเอง", defaultTitle: "คูปองส่วนลด" },
  new_arrivals: { note: "ดึงสินค้ามาใหม่อัตโนมัติ ถ้าไม่มีสินค้าจะซ่อนเอง", defaultTitle: "มาใหม่" },
  trending: { note: "ดึงสินค้ากำลังฮิตอัตโนมัติ ถ้าไม่มีสินค้าจะซ่อนเอง", defaultTitle: "กำลังฮิตสัปดาห์นี้" },
  reviews: { note: "คะแนนรีวิวและคลิปรีวิวจาก TikTok ที่เปิดไว้ในเมนูรีวิว ถ้าไม่มีคลิปจะซ่อนเอง", defaultTitle: "#CharmissReviews" },
  faq: { note: "คำถามที่พบบ่อยชุดเดียวกับหน้าช่วยเหลือ", defaultTitle: "คำถามที่พบบ่อย" },
};

export function isBuiltinSectionType(type: unknown): type is BuiltinSectionType {
  return typeof type === "string" && (BUILTIN_SECTION_TYPES as readonly string[]).includes(type);
}

/** Section types removed from the model (e.g. the old "campaign" section) can still sit in `localStorage`; page normalizers drop any section whose type isn't in this list. */
export function isHomepageSectionType(type: unknown): type is HomepageSectionType {
  return typeof type === "string" && Object.prototype.hasOwnProperty.call(HOMEPAGE_SECTION_TYPE_META, type);
}

/**
 * Product Section — Product Source Rule (Promotion Page / Homepage
 * Architecture §4) — a Product Section may source products from exactly one
 * of Collection, Category, or a Dynamic rule; it may never hold its own
 * manually-picked `Product[]`. `"manual"` stays in this union (and the
 * `products` field below stays populated for it) purely as a read path for
 * data saved before this rule existed — `HomepageSectionForm.tsx`'s Product
 * Source dropdown no longer offers it, so no new Product Section can be
 * created in this state; an existing one can only be migrated away from it
 * (create/use a Collection, then switch the section to `"collection"`),
 * never further edited as manual picks.
 */
export type HomepageProductSource = "manual" | "best_seller" | "flash_sale" | "new_arrival" | "trending" | "featured" | "collection" | "category";

export const HOMEPAGE_PRODUCT_SOURCE_META: Record<HomepageProductSource, { label: string }> = {
  manual: { label: "เลือกสินค้าเอง (แบบเดิม)" },
  best_seller: { label: "สินค้าขายดี" },
  flash_sale: { label: "Flash Sale" },
  new_arrival: { label: "สินค้ามาใหม่" },
  trending: { label: "สินค้ากำลังฮิต" },
  featured: { label: "สินค้าแนะนำ" },
  collection: { label: "กลุ่มสินค้าพิเศษ" },
  category: { label: "หมวดหมู่สินค้า" },
};

/** Each crop is an image (plain string, the original shape) or a video (`MediaItem`), see `~/lib/media`. */
export type HomepageBanners = {
  desktop: MediaValue;
  tablet: MediaValue;
  mobile: MediaValue;
};

/**
 * Hero Banner — Multi-Asset Support. `"hero"` sections used to render exactly
 * one image (`HomepageSection.banners`, still kept below for backward
 * compatibility with every already-saved section). A hero section can now
 * additionally hold up to `MAX_HERO_ASSETS` of these — image, self-hosted
 * video, or a YouTube URL — rendered as the carousel's own slide list
 * (`HeroBanner.tsx`) instead of one static image per section. `source` is
 * always the one raw value for that type: an uploaded/object-URL for
 * `image`/`video`, or the admin-pasted watch URL for `youtube` (resolved to
 * an embeddable URL at render time via `getYoutubeEmbedUrl`, never
 * transformed before saving).
 */
export type HeroAssetType = "image" | "video" | "youtube";

export type HeroAsset = {
  id: string;
  type: HeroAssetType;
  /** The Desktop/default source — unchanged meaning for `video`/`youtube`; for `image` this is specifically the Desktop artwork. */
  source: string;
  /**
   * Hero Banner — Responsive Artwork (Phase 01 Update). `"image"` only;
   * optional Tablet/Mobile crops prepared for this standard's own aspect
   * ratios (Tablet 4:3, Mobile 3:4 — see `HeroBanner.tsx`'s
   * `HERO_ASPECT_CLASS`), never a resize of `source`. Both fall back to
   * `source` when empty, so every asset saved before these fields existed
   * (and the admin form, not yet extended to set them) keeps rendering
   * exactly as before — one Desktop image at every breakpoint — rather than
   * breaking or requiring a data migration.
   */
  tabletSource?: MediaValue;
  mobileSource?: MediaValue;
  /** `"video"` only: required cover image (see `~/lib/media` `MediaItem.poster`). */
  poster?: string;
  /** `"video"` only: admin toggle "วิดีโอนี้มีเสียง"; storefront shows a mute/unmute button. */
  hasAudio?: boolean;
};

/** The Desktop slot of an image/video hero asset as one `MediaValue` (YouTube assets have none). */
export function heroAssetDesktopMedia(asset: HeroAsset): MediaValue {
  if (asset.type === "video") return { type: "video", src: asset.source, poster: asset.poster ?? "", hasAudio: !!asset.hasAudio };
  return asset.type === "image" ? asset.source : "";
}

/** Writes a `MediaValue` back into an asset's Desktop slot (type follows the file). */
export function withHeroAssetDesktopMedia(asset: HeroAsset, media: MediaValue): HeroAsset {
  if (isVideoMedia(media)) return { ...asset, type: "video", source: media.src, poster: media.poster ?? "", hasAudio: !!media.hasAudio };
  return { ...asset, type: "image", source: mediaSrc(media), poster: undefined, hasAudio: undefined };
}

export const HERO_ASSET_TYPE_META: Record<HeroAssetType, { label: string }> = {
  image: { label: "รูปภาพ" },
  video: { label: "วิดีโอ" },
  youtube: { label: "YouTube" },
};

export const MAX_HERO_ASSETS = 10;

let nextHeroAssetRuntimeId = 1;
export const genHeroAssetId = () => `hero-asset-runtime-${Date.now()}-${nextHeroAssetRuntimeId++}`;

export function emptyHeroAsset(type: HeroAssetType = "image"): HeroAsset {
  return { id: genHeroAssetId(), type, source: "" };
}

/** Accepts youtube.com/watch?v=, youtu.be/, and youtube.com/embed/ forms — the shapes an admin is realistically going to paste. */
const YOUTUBE_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;

export function extractYoutubeVideoId(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.replace(/^www\./, "");
    let id: string | null = null;
    if (host === "youtu.be") {
      id = parsed.pathname.slice(1);
    } else if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      if (parsed.pathname === "/watch") id = parsed.searchParams.get("v");
      else if (parsed.pathname.startsWith("/embed/")) id = parsed.pathname.replace("/embed/", "");
      else if (parsed.pathname.startsWith("/shorts/")) id = parsed.pathname.replace("/shorts/", "");
    }
    id = id?.split(/[?&]/)[0] ?? null;
    return id && YOUTUBE_ID_PATTERN.test(id) ? id : null;
  } catch {
    return null;
  }
}

export function isValidYoutubeUrl(url: string): boolean {
  return extractYoutubeVideoId(url) !== null;
}

export function getYoutubeEmbedUrl(url: string): string | null {
  const id = extractYoutubeVideoId(url);
  return id ? `https://www.youtube.com/embed/${id}` : null;
}

/** An incomplete asset (no file/URL yet, or an invalid YouTube URL) must never be allowed to save — called from `validatePublishRequirements` for every "hero" section. */
export function validateHeroAssets(assets: HeroAsset[]): string[] {
  const errors: string[] = [];
  if (assets.length > MAX_HERO_ASSETS) errors.push(`แบนเนอร์สไลด์ใส่ได้สูงสุด ${MAX_HERO_ASSETS} รายการ`);
  assets.forEach((asset, i) => {
    if (!asset.source.trim()) errors.push(`แบนเนอร์สไลด์ที่ ${i + 1} ยังไม่มีไฟล์หรือลิงก์`);
    else if (asset.type === "youtube" && !isValidYoutubeUrl(asset.source)) errors.push(`แบนเนอร์สไลด์ที่ ${i + 1} ลิงก์ YouTube ไม่ถูกต้อง`);
    else if (asset.type === "video" && !asset.poster) errors.push(`แบนเนอร์สไลด์ที่ ${i + 1} เป็นวิดีโอ กรุณาใส่ภาพปกวิดีโอ`);
    if (asset.type !== "youtube") {
      errors.push(...mediaErrors(asset.tabletSource, `แบนเนอร์สไลด์ที่ ${i + 1} ขนาดแท็บเล็ต`));
      errors.push(...mediaErrors(asset.mobileSource, `แบนเนอร์สไลด์ที่ ${i + 1} ขนาดมือถือ`));
    }
  });
  return errors;
}

/**
 * One destination shape reused by every CTA/click-through in this system
 * (Hero, Promotion Banner, Content, CTA) instead of a separate
 * "type this URL yourself" field per section. `landingPage`/`product`/
 * `category`/`collection` store only the *id*; the actual href is always
 * derived at render time (`resolveHomepageDestinationHref`) — slug/id is the
 * one source of truth, never duplicated into a second URL field.
 *
 * This discriminated union IS the project's single "Destination" source of
 * truth (Category/Landing Page/Collection/Product), not a second parallel
 * type. `category`/`collection` resolve to the *existing* `/products`
 * listing page filtered by query string (`categoryListHref`/
 * `collectionListHref` below) — no dedicated Category/Collection landing
 * page. Any other stored `type` (e.g. an old "brand"/"campaign" target)
 * falls through to `{ type: "none" }` in `normalizeHomepageDestination`.
 *
 * Landing Page Architecture & Promotion Page Migration — this used to be
 * `{ type: "promotion"; promotionPageId: string }`. Every already-serialized
 * Banner/Homepage-section CTA in `localStorage` still has that
 * exact shape — `normalizeHomepageDestination` below transparently upgrades
 * it to `landingPage` the moment it's read, so nothing needed a data
 * migration and no destination silently broke.
 */
export type HomepageDestination =
  | { type: "none" }
  | { type: "internal"; path: string }
  | { type: "landingPage"; landingPageId: string }
  | { type: "product"; productId: string }
  | { type: "category"; categoryId: string }
  | { type: "collection"; collectionId: string }
  | { type: "external"; url: string };

/** The pre-migration shape `normalizeHomepageDestination` still accepts and upgrades — never part of the canonical `HomepageDestination` union above. */
type LegacyPromotionDestination = { type: "promotion"; promotionPageId?: string };

export type HomepageCta = {
  label: string;
  destination: HomepageDestination;
};

/** Content section layout — Landing Page Frontend Polish §15. Ignored by every other section type. */
export type HomepageContentLayout = "image-text" | "text-image" | "full-width";

/**
 * One picture (or MP4) + alt text + where it links: a slide of
 * `banner_slider`, a tile of `banner_grid`. Single upload, no device crops;
 * `aspect` (width / height) is measured in admin when the file is chosen so
 * the storefront can reserve the right height before it loads (0 = unknown).
 */
export type SectionMediaItem = {
  id: string;
  media: MediaValue;
  alt: string;
  destination: HomepageDestination;
  aspect: number;
};

export type BannerSliderSettings = {
  slides: SectionMediaItem[];
  autoplay: boolean;
  /** Seconds per slide when `autoplay` is on. */
  intervalSeconds: number;
  showDots: boolean;
  showArrows: boolean;
};

export type BannerGridColumns = 2 | 3;
export type BannerGridSettings = {
  columns: BannerGridColumns;
  /** Always `MAX_GRID_TILES` long so switching 3 to 2 columns and back keeps the third tile; only the first `columns` show. */
  tiles: SectionMediaItem[];
};

export type CountdownBackground = "image" | "brand";
export type CountdownAfterEnd = "hide" | "message";
export type CountdownBannerSettings = {
  background: CountdownBackground;
  /** Image only (`background: "image"`). */
  image: string;
  /** Local date-time `YYYY-MM-DDTHH:mm` (the admin's clock), same format as `<input type="datetime-local">`. */
  endsAt: string;
  afterEnd: CountdownAfterEnd;
  /** Shown instead of the timer when `afterEnd` is "message". */
  endedText: string;
};

export type ProductGridLayout = "grid" | "rail";
export type ProductGridColumns = 2 | 3 | 4 | 5;
export type ProductGridSettings = {
  layout: ProductGridLayout;
  /** Desktop columns for `grid` (mobile is always 2). */
  columns: ProductGridColumns;
  /** `grid` only: at most this many desktop rows, 0 = show every product. */
  maxRows: number;
};

export type DividerSize = "s" | "m" | "l";
export type DividerSettings = { size: DividerSize; line: boolean };

export const MAX_SLIDER_SLIDES = 10;
export const MAX_GRID_TILES = 3;
export const SLIDER_INTERVAL_RANGE = { min: 2, max: 30, default: 5 } as const;
export const PRODUCT_GRID_MAX_ROWS = 10;
export const COUNTDOWN_ENDED_TEXT_DEFAULT = "หมดเวลาแล้ว";

export type HomepageSection = {
  id: string;
  type: HomepageSectionType;
  /** Admin-facing label in the section list — distinct from `title`, which is the customer-facing on-page heading. */
  name: string;
  enabled: boolean;
  /** Small kicker line above `title` (e.g. "NEW", "LIMITED EDITION") — hero/content/cta only, optional, purely additive so every pre-existing section (empty string) renders exactly as before. */
  eyebrow: string;
  title: string;
  description: string;
  banners: HomepageBanners;
  /** "hero" only — optional multi-asset carousel content (image/video/YouTube, up to `MAX_HERO_ASSETS`). Empty array = fall back to `banners` (every pre-existing hero section), never a required field. */
  assets: HeroAsset[];
  cta: HomepageCta;
  /** "content" only — Landing Page Frontend Polish §15. */
  contentLayout: HomepageContentLayout;
  /** "product" only — ignored for every other type. */
  productSource: HomepageProductSource;
  /** "product" (when `productSource === "manual"`) — same shape `PromotionPageProductPicker` already edits, reused as-is. */
  products: PromotionPageProductRef[];
  /** "product" only, when `productSource === "collection"` — id into `~/lib/adminCollections`'s `ProductCollection[]`. Resolved live at render time, never copied in. */
  collectionId: string;
  /** "product" only, when `productSource === "category"` — id into `~/lib/adminCategories`'s `AdminCategory[]`. Resolved live at render time by filtering the Product Catalog on `categoryId`, never copied in — Category stays classification-only, never a page builder (§6). */
  categoryId: string;
  /**
   * Per-type settings of the page-builder section types. Optional so every
   * record saved before they existed (and every hand-built section literal)
   * stays valid; `normalizeHomepageSection` fills the one matching the
   * section's type, and readers use `sliderSettings(s)` etc., which fall
   * back to the defaults. `product_grid` keeps its picks in `products`
   * (product or SKU level), its heading in `title` and its "ดูทั้งหมด" link
   * in `cta.destination`; `countdown_banner` uses `title` / `description`
   * / `cta` for its text and button.
   */
  slider?: BannerSliderSettings;
  grid?: BannerGridSettings;
  countdown?: CountdownBannerSettings;
  productGrid?: ProductGridSettings;
  divider?: DividerSettings;
  createdAt: string;
  updatedAt: string;
};

export function emptyDestination(): HomepageDestination {
  return { type: "none" };
}
export function emptyBanners(): HomepageBanners {
  return { desktop: "", tablet: "", mobile: "" };
}
export function emptyCta(): HomepageCta {
  return { label: "", destination: emptyDestination() };
}

export function normalizeHomepageDestination(d: Partial<HomepageDestination> | LegacyPromotionDestination | undefined): HomepageDestination {
  switch (d?.type) {
    case "internal":
      return { type: "internal", path: (d as { path?: string }).path ?? "" };
    case "landingPage":
      return { type: "landingPage", landingPageId: (d as { landingPageId?: string }).landingPageId ?? "" };
    // Legacy shape (pre "Landing Page Architecture & Promotion Page Migration")
    // — upgraded transparently the moment it's read, never persisted as-is again.
    case "promotion":
      return { type: "landingPage", landingPageId: (d as LegacyPromotionDestination).promotionPageId ?? "" };
    case "product":
      return { type: "product", productId: (d as { productId?: string }).productId ?? "" };
    case "category":
      return { type: "category", categoryId: (d as { categoryId?: string }).categoryId ?? "" };
    case "collection":
      return { type: "collection", collectionId: (d as { collectionId?: string }).collectionId ?? "" };
    case "external":
      return { type: "external", url: (d as { url?: string }).url ?? "" };
    default:
      return emptyDestination();
  }
}

/**
 * Root-cause guard — anything that comes back out of `localStorage` may
 * predate a field the current `HomepageSection` contract relies on, so every
 * section (and every nested product ref) is normalized before a component
 * ever reads `section.banners`/`section.products`/`variant.images`.
 */
export function normalizeHomepageSection(s: Partial<HomepageSection> & { id: string }): HomepageSection {
  return {
    id: s.id,
    type: isHomepageSectionType(s.type) ? s.type : "content",
    name: s.name ?? "",
    enabled: s.enabled ?? true,
    eyebrow: s.eyebrow ?? "",
    title: s.title ?? "",
    description: s.description ?? "",
    banners: upgradeSeedBanners(normalizeMediaSet(s.banners)),
    assets: Array.isArray(s.assets)
      ? s.assets.slice(0, MAX_HERO_ASSETS).map((a) => ({
          id: a.id ?? genHeroAssetId(),
          type: a.type ?? "image",
          source: a.source ?? "",
          tabletSource: normalizeMedia(a.tabletSource) || undefined,
          mobileSource: normalizeMedia(a.mobileSource) || undefined,
          ...(a.type === "video" ? { poster: typeof a.poster === "string" ? a.poster : "", hasAudio: !!a.hasAudio } : {}),
        }))
      : [],
    cta: {
      label: s.cta?.label ?? "",
      destination: normalizeHomepageDestination(s.cta?.destination),
    },
    contentLayout: s.contentLayout ?? "image-text",
    productSource: s.productSource ?? "manual",
    products: Array.isArray(s.products)
      ? s.products.map((ref) => ({ productId: ref.productId, variantIds: Array.isArray(ref.variantIds) ? ref.variantIds : [] }))
      : [],
    collectionId: s.collectionId ?? "",
    categoryId: s.categoryId ?? "",
    ...normalizeBlockSettings(s),
    createdAt: s.createdAt ?? "",
    updatedAt: s.updatedAt ?? "",
  };
}

/* ------------------------------------------------------------------ */
/* Page-builder section types: defaults, normalizers, factory          */
/* ------------------------------------------------------------------ */

let nextItemRuntimeId = 1;
export const genSectionItemId = () => `sec-item-${Date.now()}-${nextItemRuntimeId++}`;

export function emptySectionMediaItem(): SectionMediaItem {
  return { id: genSectionItemId(), media: "", alt: "", destination: emptyDestination(), aspect: 0 };
}

function normalizeSectionMediaItem(raw: Partial<SectionMediaItem> | undefined): SectionMediaItem {
  const aspect = Number(raw?.aspect);
  return {
    id: typeof raw?.id === "string" && raw.id ? raw.id : genSectionItemId(),
    media: normalizeMedia(raw?.media),
    alt: typeof raw?.alt === "string" ? raw.alt : "",
    destination: normalizeHomepageDestination(raw?.destination),
    aspect: Number.isFinite(aspect) && aspect > 0 ? aspect : 0,
  };
}

const clampInt = (v: unknown, min: number, max: number, fallback: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

export function defaultSliderSettings(): BannerSliderSettings {
  return { slides: [emptySectionMediaItem()], autoplay: true, intervalSeconds: SLIDER_INTERVAL_RANGE.default, showDots: true, showArrows: true };
}
export function defaultGridSettings(): BannerGridSettings {
  return { columns: 2, tiles: Array.from({ length: MAX_GRID_TILES }, emptySectionMediaItem) };
}
export function defaultCountdownSettings(): CountdownBannerSettings {
  return { background: "brand", image: "", endsAt: "", afterEnd: "hide", endedText: COUNTDOWN_ENDED_TEXT_DEFAULT };
}
export function defaultProductGridSettings(): ProductGridSettings {
  return { layout: "grid", columns: 4, maxRows: 0 };
}
export function defaultDividerSettings(): DividerSettings {
  return { size: "m", line: false };
}

export function normalizeSliderSettings(raw: Partial<BannerSliderSettings> | undefined): BannerSliderSettings {
  const d = defaultSliderSettings();
  if (!raw || typeof raw !== "object") return d;
  return {
    slides: Array.isArray(raw.slides) ? raw.slides.slice(0, MAX_SLIDER_SLIDES).map(normalizeSectionMediaItem) : d.slides,
    autoplay: typeof raw.autoplay === "boolean" ? raw.autoplay : d.autoplay,
    intervalSeconds: clampInt(raw.intervalSeconds, SLIDER_INTERVAL_RANGE.min, SLIDER_INTERVAL_RANGE.max, d.intervalSeconds),
    showDots: typeof raw.showDots === "boolean" ? raw.showDots : d.showDots,
    showArrows: typeof raw.showArrows === "boolean" ? raw.showArrows : d.showArrows,
  };
}

export function normalizeGridSettings(raw: Partial<BannerGridSettings> | undefined): BannerGridSettings {
  const tiles = Array.isArray(raw?.tiles) ? raw!.tiles.slice(0, MAX_GRID_TILES).map(normalizeSectionMediaItem) : [];
  while (tiles.length < MAX_GRID_TILES) tiles.push(emptySectionMediaItem());
  return { columns: raw?.columns === 3 ? 3 : 2, tiles };
}

export function normalizeCountdownSettings(raw: Partial<CountdownBannerSettings> | undefined): CountdownBannerSettings {
  const d = defaultCountdownSettings();
  if (!raw || typeof raw !== "object") return d;
  return {
    background: raw.background === "image" ? "image" : "brand",
    image: typeof raw.image === "string" ? raw.image : "",
    endsAt: typeof raw.endsAt === "string" ? raw.endsAt : "",
    afterEnd: raw.afterEnd === "message" ? "message" : "hide",
    endedText: typeof raw.endedText === "string" ? raw.endedText : d.endedText,
  };
}

export function normalizeProductGridSettings(raw: Partial<ProductGridSettings> | undefined): ProductGridSettings {
  const d = defaultProductGridSettings();
  if (!raw || typeof raw !== "object") return d;
  return {
    layout: raw.layout === "rail" ? "rail" : "grid",
    columns: clampInt(raw.columns, 2, 5, d.columns) as ProductGridColumns,
    maxRows: clampInt(raw.maxRows, 0, PRODUCT_GRID_MAX_ROWS, d.maxRows),
  };
}

export function normalizeDividerSettings(raw: Partial<DividerSettings> | undefined): DividerSettings {
  const d = defaultDividerSettings();
  if (!raw || typeof raw !== "object") return d;
  return { size: raw.size === "s" || raw.size === "l" ? raw.size : "m", line: !!raw.line };
}

/** Only the settings object matching the section's type is kept (and always present for it). */
function normalizeBlockSettings(s: Partial<HomepageSection>): Pick<HomepageSection, "slider" | "grid" | "countdown" | "productGrid" | "divider"> {
  switch (s.type) {
    case "banner_slider":
      return { slider: normalizeSliderSettings(s.slider) };
    case "banner_grid":
      return { grid: normalizeGridSettings(s.grid) };
    case "countdown_banner":
      return { countdown: normalizeCountdownSettings(s.countdown) };
    case "product_grid":
      return { productGrid: normalizeProductGridSettings(s.productGrid) };
    case "divider":
      return { divider: normalizeDividerSettings(s.divider) };
    default:
      return {};
  }
}

/** Settings readers: always a complete object, defaults when the section has none yet. */
export const sliderSettings = (s: HomepageSection): BannerSliderSettings => s.slider ?? normalizeSliderSettings(undefined);
export const gridSettings = (s: HomepageSection): BannerGridSettings => s.grid ?? normalizeGridSettings(undefined);
export const countdownSettings = (s: HomepageSection): CountdownBannerSettings => s.countdown ?? normalizeCountdownSettings(undefined);
export const productGridSettings = (s: HomepageSection): ProductGridSettings => s.productGrid ?? normalizeProductGridSettings(undefined);
export const dividerSettings = (s: HomepageSection): DividerSettings => s.divider ?? normalizeDividerSettings(undefined);

/** `endsAt` (local `YYYY-MM-DDTHH:mm`) as epoch ms, or NaN when empty/invalid. */
export function countdownEndsAtMs(endsAt: string): number {
  if (!endsAt) return NaN;
  return new Date(endsAt).getTime();
}

/** Two aspect ratios count as the same when within 2% (rounding in exported files). */
export function sameAspect(a: number, b: number): boolean {
  if (!a || !b) return true;
  return Math.abs(a - b) / Math.max(a, b) < 0.02;
}

/**
 * New section of any type with its defaults (what the builder's palette and
 * "+ เพิ่มส่วน" create). `name` defaults to the type label (+ " ใหม่" for
 * editable types); `now` is the createdAt/updatedAt label.
 */
export function createSection(type: HomepageSectionType, opts: { id?: string; name?: string; now?: string } = {}): HomepageSection {
  const label = SECTION_TYPE_META[type].label;
  return normalizeHomepageSection({
    id: opts.id ?? genHomepageSectionId(),
    type,
    name: opts.name ?? (isBuiltinSectionType(type) ? label : `${label} ใหม่`),
    enabled: true,
    productSource: type === "product" ? "best_seller" : "manual",
    banners: emptyBanners(),
    createdAt: opts.now ?? "",
    updatedAt: opts.now ?? "",
  });
}

/**
 * The one place `/products?category=<slug>` is spelled out — nav rendering
 * (Header/MobileMenu's category row) and `resolveHomepageDestinationHref`'s
 * "category" case both call this instead of hardcoding the query shape
 * twice. Reuses the *existing* `/products` listing route's `category` query
 * param — no new Category landing page or route.
 */
export function categoryListHref(slug: string): string {
  return `/products?category=${encodeURIComponent(slug)}`;
}

/**
 * Same idea as `categoryListHref`, for a Product Collection. Collections
 * have no `slug` field, so the query value is the Collection's own `id` —
 * still one value, never a duplicated second identifier.
 */
export function collectionListHref(collectionId: string): string {
  return `/products?collection=${encodeURIComponent(collectionId)}`;
}

/**
 * Resolves a destination to a real href without either side (Admin preview,
 * the real storefront) hardcoding a URL. `lookups` is supplied by the
 * caller — see `useAdminDestinationLookups()` (Admin) and
 * `useStorefrontDestinationLookups()` (storefront), the two composed
 * implementations every call site should use instead of hand-building this
 * object inline.
 */
export function resolveHomepageDestinationHref(
  destination: HomepageDestination | undefined,
  lookups: {
    landingPageSlug: (id: string) => string | undefined;
    productSlug: (id: string) => string | undefined;
    categorySlug: (id: string) => string | undefined;
    /** Returns the Collection's own id when it exists — see `collectionListHref`'s doc comment on why this isn't a "slug". */
    collectionSlug: (id: string) => string | undefined;
  },
): string | undefined {
  if (!destination) return undefined;
  switch (destination.type) {
    case "internal":
      return destination.path.trim() || undefined;
    case "external":
      return destination.url.trim() || undefined;
    case "landingPage": {
      // The customer route stays `/promotion/:slug` (preserved, not renamed)
      // — only the *destination kind's* name changed, not the route it
      // resolves to.
      const slug = lookups.landingPageSlug(destination.landingPageId);
      return slug ? `/promotion/${slug}` : undefined;
    }
    case "product": {
      const slug = lookups.productSlug(destination.productId);
      return slug ? `/product/${slug}` : undefined;
    }
    case "category": {
      const slug = lookups.categorySlug(destination.categoryId);
      return slug ? categoryListHref(slug) : undefined;
    }
    case "collection": {
      const id = lookups.collectionSlug(destination.collectionId);
      return id ? collectionListHref(id) : undefined;
    }
    default:
      return undefined;
  }
}

/** Runtime "+ Add Section" (Editor-only) needs genuinely unique ids — baselines use fixed ids instead so calling a baseline builder twice in one session never produces two different "same" baselines. */
let nextRuntimeId = 1;
export const genHomepageSectionId = () => `home-sec-runtime-${Date.now()}-${nextRuntimeId++}`;

/* ------------------------------------------------------------------ */
/* Admin summaries (section list rows, builder outline)                 */
/* ------------------------------------------------------------------ */

/** The still image that best represents a section (list thumbnails), or "". */
export function sectionThumbnail(section: HomepageSection): string {
  const banner = mediaImage(section.banners.desktop) || mediaImage(section.banners.tablet) || mediaImage(section.banners.mobile);
  if (banner) return banner;
  switch (section.type) {
    case "hero":
      return section.assets.map((a) => (a.type === "image" ? a.source : a.poster ?? "")).find(Boolean) ?? "";
    case "banner_slider":
      return sliderSettings(section).slides.map((s) => mediaImage(s.media)).find(Boolean) ?? "";
    case "banner_grid": {
      const g = gridSettings(section);
      return g.tiles.slice(0, g.columns).map((t) => mediaImage(t.media)).find(Boolean) ?? "";
    }
    case "countdown_banner":
      return countdownSettings(section).background === "image" ? countdownSettings(section).image : "";
    default:
      return "";
  }
}

const DIVIDER_SIZE_LABEL: Record<DividerSize, string> = { s: "เล็ก", m: "กลาง", l: "ใหญ่" };

/** One line describing a page-builder section's settings (undefined for the other types). `now` for the countdown's ended state. */
export function describeSection(section: HomepageSection, now: number = Date.now()): string | undefined {
  switch (section.type) {
    case "banner_slider": {
      const s = sliderSettings(section);
      const count = s.slides.filter((slide) => mediaSrc(slide.media)).length;
      return `${count} สไลด์, ${s.autoplay ? `เลื่อนอัตโนมัติทุก ${s.intervalSeconds} วินาที` : "ไม่เลื่อนอัตโนมัติ"}`;
    }
    case "banner_grid": {
      const g = gridSettings(section);
      const filled = g.tiles.slice(0, g.columns).filter((t) => mediaSrc(t.media)).length;
      return `${g.columns} รูปต่อแถว, ใส่รูปแล้ว ${filled}/${g.columns}`;
    }
    case "countdown_banner": {
      const c = countdownSettings(section);
      const ends = countdownEndsAtMs(c.endsAt);
      if (!Number.isFinite(ends)) return "ยังไม่ได้ตั้งเวลาสิ้นสุด";
      const label = new Date(ends).toLocaleString("th-TH", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
      if (ends <= now) return `หมดเวลาแล้ว ${label}${c.afterEnd === "hide" ? " หน้าร้านซ่อนส่วนนี้อยู่" : ""}`;
      return `นับถอยหลังถึง ${label}`;
    }
    case "product_grid": {
      const g = productGridSettings(section);
      const layout = g.layout === "rail" ? "แถวเลื่อนแนวนอน" : `ตาราง ${g.columns} คอลัมน์${g.maxRows > 0 ? ` สูงสุด ${g.maxRows} แถว` : ""}`;
      return `${section.products.length} สินค้า, ${layout}`;
    }
    case "divider": {
      const d = dividerSettings(section);
      return `ระยะห่าง${DIVIDER_SIZE_LABEL[d.size]}${d.line ? " มีเส้นคั่น" : ""}`;
    }
    default:
      return undefined;
  }
}
