import type { StatusTone } from "~/components/admin/StatusBadge";

/**
 * Navigation Architecture (Blueprint v1 FINAL) — Navigation is its own
 * standalone entity. It is never owned by, and never owns, a Promotion Page,
 * Category, Collection, or Product — those are only ever *targets*, resolved
 * by id. This file is the one place `NavigationItem`'s shape/validation/seed
 * data lives; `adminNavigationStore.tsx` (write) and `navigationContent.tsx`
 * (storefront read-only mirror) both build on top of it, the same
 * two-file-per-entity convention every other content module here already
 * follows (see `adminCategories.ts`/`categoryContent.tsx`).
 */
export type NavigationTargetType =
  | "promotion_page"
  | "category"
  | "collection"
  | "product"
  | "product_listing"
  | "homepage"
  | "external";

export const NAVIGATION_TARGET_TYPE_LABELS: Record<NavigationTargetType, string> = {
  promotion_page: "หน้าโปรโมชั่น",
  category: "หมวดหมู่",
  collection: "คอลเลกชัน",
  product: "สินค้า",
  product_listing: "หน้ารวมสินค้า",
  homepage: "หน้าแรก",
  external: "ลิงก์ภายนอก",
};

/** Order the Target Type dropdown shows options in — homepage/listing first (no picker needed), then the id-based targets, external last. */
export const NAVIGATION_TARGET_TYPES: NavigationTargetType[] = [
  "homepage",
  "product_listing",
  "promotion_page",
  "category",
  "collection",
  "product",
  "external",
];

/** `targetId` is required for exactly these four — the others resolve to a fixed destination (`homepage`/`product_listing`) or a free-typed one (`external`). */
export function targetRequiresId(type: NavigationTargetType): boolean {
  return type === "promotion_page" || type === "category" || type === "collection" || type === "product";
}

export function targetRequiresExternalUrl(type: NavigationTargetType): boolean {
  return type === "external";
}

export type NavigationItem = {
  id: string;
  label: string;
  /** Key into `PROMOTION_NAV_ICON_OPTIONS` (`~/lib/promotionNavIcons`) — reuses the exact same icon registry Promotion Pages' old nav picker used. Empty string = no icon, a valid state. */
  icon: string;
  order: number;
  visible: boolean;
  parentId?: string;
  targetType: NavigationTargetType;
  targetId?: string;
  externalUrl?: string;
  createdAt: string;
  updatedAt: string;
};

export type NavigationItemFormValues = Omit<NavigationItem, "id" | "createdAt" | "updatedAt">;

/**
 * Root-cause guard, same shape as every other `normalize*` in this codebase
 * (`normalizeCategory`, `normalizePromotionPage`, ...) — anything read back
 * out of `localStorage` may predate a field the current shape relies on, or
 * may have been hand-edited into an invalid state (unknown `targetType`,
 * negative `order`, a `parentId` pointing at itself). Every item is
 * normalized before a component ever reads it, so one malformed record can
 * never crash the storefront (§35/§36).
 */
export function normalizeNavigationItem(raw: Partial<NavigationItem> & { id: string }): NavigationItem {
  const targetType: NavigationTargetType = NAVIGATION_TARGET_TYPES.includes(raw.targetType as NavigationTargetType)
    ? (raw.targetType as NavigationTargetType)
    : "external";
  return {
    id: raw.id,
    label: raw.label ?? "",
    icon: raw.icon ?? "",
    order: typeof raw.order === "number" && Number.isFinite(raw.order) ? raw.order : 0,
    visible: raw.visible ?? true,
    parentId: raw.parentId && raw.parentId !== raw.id ? raw.parentId : undefined,
    targetType,
    targetId: targetRequiresId(targetType) ? raw.targetId || undefined : undefined,
    externalUrl: targetRequiresExternalUrl(targetType) ? raw.externalUrl || "" : undefined,
    createdAt: raw.createdAt ?? "",
    updatedAt: raw.updatedAt ?? "",
  };
}

/** A NavigationItem is missing what it needs to ever resolve to a real destination — shown to Admin as a "ไม่พบปลายทางของเมนูนี้" state (§18/§36), never silently rendered on the storefront. */
export function isNavigationItemConfigValid(item: NavigationItem): boolean {
  if (targetRequiresId(item.targetType)) return !!item.targetId;
  if (targetRequiresExternalUrl(item.targetType)) return !!item.externalUrl?.trim();
  return true;
}

/** Every id currently in `parentId`'s ancestor chain of `id` — used to stop an item being re-parented under its own descendant (a circular menu tree), §11/§12. */
export function collectDescendantIds(items: NavigationItem[], id: string): Set<string> {
  const result = new Set<string>();
  const stack = [id];
  while (stack.length > 0) {
    const current = stack.pop()!;
    for (const item of items) {
      if (item.parentId === current && !result.has(item.id)) {
        result.add(item.id);
        stack.push(item.id);
      }
    }
  }
  return result;
}

/**
 * Delete-safety guard (§6/§19) — every NavigationItem pointing at a given
 * target, e.g. "the Promotion Page an admin is about to delete". Used before
 * deleting a Promotion Page/Category/Collection/Product so Admin can show
 * dependency info ("ใช้งานใน Navigation: ...") instead of silently leaving a
 * dangling reference. Pure function over `NavigationItem[]`, so any Admin
 * delete flow can import it without depending on `adminNavigationStore.tsx`'s
 * provider tree.
 */
export function findNavigationReferences(
  items: NavigationItem[],
  targetType: NavigationTargetType,
  targetId: string,
): NavigationItem[] {
  return items.filter((item) => item.targetType === targetType && item.targetId === targetId);
}

/** A short "label" or "parent > label" description for a dependency list, e.g. `- ลิป` / `- เมนูหลัก > สินค้า`. */
export function describeNavigationReference(item: NavigationItem, items: NavigationItem[]): string {
  const parent = item.parentId ? items.find((i) => i.id === item.parentId) : undefined;
  return parent ? `${parent.label} > ${item.label}` : item.label;
}

const TODAY_LABEL = "20 ก.ย. 2569";

/**
 * Storefront sync — `BottomNav.tsx` (mobile/tablet bottom bar) points its
 * "โปรโมชั่น" tab at whatever this one item resolves to (id hardcoded there),
 * falling back to `/promotion/flash-sale` when the item is hidden or its
 * target isn't live. Admin flags this item so editing it isn't a surprise.
 */
export const BOTTOM_NAV_PROMOTION_ITEM_ID = "nav-102";
export const BOTTOM_NAV_PROMOTION_FALLBACK_HREF = "/promotion/flash-sale";

/**
 * Deterministic seed — fixed string-literal ids, not an incrementing
 * counter, same "baseline builder purity" rule every other content module's
 * `buildMock*()` follows (see `adminCategories.ts`'s own note on this).
 *
 * This seed is the Navigation-owning migration of what used to live as two
 * separate implicit mechanisms: `PromotionPage.navigation.*` (removed
 * outright — see `adminContent.ts`) and `categoryContent.navCategories()`'s
 * "every active Category auto-appears" rule (Category still exists and is
 * still readable as a target, but no longer auto-creates a menu item — the
 * Blueprint's own explicit rule, §28). Every item below reproduces exactly
 * one row of the storefront's nav as it rendered immediately before this
 * migration, in the same left-to-right order Header.tsx used to compose it
 * (Promotion Pages, then Categories, then the static "ดูสินค้าทั้งหมด" link)
 * — a pure data migration, not a new menu structure.
 */
const NAVIGATION_SEEDS: (Omit<NavigationItem, "createdAt" | "updatedAt"> & { id: string })[] = [
  // Figma node 132:2352 — the storefront nav, left to right; each label links to the page it names.
  { id: "nav-101", label: "Iconic Glow", icon: "glow", order: 1, visible: true, targetType: "promotion_page", targetId: "promo-page-003" },
  { id: "nav-102", label: "Flash Sale", icon: "flashsale", order: 2, visible: true, targetType: "promotion_page", targetId: "promo-page-009" },
  { id: "nav-103", label: "ขายดี", icon: "bestseller", order: 3, visible: true, targetType: "promotion_page", targetId: "promo-page-010" },
  { id: "nav-006", label: "มาใหม่", icon: "new", order: 4, visible: true, targetType: "promotion_page", targetId: "promo-page-006" },
  { id: "nav-007", label: "กำลังฮิต", icon: "hot", order: 5, visible: true, targetType: "promotion_page", targetId: "promo-page-007" },
  { id: "nav-201", label: "คุชชั่น", icon: "", order: 6, visible: true, targetType: "category", targetId: "category-005" },
  { id: "nav-009", label: "ลิป", icon: "", order: 7, visible: true, targetType: "category", targetId: "category-001" },
  { id: "nav-011", label: "แก้ม", icon: "", order: 8, visible: true, targetType: "category", targetId: "category-003" },
  { id: "nav-010", label: "ตาและคิ้ว", icon: "", order: 9, visible: true, targetType: "category", targetId: "category-002" },
  { id: "nav-202", label: "ดูแลผิว", icon: "", order: 10, visible: true, targetType: "category", targetId: "category-006" },
  { id: "nav-203", label: "กันแดดและบอดี้แคร์", icon: "", order: 11, visible: true, targetType: "category", targetId: "category-007" },
  { id: "nav-013", label: "ดูสินค้าทั้งหมด", icon: "", order: 12, visible: true, targetType: "product_listing" },
  // Earlier campaign menus — kept (hidden) so Admin can switch them back on.
  { id: "nav-001", label: "9.9", icon: "nine-nine", order: 13, visible: false, targetType: "promotion_page", targetId: "promo-page-001" },
  { id: "nav-002", label: "วันหยุดยาว", icon: "gift", order: 14, visible: false, targetType: "promotion_page", targetId: "promo-page-002" },
  { id: "nav-004", label: "ร่าง", icon: "fire", order: 16, visible: false, targetType: "promotion_page", targetId: "promo-page-004" },
  { id: "nav-005", label: "ปีใหม่", icon: "sparkle", order: 17, visible: false, targetType: "promotion_page", targetId: "promo-page-005" },
  { id: "nav-008", label: "โปรโมชั่น", icon: "tag", order: 18, visible: false, targetType: "promotion_page", targetId: "promo-page-008" },
];

export function buildMockNavigationItems(): NavigationItem[] {
  return NAVIGATION_SEEDS.map((seed) => ({ ...seed, createdAt: TODAY_LABEL, updatedAt: TODAY_LABEL }));
}

export const NAVIGATION_VISIBILITY_META: Record<"visible" | "hidden", { label: string; tone: StatusTone }> = {
  visible: { label: "แสดง", tone: "success" },
  hidden: { label: "ซ่อน", tone: "neutral" },
};
