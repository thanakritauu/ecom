import type { Order, OrderItem, OrderPayment, OrderStatus, User } from "./types";
import { MOCK_ADDRESSES } from "./checkoutData";
import { allProducts } from "./products";
import { AVAILABLE_COUPONS, COIN_TO_BAHT_RATE, computeShippingFee, DELIVERY, GIFT_PROMOTION, MOCK_COIN_BALANCE } from "./cartSelectors";
import orderItemLipTint from "~/assets/images/account/order-item-lip-tint.png";
import orderItemFoundation from "~/assets/images/account/order-item-foundation.png";
import orderItemBlush from "~/assets/images/account/order-item-blush.png";

/**
 * Mock signed-in shopper — this prototype has no auth backend, matching
 * Figma's own single example persona ("Nutcha S."). She's an existing
 * Charmiss Club member moved over from the CRM (`crm.ts` CRM-000071, Admin's
 * cust-2). Coin balance reuses the exact same mock constant Checkout's
 * Charmiss Coin card already reads, not a second invented number.
 */
export const MOCK_USER: User = {
  id: "user-1",
  name: "Nutcha S.",
  email: "nutcha.s@example.com",
  phone: "089-123-4567",
  coinBalance: MOCK_COIN_BALANCE,
  memberSource: "crm",
};

/** When her CRM coins were carried over (first website sign-in) — Admin's `memberSince` "3 มี.ค. 2568" for cust-2. */
export const MOCK_CRM_CARRY_OVER_AT = "2025-03-03T10:00:00+07:00";

export const ORDER_STATUS_META: Record<OrderStatus, { label: string; badgeClass: string }> = {
  pending_payment: { label: "รอชำระเงิน", badgeClass: "bg-warning-soft text-ink" },
  preparing: { label: "กำลังเตรียมการจัดส่ง", badgeClass: "bg-warning-soft text-ink" },
  handed_over: { label: "ส่งให้บริษัทขนส่ง", badgeClass: "bg-warning-soft text-ink" },
  shipping: { label: "กำลังจัดส่ง", badgeClass: "bg-warning-soft text-ink" },
  completed: { label: "ส่งสำเร็จ", badgeClass: "bg-success-soft text-success" },
  cancelled: { label: "ยกเลิกแล้ว", badgeClass: "bg-surface-gray text-ink-gray" },
};

/** Payment is tracked apart from the order flow — "ชำระเงินสำเร็จ" is a payment badge (green, same success pill as Admin), never an order step. */
export type PaymentStatus = "paid" | "pending" | "cancelled";

export const PAYMENT_STATUS_META: Record<PaymentStatus, { label: string; badgeClass: string }> = {
  paid: { label: "ชำระเงินสำเร็จ", badgeClass: "bg-success-soft text-success" },
  pending: { label: "รอชำระเงิน", badgeClass: "bg-warning-soft text-ink" },
  cancelled: { label: "ยกเลิกการชำระเงิน", badgeClass: "bg-surface-gray text-ink-gray" },
};

/** Only a cancelled order that never got past "ordered" counts as unpaid-and-cancelled; everything after pending was paid. */
export function getPaymentStatus(order: Order): PaymentStatus {
  if (order.status === "pending_payment") return "pending";
  if (order.status === "cancelled") return "cancelled";
  return "paid";
}

/**
 * Payment deadline — an order left "รอชำระเงิน" longer than this after it was
 * placed is cancelled automatically. Derived when orders are read
 * (`applyPaymentDeadline`), never written back into the seeds.
 */
export const PAYMENT_WINDOW_HOURS = 24;

/**
 * The order module's mock "now" — afternoon of the same mock today as Admin's
 * `ORDERS_TODAY_ISO_DATE` (2 ต.ค. 2569), so a seed can sit inside its payment
 * window forever. Orders placed later than this (Checkout, real clock) are
 * measured against the real time instead.
 */
export const ORDERS_MOCK_NOW_ISO = "2026-10-02T15:00:00+07:00";

export const AUTO_CANCEL_REASON = "ยกเลิกอัตโนมัติ เนื่องจากไม่ได้ชำระเงินภายในเวลาที่กำหนด";

/** ISO (Bangkok "+07:00" form, like the seeds) — when a pending order's payment window closes. */
export function getPaymentDeadline(order: Pick<Order, "placedAt">): string {
  const bangkok = new Date(Date.parse(order.placedAt) + (PAYMENT_WINDOW_HOURS + 7) * 3_600_000);
  return `${bangkok.toISOString().slice(0, 19)}+07:00`;
}

const MOCK_NOW_MS = Date.parse(ORDERS_MOCK_NOW_ISO);
const ordersNow = (order: Order) => (Date.parse(order.placedAt) > MOCK_NOW_MS ? Date.now() : MOCK_NOW_MS);

/** A pending order past its deadline reads as cancelled (at the deadline, with `AUTO_CANCEL_REASON`); anything else is returned as-is. */
export function applyPaymentDeadline(order: Order): Order {
  if (order.status !== "pending_payment") return order;
  const deadline = getPaymentDeadline(order);
  if (Date.parse(deadline) > ordersNow(order)) return order;
  return { ...order, status: "cancelled", cancelledAt: deadline, cancelReason: AUTO_CANCEL_REASON };
}

/**
 * Orders store the payment method as Checkout's label text — this maps it
 * back to a method kind (logo + short label in the order detail). Matches
 * on the text so older/renamed labels still resolve; an unknown method
 * returns `undefined` and the UI shows the stored label as-is.
 */
export type PaymentKind = "card" | "promptpay" | "truemoney" | "mobile_banking";

export const PAYMENT_KIND_LABEL: Record<PaymentKind, string> = {
  card: "บัตรเครดิต / เดบิต",
  promptpay: "พร้อมเพย์",
  truemoney: "TrueMoney Wallet",
  mobile_banking: "โมบายล์แบงก์กิ้ง",
};

export function getPaymentKind(method: string): PaymentKind | undefined {
  const m = method.toLowerCase();
  if (m.includes("บัตร") || m.includes("card")) return "card";
  if (m.includes("พร้อมเพย์") || m.includes("promptpay")) return "promptpay";
  if (m.includes("truemoney")) return "truemoney";
  if (m.includes("โมบาย") || m.includes("mobile")) return "mobile_banking";
  return undefined;
}

const HOME = MOCK_ADDRESSES[0];
const OFFICE = MOCK_ADDRESSES[1];
const lipTint = (variantLabel: string, price = 299, qty = 1): OrderItem => ({ name: "ลิปทินท์ Y2K Glow", variantLabel, qty, price, image: orderItemLipTint });
const foundation = (qty = 1): OrderItem => ({ name: "รองพื้น Soft Matte", variantLabel: "02 Natural Beige", qty, price: 459, image: orderItemFoundation });
const blush = (qty = 1): OrderItem => ({ name: "บลัชออนแบบแท่ง", variantLabel: "Peach Pop", qty, price: 259, image: orderItemBlush });

/** GIFT_PROMOTION's product (feature-9) as a ฿0 order line — the same gift Checkout adds at ฿590+. */
function giftItem(): OrderItem {
  const product = allProducts.find((p) => p.id === GIFT_PROMOTION.productId)!;
  return { name: product.name, variantLabel: product.variants?.[0]?.label ?? "", qty: GIFT_PROMOTION.qty, price: 0, image: product.image, isGift: true };
}

/**
 * Items + totals priced with Checkout's own rules, so no number here is
 * typed by hand: gift line at ≥ ฿590, DHL ฿60 below ฿990 (`computeShippingFee`),
 * a real `AVAILABLE_COUPONS` code (min spend respected), coins at 10 = ฿1.
 */
function priced(paid: OrderItem[], method: string, opts: { couponCode?: string; coinsRedeemed?: number } = {}): Pick<Order, "items" | "total" | "payment"> {
  const subtotal = paid.reduce((sum, i) => sum + i.price * i.qty, 0);
  const coupon = AVAILABLE_COUPONS.find((c) => c.code === opts.couponCode);
  const discount = coupon && subtotal >= coupon.minSpend ? coupon.discount : 0;
  const coinDiscount = Math.round((opts.coinsRedeemed ?? 0) * COIN_TO_BAHT_RATE);
  const shippingFee = computeShippingFee(subtotal);
  const payment: OrderPayment = { method, subtotal, shippingFee, discount, couponCode: discount > 0 ? coupon!.code : undefined, coinDiscount };
  return {
    items: subtotal >= GIFT_PROMOTION.threshold ? [...paid, giftItem()] : paid,
    total: Math.max(0, subtotal - discount - coinDiscount + shippingFee),
    payment,
  };
}

const STANDARD = DELIVERY.method;

/**
 * Phase 05 mock purchase history — covers every tracking state for UX
 * review (State 1–6 = สั่งซื้อสำเร็จ → จัดส่งสำเร็จ) plus pending-payment and
 * cancelled (ORD-2026-1037 is inside its payment window; ORD-2026-1026
 * missed it and reads as auto-cancelled). ORD-2026-1027 carries the full multi-hub DHL history and the
 * SAVE50 coupon; ORD-2026-1029 redeems 100 coins — exactly what 1027 (the
 * one delivered order) earned at her Radiance ×1.5 rate, so the CRM
 * carry-over alone is her `MOCK_COIN_BALANCE`. Tracking
 * numbers are mock (DHL's site won't find them). Read only through
 * `orderHistory.ts`'s repository, never directly by UI.
 */
export const MOCK_ORDERS: Order[] = [
  {
    // Pending payment, still inside its PAYMENT_WINDOW_HOURS window at the mock now (deadline 3 ต.ค. 14:30)
    id: "ORD-2026-1037",
    status: "pending_payment",
    placedAt: "2026-10-02T14:30:00+07:00",
    ...priced([lipTint("01 Melody Pink")], "พร้อมเพย์"),
    shippingAddress: HOME,
    shipment: { carrier: "dhl", method: STANDARD, events: [] },
  },
  {
    // State 1 — สั่งซื้อสำเร็จ (paid, not packed yet)
    id: "ORD-2026-1032",
    status: "preparing",
    placedAt: "2026-10-02T09:32:00+07:00",
    ...priced([lipTint("01 Melody Pink", 299, 2)], "พร้อมเพย์"),
    shippingAddress: HOME,
    shipment: { carrier: "dhl", method: STANDARD, events: [{ status: "ordered", timestamp: "2026-10-02T09:32:00+07:00", description: "ได้รับคำสั่งซื้อและชำระเงินเรียบร้อย" }] },
  },
  {
    // State 2 — กำลังเตรียมการจัดส่ง
    id: "ORD-2026-1031",
    status: "preparing",
    placedAt: "2026-10-01T20:10:00+07:00",
    ...priced([foundation(), blush()], "บัตรเครดิต / เดบิต"),
    shippingAddress: OFFICE,
    shipment: {
      carrier: "dhl",
      method: STANDARD,
      events: [
        { status: "ordered", timestamp: "2026-10-01T20:10:00+07:00", description: "ได้รับคำสั่งซื้อและชำระเงินเรียบร้อย" },
        { status: "preparing", timestamp: "2026-10-02T08:45:00+07:00", description: "Charmiss กำลังแพ็กสินค้าของคุณ" },
      ],
    },
  },
  {
    // State 3 — ส่งให้บริษัทขนส่ง
    id: "ORD-2026-1030",
    status: "handed_over",
    placedAt: "2026-09-30T13:05:00+07:00",
    ...priced([lipTint("04 Sugar Coral")], "TrueMoney Wallet"),
    shippingAddress: HOME,
    shipment: {
      carrier: "dhl",
      method: STANDARD,
      trackingNumber: "5093847261",
      events: [
        { status: "ordered", timestamp: "2026-09-30T13:05:00+07:00", description: "ได้รับคำสั่งซื้อเรียบร้อย" },
        { status: "preparing", timestamp: "2026-09-30T17:40:00+07:00", description: "Charmiss กำลังแพ็กสินค้าของคุณ" },
        { status: "shipped", timestamp: "2026-10-01T16:20:00+07:00", description: "ส่งมอบพัสดุให้ DHL แล้ว", location: "คลังสินค้า Charmiss บางนา" },
      ],
    },
  },
  {
    // State 4 — อยู่ระหว่างขนส่ง
    id: "ORD-2026-1029",
    status: "shipping",
    placedAt: "2026-09-28T10:12:00+07:00",
    ...priced([lipTint("03 Cherry Coke"), foundation(), blush()], "บัตรเครดิต / เดบิต", { coinsRedeemed: 100 }),
    shippingAddress: HOME,
    shipment: {
      carrier: "dhl",
      method: STANDARD,
      trackingNumber: "5093811470",
      events: [
        { status: "ordered", timestamp: "2026-09-28T10:12:00+07:00", description: "ได้รับคำสั่งซื้อและชำระเงินเรียบร้อย" },
        { status: "preparing", timestamp: "2026-09-28T15:30:00+07:00", description: "Charmiss กำลังแพ็กสินค้าของคุณ" },
        { status: "shipped", timestamp: "2026-09-29T11:05:00+07:00", description: "ส่งมอบพัสดุให้ DHL แล้ว", location: "คลังสินค้า Charmiss บางนา" },
        { status: "in_transit", timestamp: "2026-09-29T22:40:00+07:00", description: "พัสดุถึงศูนย์คัดแยก", location: "DHL Hub บางพลี" },
        { status: "in_transit", timestamp: "2026-10-01T06:15:00+07:00", description: "พัสดุออกจากศูนย์คัดแยก กำลังเดินทางไปยังสาขาปลายทาง", location: "DHL Hub บางพลี" },
      ],
    },
  },
  {
    // State 5 — กำลังนำส่ง
    id: "ORD-2026-1028",
    status: "shipping",
    placedAt: "2026-09-27T19:48:00+07:00",
    ...priced([blush(2)], "พร้อมเพย์"),
    shippingAddress: OFFICE,
    shipment: {
      carrier: "dhl",
      method: STANDARD,
      trackingNumber: "5093790034",
      events: [
        { status: "ordered", timestamp: "2026-09-27T19:48:00+07:00", description: "ได้รับคำสั่งซื้อและชำระเงินเรียบร้อย" },
        { status: "preparing", timestamp: "2026-09-28T09:20:00+07:00", description: "Charmiss กำลังแพ็กสินค้าของคุณ" },
        { status: "shipped", timestamp: "2026-09-28T16:00:00+07:00", description: "ส่งมอบพัสดุให้ DHL แล้ว", location: "คลังสินค้า Charmiss บางนา" },
        { status: "in_transit", timestamp: "2026-09-29T02:10:00+07:00", description: "พัสดุถึงศูนย์คัดแยก", location: "DHL Hub บางพลี" },
        { status: "in_transit", timestamp: "2026-10-02T05:50:00+07:00", description: "พัสดุถึงสาขาปลายทาง", location: "DHL สาขาสาทร" },
        { status: "out_for_delivery", timestamp: "2026-10-02T08:30:00+07:00", description: "พนักงานกำลังนำส่งพัสดุถึงคุณวันนี้", location: "DHL สาขาสาทร" },
      ],
    },
  },
  {
    // State 6 — จัดส่งสำเร็จ (full timeline for UX review)
    id: "ORD-2026-1027",
    status: "completed",
    placedAt: "2026-09-12T09:32:00+07:00",
    ...priced([foundation(), blush()], "บัตรเครดิต / เดบิต", { couponCode: "SAVE50" }),
    shippingAddress: HOME,
    shipment: {
      carrier: "dhl",
      method: STANDARD,
      trackingNumber: "5093522187",
      events: [
        { status: "ordered", timestamp: "2026-09-12T09:32:00+07:00", description: "ได้รับคำสั่งซื้อและชำระเงินเรียบร้อย" },
        { status: "preparing", timestamp: "2026-09-12T14:20:00+07:00", description: "Charmiss กำลังแพ็กสินค้าของคุณ" },
        { status: "shipped", timestamp: "2026-09-13T10:15:00+07:00", description: "ส่งมอบพัสดุให้ DHL แล้ว", location: "คลังสินค้า Charmiss บางนา" },
        { status: "in_transit", timestamp: "2026-09-13T21:05:00+07:00", description: "พัสดุถึงศูนย์คัดแยก", location: "DHL Hub บางพลี" },
        { status: "in_transit", timestamp: "2026-09-14T04:40:00+07:00", description: "พัสดุออกจากศูนย์คัดแยก", location: "DHL Hub บางพลี" },
        { status: "in_transit", timestamp: "2026-09-14T06:55:00+07:00", description: "พัสดุถึงสาขาปลายทาง", location: "DHL สาขาวัฒนา" },
        { status: "out_for_delivery", timestamp: "2026-09-14T08:30:00+07:00", description: "พนักงานกำลังนำส่งพัสดุ", location: "DHL สาขาวัฒนา" },
        { status: "delivered", timestamp: "2026-09-14T13:12:00+07:00", description: "จัดส่งสำเร็จ ผู้รับ: Nutcha S.", location: "กรุงเทพมหานคร" },
      ],
    },
  },
  {
    // Left unpaid past its deadline — reads as auto-cancelled (`applyPaymentDeadline`)
    id: "ORD-2026-1026",
    status: "pending_payment",
    placedAt: "2026-09-11T18:22:00+07:00",
    ...priced([lipTint("Peach Pop", 259)], "พร้อมเพย์"),
    shippingAddress: HOME,
    shipment: { carrier: "dhl", method: STANDARD, events: [] },
  },
  {
    id: "ORD-2026-1025",
    status: "cancelled",
    placedAt: "2026-09-11T11:03:00+07:00",
    cancelledAt: "2026-09-11T12:30:00+07:00",
    ...priced([lipTint("03 Cherry Coke")], "บัตรเครดิต / เดบิต"),
    shippingAddress: HOME,
    shipment: { carrier: "dhl", method: STANDARD, events: [{ status: "ordered", timestamp: "2026-09-11T11:03:00+07:00" }] },
  },
];
