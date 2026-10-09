import type { NavigationItem } from "./adminNavigation";
import { collectionListHref } from "./pageSections";
import { isPromotionPageVisible, type PromotionPage } from "./adminContent";
import { isCollectionUsable, type ProductCollection } from "./adminCollections";
import type { AdminCategory } from "./adminCategories";
import type { Product } from "./types";

/**
 * Navigation Architecture (Blueprint v1 FINAL) §5/§17 — the ONE place a
 * `NavigationItem` is turned into a real `href` and an "is this actually
 * reachable right now" flag. Pure, framework-agnostic functions (no Solid
 * signals) so both the storefront's read-only `navigationContent.tsx`
 * (filters to visible+available) and the Admin Navigation list (shows every
 * item, including unavailable ones, for the dependency-indicator UI, §18)
 * build their tree from this exact same logic — never two implementations
 * that could quietly disagree about what "live" means.
 */
export type NavigationLookups = {
  getPromotionPage: (id: string) => PromotionPage | undefined;
  getCategory: (id: string) => AdminCategory | undefined;
  getCollection: (id: string) => ProductCollection | undefined;
  getProduct: (id: string) => Product | undefined;
};

export type ResolvedNavigationItem = NavigationItem & {
  href: string;
  /** False when the target is missing, or exists but isn't currently reachable by a customer (unpublished Promotion Page, inactive Category, non-active Collection, disabled Product). Never used to silently hide a broken link from Admin — only from the storefront (§17/§36). */
  available: boolean;
  children: ResolvedNavigationItem[];
};

/** §5/§32/§33 — Homepage and Product Listing are fixed destinations, no `targetId` needed; both are always "available" (there's no draft/unpublished state for either). */
function resolveOne(item: NavigationItem, lookups: NavigationLookups): { href: string; available: boolean } {
  switch (item.targetType) {
    case "homepage":
      return { href: "/", available: true };
    case "product_listing":
      return { href: "/products", available: true };
    case "coupon_page":
      return { href: "/coupons", available: true };
    case "external":
      return { href: item.externalUrl || "", available: !!item.externalUrl?.trim() };
    case "promotion_page": {
      const page = item.targetId ? lookups.getPromotionPage(item.targetId) : undefined;
      return { href: page ? `/promotion/${page.slug}` : "", available: !!page && isPromotionPageVisible(page) };
    }
    case "category": {
      const category = item.targetId ? lookups.getCategory(item.targetId) : undefined;
      return { href: category ? `/${category.slug}` : "", available: !!category && category.status === "active" };
    }
    case "collection": {
      const collection = item.targetId ? lookups.getCollection(item.targetId) : undefined;
      return { href: collection ? collectionListHref(collection.id) : "", available: !!collection && isCollectionUsable(collection) };
    }
    case "product": {
      const product = item.targetId ? lookups.getProduct(item.targetId) : undefined;
      return { href: product ? `/product/${product.slug}` : "", available: !!product };
    }
    default:
      return { href: "", available: false };
  }
}

/** Nests by `parentId`, sorted by `order` at every level. An item whose `parentId` no longer exists among `items` is treated as top-level, never silently dropped (§35). */
export function buildNavigationTree(items: NavigationItem[], lookups: NavigationLookups): ResolvedNavigationItem[] {
  const byParent = new Map<string | undefined, NavigationItem[]>();
  const ids = new Set(items.map((i) => i.id));
  for (const item of items) {
    const parentKey = item.parentId && ids.has(item.parentId) ? item.parentId : undefined;
    if (!byParent.has(parentKey)) byParent.set(parentKey, []);
    byParent.get(parentKey)!.push(item);
  }
  const build = (parentId: string | undefined): ResolvedNavigationItem[] =>
    (byParent.get(parentId) ?? [])
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((item) => {
        const { href, available } = resolveOne(item, lookups);
        return { ...item, href, available, children: build(item.id) };
      });
  return build(undefined);
}

/** §17 — a `visible` item whose resolved target isn't currently reachable is excluded from what the storefront renders (never a dangling/broken link); an unavailable *parent* also hides its children rather than orphaning them at the top level. Admin's own list uses `buildNavigationTree` directly (unfiltered) instead, so it can still show and manage the item. */
export function filterVisibleNavigationTree(tree: ResolvedNavigationItem[]): ResolvedNavigationItem[] {
  return tree
    .filter((item) => item.visible && item.available)
    .map((item) => ({ ...item, children: filterVisibleNavigationTree(item.children) }));
}

/** Flattens a tree back into a parent-first list — useful anywhere a flat, already-ordered array is easier to render than recursion (e.g. an indented Admin list). */
export function flattenNavigationTree(tree: ResolvedNavigationItem[], depth = 0): (ResolvedNavigationItem & { depth: number })[] {
  return tree.flatMap((item) => [{ ...item, depth }, ...flattenNavigationTree(item.children, depth + 1)]);
}
