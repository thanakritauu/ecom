import type { StatusTone } from "~/components/admin/StatusBadge";

/**
 * Category Management — Phase 01 additional scope. A named, admin-curated
 * product taxonomy entry (e.g. "ปาก", "ตา") that the storefront's category
 * navigation and filters are built from, plus the taxonomy-specific fields a
 * real category needs: `slug` (its URL/filter key) and `image` (a
 * native-upload thumbnail).
 *
 * Architecture Cleanup & Source of Truth — Category is Product
 * Classification only, never its own Product Collection: it used to also
 * carry a `products: PromotionPageProductRef[]` curated "featured products"
 * list (the same shape `ProductCollection` uses), which duplicated
 * Collection's one job. A Category's real product membership is derived
 * live from each `AdminProduct.categoryId` instead (see
 * `~/lib/masterDataRelations`'s `productsInCategory`) — never a second,
 * independently-editable list that could drift from it. Curating a shown
 * product set for merchandising is Collection's job now.
 */
export type CategoryStatus = "active" | "inactive";

export const CATEGORY_STATUS_META: Record<CategoryStatus, { label: string; tone: StatusTone }> = {
  active: { label: "เปิดใช้งาน", tone: "success" },
  inactive: { label: "ปิดใช้งาน", tone: "neutral" },
};

export type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  status: CategoryStatus;
  createdAt: string;
  updatedAt: string;
};

export type CategoryFormValues = Omit<AdminCategory, "id" | "createdAt" | "updatedAt">;

/** Same rules as `adminCampaigns.ts`'s `slugify` — plain ASCII lowercase + hyphen is the whole alphabet a slug needs. */
export function slugifyCategory(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Root-cause guard, same shape as `normalizeProductCollection` — anything
 * read back out of `localStorage` may predate a field the current shape
 * relies on, so every category is normalized before a component ever reads
 * it.
 */
export function normalizeCategory(c: Partial<AdminCategory> & { id: string }): AdminCategory {
  return {
    id: c.id,
    name: c.name ?? "",
    slug: c.slug ?? "",
    description: c.description ?? "",
    image: c.image ?? "",
    status: c.status ?? "active",
    createdAt: c.createdAt ?? "",
    updatedAt: c.updatedAt ?? "",
  };
}

/** Case-insensitive; `excludeId` lets Edit compare against every *other* category. */
export function isCategorySlugTaken(categories: AdminCategory[], slug: string, excludeId?: string): boolean {
  const target = slug.trim().toLowerCase();
  return categories.some((c) => c.id !== excludeId && c.slug.trim().toLowerCase() === target);
}

const TODAY_LABEL = "18 ก.ย. 2569";

/**
 * Matches the storefront's own mega-menu taxonomy (หน้า/ตา/คิ้ว/แก้ม/ปาก,
 * seen in `Header.tsx`/`MobileMenu.tsx`) rather than inventing a parallel
 * one. `eye`/`cheek`/`lip` slugs line up with `Product.category` in
 * `src/lib/products.ts`; a Category's real product membership is always
 * derived live from `AdminProduct.categoryId` (`~/lib/masterDataRelations`'s
 * `productsInCategory`), never stored on the seed itself.
 */
const CATEGORY_SEEDS: (Omit<AdminCategory, "createdAt" | "updatedAt"> & { id: string })[] = [
  {
    id: "category-001",
    name: "ปาก",
    slug: "lip",
    description: "ลิปสติก ลิปทินท์ ลิปกลอส และผลิตภัณฑ์ดูแลริมฝีปาก",
    image: "",
    status: "active",
  },
  {
    id: "category-002",
    name: "ตา",
    slug: "eye",
    description: "อายแชโดว์ อายไลน์เนอร์ มาสคาร่า และผลิตภัณฑ์แต่งตา",
    image: "",
    status: "active",
  },
  {
    id: "category-003",
    name: "แก้ม",
    slug: "cheek",
    description: "บลัชออน ไฮไลท์เตอร์ และผลิตภัณฑ์แต่งแก้ม",
    image: "",
    status: "active",
  },
  {
    id: "category-004",
    name: "คิ้ว",
    slug: "brow",
    description: "ดินสอเขียนคิ้ว เจลเขียนคิ้ว และผลิตภัณฑ์แต่งคิ้ว",
    image: "",
    status: "active",
  },
  {
    id: "category-005",
    name: "หน้า",
    slug: "face",
    description: "รองพื้น คูชั่น แป้ง และผลิตภัณฑ์แต่งหน้าหน้า",
    image: "",
    status: "inactive",
  },
];

/** Baseline builder — fixed string-literal ids ("category-001".."005"), not an incrementing counter, so this returns byte-identical output on every call within the same process (same rule as every other Admin content module's `buildMock*()`). */
export function buildMockCategories(): AdminCategory[] {
  return CATEGORY_SEEDS.map((seed) => ({
    ...seed,
    createdAt: TODAY_LABEL,
    updatedAt: TODAY_LABEL,
  }));
}
