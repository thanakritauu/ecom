import { createContext, createSignal, onMount, useContext, type JSX } from "solid-js";
import { isServer } from "solid-js/web";
import { allProducts } from "./products";
import type { Product } from "./types";
import { buildMockCategories } from "./adminCategories";
import { buildMockBrands } from "./adminBrands";
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
   * Variant → Image → Stock (Global UI Correction — Final Overrides #2/#3,
   * and the Variant Image Upload — Final Override that hardened this further):
   * variants are identified by their own photos, completely independent
   * from the product's own Gallery (`AdminProduct.images`/`.image`) — never
   * a reference into it, never copied from it, never falls back to it. Each
   * variant's `images` is its own collection that Add/Remove/Replace only
   * ever touches for that one variant.
   */
  images: string[];
};

/**
 * Admin-only overlay on top of the customer-facing `Product` (lib/types.ts).
 * Defined as an intersection here rather than adding these fields to
 * `Product` itself — nothing about SKU/brand/status/variants-with-stock is
 * needed by the storefront, so the shared type stays exactly as the
 * customer side already relies on it (PART 24's own warning: don't risk the
 * Customer Frontend for an Admin-only concern).
 */
export type AdminProduct = Product & {
  sku: string;
  /**
   * Admin Master Data Foundation — `categoryId`/`brandId` are the *real*
   * relationship into `~/lib/adminCategories`/`~/lib/adminBrands` (empty
   * string = unassigned), the one a Category/Brand's own product count is
   * derived from (see `~/lib/masterDataRelations`'s `productsInCategory`/
   * `productsInBrand`, used by the Category/Brand List/Detail/QuickView
   * pages — Category/Brand carry no product list of their own; Architecture
   * Cleanup & Source of Truth). `category`/`brand` (below and on `Product`
   * itself) are kept as plain derived strings — `category` because the
   * storefront's `/products?category=` facet filter (Global Frontend
   * Navigation Architecture) matches against that literal 3-value union
   * directly, not a Category id, and `brand` because it's already displayed
   * in a dozen places as free text. `ProductForm` keeps both in sync
   * whenever `categoryId`/`brandId` change — nothing reads `category`/
   * `brand` as its own independently-edited field anymore.
   */
  categoryId: string;
  brandId: string;
  brand: string;
  status: AdminProductStatus;
  lowStockThreshold: number;
  updatedAt: string;
  adminVariants: AdminVariant[];
};

export function getStockStatus(product: Pick<AdminProduct, "stockLeft" | "lowStockThreshold">): StockStatus {
  const left = product.stockLeft ?? 0;
  if (left <= 0) return "out_of_stock";
  if (left <= product.lowStockThreshold) return "low_stock";
  return "in_stock";
}

export const STOCK_STATUS_META: Record<StockStatus, { label: string; tone: "success" | "warning" | "danger" }> = {
  in_stock: { label: "In Stock", tone: "success" },
  low_stock: { label: "Low Stock", tone: "warning" },
  out_of_stock: { label: "Out of Stock", tone: "danger" },
};

export const ADMIN_PRODUCT_STATUS_META: Record<AdminProductStatus, { label: string; tone: "success" | "info" | "neutral" }> = {
  active: { label: "Active", tone: "success" },
  draft: { label: "Draft", tone: "info" },
  disabled: { label: "Disabled", tone: "neutral" },
};

const TODAY_LABEL = "17 ก.ย. 2569";

/**
 * A pool completely separate from any product's own Gallery — none of these
 * eight images appear as anyone's `Product.image`/`.images` in products.ts
 * (verified by inspection), so seeding variant photos from here can never
 * coincide with that product's own Gallery. Real per-shade photography
 * doesn't exist in this catalog (customer-facing `ProductVariant.image` is
 * always unset), so this is the mock stand-in — but a stand-in drawn from a
 * source that is structurally guaranteed independent, not a copy of the
 * Gallery it sits next to.
 */
const VARIANT_MOCK_IMAGE_POOL = [
  categoryBrow,
  categoryCheek,
  categoryEye,
  categoryFace,
  categoryLip,
  categoryTools,
  orderItemFoundation,
  orderItemLipTint,
];

/**
 * Seeds admin's richer per-variant rows from whatever shade variants a
 * product already has, so a freshly-loaded catalog isn't all empty. Each
 * variant gets its own slice of `VARIANT_MOCK_IMAGE_POOL` — offset by both
 * the product's index and the variant's own index, so (a) no variant ever
 * touches this product's Gallery images and (b) sibling variants on the same
 * product don't all show the same photo. Image *count* is deliberately
 * uneven across variants (1–3) per the spec's own "จำนวนรูปไม่จำเป็นต้องเท่ากัน" —
 * a real per-variant photo shoot naturally produces different counts too.
 */
function seedAdminVariants(product: Product, sku: string, productIndex: number): AdminVariant[] {
  if (!product.variants?.length) return [];
  return product.variants.map((v, i) => {
    const imageCount = ((productIndex + i) % 3) + 1;
    const images = Array.from(
      { length: imageCount },
      (_, k) => VARIANT_MOCK_IMAGE_POOL[(productIndex * 3 + i * 2 + k) % VARIANT_MOCK_IMAGE_POOL.length],
    );
    return {
      id: v.id,
      label: v.label,
      sku: `${sku}-${v.id.toUpperCase()}`,
      price: product.price,
      stock: v.soldOut ? 0 : (product.stockLeft ?? 20),
      images,
    };
  });
}

const FALLBACK_CATEGORIES = ["eye", "cheek", "lip"] as const;

/** Slug → real Category id, built once from the same seed `adminCategoryStore.tsx` starts from — not a second, hand-typed id map. */
const CATEGORY_SLUG_TO_ID: Record<string, string> = Object.fromEntries(buildMockCategories().map((c) => [c.slug, c.id]));

/**
 * Same "core line" vs "Sanrio collab line" split `adminBrandStore.tsx`'s own
 * `buildProductSeedsByBrand()` already classifies these same products by —
 * reused here so a product's backfilled `brandId` and the Brand module's own
 * (separately curated) product list agree on which line each SKU belongs to.
 */
const BRAND_SEEDS = buildMockBrands();
const CORE_BRAND_ID = BRAND_SEEDS.find((b) => b.slug === "charmiss")?.id ?? "";
const COLLAB_BRAND_ID = BRAND_SEEDS.find((b) => b.slug === "charmiss-x-sanrio")?.id ?? "";

/**
 * Architecture Cleanup & Source of Truth — exported (was private) so
 * `productCatalog.tsx` (the storefront's read-only mirror, same pattern as
 * `categoryContent.tsx`/`collectionContent.tsx`/etc.) can seed itself from
 * the exact same baseline this store uses, instead of maintaining a second,
 * independent product dataset. Pure and deterministic — safe to call from
 * both provider trees.
 */
export function buildAdminProductBaseline(): AdminProduct[] {
  return allProducts.map((product, i) => {
    const sku = `CHM${String(i + 1).padStart(3, "0")}`;
    // Most of this catalog never sets `category` (only bestSellerProducts
    // does) — fine for the storefront, which never filters by it for those
    // sections, but Admin's Category assignment needs every row to belong to
    // something. Backfilled deterministically, not stored back onto the
    // shared catalog.
    const category = product.category ?? FALLBACK_CATEGORIES[i % FALLBACK_CATEGORIES.length];
    return {
      ...product,
      category,
      categoryId: CATEGORY_SLUG_TO_ID[category] ?? "",
      sku,
      brand: "Charmiss",
      brandId: (product.name.includes("Sanrio") ? COLLAB_BRAND_ID : CORE_BRAND_ID) || "",
      status: "active",
      lowStockThreshold: 10,
      updatedAt: TODAY_LABEL,
      adminVariants: seedAdminVariants(product, sku, i),
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
  return {
    id: v.id,
    label: v.label ?? "",
    sku: v.sku ?? "",
    price: v.price,
    stock: typeof v.stock === "number" && Number.isFinite(v.stock) ? v.stock : 0,
    images: Array.isArray(v.images) ? v.images : [],
  };
}

/** Exported for the same reason as `buildAdminProductBaseline` — `productCatalog.tsx` reads the same `localStorage` key and must guard against the identical stale-shape landmine this store already guards against. */
export function normalizeAdminProduct(p: AdminProduct): AdminProduct {
  return {
    ...p,
    // Same root-cause guard as `adminVariants` below — a product persisted
    // before `categoryId`/`brandId` existed loads back with them `undefined`.
    categoryId: p.categoryId ?? "",
    brandId: p.brandId ?? "",
    adminVariants: Array.isArray(p.adminVariants) ? p.adminVariants.map(normalizeVariant) : [],
  };
}

export type ProductFormValues = {
  name: string;
  sku: string;
  brand: string;
  brandId: string;
  category?: Product["category"];
  categoryId: string;
  description?: string;
  price: number;
  compareAtPrice?: number;
  stockLeft: number;
  lowStockThreshold: number;
  status: AdminProductStatus;
  images: string[];
  adminVariants: AdminVariant[];
};

type AdminProductContextValue = {
  products: () => AdminProduct[];
  getById: (id: string) => AdminProduct | undefined;
  addProduct: (input: ProductFormValues) => Promise<AdminProduct>;
  updateProduct: (id: string, input: ProductFormValues) => Promise<AdminProduct>;
  deleteProduct: (id: string) => Promise<void>;
  duplicateProduct: (id: string) => Promise<AdminProduct>;
  setStatus: (id: string, status: AdminProductStatus) => Promise<void>;
};

const AdminProductContext = createContext<AdminProductContextValue>();
const STORAGE_KEY = "charmiss:admin:products";
let nextId = 1000;

function persist(products: AdminProduct[]) {
  if (isServer) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  } catch {
    // storage can be unavailable (private mode / quota) — state just stays in-memory for this tab.
  }
}

function readPersisted(): AdminProduct[] | null {
  if (isServer) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    // The critical half of the fix: data coming back out of localStorage may
    // predate fields the current `AdminVariant` contract relies on (see
    // `normalizeAdminProduct`'s own comment) — normalize before it ever
    // reaches a component.
    return (JSON.parse(raw) as AdminProduct[]).map(normalizeAdminProduct);
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
    const persisted = readPersisted();
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
      price: input.price,
      compareAtPrice: input.compareAtPrice,
      stockLeft: input.stockLeft,
      stockTotal: input.stockLeft,
      category: input.category,
      categoryId: input.categoryId,
      description: input.description,
      sku: input.sku,
      brand: input.brand,
      brandId: input.brandId,
      status: input.status,
      lowStockThreshold: input.lowStockThreshold,
      updatedAt: TODAY_LABEL,
      adminVariants: input.adminVariants,
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
          brand: input.brand,
          brandId: input.brandId,
          category: input.category,
          categoryId: input.categoryId,
          description: input.description,
          price: input.price,
          compareAtPrice: input.compareAtPrice,
          stockLeft: input.stockLeft,
          stockTotal: Math.max(p.stockTotal ?? 0, input.stockLeft),
          lowStockThreshold: input.lowStockThreshold,
          status: input.status,
          images: input.images,
          image: input.images[0] ?? p.image,
          adminVariants: input.adminVariants,
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

  return (
    <AdminProductContext.Provider
      value={{ products, getById, addProduct, updateProduct, deleteProduct, duplicateProduct, setStatus }}
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
