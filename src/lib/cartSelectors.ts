import type { CartLine, Product, ProductVariant } from "./types";
import { resolveVariantOption } from "./productVariants";
import { flashDealFor } from "./flashSalePricing";
import { getTier, type TierId } from "./membership";
import { skuRefsCover, type ProductSkuRef } from "./productSkuRef";
import type { CombinableKind } from "./adminMarketing";
import type { FlashPricedProduct } from "./flashSalePricing";
import { canStack, flashTagOf, mergeTags, skuPricingOf, type PromoTag } from "./promoStacking";

/** Matches the free-shipping copy already used in Home's Utility Bar — one real threshold, not a second number invented for the drawer. */
export const FREE_SHIPPING_THRESHOLD = 990;
/** DHL standard delivery fee below `FREE_SHIPPING_THRESHOLD`. */
export const SHIPPING_FEE = 60;

/**
 * The one shipping rule (Checkout, account orders, Admin order seeds):
 * DHL standard is free once the product subtotal — the lines' own total,
 * before coupon/coin discounts — reaches ฿990, otherwise ฿60. The cart
 * itself never shows this promo (it leads with the gift banner instead).
 */
export function computeShippingFee(subtotal: number): number {
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
}

/**
 * "ซื้อครบ ฿X รับฟรีสินค้า Y ทันที" — mock prototype promo (no promotion
 * backend), same status as `AVAILABLE_COUPONS` below. The gift is a real
 * catalog product (feature-9 = the setting spray) so its name/photo stay in
 * sync with the Product Store. It is never a `CartLine`: it's derived from
 * the paid subtotal, so it appears/disappears on its own as qty changes and
 * can't be edited, removed, or counted toward the total. Free shipping
 * (`FREE_SHIPPING_THRESHOLD`) still applies — the UI just leads with this one.
 */
export const GIFT_PROMOTION = { threshold: 590, productId: "feature-9", qty: 1 } as const;

export type GiftPromotionState = {
  product: Product;
  qty: number;
  threshold: number;
  remaining: number;
  unlocked: boolean;
};

export function resolveGiftPromotion(subtotal: number, products: Product[]): GiftPromotionState | undefined {
  const product = products.find((p) => p.id === GIFT_PROMOTION.productId);
  if (!product) return undefined;
  const remaining = Math.max(0, GIFT_PROMOTION.threshold - subtotal);
  return { product, qty: GIFT_PROMOTION.qty, threshold: GIFT_PROMOTION.threshold, remaining, unlocked: remaining === 0 };
}

export type ResolvedCartLine = {
  line: CartLine;
  product: Product;
  variant?: ProductVariant;
  /** Per-unit price shown for this line: the flash price during a live flash sale, else the option's / product's own price (see `productVariants.ts`). */
  unitPrice: number;
  /** Struck-through "ราคาก่อนลด" for this line. */
  compareAtPrice?: number;
  /** What this line costs: `unitPrice` x qty, except units over a flash sale limit, which are charged `normalUnitPrice`. */
  lineTotal: number;
  /** Flash sale only: units at the flash price (the rest of `line.qty` is at `normalUnitPrice`). */
  flashQty?: number;
  normalUnitPrice?: number;
  /** Flash sale only: the most units this cart gets at the flash price (set when a limit applies). */
  flashLimit?: number;
  /**
   * Every promo that already gave this line something (flash sale, ส่วนลดสินค้า,
   * then cart deals and gift / free shipping once the cart is priced): later
   * promos check it before they apply ("การใช้ร่วมกับโปรอื่น", `promoStacking.ts`).
   */
  promoTags?: PromoTag[];
};

/**
 * Joins raw cart lines (product/variant ids + qty — the only state cart.tsx
 * itself owns) against the live Product Store (Architecture Cleanup &
 * Source of Truth — `products` is the caller's `useProductCatalog().products()`,
 * never a static import here). Kept separate from cart.tsx on purpose: cart
 * state shouldn't need to import product data itself, and the Drawer/Cart
 * Page/Checkout all resolve and total their lines the exact same way by
 * calling these same two functions instead of re-deriving totals.
 *
 * Flash sale limits: a live flash sale's "จำกัดต่อลูกค้า" (and its
 * "จำกัดการซื้อทั้งหมด") cap how many units of this cart get the flash price,
 * counted per product (level ระดับสินค้า, across its options) or per option
 * (ระดับตัวเลือกสินค้า), in cart order. Units over the cap stay in the cart
 * and are charged the normal price; the line shows a note.
 */
export function resolveCartLines(lines: CartLine[], products: Product[]): ResolvedCartLine[] {
  const flashUsed = new Map<string, number>();
  return lines.flatMap((line): ResolvedCartLine[] => {
    const product = products.find((p) => p.id === line.productId);
    if (!product) return [];
    const found = line.variantId ? product.variants?.find((v) => v.id === line.variantId) : undefined;
    // Same resolver the Product Option Modal shows from, so the cart line's photo/price match the option the shopper picked.
    const option = found ? resolveVariantOption(product, found) : undefined;
    const variant = found && option ? { ...found, image: option.image } : found;
    const unitPrice = option?.price ?? product.price;
    const compareAtPrice = option ? option.compareAtPrice : product.compareAtPrice;
    const deal = flashDealFor(product, found?.id);
    const sku = skuPricingOf(product, found?.id);
    if (!deal) return [{ line, product, variant, unitPrice, compareAtPrice, lineTotal: unitPrice * line.qty, promoTags: sku?.normalTags ?? [] }];
    const caps = [deal.customerLimit, deal.totalLimit].filter((n): n is number => n !== undefined);
    const cap = caps.length > 0 ? Math.min(...caps) : undefined;
    const used = flashUsed.get(deal.limitKey) ?? 0;
    const flashQty = cap === undefined ? line.qty : Math.max(0, Math.min(line.qty, cap - used));
    flashUsed.set(deal.limitKey, used + flashQty);
    const lineTotal = flashQty * deal.flashPrice + (line.qty - flashQty) * deal.normalPrice;
    // The flash sale (and any product discount stacked on it) on the flash units; the normal-price units carry their own.
    const flashTags = sku?.flashTags ?? [flashTagOf((product as Product & FlashPricedProduct).flashDeal)];
    const promoTags = mergeTags(flashQty > 0 ? flashTags : [], flashQty < line.qty ? sku?.normalTags : []);
    const regular = deal.regularPrice ?? deal.normalPrice;
    // Nothing left at the flash price: the line reads as a normal-price line (struck only when a product discount lowered it).
    if (flashQty === 0) {
      const struck = regular > deal.normalPrice ? regular : undefined;
      return [{ line, product, variant, unitPrice: deal.normalPrice, compareAtPrice: struck, lineTotal, flashQty, normalUnitPrice: deal.normalPrice, flashLimit: cap, promoTags }];
    }
    return [{ line, product, variant, unitPrice: deal.flashPrice, compareAtPrice: regular, lineTotal, flashQty, normalUnitPrice: deal.normalPrice, flashLimit: cap, promoTags }];
  });
}

/** "ราคาแฟลชเซลสูงสุด 2 ชิ้น ชิ้นที่เกินคิดราคาปกติ ฿329": shown on a line with units over its flash sale limit. */
export function flashLimitNote(entry: ResolvedCartLine): string | undefined {
  if (entry.flashQty === undefined || entry.flashLimit === undefined || entry.flashQty >= entry.line.qty) return undefined;
  const normal = `฿${(entry.normalUnitPrice ?? 0).toLocaleString("th-TH")}`;
  return `ราคาแฟลชเซลสูงสุด ${entry.flashLimit.toLocaleString("th-TH")} ชิ้น ชิ้นที่เกินคิดราคาปกติ ${normal}`;
}

export function computeCartTotal(resolved: ResolvedCartLine[]): number {
  return resolved.reduce((sum, { lineTotal }) => sum + lineTotal, 0);
}

/**
 * Checkout-only pricing inputs. Kept in this same file — not a second
 * pricing module — so Checkout's Order Summary computes its total with the
 * exact same `computeCartTotal`-derived subtotal the Drawer and Cart Page
 * use, extended with the three things only Checkout adds (shipping fee,
 * coupon, Charmiss Coin), instead of three separate screens each re-deriving
 * a total their own way.
 */
/** The default carrier (DHL standard): orders, help pages and FAQ name it; the fee is `computeShippingFee`. */
export const DELIVERY = { carrier: "DHL", label: "จัดส่งโดย DHL", method: "จัดส่งมาตรฐาน", etaLabel: "ได้รับภายใน 2-3 วันทำการ" } as const;

/**
 * Checkout's delivery choice (mock until the other carriers are contracted): DHL first and picked by
 * default. `fee` = that carrier's shipping fee; a free-shipping promo makes every option free.
 */
export const DELIVERY_OPTIONS = [
  { id: "dhl", name: "DHL", fee: SHIPPING_FEE },
  { id: "flash", name: "Flash Express", fee: 50 },
  { id: "kerry", name: "Kerry Express", fee: 55 },
  { id: "ems", name: "EMS", fee: 45 },
] as const;
export type DeliveryOptionId = (typeof DELIVERY_OPTIONS)[number]["id"];

/** Paid on the Checkout page itself (no separate payment step). No installments / cash on delivery. Order = display order; the first is the default pick. */
export const PAYMENT_METHODS = [
  { id: "promptpay", label: "พร้อมเพย์", description: "สแกน QR ชำระผ่านแอปธนาคาร" },
  // Stored on orders as this label — `OrderMeta` maps this label (and the older "โอนเงินผ่านแอปธนาคาร" / "โมบายแบงก์กิ้ง") to the bank-app label.
  { id: "mobilebanking", label: "โมบายล์แบงก์กิ้ง", description: "ชำระผ่านแอปธนาคารบนมือถือ" },
  { id: "card", label: "บัตรเครดิต / เดบิต", description: "ชำระผ่านบัตรเครดิตหรือเดบิต" },
  { id: "truemoney", label: "TrueMoney Wallet", description: "ยืนยันการชำระในแอป TrueMoney" },
] as const;
export type PaymentMethodId = (typeof PAYMENT_METHODS)[number]["id"];

export type CouponDiscountKind = "baht" | "percent";

export type Coupon = {
  code: string;
  /** "ลด ฿100" / "ลด 10% (สูงสุด ฿200)": the one-line label every coupon surface prints (`couponLabels`). */
  label: string;
  /** "ลด ฿100" / "ลด 10%": the ticket's big line. */
  amountLabel: string;
  /** "ลดสูงสุด ฿200": a capped % coupon's extra ticket line. */
  capLabel?: string;
  discountType: CouponDiscountKind;
  /** Baht off, or the percent for a "percent" coupon (see `couponDiscountAmount`). */
  discount: number;
  /** "percent" only: most baht it takes off. */
  maxDiscount?: number;
  /** 0 = no minimum. */
  minSpend: number;
  /** Uses across every customer; unset = unlimited. */
  usageLimit?: number;
  /** Uses per customer account; unset = unlimited. */
  perCustomerLimit?: number;
  /** Uses so far across every customer (cancelled orders don't count). */
  usedCount: number;
  /** Ticket thumbnail; unset = the % artwork. */
  image?: string;
  /** ISO 8601 — first moment the coupon can be used (Bangkok). Unset = already open. */
  startsAt?: string;
  /** ISO 8601 — last moment the coupon can be used (Bangkok). */
  expiresAt: string;
  /** "หมดอายุ 31 ต.ค." — derived from `expiresAt`. */
  expiresLabel: string;
  /** Admin's "เงื่อนไขเพิ่มเติม" (rich text HTML), shown under the automatic conditions. */
  extraConditions?: string;
  /** Products / SKUs the coupon is limited to (`couponEligibleSubtotal`). Unset = ทั้งร้าน. */
  productScope?: ProductSkuRef[];
  /** Set when this shopper is outside the coupon's กลุ่มลูกค้า: the reason a typed code is refused ("คูปองนี้สำหรับลูกค้าใหม่เท่านั้น"). */
  audienceBlock?: string;
  /** "การใช้ร่วมกับโปรอื่น" (unset = stacks with all): lines that got a promo it can't stack with don't count (`couponEligibleSubtotal`). */
  combinableWith?: CombinableKind[];
};

const THAI_SHORT_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

/** The coupon's printed labels: big line ("ลด 10%"), cap line ("ลดสูงสุด ฿200") and one-line label ("ลด 10% (สูงสุด ฿200)"). */
export function couponLabels(c: { discountType?: CouponDiscountKind; discount: number; maxDiscount?: number }): { amount: string; cap?: string; label: string } {
  const baht = (n: number) => `฿${n.toLocaleString("th-TH")}`;
  if (c.discountType !== "percent") return { amount: `ลด ${baht(c.discount ?? 0)}`, label: `ลด ${baht(c.discount ?? 0)}` };
  const amount = `ลด ${c.discount ?? 0}%`;
  if (!c.maxDiscount) return { amount, label: amount };
  return { amount, cap: `ลดสูงสุด ${baht(c.maxDiscount)}`, label: `${amount} (สูงสุด ${baht(c.maxDiscount)})` };
}

/**
 * One storefront coupon from its Admin fields: `endDate`/`endTime` is its last
 * valid minute and `startDate`/`startTime` its first (YYYY-MM-DD / HH:mm, Bangkok).
 */
export function buildCoupon(c: {
  code: string;
  discount: number;
  discountType?: CouponDiscountKind;
  maxDiscount?: number;
  minSpend?: number;
  usageLimit?: number;
  perCustomerLimit?: number;
  usedCount?: number;
  image?: string;
  startDate?: string;
  startTime?: string;
  endDate: string;
  endTime?: string;
  extraConditions?: string;
  productScope?: ProductSkuRef[];
}): Coupon {
  const [, month, day] = c.endDate.split("-").map(Number);
  const discountType = c.discountType ?? "baht";
  const maxDiscount = discountType === "percent" ? c.maxDiscount || undefined : undefined;
  const labels = couponLabels({ discountType, discount: c.discount, maxDiscount });
  return {
    code: c.code,
    label: labels.label,
    amountLabel: labels.amount,
    capLabel: labels.cap,
    discountType,
    discount: c.discount,
    maxDiscount,
    minSpend: c.minSpend ?? 0,
    usageLimit: c.usageLimit || undefined,
    perCustomerLimit: c.perCustomerLimit || undefined,
    usedCount: c.usedCount ?? 0,
    image: c.image || undefined,
    startsAt: c.startDate ? `${c.startDate}T${c.startTime || "00:00"}:00+07:00` : undefined,
    expiresAt: `${c.endDate}T${c.endTime || "23:59"}:59+07:00`,
    expiresLabel: `หมดอายุ ${day} ${THAI_SHORT_MONTHS[month - 1]}`,
    extraConditions: c.extraConditions || undefined,
    productScope: c.productScope && c.productScope.length > 0 ? c.productScope : undefined,
  };
}

/**
 * Baht this coupon takes off a product subtotal: 0 below its minimum; a %
 * coupon is rounded down to whole baht and capped by `maxDiscount`; never
 * more than the subtotal itself (shipping is never discounted).
 */
export function couponDiscountAmount(c: Pick<Coupon, "discountType" | "discount" | "maxDiscount" | "minSpend">, subtotal: number): number {
  if (subtotal <= 0 || subtotal < c.minSpend) return 0;
  let amount = c.discountType === "percent" ? Math.floor((subtotal * c.discount) / 100) : c.discount;
  if (c.discountType === "percent" && c.maxDiscount) amount = Math.min(amount, c.maxDiscount);
  return Math.max(0, Math.min(amount, subtotal));
}

/** A coupon limited to some products / SKUs (`productScope`); otherwise it counts the whole cart. */
export const isCouponScoped = (c: Pick<Coupon, "productScope">): boolean => !!c.productScope && c.productScope.length > 0;

/**
 * The product total a coupon works on: every paid line for a store-wide
 * coupon, else only the lines its `productScope` covers (product, or the
 * picked SKUs). Uses each line's charged `lineTotal` (flash prices included).
 * Free gifts are never `ResolvedCartLine`s, so they never count.
 */
export function couponEligibleSubtotal(c: Pick<Coupon, "productScope" | "combinableWith">, lines: ResolvedCartLine[]): number {
  return couponScopeLines(c, lines)
    .filter((l) => couponStacksOn(c, l))
    .reduce((sum, l) => sum + l.lineTotal, 0);
}

/** Lines inside the coupon's product scope (every line for a store-wide coupon), before any stacking check. */
const couponScopeLines = (c: Pick<Coupon, "productScope">, lines: ResolvedCartLine[]) =>
  isCouponScoped(c) ? lines.filter((l) => skuRefsCover(c.productScope!, l.product.id, l.line.variantId)) : lines;

/** Whether the coupon may add its discount on this line, given the promos already on it (`promoStacking.ts`). */
export const couponStacksOn = (c: Pick<Coupon, "combinableWith">, line: ResolvedCartLine) => canStack({ kind: "coupon", combinableWith: c.combinableWith }, line.promoTags);

/** In-scope lines exist, but every one of them got a promo this coupon can't be used with. */
export function couponStackBlocked(c: Pick<Coupon, "productScope" | "combinableWith">, lines: ResolvedCartLine[]): boolean {
  const inScope = couponScopeLines(c, lines);
  return inScope.length > 0 && !inScope.some((l) => couponStacksOn(c, l));
}

/**
 * Why this cart can't use the coupon yet, or undefined when it can: a scoped
 * coupon with no item in the cart from its list, or the eligible total (all
 * products for a store-wide coupon) under the minimum spend.
 */
export function couponCartBlock(c: Pick<Coupon, "productScope" | "minSpend" | "combinableWith">, lines: ResolvedCartLine[]): string | undefined {
  const scoped = isCouponScoped(c);
  if (couponStackBlocked(c, lines)) return "คูปองนี้ใช้ร่วมกับโปรโมชั่นของสินค้าในตะกร้าไม่ได้";
  const eligible = couponEligibleSubtotal(c, lines);
  if (scoped && eligible <= 0) return "ใช้ได้กับสินค้าที่ร่วมรายการเท่านั้น";
  if (eligible < c.minSpend) {
    const short = `฿${(c.minSpend - eligible).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return scoped ? `ซื้อสินค้าที่ร่วมรายการเพิ่มอีก ${short} เพื่อใช้คูปองนี้` : `ซื้อเพิ่มอีก ${short} เพื่อใช้คูปองนี้`;
  }
  return undefined;
}

/**
 * Why this coupon can't be used any more, or undefined when it still can:
 * its total limit is used up, or this shopper (`usedByShopper` of their own
 * non-cancelled orders) has used their share.
 */
export function couponUsageBlock(c: Pick<Coupon, "usageLimit" | "perCustomerLimit" | "usedCount">, usedByShopper = 0): string | undefined {
  if (c.usageLimit !== undefined && c.usedCount >= c.usageLimit) return "คูปองนี้ถูกใช้ครบจำนวนแล้ว";
  if (c.perCustomerLimit !== undefined && usedByShopper >= c.perCustomerLimit)
    return c.perCustomerLimit === 1 ? "คุณใช้คูปองนี้ไปแล้ว ใช้ได้ 1 ครั้งต่อบัญชี" : `คุณใช้คูปองนี้ครบ ${c.perCustomerLimit.toLocaleString("th-TH")} ครั้งแล้ว`;
  return undefined;
}

/**
 * The three launch coupons. Admin's coupon store is seeded from these (and the
 * storefront reads that store, see `storefrontPromotions.tsx`); mock order
 * history (accountData.ts, adminOrders.ts) prices its past coupon orders with them.
 */
export const AVAILABLE_COUPONS: Coupon[] = [
  buildCoupon({ code: "SAVE100", discount: 100, minSpend: 2000, endDate: "2026-10-31" }),
  buildCoupon({ code: "SAVE50", discount: 50, minSpend: 500, endDate: "2026-11-15" }),
  buildCoupon({ code: "SAVE20", discount: 20, minSpend: 200, endDate: "2026-11-30" }),
];

/** A coupon outside its window is never offered (Home tickets, Checkout picker) nor accepted (typed code, totals). */
export function isCouponActive(c: Pick<Coupon, "expiresAt" | "startsAt">, now = Date.now()): boolean {
  return Date.parse(c.expiresAt) >= now && (!c.startsAt || Date.parse(c.startsAt) <= now);
}

export function isCouponNotStarted(c: Pick<Coupon, "startsAt">, now = Date.now()): boolean {
  return !!c.startsAt && Date.parse(c.startsAt) > now;
}

/**
 * Mock balance — no loyalty-points backend exists; documented the same way
 * as the coupon catalog above. It's the mock persona's (Nutcha S., CRM-000071)
 * coins carried over from the Charmiss Club CRM, plus what her delivered
 * orders earned, minus what she redeemed — `accountData.ts`'s orders are set
 * so those two cancel out, so her history and this number agree.
 */
export const MOCK_COIN_BALANCE = 3500;
export const MAX_COIN_REDEMPTION = 800;
export const COIN_TO_BAHT_RATE = 0.1; // 800 coins -> ฿80, matching the Figma example 1:1
/** Coins are redeemed in steps of 10 (= ฿1), so a redemption is always a whole-baht discount. */
export const COIN_REDEMPTION_STEP = 10;

/**
 * Most coins this order can take: the lowest of the balance, `MAX_COIN_REDEMPTION`,
 * and what the products still cost after the coupon (coins never pay the shipping
 * fee, so the total stays ≥ the fee and never below ฿0) — rounded down to a step.
 */
export function maxRedeemableCoins(opts: { balance: number; subtotal: number; couponDiscount: number }): number {
  const byAmount = Math.max(0, opts.subtotal - opts.couponDiscount) / COIN_TO_BAHT_RATE;
  const max = Math.min(opts.balance, MAX_COIN_REDEMPTION, byAmount);
  return Math.max(0, Math.floor(max / COIN_REDEMPTION_STEP) * COIN_REDEMPTION_STEP);
}

/**
 * Earn side of the same mock Charmiss Coin program (no backend exists here
 * either — same status as `COIN_TO_BAHT_RATE` above, just the other
 * direction): ทุก ฿10 ที่ชำระจริง (ไม่รวมค่าจัดส่ง) ได้รับ 1 คอยน์, the same
 * 10:1 ratio the redemption side already uses, rounded down so a partial
 * ฿10 never earns a fractional coin. The member's tier multiplies it
 * (`membership.ts` `coinMultiplier`: Glow ×1, Radiance ×1.5, Icon ×2) before
 * rounding down.
 */
export const COIN_EARN_RATE = 0.1;

export function computeCoinsEarned(amountPaid: number, tier: TierId = "glow"): number {
  const raw = Math.max(0, amountPaid) * COIN_EARN_RATE * getTier(tier).coinMultiplier;
  // Rounded to 6 places first so float noise (e.g. 69.99999…) can't drop a whole coin.
  return Math.floor(Math.round(raw * 1e6) / 1e6);
}

export type CheckoutTotals = {
  /** The lines' own total (sale / flash prices included): "ยอดรวมสินค้า". */
  subtotal: number;
  /** Cart-level promos (ส่วนลดสินค้า with a minimum or cap, ยิ่งซื้อยิ่งคุ้ม, บันเดิลดีล, ซื้อ X แถม Y), each shown as its own row. */
  promoDiscount: number;
  couponDiscount: number;
  coinDiscount: number;
  shippingFee: number;
  total: number;
};

/**
 * Layer 4 and the bill. `subtotal` = the lines' own total, `promoDiscount` =
 * the cart-level promo rows (`priceCart`), `lines` = the priced lines
 * (`CartPricing.pricedLines`: each line's total after every promo, with its
 * tags) the coupon works on: a scoped coupon only discounts the ones it
 * covers, and no coupon counts a line that got a promo it can't stack with.
 */
export function computeCheckoutTotals(opts: {
  subtotal: number;
  promoDiscount?: number;
  lines?: ResolvedCartLine[];
  coupon?: Coupon;
  coinsRedeemed?: number;
  shippingFee: number;
}): CheckoutTotals {
  const c = opts.coupon;
  const promoDiscount = Math.min(Math.max(0, opts.promoDiscount ?? 0), opts.subtotal);
  const afterPromos = opts.subtotal - promoDiscount;
  const couponBase = !c ? 0 : opts.lines ? couponEligibleSubtotal(c, opts.lines) : isCouponScoped(c) ? 0 : afterPromos;
  const couponDiscount = c && isCouponActive(c) ? couponDiscountAmount(c, Math.min(couponBase, afterPromos)) : 0;
  const coinDiscount = Math.round((opts.coinsRedeemed ?? 0) * COIN_TO_BAHT_RATE);
  const total = Math.max(0, afterPromos - couponDiscount - coinDiscount + opts.shippingFee);
  return { subtotal: opts.subtotal, promoDiscount, couponDiscount, coinDiscount, shippingFee: opts.shippingFee, total };
}
