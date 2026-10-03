import type { StatusTone } from "~/components/admin/StatusBadge";

/**
 * Brand Management — Phase 01 additional scope. Structurally identical to
 * `AdminCategory` (Name/Slug/Description/Image/Status) since a
 * brand is the same kind of taxonomy entry a category is, just grouping
 * products by manufacturer/line instead of by type.
 *
 * Architecture Cleanup & Source of Truth — Brand is Product Classification
 * only, same as Category: it used to also carry a curated
 * `products: PromotionPageProductRef[]` "featured products" list, which
 * duplicated Collection's one job. A Brand's real product membership is
 * derived live from each `AdminProduct.brandId` instead (see
 * `~/lib/masterDataRelations`'s `productsInBrand`).
 */
export type BrandStatus = "active" | "inactive";

export const BRAND_STATUS_META: Record<BrandStatus, { label: string; tone: StatusTone }> = {
  active: { label: "เปิดใช้งาน", tone: "success" },
  inactive: { label: "ปิดใช้งาน", tone: "neutral" },
};

export type AdminBrand = {
  id: string;
  name: string;
  slug: string;
  description: string;
  logo: string;
  status: BrandStatus;
  createdAt: string;
  updatedAt: string;
};

export type BrandFormValues = Omit<AdminBrand, "id" | "createdAt" | "updatedAt">;

/** Same rules as `adminCategories.ts`'s `slugifyCategory`. */
export function slugifyBrand(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Root-cause guard, same shape as `normalizeCategory` — every brand is normalized before a component ever reads it. */
export function normalizeBrand(b: Partial<AdminBrand> & { id: string }): AdminBrand {
  return {
    id: b.id,
    name: b.name ?? "",
    slug: b.slug ?? "",
    description: b.description ?? "",
    logo: b.logo ?? "",
    status: b.status ?? "active",
    createdAt: b.createdAt ?? "",
    updatedAt: b.updatedAt ?? "",
  };
}

/** Case-insensitive; `excludeId` lets Edit compare against every *other* brand. */
export function isBrandSlugTaken(brands: AdminBrand[], slug: string, excludeId?: string): boolean {
  const target = slug.trim().toLowerCase();
  return brands.some((b) => b.id !== excludeId && b.slug.trim().toLowerCase() === target);
}

const TODAY_LABEL = "18 ก.ย. 2569";

/**
 * Two real product lines already visible in `src/lib/products.ts`'s product
 * names ("Charmiss Charming..." vs "Charmiss x Sanrio..."), plus one
 * inactive placeholder sub-line with no products yet — mirrors
 * `adminCategories.ts`'s "หน้า"/"คิ้ว" seeds that also start empty.
 */
const BRAND_SEEDS: (Omit<AdminBrand, "createdAt" | "updatedAt"> & { id: string })[] = [
  {
    id: "brand-001",
    name: "Charmiss",
    slug: "charmiss",
    description: "แบรนด์หลักของ Charmiss ครอบคลุมสกินแคร์และเครื่องสำอางทุกไลน์",
    logo: "",
    status: "active",
  },
  {
    id: "brand-002",
    name: "Charmiss x Sanrio",
    slug: "charmiss-x-sanrio",
    description: "คอลเลกชันคอลแลบระหว่าง Charmiss และ Sanrio Character",
    logo: "",
    status: "active",
  },
  {
    id: "brand-003",
    name: "Charmiss Wellness",
    slug: "charmiss-wellness",
    description: "ไลน์ผลิตภัณฑ์เพื่อสุขภาพและความเป็นอยู่ที่ดี (เตรียมเปิดตัว)",
    logo: "",
    status: "inactive",
  },
];

/** Baseline builder — fixed string-literal ids ("brand-001".."003"), not an incrementing counter, same rule as every other Admin content module's `buildMock*()`. A Brand's real product membership is always derived live from `AdminProduct.brandId` (`~/lib/masterDataRelations`'s `productsInBrand`), never stored on the seed itself. */
export function buildMockBrands(): AdminBrand[] {
  return BRAND_SEEDS.map((seed) => ({
    ...seed,
    createdAt: TODAY_LABEL,
    updatedAt: TODAY_LABEL,
  }));
}
