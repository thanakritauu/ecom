import type { Product, ProductVariant } from "./types";
import type { ResolvedCartLine } from "./cartSelectors";
import { SHIPPING_FEE } from "./cartSelectors";
import {
  isMarketingLive,
  promotionCondition,
  promotionCoversLine,
  promotionDiscountTiers,
  promotionGiftTiers,
  type CombinableKind,
  type DiscountKind,
  type Promotion,
  type PromotionCondition,
  type PromotionItem,
  type PromotionType,
} from "./adminMarketing";
import { canStack, mergeTags, type PromoTag } from "./promoStacking";
import { isPriceLevelDiscount } from "./productDiscountPricing";

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
  /** The gift's options the customer may pick from (in stock, allowed by Admin); empty = the product has no options. */
  options: ProductVariant[];
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
export type GiftLine = {
  key: string;
  product: Product;
  qty: number;
  /** Options the customer may pick (see `GiftTierState.options`). More than one = a choice is needed. */
  options: ProductVariant[];
  /** The option this gift ships as: the customer's pick, else the first allowed option. Unset = no options. */
  variant?: ProductVariant;
};

const isLive = (p: Promotion) => isMarketingLive(p);

/** Lines a gift / free-shipping promo counts: in its scope, and not carrying a promo it can't stack with. */
function giftShippingLines(promo: Promotion, lines: ResolvedCartLine[]): ResolvedCartLine[] {
  const tag = { kind: "gift_shipping" as const, combinableWith: promo.combinableWith };
  return lines.filter((l) => promotionCoversLine(promo, l.product.id, l.line.variantId) && canStack(tag, l.promoTags));
}

function progress(promo: Promotion, lines: ResolvedCartLine[]): PromoProgress {
  const unit = promotionCondition(promo);
  const eligible = giftShippingLines(promo, lines);
  const current = eligible.reduce((sum, l) => sum + (unit === "qty" ? l.line.qty : l.lineTotal), 0);
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
        const allowed = tier.giftVariantIds?.length ? new Set(tier.giftVariantIds) : undefined;
        const options = (product.variants ?? []).filter((v) => !v.soldOut && (!allowed || allowed.has(v.id)));
        return [{ index, threshold: tier.threshold, product, qty: tier.giftQty, remaining, unlocked: remaining === 0, options }];
      });
      if (tiers.length === 0) return [];
      const unlockedCount = tiers.filter((t) => t.unlocked).length;
      return [{ ...prog, id: p.id, name: p.name, tiers, nextTier: tiers.find((t) => !t.unlocked), unlockedCount, showInCart: !!p.showInCart }];
    });
}

/** Unlocked gifts as cart lines; `choices` = the customer's picked option per gift key (`CartContext.giftChoices`). */
export function giftLinesOf(gifts: GiftPromotionState[], choices: Record<string, string> = {}): GiftLine[] {
  return gifts.flatMap((g) =>
    g.tiers
      .filter((t) => t.unlocked)
      .map((t): GiftLine => {
        const key = `${g.id}@${t.index}`;
        // The customer's pick if it's still allowed, else the first allowed option (picked for them; they can change it).
        const variant = t.options.find((v) => v.id === choices[key]) ?? t.options[0];
        return { key, product: t.product, qty: t.qty, options: t.options, variant };
      }),
  );
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

// ---------------------------------------------------------------------------
// Cart pricing: every promotion tool, in a fixed order, each on the result
// of the one before. Layer 1 (the product price: flash sale + sale-price
// ส่วนลดสินค้า) is already in the resolved lines (`resolveCartLines` over the
// catalog, see `productDiscountPricing.ts`); this adds:
//   1b. ส่วนลดสินค้า with a minimum spend or a "ลดสูงสุด" cap (cart-level row)
//   2.  cart deals: บันเดิลดีล, ซื้อ X แถม Y, then ยิ่งซื้อยิ่งคุ้ม
//   3.  ซื้อครบรับของแถม + ส่งฟรี, counted on the total after 1-2
// Layer 4 (the coupon) is `computeCheckoutTotals` over `pricedLines`.
// Stacking ("การใช้ร่วมกับโปรอื่น") is checked per line before every step
// (`promoStacking.ts`): a promo that can't stack with what a line already
// has skips that line; it never takes the earlier discount away. A line
// never goes below ฿0.
// ---------------------------------------------------------------------------

/** One cart-level promo the order got: shown as its own row (name, -฿amount) in the cart, mini cart and checkout. */
export type PromoDiscountRow = { id: string; name: string; type: PromotionType; amount: number };

/** ยิ่งซื้อยิ่งคุ้ม in this cart, for its progress banner. */
export type TieredDiscountState = {
  id: string;
  name: string;
  unit: PromotionCondition;
  /** What the eligible lines add up to (pieces, or baht after the earlier promos). */
  current: number;
  kind: DiscountKind;
  steps: { threshold: number; value: number }[];
  /** Highest step reached, -1 = none yet. */
  reachedIndex: number;
  next?: { index: number; threshold: number; value: number; remaining: number };
  discount: number;
  showInCart: boolean;
};

export type CartPricing = {
  /** "ยอดรวมสินค้า": the lines' own total (sale / flash prices included). */
  subtotal: number;
  /** Cart-level promo rows, in the order they were applied. */
  rows: PromoDiscountRow[];
  promoDiscount: number;
  /** subtotal - promoDiscount: what the products cost before coupon, coins and shipping (the mini cart / cart page total). */
  total: number;
  /** The lines as the coupon sees them: `lineTotal` after every promo, `promoTags` = every promo on the line. */
  pricedLines: ResolvedCartLine[];
  freeShipping?: FreeShippingState;
  shippingFee: number;
  gifts: GiftPromotionState[];
  /** Free gifts: unlocked ของแถม tiers, then ซื้อ X แถม Y items that weren't in the cart. */
  giftLines: GiftLine[];
  tiered: TieredDiscountState[];
};

type Work = { entry: ResolvedCartLine; net: number; tags: PromoTag[]; reserved: number };

const round2 = (n: number) => Math.round(n * 100) / 100;
const tagOf = (p: Promotion, kind: CombinableKind): PromoTag => ({ kind, combinableWith: p.combinableWith, promoId: p.id });
const qtyOf = (w: Work) => w.entry.line.qty;
const unitNet = (w: Work) => (qtyOf(w) > 0 ? w.net / qtyOf(w) : 0);

/** Takes `amount` off `works`, split by `weights` (whole satang, the biggest share last), never below a line's ฿0. Returns what was taken. */
function spread(works: Work[], weights: number[], amount: number): number {
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0 || amount <= 0) return 0;
  const target = Math.min(amount, total);
  const order = works.map((_, i) => i).filter((i) => weights[i] > 0).sort((a, b) => weights[a] - weights[b]);
  let left = target;
  order.forEach((i, k) => {
    const share = k === order.length - 1 ? left : Math.floor(((target * weights[i]) / total) * 100) / 100;
    const take = Math.max(0, Math.min(share, works[i].net, left));
    works[i].net = round2(works[i].net - take);
    left = round2(left - take);
  });
  return round2(target - left);
}

const matchesItem = (entry: ResolvedCartLine, item: PromotionItem) =>
  entry.product.id === item.productId && (!item.variantIds?.length || (!!entry.line.variantId && item.variantIds.includes(entry.line.variantId)));

type Taken = { work: Work; units: number };

/** Reserves `sets` x each item's qty from the usable works, in cart order. Undefined (nothing reserved) when any item falls short. */
function reserveSets(works: Work[], items: PromotionItem[], sets: number, usable: (w: Work) => boolean): Taken[] | undefined {
  const before = works.map((w) => w.reserved);
  const taken: Taken[] = [];
  for (const item of items) {
    let need = sets * item.qty;
    for (const w of works) {
      if (need <= 0) break;
      if (!usable(w) || !matchesItem(w.entry, item)) continue;
      const units = Math.min(need, qtyOf(w) - w.reserved);
      if (units <= 0) continue;
      w.reserved += units;
      need -= units;
      taken.push({ work: w, units });
    }
    if (need > 0) {
      works.forEach((w, i) => (w.reserved = before[i]));
      return undefined;
    }
  }
  return taken;
}

/** Most full sets of `items` the usable, not yet reserved units make (reserved on return). */
function reserveMostSets(works: Work[], items: PromotionItem[], usable: (w: Work) => boolean): { sets: number; taken: Taken[] } {
  const free = (item: PromotionItem) => works.reduce((n, w) => (usable(w) && matchesItem(w.entry, item) ? n + qtyOf(w) - w.reserved : n), 0);
  let sets = items.length > 0 ? Math.min(...items.map((i) => (i.qty > 0 ? Math.floor(free(i) / i.qty) : 0))) : 0;
  for (; sets > 0; sets--) {
    const taken = reserveSets(works, items, sets, usable);
    if (taken) return { sets, taken };
  }
  return { sets: 0, taken: [] };
}

/** Per work, the value of the units taken (at their current unit price). */
function takenValue(taken: Taken[]): { works: Work[]; values: number[] } {
  const works: Work[] = [];
  const values: number[] = [];
  for (const t of taken) {
    const i = works.indexOf(t.work);
    const value = t.units * unitNet(t.work);
    if (i === -1) {
      works.push(t.work);
      values.push(value);
    } else values[i] += value;
  }
  return { works, values };
}

const addTag = (works: Work[], tag: PromoTag) => works.forEach((w) => (w.tags = mergeTags(w.tags, [tag])));

/** A ซื้อ X แถม Y item that isn't in the cart, as a free gift line (same row / option picker as ของแถม). */
function freeItemLine(p: Promotion, index: number, item: PromotionItem, qty: number, products: Product[], choices: Record<string, string>): GiftLine | undefined {
  const product = products.find((x) => x.id === item.productId);
  if (!product || (product.stockLeft !== undefined && product.stockLeft <= 0)) return undefined;
  const allowed = item.variantIds?.length ? new Set(item.variantIds) : undefined;
  const options = (product.variants ?? []).filter((v) => !v.soldOut && (!allowed || allowed.has(v.id)));
  if ((product.variants?.length ?? 0) > 0 && options.length === 0) return undefined;
  const key = `${p.id}@get-${index}`;
  return { key, product, qty, options, variant: options.find((v) => v.id === choices[key]) ?? options[0] };
}

/**
 * Prices one cart with every live promotion (`promotions` = what the
 * storefront runs for this shopper: switched on, in its window, in its
 * กลุ่มลูกค้า). Pure: the Drawer, Cart Page and Checkout all call it with the
 * same lines, so they always show the same totals.
 */
export function priceCart(opts: { lines: ResolvedCartLine[]; promotions: Promotion[]; products: Product[]; giftChoices?: Record<string, string> }): CartPricing {
  const promos = opts.promotions.filter(isLive);
  const choices = opts.giftChoices ?? {};
  const works: Work[] = opts.lines.map((entry) => ({ entry, net: entry.lineTotal, tags: [...(entry.promoTags ?? [])], reserved: 0 }));
  const rows: PromoDiscountRow[] = [];
  const extraGifts: GiftLine[] = [];
  const tiered: TieredDiscountState[] = [];
  const pushRow = (p: Promotion, amount: number) => amount > 0 && rows.push({ id: p.id, name: p.name, type: p.type, amount: round2(amount) });

  // 1b. ส่วนลดสินค้า that depends on the cart (minimum spend or a cap): one row, off the eligible lines' total.
  for (const p of promos) {
    if ((p.type !== "percent_off" && p.type !== "baht_off") || isPriceLevelDiscount(p)) continue;
    const tag = tagOf(p, "product_discount");
    const eligible = works.filter((w) => w.net > 0 && promotionCoversLine(p, w.entry.product.id, w.entry.line.variantId) && canStack(tag, w.tags));
    const base = round2(eligible.reduce((n, w) => n + w.net, 0));
    if (base <= 0 || (p.minSpend && base < p.minSpend)) continue;
    let amount = p.type === "percent_off" ? Math.floor((base * (p.discountPercent ?? 0)) / 100) : (p.discountAmount ?? 0);
    if (p.type === "percent_off" && p.maxDiscount) amount = Math.min(amount, p.maxDiscount);
    const taken = spread(eligible, eligible.map((w) => w.net), Math.min(amount, base));
    if (taken > 0) {
      addTag(eligible, tag);
      pushRow(p, taken);
    }
  }

  // 2a. บันเดิลดีล: every full set in the cart is charged the set price.
  for (const p of promos) {
    if (p.type !== "bundle" || !p.bundleItems?.length || !(p.bundlePrice && p.bundlePrice > 0)) continue;
    const tag = tagOf(p, "cart_deal");
    const { sets, taken } = reserveMostSets(works, p.bundleItems, (w) => w.net > 0 && canStack(tag, w.tags));
    if (sets === 0) continue;
    const { works: used, values } = takenValue(taken);
    const discount = round2(values.reduce((a, b) => a + b, 0) - sets * p.bundlePrice);
    if (discount <= 0) {
      taken.forEach((t) => (t.work.reserved -= t.units));
      continue;
    }
    addTag(used, tag);
    pushRow(p, spread(used, values, discount));
  }

  // 2b. ซื้อ X แถม Y: per full set of the buy items, the get items are free (in the cart: discounted; not in it: added as a gift line).
  for (const p of promos) {
    if (p.type !== "buy_x_get_y" || !p.buyItems?.length || !p.getItems?.length) continue;
    const tag = tagOf(p, "cart_deal");
    const usable = (w: Work) => w.net > 0 && canStack(tag, w.tags);
    const { sets, taken: bought } = reserveMostSets(works, p.buyItems, usable);
    if (sets === 0) continue;
    const got: Taken[] = [];
    p.getItems.forEach((item, i) => {
      let need = sets * item.qty;
      for (const w of works) {
        if (need <= 0) break;
        if (!usable(w) || !matchesItem(w.entry, item)) continue;
        const units = Math.min(need, qtyOf(w) - w.reserved);
        if (units <= 0) continue;
        w.reserved += units;
        need -= units;
        got.push({ work: w, units });
      }
      if (need > 0) {
        const gift = freeItemLine(p, i, item, need, opts.products, choices);
        if (gift) extraGifts.push(gift);
      }
    });
    const { works: freed, values } = takenValue(got);
    if (freed.length === 0 && !extraGifts.some((g) => g.key.startsWith(`${p.id}@`))) {
      bought.forEach((t) => (t.work.reserved -= t.units));
      continue;
    }
    addTag([...bought.map((t) => t.work), ...freed], tag);
    pushRow(p, spread(freed, values, values.reduce((a, b) => a + b, 0)));
  }

  // 2c. ยิ่งซื้อยิ่งคุ้ม: the highest step the eligible lines reach, % or baht off their total.
  for (const p of promos) {
    if (p.type !== "tiered_discount") continue;
    const steps = promotionDiscountTiers(p);
    if (steps.length === 0) continue;
    const tag = tagOf(p, "cart_deal");
    const unit = promotionCondition(p);
    const eligible = works.filter((w) => promotionCoversLine(p, w.entry.product.id, w.entry.line.variantId) && canStack(tag, w.tags));
    const base = round2(eligible.reduce((n, w) => n + w.net, 0));
    const current = unit === "qty" ? eligible.reduce((n, w) => n + qtyOf(w), 0) : base;
    let reachedIndex = -1;
    steps.forEach((s, i) => current >= s.threshold && (reachedIndex = i));
    const kind: DiscountKind = p.tierDiscountType ?? "percent";
    let discount = 0;
    if (reachedIndex >= 0 && base > 0) {
      const value = steps[reachedIndex].value;
      const amount = kind === "percent" ? Math.floor((base * value) / 100) : Math.min(value, base);
      discount = spread(eligible, eligible.map((w) => w.net), amount);
      if (discount > 0) {
        addTag(eligible, tag);
        pushRow(p, discount);
      }
    }
    const nextStep = steps[reachedIndex + 1];
    tiered.push({
      id: p.id,
      name: p.name,
      unit,
      current,
      kind,
      steps,
      reachedIndex,
      next: nextStep ? { index: reachedIndex + 1, threshold: nextStep.threshold, value: nextStep.value, remaining: round2(nextStep.threshold - current) } : undefined,
      discount,
      // A product-limited promo with none of its products in the cart stays quiet.
      showInCart: p.showInCart !== false && opts.lines.length > 0 && (p.productIds.length === 0 || eligible.length > 0),
    });
  }

  // 3. ของแถม + ส่งฟรี on the total after 1-2; the lines they count carry their tag (for the coupon's stacking check).
  const adjusted = works.map((w): ResolvedCartLine => ({ ...w.entry, lineTotal: w.net, promoTags: w.tags }));
  const freeShipping = resolveFreeShipping(promos, adjusted);
  const gifts = resolveGiftPromotions(promos, adjusted, opts.products);
  const counted = (p: Promotion | undefined) => (p ? giftShippingLines(p, adjusted) : []);
  const giftShipTags = new Map<ResolvedCartLine, PromoTag[]>();
  const tagCounted = (p: Promotion | undefined) => {
    if (!p) return;
    const tag = tagOf(p, "gift_shipping");
    for (const l of counted(p)) giftShipTags.set(l, mergeTags(giftShipTags.get(l), [tag]));
  };
  if (freeShipping?.unlocked) tagCounted(promos.find((p) => p.id === freeShipping.id));
  for (const g of gifts) if (g.unlockedCount > 0) tagCounted(promos.find((p) => p.id === g.id));
  const pricedLines = adjusted.map((l) => (giftShipTags.has(l) ? { ...l, promoTags: mergeTags(l.promoTags, giftShipTags.get(l)) } : l));

  const subtotal = round2(opts.lines.reduce((n, l) => n + l.lineTotal, 0));
  const promoDiscount = Math.min(subtotal, round2(rows.reduce((n, r) => n + r.amount, 0)));
  return {
    subtotal,
    rows,
    promoDiscount,
    total: round2(subtotal - promoDiscount),
    pricedLines,
    freeShipping,
    shippingFee: shippingFeeFor(freeShipping),
    gifts,
    giftLines: [...giftLinesOf(gifts, choices), ...extraGifts],
    tiered,
  };
}
