import type { StatusTone } from "~/components/admin/StatusBadge";
import type { PromotionPageProductRef } from "./adminContent";

/**
 * Product Collection Management — a simple named, admin-curated group of
 * products (e.g. "Best Sellers", "Skincare") that other modules (a Homepage
 * product section) can reference as a product source instead of
 * hand-picking products every time. Name (staff only), on/off status and a
 * product list; the storefront only shows the products of an active one.
 */
/**
 * Draft-first rule: a new collection starts as "draft" (only a name needed,
 * never used on the storefront, exactly like "inactive" there). Its first
 * publish makes it "active"; after that it's only ever active / inactive.
 */
export type CollectionStatus = "draft" | "active" | "inactive";

export const COLLECTION_STATUS_META: Record<CollectionStatus, { label: string; tone: StatusTone }> = {
  draft: { label: "แบบร่าง", tone: "info" },
  active: { label: "เปิดใช้งาน", tone: "success" },
  inactive: { label: "ปิดใช้งาน", tone: "neutral" },
};

/**
 * `products` reuses `PromotionPageProductRef` verbatim (`{productId, variantIds}`)
 * — the same product-reference shape every other Admin module already uses,
 * rather than a second, parallel type for the same idea.
 */
export type ProductCollection = {
  id: string;
  name: string;
  status: CollectionStatus;
  products: PromotionPageProductRef[];
  createdAt: string;
  updatedAt: string;
};

export type ProductCollectionFormValues = Omit<ProductCollection, "id" | "createdAt" | "updatedAt">;

/**
 * Root-cause guard, same convention as `normalizePromotionPage` — anything
 * that comes back out of `localStorage` may predate a field the current
 * shape relies on, so every collection is normalized before a component
 * ever reads it.
 */
export function normalizeProductCollection(c: Omit<Partial<ProductCollection>, "status"> & { id: string; status?: string }): ProductCollection {
  return {
    id: c.id,
    name: c.name ?? "",
    // Older saves keep their own status; anything unknown is off.
    status: c.status === "active" || c.status === "draft" ? c.status : "inactive",
    products: Array.isArray(c.products)
      ? c.products.map((ref) => ({ productId: ref.productId, variantIds: Array.isArray(ref.variantIds) ? ref.variantIds : [] }))
      : [],
    createdAt: c.createdAt ?? "",
    updatedAt: c.updatedAt ?? "",
  };
}

/**
 * The one rule other code (e.g. a Homepage product section resolving a
 * collection into real products) should call to decide whether a
 * collection's products should actually be shown on the storefront —
 * deliberately just a status check, not a scheduler or any derived logic.
 */
export function isCollectionUsable(collection: Pick<ProductCollection, "status">): boolean {
  return collection.status === "active";
}

/**
 * What a draft collection still lacks before it can go live (same checks as
 * the form's บันทึกและเผยแพร่), as field names for the list's เผยแพร่ toast.
 * Empty = ready to publish.
 */
export function collectionPublishProblems(collection: Pick<ProductCollection, "name" | "products">): string[] {
  const problems: string[] = [];
  if (!collection.name.trim()) problems.push("ชื่อกลุ่มสินค้าพิเศษ");
  if (collection.products.length === 0) problems.push("สินค้าในกลุ่มสินค้าพิเศษ");
  return problems;
}

const TODAY_LABEL = "18 ก.ย. 2569";

const COLLECTION_SEEDS: (Omit<ProductCollection, "createdAt" | "updatedAt"> & { id: string })[] = [
  {
    id: "collection-001",
    name: "สินค้าขายดี",
    status: "active",
    products: [
      { productId: "best-1", variantIds: [] },
      { productId: "best-3", variantIds: [] },
      { productId: "best-5", variantIds: [] },
      { productId: "best-8", variantIds: [] },
    ],
  },
  {
    id: "collection-002",
    name: "สินค้ามาใหม่",
    status: "active",
    products: [
      { productId: "new-2", variantIds: [] },
      { productId: "new-4", variantIds: [] },
    ],
  },
  {
    id: "collection-003",
    name: "สกินแคร์",
    status: "inactive",
    products: [
      { productId: "feature-1", variantIds: [] },
      { productId: "feature-2", variantIds: [] },
      { productId: "trend-1", variantIds: [] },
    ],
  },
  {
    id: "collection-004",
    name: "รายการแนะนำ",
    status: "inactive",
    products: [
      { productId: "trend-3", variantIds: [] },
      { productId: "best-8", variantIds: [] },
    ],
  },
  {
    id: "collection-005",
    name: "Summer Essentials",
    status: "active",
    products: [
      { productId: "trend-1", variantIds: [] },
      { productId: "new-2", variantIds: [] },
      { productId: "feature-1", variantIds: [] },
    ],
  },
];

/**
 * Baseline builder — fixed string-literal ids ("collection-001".."005"), not
 * an incrementing counter, so this returns byte-identical output on every
 * call within the same process (the same bug already found & fixed for the
 * other Admin content modules).
 */
export function buildMockProductCollections(): ProductCollection[] {
  return COLLECTION_SEEDS.map((seed) => ({ ...seed, createdAt: TODAY_LABEL, updatedAt: TODAY_LABEL }));
}
