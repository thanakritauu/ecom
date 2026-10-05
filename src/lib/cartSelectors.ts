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
export const DELIVERY = { carrier: "DHL", label: "จัดส่งโดย DHL", method: "จัดส่งมาตรฐาน", etaLabel: "ได้รับภายใน 2–3 วันทำการ" } as const;

/** Paid on the Checkout page itself (no separate payment step). No installments / cash on delivery. */
export const PAYMENT_METHODS = [
  { id: "card", label: "บัตรเครดิต / เดบิต", description: "ชำระผ่านบัตรเครดิตหรือเดบิต" },
  // `shortLabel`: phone-width method row, where the PromptPay logo beside it already reads "PromptPay".
  { id: "promptpay", label: "พร้อมเพย์ (PromptPay)", shortLabel: "พร้อมเพย์", description: "สแกน QR ชำระผ่านแอปธนาคาร" },
  { id: "truemoney", label: "TrueMoney Wallet", description: "ยืนยันการชำระในแอป TrueMoney" },
] as const;
export type PaymentMethodId = (typeof PAYMENT_METHODS)[number]["id"];

export type Coupon = {
  code: string;
  /** "ลด ฿100" — whole baht, the one amount format every coupon surface prints. */
  label: string;
  discount: number;
  minSpend: number;
  /** ISO 8601 — last moment the coupon can be used (end of that day, Bangkok). */
  expiresAt: string;
  /** "หมดอายุ 31 ต.ค." — derived from `expiresAt`. */
  expiresLabel: string;
};

const THAI_SHORT_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

/** `expiresOn` = the coupon's last valid day (YYYY-MM-DD, Bangkok). */
function coupon(code: string, discount: number, minSpend: number, expiresOn: string): Coupon {
  const [, month, day] = expiresOn.split("-").map(Number);
  return {
    code,
    label: `ลด ฿${discount.toLocaleString("th-TH")}`,
    discount,
    minSpend,
    expiresAt: `${expiresOn}T23:59:59+07:00`,
    expiresLabel: `หมดอายุ ${day} ${THAI_SHORT_MONTHS[month - 1]}`,
  };
}

/** Mock prototype catalog (no coupon backend exists) — same kind of stand-in as the mock reviews on the Product Detail page. Admin's coupon seeds (adminMarketing.ts) read these same dates. */
export const AVAILABLE_COUPONS: Coupon[] = [
  coupon("SAVE100", 100, 2000, "2026-10-31"),
  coupon("SAVE50", 50, 500, "2026-11-15"),
  coupon("SAVE20", 20, 200, "2026-11-30"),
];

/** An expired coupon is never offered (Home tickets, Checkout picker) nor accepted (typed code, totals). */
export function isCouponActive(c: Pick<Coupon, "expiresAt">, now = Date.now()): boolean {
  return Date.parse(c.expiresAt) >= now;
}

export function activeCoupons(now = Date.now()): Coupon[] {
  return AVAILABLE_COUPONS.filter((c) => isCouponActive(c, now));
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
  const couponDiscount = opts.coupon && opts.subtotal >= opts.coupon.minSpend && isCouponActive(opts.coupon) ? opts.coupon.discount : 0;
  const coinDiscount = Math.round((opts.coinsRedeemed ?? 0) * COIN_TO_BAHT_RATE);
  const total = Math.max(0, opts.subtotal - couponDiscount - coinDiscount + opts.shippingFee);
  return { subtotal: opts.subtotal, couponDiscount, coinDiscount, shippingFee: opts.shippingFee, total };
}
