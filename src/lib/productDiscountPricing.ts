import type { AdminProduct } from "./adminProductStore";
import type { Product } from "./types";
import { promotionCoversLine, type Promotion } from "./adminMarketing";
import { optionNormalPrice, type FlashDeal, type FlashDealPrice, type FlashPricedProduct } from "./flashSalePricing";
import { getDiscountPercent } from "./products";
import { canStack, flashTagOf, skuKey, type PromoTag, type SkuPricing } from "./promoStacking";

export { skuPricingOf, type SkuPricing, type ProductDiscountPriced } from "./promoStacking";

/**
 * Layer 1 of the storefront pricing (product price): ส่วนลดสินค้า
 * (`percent_off` / `baht_off`) on top of the flash sale.
 *
 * A product discount with no minimum spend and no "ลดสูงสุด" cap is a plain
 * sale price: it lowers each covered SKU's unit price, so the card, the PDP
 * and the cart line all show the discounted price with the normal price
 * struck through (and the usual "ลด X%" badge). One with a minimum spend or
 * a cap depends on the whole cart, so it can't be printed on a card: the
 * cart applies it (`priceCart` in `promotionEngine.ts`) as its own row.
 *
 * Stacking (`promoStacking.ts`): several product discounts on one SKU run in
 * order, each only if it and every discount already on that price allow
 * each other. On flash units the flash sale counts as already applied, so a
 * product discount lowers the flash price only when both allow each other;
 * units over the flash limit (charged the normal price) still get it.
 */

/** A sale-price product discount (no minimum, no cap): applied to the catalog price itself. */
export function isPriceLevelDiscount(p: Pick<Promotion, "type" | "minSpend" | "maxDiscount">): boolean {
  if (p.type !== "percent_off" && p.type !== "baht_off") return false;
  if (p.minSpend && p.minSpend > 0) return false;
  return !(p.type === "percent_off" && p.maxDiscount && p.maxDiscount > 0);
}

/** One unit's price after a sale-price discount: % rounded to whole baht (same rule as a flash "ลด %"), baht never below 0. */
export function discountedUnitPrice(p: Pick<Promotion, "type" | "discountPercent" | "discountAmount">, price: number): number {
  if (p.type === "percent_off") return Math.max(0, Math.round((price * (100 - Math.min(100, p.discountPercent ?? 0))) / 100));
  if (p.type === "baht_off") return Math.max(0, price - (p.discountAmount ?? 0));
  return price;
}

export const productDiscountTag = (p: Pick<Promotion, "id" | "combinableWith">): PromoTag => ({ kind: "product_discount", combinableWith: p.combinableWith, promoId: p.id });

function runDiscounts(price: number, start: PromoTag[], promos: Promotion[]): { price: number; tags: PromoTag[] } {
  let next = price;
  const tags = [...start];
  for (const p of promos) {
    const tag = productDiscountTag(p);
    if (!canStack(tag, tags)) continue;
    const after = discountedUnitPrice(p, next);
    if (after >= next) continue;
    next = after;
    tags.push(tag);
  }
  return { price: next, tags };
}

/**
 * The product with its sale-price discounts applied (`promos` = live,
 * audience-matched promotions, any type; only sale-price product discounts
 * are used). Untouched products are returned as they are.
 */
export function applyProductDiscounts<T extends AdminProduct>(product: T, promos: Promotion[]): T {
  const own = promos.filter((p) => isPriceLevelDiscount(p) && (p.productIds.length === 0 || p.productIds.includes(product.id)));
  if (own.length === 0) return product;
  const deal = (product as T & FlashPricedProduct).flashDeal;
  const flashTag = flashTagOf(deal);
  const variants = product.adminVariants ?? [];
  const skus: (string | undefined)[] = variants.length > 0 ? variants.map((v) => v.id) : [undefined];

  const skuPricing: Record<string, SkuPricing> = {};
  const prices: Record<string, number> = {};
  const nextDeal: FlashDeal | undefined = deal ? { ...deal, variants: { ...deal.variants } } : undefined;
  let touched = false;

  for (const sku of skus) {
    const covering = own.filter((p) => promotionCoversLine(p, product.id, sku));
    const key = skuKey(sku);
    const flash: FlashDealPrice | undefined = deal ? (sku ? deal.variants[sku] : deal.base) : undefined;
    const variant = sku ? variants.find((v) => v.id === sku) : undefined;
    // Outside a flash sale the option's stored price; in one, the deal's normal price (the option price there is the flash price).
    const regular = flash ? flash.normalPrice : variants.length > 0 ? optionNormalPrice(product, variant) : product.price;
    const normal = covering.length > 0 ? runDiscounts(regular, [], covering) : { price: regular, tags: [] };
    const flashRun = flash ? (covering.length > 0 ? runDiscounts(flash.flashPrice, [flashTag], covering) : { price: flash.flashPrice, tags: [flashTag] }) : undefined;
    const changed = normal.price < regular || (!!flash && !!flashRun && flashRun.price < flash.flashPrice);
    if (changed) touched = true;

    // The struck "ราคาก่อนลด": the flash deal's normal price, else the option's own compare price (if higher), else its normal price once discounted.
    const native = flash ? flash.normalPrice : sku && deal ? deal.regularCompareAtPrice : product.compareAtPrice;
    const shown = flashRun ? flashRun.price : normal.price;
    const compareAtPrice = Math.max(native ?? 0, changed ? regular : 0) > shown ? Math.max(native ?? 0, changed ? regular : 0) : undefined;
    skuPricing[key] = { compareAtPrice, flashTags: flashRun?.tags, normalTags: normal.tags };
    prices[key] = shown;
    if (flash && nextDeal) {
      const priced: FlashDealPrice = { ...flash, flashPrice: flashRun!.price, normalPrice: normal.price, regularPrice: flash.normalPrice };
      if (sku) nextDeal.variants[sku] = priced;
      else nextDeal.base = priced;
    }
  }
  if (!touched) return product;

  // Card / PDP headline price: the cheapest option (same rule as the flash sale), with that option's struck price.
  const cheapestKey = Object.keys(prices).reduce((a, b) => (prices[b] < prices[a] ? b : a));
  const price = prices[cheapestKey];
  const compareAtPrice = skuPricing[cheapestKey].compareAtPrice;
  return {
    ...product,
    price,
    compareAtPrice,
    discountPercent: getDiscountPercent({ price, compareAtPrice }),
    adminVariants: variants.map((v) => ({ ...v, price: prices[skuKey(v.id)] ?? optionNormalPrice(product, v) })),
    ...(nextDeal ? { flashDeal: nextDeal } : {}),
    skuPricing,
  };
}
