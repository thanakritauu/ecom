import type { PromotionPageProductRef } from "./adminContent";
import { upgradeSeedBanners } from "./seedBanners";

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

export type HomepageSectionType = "hero" | "promotion_banner" | "product" | "campaign" | "content" | "cta";

export const HOMEPAGE_SECTION_TYPE_META: Record<HomepageSectionType, { label: string }> = {
  hero: { label: "Hero Banner" },
  promotion_banner: { label: "Promotion Banner" },
  product: { label: "Product Section" },
  campaign: { label: "Campaign" },
  content: { label: "Content" },
  cta: { label: "CTA" },
};

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
  manual: { label: "เลือกสินค้าเอง (เดิม — ย้ายไปใช้ Collection แทน)" },
  best_seller: { label: "สินค้าขายดี (Best Seller)" },
  flash_sale: { label: "Flash Sale" },
  new_arrival: { label: "สินค้ามาใหม่ (New Arrival)" },
  trending: { label: "กำลังฮิต (Trending)" },
  featured: { label: "คอลเลกชันแนะนำ (Featured)" },
  collection: { label: "Product Collection" },
  category: { label: "หมวดหมู่สินค้า (Category)" },
};

export type HomepageBanners = {
  desktop: string;
  tablet: string;
  mobile: string;
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
  tabletSource?: string;
  mobileSource?: string;
};

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
  if (assets.length > MAX_HERO_ASSETS) errors.push(`Hero Banner รองรับสูงสุด ${MAX_HERO_ASSETS} รายการ`);
  assets.forEach((asset, i) => {
    if (!asset.source.trim()) errors.push(`Hero Banner รายการที่ ${i + 1}: ยังไม่ได้เพิ่มไฟล์หรือลิงก์`);
    else if (asset.type === "youtube" && !isValidYoutubeUrl(asset.source)) errors.push(`Hero Banner รายการที่ ${i + 1}: ลิงก์ YouTube ไม่ถูกต้อง`);
  });
  return errors;
}

/**
 * One destination shape reused by every CTA/click-through in this system
 * (Hero, Promotion Banner, Campaign, Content, CTA) instead of a separate
 * "type this URL yourself" field per section. `landingPage`/`product`/
 * `category`/`collection` store only the *id*; the actual href is always
 * derived at render time (`resolveHomepageDestinationHref`) — slug/id is the
 * one source of truth, never duplicated into a second URL field.
 *
 * This discriminated union IS the project's single "Destination" source of
 * truth (Category/Landing Page/Collection/Campaign/Product), reused verbatim
 * by `adminBanners.ts` and `adminCampaigns.ts` CTAs, not a second parallel
 * type. `category`/`collection` resolve to the *existing* `/products`
 * listing page filtered by query string (`categoryListHref`/
 * `collectionListHref` below) — no dedicated Category/Collection landing
 * page. `campaign` has no variant here yet — extending the union later
 * (one case here, one in the resolver, one option in `DestinationSelector`)
 * is what "ready to connect in the future" means for this architecture.
 *
 * Landing Page Architecture & Promotion Page Migration — this used to be
 * `{ type: "promotion"; promotionPageId: string }`. Every already-serialized
 * Banner/Campaign/Homepage-section CTA in `localStorage` still has that
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
  /** "product" (when `productSource === "manual"`) and "campaign" (always manual) — same shape `PromotionPageProductPicker` already edits, reused as-is. */
  products: PromotionPageProductRef[];
  /** "product" only, when `productSource === "collection"` — id into `~/lib/adminCollections`'s `ProductCollection[]`. Resolved live at render time, never copied in. */
  collectionId: string;
  /** "product" only, when `productSource === "category"` — id into `~/lib/adminCategories`'s `AdminCategory[]`. Resolved live at render time by filtering the Product Catalog on `categoryId`, never copied in — Category stays classification-only, never a page builder (§6). */
  categoryId: string;
  /** "campaign" only, optional — id into `~/lib/adminCampaigns`'s `Campaign[]`. When set, Banner/Title/Description/CTA/Products are all derived live from that Campaign record instead of this section's own inline fields. */
  campaignId: string;
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
    type: s.type ?? "content",
    name: s.name ?? "",
    enabled: s.enabled ?? true,
    eyebrow: s.eyebrow ?? "",
    title: s.title ?? "",
    description: s.description ?? "",
    banners: upgradeSeedBanners({
      desktop: s.banners?.desktop ?? "",
      tablet: s.banners?.tablet ?? "",
      mobile: s.banners?.mobile ?? "",
    }),
    assets: Array.isArray(s.assets)
      ? s.assets.slice(0, MAX_HERO_ASSETS).map((a) => ({
          id: a.id ?? genHeroAssetId(),
          type: a.type ?? "image",
          source: a.source ?? "",
          tabletSource: a.tabletSource || undefined,
          mobileSource: a.mobileSource || undefined,
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
    campaignId: s.campaignId ?? "",
    createdAt: s.createdAt ?? "",
    updatedAt: s.updatedAt ?? "",
  };
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
