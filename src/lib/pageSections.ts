import type { PromotionPageProductRef } from "./adminContent";

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

export type HomepageProductSource = "manual" | "best_seller" | "new_arrival" | "trending" | "featured" | "collection";

export const HOMEPAGE_PRODUCT_SOURCE_META: Record<HomepageProductSource, { label: string }> = {
  manual: { label: "เลือกสินค้าเอง" },
  best_seller: { label: "สินค้าขายดี (Best Seller)" },
  new_arrival: { label: "สินค้ามาใหม่ (New Arrival)" },
  trending: { label: "กำลังฮิต (Trending)" },
  featured: { label: "คอลเลกชันแนะนำ (Featured)" },
  collection: { label: "Product Collection" },
};

export type HomepageBanners = {
  desktop: string;
  tablet: string;
  mobile: string;
};

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
  cta: HomepageCta;
  /** "content" only — Landing Page Frontend Polish §15. */
  contentLayout: HomepageContentLayout;
  /** "product" only — ignored for every other type. */
  productSource: HomepageProductSource;
  /** "product" (when `productSource === "manual"`) and "campaign" (always manual) — same shape `PromotionPageProductPicker` already edits, reused as-is. */
  products: PromotionPageProductRef[];
  /** "product" only, when `productSource === "collection"` — id into `~/lib/adminCollections`'s `ProductCollection[]`. Resolved live at render time, never copied in. */
  collectionId: string;
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
    banners: {
      desktop: s.banners?.desktop ?? "",
      tablet: s.banners?.tablet ?? "",
      mobile: s.banners?.mobile ?? "",
    },
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
