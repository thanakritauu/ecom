import { createContext, createSignal, onMount, useContext, type JSX } from "solid-js";
import { isServer } from "solid-js/web";
import { allProducts, flashSaleRoundEndsAt, getDiscountPercent } from "./products";
import type { Product, ProductVariant } from "./types";
import { normalizeMedia, type MediaValue } from "./media";
import { buildMockCategories } from "./adminCategories";
import categoryBrow from "~/assets/images/category/category-brow.png";
import categoryCheek from "~/assets/images/category/category-cheek.png";
import categoryEye from "~/assets/images/category/category-eye.png";
import categoryFace from "~/assets/images/category/category-face.png";
import categoryLip from "~/assets/images/category/category-lip.png";
import categoryTools from "~/assets/images/category/category-tools.png";
import orderItemFoundation from "~/assets/images/account/order-item-foundation.png";
import orderItemLipTint from "~/assets/images/account/order-item-lip-tint.png";

export type AdminProductStatus = "active" | "draft" | "disabled";
export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

export type AdminVariant = {
  id: string;
  label: string;
  sku: string;
  price?: number;
  stock: number;
  /**
   * The variant's real product photos — what the Product Option Modal's
   * square option tile (and the cart line) shows. Always independent of the
   * Product Card swatch below (`mode`/`color`/`swatchImage`) and of the
   * product's own Gallery: each variant's `images` is its own collection
   * that Add/Remove/Replace only ever touches for that one variant.
   */
  images: string[];
  /** Product Card shade-circle color — used when `mode` is `"color"`. Always kept (defaults to a neutral gray). */
  color?: string;
  /** Product Card shade-circle image — uploaded separately from `images`, used when `mode` is `"image"`. */
  swatchImage?: string;
  /**
   * What the Product Card's shade circle shows: the flat `color` or the
   * uploaded `swatchImage`. Only affects that circle — the modal always
   * shows `images`. Variants persisted before this existed normalize to
   * `"color"`.
   */
  mode: "color" | "image";
  /** Sold out regardless of `stock` — the storefront greys this option out (card circle, Option Modal tile). */
  soldOut?: boolean;
};

/**
 * Admin-only overlay on top of the customer-facing `Product` (lib/types.ts).
 * Defined as an intersection here rather than adding these fields to
 * `Product` itself — nothing about SKU/status/variants-with-stock is
 * needed by the storefront, so the shared type stays exactly as the
 * customer side already relies on it (PART 24's own warning: don't risk the
 * Customer Frontend for an Admin-only concern).
 */
export type AdminProduct = Product & {
  sku: string;
  /**
   * Flash Sale runs in the storefront's daily round (ends at the next Bangkok
   * midnight, `flashSaleRoundEndsAt`). `flashSaleEndsAt` is then re-derived
   * every time products are read, so a saved product never carries a stale
   * end time past midnight. Unset/false = a one-off end time set by Admin.
   */
  flashSaleDaily?: boolean;
  /**
   * Admin Master Data Foundation — `categoryId` is the *real* relationship
   * into `~/lib/adminCategories` (empty string = unassigned), the one a
   * Category's own product count is derived from (see
   * `~/lib/masterDataRelations`'s `productsInCategory`, used by the Category
   * List/Detail/QuickView pages — Category carries no product list of its
   * own; Architecture Cleanup & Source of Truth). `category` (on `Product`
   * itself) is kept as a plain derived string because the storefront's
   * `/products?category=` facet filter (Global Frontend Navigation
   * Architecture) matches against that literal union directly, not a
   * Category id. `ProductForm` keeps it in sync whenever `categoryId`
   * changes. There is no brand field: the store sells only Charmiss.
   */
  categoryId: string;
  status: AdminProductStatus;
  lowStockThreshold: number;
  updatedAt: string;
  adminVariants: AdminVariant[];
};

/** Default for `lowStockThreshold`: the storefront cart shows "เหลือ X ชิ้นสุดท้าย" once stock is at or below the product's own threshold (CartItemRow.tsx). */
export const LOW_STOCK_THRESHOLD = 5;

/** The storefront's own low-stock wording (CartItemRow.tsx), reused wherever Admin shows a low-stock count. */
export const lowStockLabel = (left: number) => `เหลือ ${left} ชิ้นสุดท้าย`;

/** Category slugs the storefront actually reads (`Product["category"]`) — a Category with any other slug saves `categoryId` only. */
export const STOREFRONT_CATEGORY_SLUGS: NonNullable<Product["category"]>[] = ["cushion", "lip", "cheek", "eye", "skincare", "suncare-bodycare"];

/** The product's own low-stock line, falling back to the default for products saved without one. */
export function lowStockThresholdOf(product: Partial<Pick<AdminProduct, "lowStockThreshold">>): number {
  const t = product.lowStockThreshold;
  return typeof t === "number" && Number.isFinite(t) && t >= 0 ? t : LOW_STOCK_THRESHOLD;
}

/** Only these reach the storefront: drafts and products switched off stay in Admin. */
export const isProductOnSale = (product: Pick<AdminProduct, "status">) => product.status === "active";

export function getStockStatus(product: Pick<AdminProduct, "stockLeft" | "lowStockThreshold">): StockStatus {
  const left = product.stockLeft ?? 0;
  if (left <= 0) return "out_of_stock";
  if (left <= product.lowStockThreshold) return "low_stock";
  return "in_stock";
}

export const STOCK_STATUS_META: Record<StockStatus, { label: string; tone: "success" | "warning" | "danger" }> = {
  in_stock: { label: "มีสินค้า", tone: "success" },
  low_stock: { label: "ใกล้หมด", tone: "warning" },
  out_of_stock: { label: "สินค้าหมด", tone: "danger" },
};

/** Badge text — low stock reads like the storefront cart ("เหลือ X ชิ้นสุดท้าย"); the filter keeps the short labels above. */
export function stockStatusLabel(product: Pick<AdminProduct, "stockLeft" | "lowStockThreshold">): string {
  const status = getStockStatus(product);
  return status === "low_stock" ? lowStockLabel(product.stockLeft ?? 0) : STOCK_STATUS_META[status].label;
}

export const ADMIN_PRODUCT_STATUS_META: Record<AdminProductStatus, { label: string; tone: "success" | "info" | "neutral" }> = {
  active: { label: "เปิดขาย", tone: "success" },
  draft: { label: "แบบร่าง", tone: "info" },
  disabled: { label: "ปิดการขาย", tone: "neutral" },
};

const TODAY_LABEL = "17 ก.ย. 2569";

/**
 * Seeds admin's per-variant rows from the product's own options
 * (`applyProductOptions` in products.ts). Option photo = that option's own
 * photo when it has one (the Glowlogram palettes), else the product's photo —
 * this catalog has no per-shade photography, and a real product photo reads
 * better in the option modal than unrelated stand-in art. The card circle
 * follows the option's swatch: its photo for image swatches, else its hex.
 */
function seedAdminVariants(product: Product, sku: string): AdminVariant[] {
  if (!product.variants?.length) return [];
  return product.variants.map((v) => ({
    id: v.id,
    label: v.label,
    sku: `${sku}-${v.id.toUpperCase()}`,
    price: product.price,
    stock: v.soldOut ? 0 : (product.stockLeft ?? 20),
    images: [v.image ?? product.image],
    color: v.color || "#CCCCCC",
    swatchImage: v.swatchImage,
    mode: v.swatchImage ? "image" : "color",
    soldOut: v.soldOut || undefined,
  }));
}

const FALLBACK_CATEGORIES = ["eye", "cheek", "lip"] as const;

/** Slug → real Category id, built once from the same seed `adminCategoryStore.tsx` starts from — not a second, hand-typed id map. */
const CATEGORY_SLUG_TO_ID: Record<string, string> = Object.fromEntries(buildMockCategories().map((c) => [c.slug, c.id]));

/**
 * Architecture Cleanup & Source of Truth — exported (was private) so
 * `productCatalog.tsx` (the storefront's read-only mirror, same pattern as
 * `categoryContent.tsx`/`collectionContent.tsx`/etc.) can seed itself from
 * the exact same baseline this store uses, instead of maintaining a second,
 * independent product dataset. Pure and deterministic — safe to call from
 * both provider trees.
 */
/**
 * Seed stock for catalog products that never set `stockLeft`: the storefront
 * reads a missing value as "in stock with no limit" while Admin would count it
 * as 0, so every seed product gets a real number (v12).
 */
const SEED_STOCK_ROTATION = [40, 25, 60, 15, 32, 50, 18, 22, 45, 30];
const seedStockOf = (product: Product, i: number) => product.stockLeft ?? SEED_STOCK_ROTATION[i % SEED_STOCK_ROTATION.length];

export function buildAdminProductBaseline(): AdminProduct[] {
  return allProducts.map((catalogProduct, i) => {
    const product: Product = { ...catalogProduct, stockLeft: seedStockOf(catalogProduct, i) };
    const sku = `CHM${String(i + 1).padStart(3, "0")}`;
    // Most of this catalog never sets `category` (only bestSellerProducts
    // does) — fine for the storefront, which never filters by it for those
    // sections, but Admin's Category assignment needs every row to belong to
    // something. Backfilled deterministically, not stored back onto the
    // shared catalog.
    // Cushions (the Iconic Glow line) are their own menu category; everything else as before.
    const category = product.category ?? (/cushion/i.test(product.name) ? "cushion" : FALLBACK_CATEGORIES[i % FALLBACK_CATEGORIES.length]);
    return {
      ...product,
      flashSaleDaily: product.flashSaleEndsAt !== undefined || undefined,
      category,
      categoryId: CATEGORY_SLUG_TO_ID[category] ?? "",
      sku,
      status: "active",
      lowStockThreshold: LOW_STOCK_THRESHOLD,
      updatedAt: TODAY_LABEL,
      adminVariants: seedAdminVariants(product, sku),
    };
  });
}

/**
 * Full System Regression — Root Cause fix for the `variant.images[0]` crash:
 * the actual bug was never any one component, it was that
 * `AdminProduct[]`/`AdminVariant[]` coming back out of `localStorage` was
 * trusted as-is (`JSON.parse(raw) as AdminProduct[]`, no runtime check).
 * `AdminVariant.images` didn't exist as a field until partway through this
 * project — any product persisted before that point (this session's own
 * earlier testing, or a real returning user) loads back with
 * `adminVariants[].images === undefined`, and every component reading
 * `variant.images[0]`/`.length`/`.map()` inherited that landmine. Every
 * `AdminProduct[]` that enters the `products` signal — fresh baseline *or*
 * persisted — is normalized through here first, so the rest of the app can
 * rely on `AdminVariant.images` always being a real (possibly empty) array.
 */
function normalizeVariant(v: Partial<AdminVariant> & { id: string }): AdminVariant {
  const mode: AdminVariant["mode"] = v.mode === "image" ? "image" : "color";
  return {
    id: v.id,
    label: v.label ?? "",
    sku: v.sku ?? "",
    price: v.price,
    stock: typeof v.stock === "number" && Number.isFinite(v.stock) ? v.stock : 0,
    images: Array.isArray(v.images) ? v.images : [],
    color: v.color || "#CCCCCC",
    swatchImage: typeof v.swatchImage === "string" && v.swatchImage ? v.swatchImage : undefined,
    mode,
    soldOut: v.soldOut === true ? true : undefined,
  };
}

/**
 * The storefront lists a product's options from `variants` (resolveVariantOptions
 * in productVariants.ts maps over it and only overlays `adminVariants` by id),
 * so whatever Admin saves in `adminVariants` — added, removed, renamed,
 * reordered, sold out — has to be written back to `variants` too, or the card,
 * Option Modal and cart keep showing the old list. `image` (the photo the card
 * swaps to when a shade is picked) keeps the previous variant's photo when
 * there was one, so a seed shade doesn't start swapping the card to its mock
 * option photo; a new option uses its own first photo.
 */
export function deriveStorefrontVariants(adminVariants: AdminVariant[], previous: ProductVariant[] = []): ProductVariant[] | undefined {
  if (adminVariants.length === 0) return undefined;
  const prevById = new Map(previous.map((v) => [v.id, v]));
  return adminVariants.map((v) => {
    const prev = prevById.get(v.id);
    return {
      id: v.id,
      label: v.label.trim() || "ตัวเลือก",
      color: v.color || "#CCCCCC",
      swatchImage: v.mode === "image" ? v.swatchImage : undefined,
      image: prev ? prev.image : v.images[0],
      soldOut: v.soldOut || v.stock <= 0 || undefined,
    };
  });
}

/** Slug of a seed Category id — the fallback when a caller (e.g. Excel import) only sets `categoryId`. */
function storefrontCategoryOf(categoryId: string): Product["category"] {
  const slug = Object.entries(CATEGORY_SLUG_TO_ID).find(([, id]) => id === categoryId)?.[0];
  return STOREFRONT_CATEGORY_SLUGS.find((s) => s === slug);
}

/** Exported for the same reason as `buildAdminProductBaseline` — `productCatalog.tsx` reads the same `localStorage` key and must guard against the identical stale-shape landmine this store already guards against. */
/** Daily-round products get today's end time (next Bangkok midnight) on every read — see `AdminProduct.flashSaleDaily`. */
export function withDailyFlashSaleEnd(p: AdminProduct): AdminProduct {
  return p.flashSaleDaily ? { ...p, flashSaleEndsAt: flashSaleRoundEndsAt() } : p;
}

function flashSaleFields(input: Pick<ProductFormValues, "flashSaleEndsAt" | "flashSaleDaily">): Pick<AdminProduct, "flashSaleEndsAt" | "flashSaleDaily"> {
  if (input.flashSaleEndsAt === undefined && !input.flashSaleDaily) return { flashSaleEndsAt: undefined, flashSaleDaily: undefined };
  return input.flashSaleDaily
    ? { flashSaleEndsAt: flashSaleRoundEndsAt(), flashSaleDaily: true }
    : { flashSaleEndsAt: input.flashSaleEndsAt, flashSaleDaily: undefined };
}

export function normalizeAdminProduct(stored: AdminProduct): AdminProduct {
  // Products saved while the (now removed) Brand module existed still carry `brand`/`brandId` — dropped on read so they're never written back.
  const { brand: _brand, brandId: _brandId, ...p } = stored as AdminProduct & { brand?: unknown; brandId?: unknown };
  return {
    ...p,
    // Same root-cause guard as `adminVariants` below — a product persisted
    // before `categoryId` existed loads back with it `undefined`.
    categoryId: p.categoryId ?? "",
    status: p.status === "draft" || p.status === "disabled" ? p.status : "active",
    lowStockThreshold: lowStockThresholdOf(p),
    adminVariants: Array.isArray(p.adminVariants) ? p.adminVariants.map(normalizeVariant) : [],
    // Gallery items that may be videos (`~/lib/media`); absent on every product saved before video existed.
    media: Array.isArray(p.media) ? p.media.map(normalizeMedia) : undefined,
  };
}

export type ProductFormValues = {
  name: string;
  sku: string;
  category?: Product["category"];
  categoryId: string;
  description?: string;
  price: number;
  compareAtPrice?: number;
  stockLeft: number;
  lowStockThreshold: number;
  status: AdminProductStatus;
  images: string[];
  /** CMS + Frontend Final Refinement §8 — explicit "รูปหลัก" pin; falls back to `images[0]` when unset. */
  mainImage?: string;
  /** Gallery in order, images and videos (`~/lib/media`). `images` is always its still-image twin (video = poster). */
  media?: MediaValue[];
  adminVariants: AdminVariant[];
  /** REAL-TIME LIVE PREVIEW SYSTEM §4/§8 — epoch ms; unset/undefined = no Flash Sale. */
  flashSaleEndsAt?: number;
  /** See `AdminProduct.flashSaleDaily` — when true, `flashSaleEndsAt` is ignored and re-derived on read. */
  flashSaleDaily?: boolean;
  /** Flash Sale progress bar's "of N" — defaults to the larger of the old total and `stockLeft`. */
  stockTotal?: number;
  /** Mock merchandising numbers the Product Card's rating/sold row shows (unset = row hidden). */
  rating?: number;
  soldCount?: number;
  reviewCount?: number;
};

type AdminProductContextValue = {
  products: () => AdminProduct[];
  getById: (id: string) => AdminProduct | undefined;
  addProduct: (input: ProductFormValues) => Promise<AdminProduct>;
  updateProduct: (id: string, input: ProductFormValues) => Promise<AdminProduct>;
  deleteProduct: (id: string) => Promise<void>;
  duplicateProduct: (id: string) => Promise<AdminProduct>;
  setStatus: (id: string, status: AdminProductStatus) => Promise<void>;
  /** Stock edit from the Inventory page: product stock plus, optionally, each option's stock (by variant id). Keeps `variants[].soldOut` in step. */
  updateStock: (id: string, stockLeft: number, variantStock?: Record<string, number>) => Promise<AdminProduct>;
  /** Partial write for pages that own one slice of a product (e.g. the Flash Sale page: `flashSaleEndsAt`/`flashSaleDaily`/`stockTotal`). */
  patchProduct: (id: string, patch: Partial<Omit<AdminProduct, "id">>) => Promise<AdminProduct>;
};

const AdminProductContext = createContext<AdminProductContextValue>();
export const PRODUCTS_STORAGE_KEY = "charmiss:admin:products";
const STORAGE_KEY = PRODUCTS_STORAGE_KEY;
/** Fired after every save so storefront readers in the same tab (`productCatalog.tsx`) refresh; other tabs get the `storage` event. */
export const PRODUCTS_CHANGED_EVENT = "charmiss:products-changed";
/**
 * Seed-data version of what's persisted under `STORAGE_KEY`. Bumped when the
 * seed catalog gains values a returning browser's stored copy can't have —
 * v2: Product Card Refinement's `compareAtPrice`/`rating`/`soldCount` on the
 * seed products. v3: the Lip Tint showcase SKU (`best-1`) is no longer a
 * Flash Sale product. v4: every option has 3–4 mock reviews. v5: the
 * Product Card swatch (`mode`/`color`/`swatchImage`) is split from the
 * modal's option photos (`images`). v7: seed products take the real Charmiss
 * range's name, photos, prices and category (mock content, `watsonsCatalog.ts`). v8: storefront
 * `variants` re-derived from `adminVariants` (Admin edits used to save only
 * the latter) and the seed's low-stock threshold drops 10 → 5. v9: seed
 * reviews re-taken (option labels always from the product's own options)
 * and seed Flash Sale end times reset to the daily round (a stored epoch
 * goes stale). Written
 * alongside every persist, so once Admin has saved, anything it changed on
 * purpose stays as Admin left it.
 */
const SEED_VERSION_KEY = "charmiss:admin:products:seed-version";
const SEED_VERSION = 12;
let nextId = 1000;

function persist(products: AdminProduct[]) {
  if (isServer) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    localStorage.setItem(SEED_VERSION_KEY, String(SEED_VERSION));
  } catch {
    // storage can be unavailable (private mode / quota) — state just stays in-memory for this tab.
  }
  window.dispatchEvent(new Event(PRODUCTS_CHANGED_EVENT));
}

const SEED_BACKFILL_FIELDS = ["compareAtPrice", "rating", "soldCount"] as const;
/** v3 — seed values that were taken out of the baseline; removed from a pre-v3 stored copy. */
const SEED_REMOVED_FIELDS: Record<string, readonly (keyof AdminProduct)[]> = { "best-1": ["flashSaleEndsAt"] };

/**
 * Brings a stored copy saved under an older seed version up to date — only
 * on seed products (matched by id). v2: fills missing seed values (never
 * overwriting one Admin set) and re-derives `discountPercent` from the
 * prices. v3: drops seed values that were removed from the baseline. v4:
 * replaces the review data with the seed's (Admin never edits reviews, so
 * there's nothing of Admin's to preserve there).
 */
function migrateSeedFields(list: AdminProduct[], fromVersion: number): AdminProduct[] {
  const seedById = new Map(allProducts.map((p) => [p.id, p]));
  const seedIndex = new Map(allProducts.map((p, i) => [p.id, i]));
  return list.map((p) => {
    const seed = seedById.get(p.id);
    if (!seed) return p;
    const next = { ...p };
    // v12 — seed products saved without a stock number get the seed's (see `SEED_STOCK_ROTATION`).
    if (fromVersion < 12 && next.stockLeft === undefined) next.stockLeft = seedStockOf(seed, seedIndex.get(p.id) ?? 0);
    if (fromVersion < 2) {
      for (const key of SEED_BACKFILL_FIELDS) {
        if (next[key] === undefined && seed[key] !== undefined) next[key] = seed[key];
      }
      next.discountPercent = getDiscountPercent(next);
    }
    if (fromVersion < 3) {
      for (const key of SEED_REMOVED_FIELDS[p.id] ?? []) delete next[key];
    }
    if (fromVersion < 4) {
      next.reviews = seed.reviews;
      next.reviewCount = seed.reviewCount;
      next.ratingBreakdown = seed.ratingBreakdown;
    }
    if (fromVersion < 7) {
      next.name = seed.name;
      next.image = seed.image;
      next.images = seed.images;
      next.price = seed.price;
      next.compareAtPrice = seed.compareAtPrice;
      next.discountPercent = getDiscountPercent(next);
      if (seed.category) {
        next.category = seed.category;
        next.categoryId = CATEGORY_SLUG_TO_ID[seed.category] ?? next.categoryId;
      }
    }
    if (fromVersion < 8 && p.lowStockThreshold === 10) next.lowStockThreshold = LOW_STOCK_THRESHOLD;
    if (fromVersion < 9) {
      next.reviews = seed.reviews;
      if (next.flashSaleEndsAt !== undefined && seed.flashSaleEndsAt !== undefined) next.flashSaleEndsAt = seed.flashSaleEndsAt;
    }
    // v10 — seed Flash Sale products join the daily round, so a saved one stops expiring at the first midnight.
    if (fromVersion < 10 && next.flashSaleEndsAt !== undefined && seed.flashSaleEndsAt !== undefined) next.flashSaleDaily = true;
    // v11 — options decided per SKU by product type (products.ts `applyProductOptions`): seed products take the
    // new options, option rows, shade-free name and option-matched reviews.
    if (fromVersion < 11) {
      next.name = seed.name;
      next.variants = seed.variants;
      next.adminVariants = seedAdminVariants(seed, next.sku);
      next.reviews = seed.reviews;
    }
    return next;
  })
    .map((p) => (fromVersion < 5 ? splitSwatchFromPhotos(p, seedById.get(p.id)) : p))
    .map((p) => (fromVersion < 8 ? syncStorefrontVariants(p) : p));
}

/**
 * v8 — any product (seed or Admin-created) whose saved `adminVariants`
 * drifted from `variants`. Only when it has `adminVariants`: a product with
 * none keeps its `variants` as they are, since an empty list here can't tell
 * "Admin removed every option" from "never had per-option rows".
 */
function syncStorefrontVariants(p: AdminProduct): AdminProduct {
  if (p.adminVariants.length === 0) return p;
  return { ...p, variants: deriveStorefrontVariants(p.adminVariants, p.variants), discountPercent: getDiscountPercent(p) };
}

/**
 * v5 — before the split, `mode: "image"` meant "this variant's `images` are
 * both its card circle and its photos". Seed products go back to their
 * seeded shade color for the circle (what the card always showed); an
 * Admin-created variant in Image mode keeps its look by using its first
 * photo as the new, separate `swatchImage`.
 */
function splitSwatchFromPhotos(p: AdminProduct, seed: Product | undefined): AdminProduct {
  return {
    ...p,
    adminVariants: p.adminVariants.map((v) => {
      if (v.mode !== "image" || v.swatchImage) return v;
      const seedColor = seed?.variants?.find((sv) => sv.id === v.id)?.color;
      return seed ? { ...v, mode: "color", color: seedColor || v.color } : { ...v, swatchImage: v.images[0] };
    }),
  };
}

/**
 * The one read path for persisted products — shared by this store and
 * `productCatalog.tsx` (which reads the same key) so both see identical data.
 * `null` when nothing is stored (callers fall back to the baseline).
 */
export function readPersistedAdminProducts(): AdminProduct[] | null {
  if (isServer) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    // The critical half of the fix: data coming back out of localStorage may
    // predate fields the current `AdminVariant` contract relies on (see
    // `normalizeAdminProduct`'s own comment) — normalize before it ever
    // reaches a component.
    const stored = (JSON.parse(raw) as AdminProduct[]).map(normalizeAdminProduct);
    const version = Number(localStorage.getItem(SEED_VERSION_KEY) ?? 1);
    return (version < SEED_VERSION ? migrateSeedFields(stored, version) : stored).map(withDailyFlashSaleEnd);
  } catch {
    return null;
  }
}

/**
 * Global mock "Product" state — Add/Edit/Delete/Duplicate/Enable-Disable/
 * Stock all go through here (PART 25), so Product List, Product Detail, and
 * (in a later phase) Dashboard/Inventory can all read the same live data
 * instead of each module re-deriving its own snapshot.
 */
export function AdminProductProvider(props: { children: JSX.Element }) {
  // SSR-safe like cart.tsx/auth.tsx: `buildAdminProductBaseline()` is pure
  // (derived only from the static catalog, no browser API), so server and
  // the client's first render always agree — only after hydration do we
  // check localStorage for any persisted admin edits.
  const [products, setProducts] = createSignal<AdminProduct[]>(buildAdminProductBaseline());

  onMount(() => {
    const persisted = readPersistedAdminProducts();
    if (persisted) setProducts(persisted);
  });

  const mutate = (fn: (list: AdminProduct[]) => AdminProduct[]) => {
    setProducts((list) => {
      // Defense-in-depth alongside the `readPersisted()` fix: every write
      // path (add/update/duplicate/delete/status-change) re-normalizes too,
      // so a malformed shape can never enter the signal, get persisted, and
      // resurface on the next reload.
      const next = fn(list).map(normalizeAdminProduct);
      persist(next);
      return next;
    });
  };

  const simulateDelay = () => new Promise<void>((resolve) => setTimeout(resolve, 450 + Math.random() * 250));
  const getById = (id: string) => products().find((p) => p.id === id);

  const addProduct: AdminProductContextValue["addProduct"] = async (input) => {
    await simulateDelay();
    if (Math.random() < 0.08) throw new Error("SAVE_FAILED");
    const created: AdminProduct = {
      id: `admin-${nextId++}`,
      slug: `admin-${input.sku.toLowerCase()}`,
      name: input.name,
      image: input.images[0] ?? "",
      images: input.images,
      mainImage: input.mainImage,
      media: input.media,
      price: input.price,
      compareAtPrice: input.compareAtPrice,
      discountPercent: getDiscountPercent(input),
      stockLeft: input.stockLeft,
      stockTotal: Math.max(input.stockTotal ?? 0, input.stockLeft),
      category: input.category ?? storefrontCategoryOf(input.categoryId),
      categoryId: input.categoryId,
      description: input.description,
      sku: input.sku,
      status: input.status,
      lowStockThreshold: input.lowStockThreshold,
      updatedAt: TODAY_LABEL,
      adminVariants: input.adminVariants,
      variants: deriveStorefrontVariants(input.adminVariants),
      ...flashSaleFields(input),
      rating: input.rating,
      soldCount: input.soldCount,
      reviewCount: input.reviewCount,
    };
    mutate((list) => [created, ...list]);
    return created;
  };

  const updateProduct: AdminProductContextValue["updateProduct"] = async (id, input) => {
    await simulateDelay();
    if (Math.random() < 0.08) throw new Error("SAVE_FAILED");
    let updated: AdminProduct | undefined;
    mutate((list) =>
      list.map((p) => {
        if (p.id !== id) return p;
        updated = {
          ...p,
          name: input.name,
          sku: input.sku,
          category: input.category ?? storefrontCategoryOf(input.categoryId),
          categoryId: input.categoryId,
          description: input.description,
          price: input.price,
          compareAtPrice: input.compareAtPrice,
          // Stored too (not only derived) — a few readers still take the stored percent as-is.
          discountPercent: getDiscountPercent(input),
          stockLeft: input.stockLeft,
          stockTotal: Math.max(input.stockTotal ?? p.stockTotal ?? 0, input.stockLeft),
          lowStockThreshold: input.lowStockThreshold,
          status: input.status,
          images: input.images,
          image: input.images[0] ?? p.image,
          mainImage: input.mainImage,
          media: input.media,
          adminVariants: input.adminVariants,
          variants: deriveStorefrontVariants(input.adminVariants, p.variants),
          ...flashSaleFields(input),
          rating: input.rating,
          soldCount: input.soldCount,
          reviewCount: input.reviewCount,
          updatedAt: TODAY_LABEL,
        };
        return updated;
      }),
    );
    if (!updated) throw new Error("NOT_FOUND");
    return updated;
  };

  const deleteProduct: AdminProductContextValue["deleteProduct"] = async (id) => {
    await simulateDelay();
    mutate((list) => list.filter((p) => p.id !== id));
  };

  const duplicateProduct: AdminProductContextValue["duplicateProduct"] = async (id) => {
    await simulateDelay();
    const source = getById(id);
    if (!source) throw new Error("NOT_FOUND");
    const duplicate: AdminProduct = {
      ...source,
      id: `admin-${nextId++}`,
      slug: `${source.slug}-copy-${nextId}`,
      name: `${source.name} Copy`,
      sku: `${source.sku}-COPY`,
      status: "draft",
      updatedAt: TODAY_LABEL,
    };
    mutate((list) => [duplicate, ...list]);
    return duplicate;
  };

  const setStatus: AdminProductContextValue["setStatus"] = async (id, status) => {
    await simulateDelay();
    mutate((list) => list.map((p) => (p.id === id ? { ...p, status, updatedAt: TODAY_LABEL } : p)));
  };

  const updateStock: AdminProductContextValue["updateStock"] = async (id, stockLeft, variantStock) => {
    await simulateDelay();
    let updated: AdminProduct | undefined;
    mutate((list) =>
      list.map((p) => {
        if (p.id !== id) return p;
        const adminVariants = variantStock
          ? p.adminVariants.map((v) => (variantStock[v.id] === undefined ? v : { ...v, stock: variantStock[v.id] }))
          : p.adminVariants;
        updated = {
          ...p,
          stockLeft,
          stockTotal: Math.max(p.stockTotal ?? 0, stockLeft),
          adminVariants,
          variants: adminVariants.length > 0 ? deriveStorefrontVariants(adminVariants, p.variants) : p.variants,
          updatedAt: TODAY_LABEL,
        };
        return updated;
      }),
    );
    if (!updated) throw new Error("NOT_FOUND");
    return updated;
  };

  const patchProduct: AdminProductContextValue["patchProduct"] = async (id, patch) => {
    await simulateDelay();
    let updated: AdminProduct | undefined;
    mutate((list) =>
      list.map((p) => {
        if (p.id !== id) return p;
        updated = { ...p, ...patch, id: p.id, updatedAt: TODAY_LABEL };
        return updated;
      }),
    );
    if (!updated) throw new Error("NOT_FOUND");
    return updated;
  };

  return (
    <AdminProductContext.Provider
      value={{ products, getById, addProduct, updateProduct, deleteProduct, duplicateProduct, setStatus, updateStock, patchProduct }}
    >
      {props.children}
    </AdminProductContext.Provider>
  );
}

export function useAdminProducts() {
  const ctx = useContext(AdminProductContext);
  if (!ctx) throw new Error("useAdminProducts must be used within AdminProductProvider");
  return ctx;
}
