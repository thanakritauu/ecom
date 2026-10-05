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

/**
 * Storefront sync — category pages are static route files at the site root
 * (`src/routes/cushion.tsx`, `lip.tsx`, ...), so a category's customer URL is
 * `/{slug}` and only these slugs actually have a page. Static mirror of the
 * route folder; update it when a category route file is added or removed.
 */
export const STOREFRONT_CATEGORY_ROUTE_SLUGS = ["cushion", "lip", "cheek", "eye", "skincare", "suncare-bodycare"];

/** Every other first path segment the storefront already routes — a category slugged one of these would collide with that page. */
export const STOREFRONT_RESERVED_ROOT_SLUGS = ["products", "product", "promotion", "cart", "checkout", "account", "login", "register", "admin"];

export function categoryStorefrontHref(slug: string): string {
  return `/${slug}`;
}

/** Thai warning for the slug field, or undefined when the slug maps cleanly onto an existing category page. */
export function categorySlugRouteWarning(slug: string): { tone: "error" | "warning"; message: string } | undefined {
  const s = slug.trim().toLowerCase();
  if (!s) return undefined;
  if (STOREFRONT_RESERVED_ROOT_SLUGS.includes(s)) return { tone: "error", message: `/${s} เป็นหน้าที่ระบบใช้งานอยู่แล้ว กรุณาเลือก Slug อื่น` };
  if (!STOREFRONT_CATEGORY_ROUTE_SLUGS.includes(s)) return { tone: "warning", message: `หน้าร้านยังไม่มีหน้า /${s} — ลูกค้าที่เปิดลิงก์นี้จะเจอหน้าไม่พบ (ต้องเพิ่มหน้าหมวดหมู่ในโค้ดก่อน)` };
  return undefined;
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
  // Storefront menu order: คุชชั่น | ลิป | แก้ม | ตาและคิ้ว | ดูแลผิว | กันแดดและบอดี้แคร์ (ids kept from the first seed so product links hold).
  {
    id: "category-005",
    name: "คุชชั่น",
    slug: "cushion",
    description: "คุชชั่นและรองพื้นเนื้อบางเบา เพื่อผิวโกลว์ฉ่ำทั้งวัน",
    image: "",
    status: "active",
  },
  {
    id: "category-001",
    name: "ลิป",
    slug: "lip",
    description: "ลิปสติก ลิปทินท์ ลิปกลอส และผลิตภัณฑ์ดูแลริมฝีปาก",
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
    id: "category-002",
    name: "ตาและคิ้ว",
    slug: "eye",
    description: "อายแชโดว์ อายไลน์เนอร์ มาสคาร่า ดินสอและเจลเขียนคิ้ว",
    image: "",
    status: "active",
  },
  {
    id: "category-006",
    name: "ดูแลผิว",
    slug: "skincare",
    description: "สกินแคร์บำรุงผิวหน้า ให้ผิวชุ่มชื้น แข็งแรง พร้อมแต่งหน้า",
    image: "",
    status: "active",
  },
  {
    id: "category-007",
    name: "กันแดดและบอดี้แคร์",
    slug: "suncare-bodycare",
    description: "กันแดดและผลิตภัณฑ์ดูแลผิวกาย ปกป้องผิวจากแดดทุกวัน",
    image: "",
    status: "active",
  },
  {
    // Merged into "ตาและคิ้ว" — kept (inactive) so older references still resolve. The storefront hides it from
    // the nav and has no `/brow` page (the route file was removed), so `/brow` lands on the not-found screen.
    id: "category-004",
    name: "คิ้ว",
    slug: "brow",
    description: "ดินสอเขียนคิ้ว เจลเขียนคิ้ว และผลิตภัณฑ์แต่งคิ้ว",
    image: "",
    status: "inactive",
  },
];

/** Baseline builder — fixed string-literal ids ("category-001".."007"), not an incrementing counter, so this returns byte-identical output on every call within the same process (same rule as every other Admin content module's `buildMock*()`). */
export function buildMockCategories(): AdminCategory[] {
  return CATEGORY_SEEDS.map((seed) => ({
    ...seed,
    createdAt: TODAY_LABEL,
    updatedAt: TODAY_LABEL,
  }));
}
