import type { CartLine, Product, ProductVariant } from "./types";
import { resolveVariantOption } from "./productVariants";

/** Matches the free-shipping copy already used in TrustBadges/Home's Utility Bar — one real threshold, not a second number invented for the drawer. */
export const FREE_SHIPPING_THRESHOLD = 990;

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
 * use, extended with the three things only Checkout adds (shipping method,
 * coupon, Charmiss Coin), instead of three separate screens each re-deriving
 * a total their own way.
 */
export const SHIPPING_METHODS = [
  { id: "standard", label: "จัดส่งมาตรฐาน", fee: 0, etaLabel: "ได้รับ 10 ก.ย. – 11 ก.ย." },
  { id: "express", label: "จัดส่งด่วน", fee: 60, etaLabel: "ได้รับภายใน 9 ก.ย." },
] as const;
export type ShippingMethodId = (typeof SHIPPING_METHODS)[number]["id"];

export const PAYMENT_METHODS = [
  { id: "card", label: "บัตรเครดิต / เดบิต", description: "ชำระผ่านบัตรเครดิตหรือเดบิต" },
  { id: "promptpay", label: "พร้อมเพย์ (PromptPay)", description: "สแกน QR ชำระผ่านแอปธนาคาร" },
  { id: "cod", label: "เก็บเงินปลายทาง (COD)", description: "ชำระเมื่อได้รับสินค้า" },
  { id: "installment", label: "ผ่อนชำระ 0%", description: "3 / 6 / 10 เดือน ผ่านบัตรที่ร่วมรายการ" },
] as const;
export type PaymentMethodId = (typeof PAYMENT_METHODS)[number]["id"];

export type Coupon = { code: string; label: string; discount: number; minSpend: number; expiresLabel: string };

/** Mock prototype catalog (no coupon backend exists) — same kind of stand-in as the mock reviews on the Product Detail page. */
export const AVAILABLE_COUPONS: Coupon[] = [
  { code: "SAVE100", label: "ลด ฿100", discount: 100, minSpend: 2000, expiresLabel: "หมดอายุ 11 ก.ย." },
  { code: "SAVE50", label: "ลด ฿50", discount: 50, minSpend: 500, expiresLabel: "หมดอายุ 30 ก.ย." },
  { code: "SAVE20", label: "ลด ฿20", discount: 20, minSpend: 200, expiresLabel: "หมดอายุ 30 ก.ย." },
];

/** Mock balance — no loyalty-points backend exists; documented the same way as the coupon catalog above. */
export const MOCK_COIN_BALANCE = 850;
export const MAX_COIN_REDEMPTION = 800;
export const COIN_TO_BAHT_RATE = 0.1; // 800 coins -> ฿80, matching the Figma example 1:1

/**
 * Earn side of the same mock Charmiss Coin program (no backend exists here
 * either — same status as `COIN_TO_BAHT_RATE` above, just the other
 * direction): ทุก ฿10 ที่ชำระจริง (ไม่รวมค่าจัดส่ง) ได้รับ 1 คอยน์, the same
 * 10:1 ratio the redemption side already uses, rounded down so a partial
 * ฿10 never earns a fractional coin.
 */
export const COIN_EARN_RATE = 0.1;

export function computeCoinsEarned(amountPaid: number): number {
  return Math.floor(Math.max(0, amountPaid) * COIN_EARN_RATE);
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
  const couponDiscount = opts.coupon && opts.subtotal >= opts.coupon.minSpend ? opts.coupon.discount : 0;
  const coinDiscount = Math.round((opts.coinsRedeemed ?? 0) * COIN_TO_BAHT_RATE);
  const total = Math.max(0, opts.subtotal - couponDiscount - coinDiscount + opts.shippingFee);
  return { subtotal: opts.subtotal, couponDiscount, coinDiscount, shippingFee: opts.shippingFee, total };
}
