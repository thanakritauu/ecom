/**
 * One picked product in any Admin product picker (owner rule: every picker can
 * pick a whole product or specific SKUs). `variantIds` empty = the whole
 * product (every option); otherwise only those options (SKUs).
 * Same shape as `PromotionPageProductRef` (campaign pages / collections).
 */
export type ProductSkuRef = { productId: string; variantIds: string[] };

/** Cleans stored data: drops bad entries and duplicates, keeps order. */
export function normalizeSkuRefs(raw: unknown): ProductSkuRef[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: ProductSkuRef[] = [];
  for (const r of raw as Partial<ProductSkuRef>[]) {
    if (!r || typeof r.productId !== "string" || !r.productId || seen.has(r.productId)) continue;
    seen.add(r.productId);
    out.push({ productId: r.productId, variantIds: Array.isArray(r.variantIds) ? r.variantIds.filter((v): v is string => typeof v === "string") : [] });
  }
  return out;
}

/** Old product-id lists read as whole-product refs. */
export const skuRefsFromProductIds = (ids: string[] | undefined): ProductSkuRef[] => (ids ?? []).map((productId) => ({ productId, variantIds: [] }));

/** Does a cart line / product option fall inside these refs? Empty refs = nothing picked (callers decide what that means). */
export function skuRefsCover(refs: ProductSkuRef[], productId: string, variantId?: string): boolean {
  const ref = refs.find((r) => r.productId === productId);
  if (!ref) return false;
  return ref.variantIds.length === 0 || (!!variantId && ref.variantIds.includes(variantId));
}
