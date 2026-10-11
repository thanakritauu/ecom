import type { CartLine, Product, ProductVariant } from "./types";
import { resolveVariantOption } from "./productVariants";
import { getTier, type TierId } from "./membership";

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
  /** Per-unit price for this line — the selected variant's own price when it has one, else `product.price` (see `productVariants.ts`). */
  unitPrice: number;
};

/**
 * Joins raw cart lines (product/variant ids + qty — the only state cart.tsx
 * itself owns) against the live Product Store (Architecture Cleanup &
 * Source of Truth — `products` is the caller's `useProductCatalog().products()`,
 * never a static import here). Kept separate from cart.tsx on purpose: cart
 * state shouldn't need to import product data itself, and the Drawer/Cart
 * Page/Checkout all resolve and total their lines the exact same way by
 * calling these same two functions instead of re-deriving totals.
 */
export function resolveCartLines(lines: CartLine[], products: Product[]): ResolvedCartLine[] {
  return lines.flatMap((line): ResolvedCartLine[] => {
    const product = products.find((p) => p.id === line.productId);
    if (!product) return [];
    const found = line.variantId ? product.variants?.find((v) => v.id === line.variantId) : undefined;
    if (!found) return [{ line, product, variant: found, unitPrice: product.price }];
    // Same resolver the Product Option Modal shows from, so the cart line's photo/price match the option the shopper picked.
    const option = resolveVariantOption(product, found);
    return [{ line, product, variant: { ...found, image: option.image }, unitPrice: option.price }];
  });
}

export function computeCartTotal(resolved: ResolvedCartLine[]): number {
  return resolved.reduce((sum, { line, unitPrice }) => sum + unitPrice * line.qty, 0);
}

/**
 * Checkout-only pricing inputs. Kept in this same file — not a second
 * pricing module — so Checkout's Order Summary computes its total with the
 * exact same `computeCartTotal`-derived subtotal the Drawer and Cart Page
 * use, extended with the three things only Checkout adds (shipping fee,
 * coupon, Charmiss Coin), instead of three separate screens each re-deriving
 * a total their own way.
 */
/** One carrier, no shipping choice at checkout — every order ships DHL standard (shown with its logo); the fee is `computeShippingFee`. */
export const DELIVERY = { carrier: "DHL", label: "จัดส่งโดย DHL", method: "จัดส่งมาตรฐาน", etaLabel: "ได้รับภายใน 2-3 วันทำการ" } as const;

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
  subtotal: number;
  couponDiscount: number;
  coinDiscount: number;
  shippingFee: number;
  total: number;
};

export function computeCheckoutTotals(opts: {
  subtotal: number;
  coupon?: Coupon;
  coinsRedeemed?: number;
  shippingFee: number;
}): CheckoutTotals {
  const couponDiscount = opts.coupon && isCouponActive(opts.coupon) ? couponDiscountAmount(opts.coupon, opts.subtotal) : 0;
  const coinDiscount = Math.round((opts.coinsRedeemed ?? 0) * COIN_TO_BAHT_RATE);
  const total = Math.max(0, opts.subtotal - couponDiscount - coinDiscount + opts.shippingFee);
  return { subtotal: opts.subtotal, couponDiscount, coinDiscount, shippingFee: opts.shippingFee, total };
}
