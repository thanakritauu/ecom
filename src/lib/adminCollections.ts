import type { StatusTone } from "~/components/admin/StatusBadge";
import type { PromotionPageProductRef } from "./adminContent";

/**
 * Product Collection Management — a simple named, admin-curated group of
 * products (e.g. "Best Sellers", "Skincare") that other modules (a Homepage
 * product section, a Campaign) can reference as a product source instead of
 * hand-picking products every time. Deliberately much simpler than a
 * Promotion Page: no banners, no schedule, no destination/CTA, no slug —
 * just Name, Description, Status, and a Product list.
 */
export type CollectionStatus = "active" | "inactive" | "draft";

export const COLLECTION_STATUS_META: Record<CollectionStatus, { label: string; tone: StatusTone }> = {
  active: { label: "เปิดใช้งาน", tone: "success" },
  inactive: { label: "ปิดใช้งาน", tone: "neutral" },
  draft: { label: "แบบร่าง", tone: "neutral" },
};

/**
 * `products` reuses `PromotionPageProductRef` verbatim (`{productId, variantIds}`)
 * — the same product-reference shape every other Admin module already uses,
 * rather than a second, parallel type for the same idea.
 */
export type ProductCollection = {
  id: string;
  name: string;
  description: string;
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
export function normalizeProductCollection(c: Partial<ProductCollection> & { id: string }): ProductCollection {
  return {
    id: c.id,
    name: c.name ?? "",
    description: c.description ?? "",
    status: c.status ?? "draft",
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

const TODAY_LABEL = "18 ก.ย. 2569";

const COLLECTION_SEEDS: (Omit<ProductCollection, "createdAt" | "updatedAt"> & { id: string })[] = [
  {
    id: "collection-001",
    name: "สินค้าขายดี",
    description: "รวมสินค้าขายดีที่ลูกค้าซื้อซ้ำมากที่สุด เหมาะสำหรับแสดงบนหน้าแรก",
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
    description: "คอลเลกชันสินค้าที่เพิ่งเปิดตัวใหม่ล่าสุด",
    status: "active",
    products: [
      { productId: "new-2", variantIds: [] },
      { productId: "new-4", variantIds: [] },
    ],
  },
  {
    id: "collection-003",
    name: "สกินแคร์",
    description: "กลุ่มสินค้าดูแลผิวหน้าและผิวกายสำหรับแคมเปญเฉพาะทาง",
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
    description: "สินค้าที่ทีมงานคัดสรรแนะนำเป็นพิเศษ",
    status: "draft",
    products: [
      { productId: "trend-3", variantIds: [] },
      { productId: "best-8", variantIds: [] },
    ],
  },
  {
    id: "collection-005",
    name: "Summer Essentials",
    description: "รวมไอเทมที่ต้องมีติดกระเป๋าช่วงหน้าร้อน",
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
