import type { Product } from "./types";
import type { ResolvedCartLine } from "./cartSelectors";
import { SHIPPING_FEE } from "./cartSelectors";
import { isMarketingLive, promotionCondition, promotionGiftTiers, type Promotion, type PromotionCondition } from "./adminMarketing";

/**
 * The storefront side of the cart-threshold promotions Admin manages
 * (Marketing > โปรโมชั่น): free shipping and "ซื้อครบรับของแถม" (one tier, or
 * ขั้นบันได up to 5 tiers), each counted in baht or pieces. Pure functions
 * over the active promos + resolved cart lines, so the Drawer, Cart Page and
 * Checkout all reach the same answer. A promo runs while it's switched on
 * and now is inside its start/end date-time (Bangkok), `isMarketingLive`.
 *
 * Counting: only the promo's eligible lines (all, or its `productIds`), at
 * their line price before coupon/coins; gifts never count.
 */

export type PromoProgress = {
  unit: PromotionCondition;
  /** What the eligible lines add up to, in `unit`. */
  current: number;
};

export type FreeShippingState = PromoProgress & {
  id: string;
  name: string;
  /** 0 = free on every order. */
  threshold: number;
  remaining: number;
  unlocked: boolean;
  showInCart: boolean;
};

export type GiftTierState = {
  /** 0-based position in the ascending tier list. */
  index: number;
  threshold: number;
  product: Product;
  qty: number;
  remaining: number;
  unlocked: boolean;
};

export type GiftPromotionState = PromoProgress & {
  id: string;
  name: string;
  tiers: GiftTierState[];
  /** First tier not reached yet; undefined once every tier is unlocked. */
  nextTier?: GiftTierState;
  unlockedCount: number;
  showInCart: boolean;
};

/** A gift the shopper gets right now: one per unlocked tier of every active gift promo. */
export type GiftLine = { key: string; product: Product; qty: number };

const isLive = (p: Promotion) => isMarketingLive(p);

function progress(promo: Promotion, lines: ResolvedCartLine[]): PromoProgress {
  const unit = promotionCondition(promo);
  const scope = promo.productIds.length > 0 ? new Set(promo.productIds) : undefined;
  const eligible = scope ? lines.filter((l) => scope.has(l.product.id)) : lines;
  const current = eligible.reduce((sum, l) => sum + (unit === "qty" ? l.line.qty : l.unitPrice * l.line.qty), 0);
  return { unit, current };
}

/**
 * The free-shipping promo that applies (several active → the one already
 * unlocked, else the one closest to unlocking). Undefined = no free-shipping
 * promo is on, so every order pays `SHIPPING_FEE`.
 */
export function resolveFreeShipping(promotions: Promotion[], lines: ResolvedCartLine[]): FreeShippingState | undefined {
  const states = promotions
    .filter((p) => p.type === "free_shipping" && isLive(p))
    .map((p): FreeShippingState => {
      const prog = progress(p, lines);
      const threshold = p.minSpend ?? 0;
      const remaining = Math.max(0, threshold - prog.current);
      return { ...prog, id: p.id, name: p.name, threshold, remaining, unlocked: lines.length > 0 && remaining === 0, showInCart: !!p.showInCart };
    });
  return states.sort((a, b) => Number(b.unlocked) - Number(a.unlocked) || a.remaining / (a.threshold || 1) - b.remaining / (b.threshold || 1))[0];
}

export function shippingFeeFor(freeShipping: FreeShippingState | undefined): number {
  return freeShipping?.unlocked ? 0 : SHIPPING_FEE;
}

/** Every active gift promo with at least one tier whose product exists in the catalog. Tiers are cumulative. */
export function resolveGiftPromotions(promotions: Promotion[], lines: ResolvedCartLine[], products: Product[]): GiftPromotionState[] {
  return promotions
    .filter((p) => p.type === "gift_with_purchase" && isLive(p))
    .flatMap((p): GiftPromotionState[] => {
      const prog = progress(p, lines);
      const tiers = promotionGiftTiers(p).flatMap((tier, index): GiftTierState[] => {
        const product = products.find((x) => x.id === tier.giftProductId);
        if (!product) return [];
        const remaining = Math.max(0, tier.threshold - prog.current);
        return [{ index, threshold: tier.threshold, product, qty: tier.giftQty, remaining, unlocked: remaining === 0 }];
      });
      if (tiers.length === 0) return [];
      const unlockedCount = tiers.filter((t) => t.unlocked).length;
      return [{ ...prog, id: p.id, name: p.name, tiers, nextTier: tiers.find((t) => !t.unlocked), unlockedCount, showInCart: !!p.showInCart }];
    });
}

export function giftLinesOf(gifts: GiftPromotionState[]): GiftLine[] {
  return gifts.flatMap((g) => g.tiers.filter((t) => t.unlocked).map((t) => ({ key: `${g.id}@${t.index}`, product: t.product, qty: t.qty })));
}

/** "฿260.00" / "2 ชิ้น": same money format as the rest of the cart (`formatTHB`). */
export function formatPromoValue(unit: PromotionCondition, value: number): string {
  if (unit === "qty") return `${value.toLocaleString("th-TH")} ชิ้น`;
  return `฿${value.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Short milestone label under the tier bar: "฿1,500" / "3 ชิ้น". */
export function formatPromoShort(unit: PromotionCondition, value: number): string {
  return unit === "qty" ? `${value.toLocaleString("th-TH")} ชิ้น` : `฿${value.toLocaleString("th-TH", { maximumFractionDigits: 0 })}`;
}
