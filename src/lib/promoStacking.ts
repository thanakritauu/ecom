import type { CombinableKind } from "./adminMarketing";
import type { FlashDeal } from "./flashSalePricing";
import type { Product } from "./types";

/**
 * "การใช้ร่วมกับโปรอื่น" on the storefront. Every discount a cart line gets
 * leaves a tag on it (which group gave it, and what that promo said it may
 * stack with). A later promo A may still work on that line only when A
 * allows every tag's group AND every tag's promo allows A's group. Unset
 * `combinableWith` = stacks with everything (old data keeps working).
 *
 * Groups: flash_sale (แฟลชเซล), product_discount (ส่วนลดสินค้า), cart_deal
 * (ยิ่งซื้อยิ่งคุ้ม / บันเดิลดีล / ซื้อ X แถม Y), gift_shipping (ของแถมและส่งฟรี),
 * coupon (คูปอง).
 */
export type PromoTag = { kind: CombinableKind; combinableWith?: CombinableKind[]; promoId?: string };

export const kindAllowed = (list: CombinableKind[] | undefined, kind: CombinableKind) => !list || list.includes(kind);

/** Whether a promo of `kind` (with its own `combinableWith`) may add its discount on a line that already carries `applied`. */
export function canStack(next: { kind: CombinableKind; combinableWith?: CombinableKind[] }, applied: readonly PromoTag[] | undefined): boolean {
  return (applied ?? []).every((t) => kindAllowed(next.combinableWith, t.kind) && kindAllowed(t.combinableWith, next.kind));
}

/** Tags of both lists, without repeating the same promo. */
export function mergeTags(a: readonly PromoTag[] | undefined, b: readonly PromoTag[] | undefined): PromoTag[] {
  const out = [...(a ?? [])];
  for (const t of b ?? []) if (!out.some((x) => x.kind === t.kind && x.promoId === t.promoId)) out.push(t);
  return out;
}

export const flashTagOf = (deal: Pick<FlashDeal, "combinableWith"> | undefined): PromoTag => ({ kind: "flash_sale", combinableWith: deal?.combinableWith, promoId: "flash" });

/** What the cart needs per SKU once product discounts touched the product: the struck price and the tags each kind of unit carries. */
export type SkuPricing = {
  compareAtPrice?: number;
  /** Units at the flash price: the flash tag plus any product discount stacked on it. */
  flashTags?: PromoTag[];
  /** Units at the normal price (no flash sale, or over its limit). */
  normalTags: PromoTag[];
};

export type ProductDiscountPriced = { skuPricing?: Record<string, SkuPricing> };

/** `skuPricing` key: the option id, or "" for a product without options. */
export const skuKey = (variantId?: string) => variantId ?? "";

export function skuPricingOf(product: Product, variantId?: string): SkuPricing | undefined {
  return (product as Product & ProductDiscountPriced).skuPricing?.[skuKey(variantId)];
}

