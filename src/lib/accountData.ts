import type { Order, OrderItem, OrderStatus, User } from "./types";
import { MOCK_ADDRESSES } from "./checkoutData";
import { MOCK_COIN_BALANCE } from "./cartSelectors";
import orderItemLipTint from "~/assets/images/account/order-item-lip-tint.png";
import orderItemFoundation from "~/assets/images/account/order-item-foundation.png";
import orderItemBlush from "~/assets/images/account/order-item-blush.png";

/**
 * Mock signed-in shopper — this prototype has no auth backend, matching
 * Figma's own single example persona ("Nutcha S."). Coin balance reuses the
 * exact same mock constant Checkout's Charmiss Coin card already reads, not
 * a second invented number.
 */
export const MOCK_USER: User = {
  id: "user-1",
  name: "Nutcha S.",
  email: "nutcha.s@example.com",
  phone: "089-123-4567",
  coinBalance: MOCK_COIN_BALANCE,
};

export const ORDER_STATUS_META: Record<OrderStatus, { label: string; badgeClass: string }> = {
  pending_payment: { label: "รอชำระเงิน", badgeClass: "bg-[#fff4e6] text-ink" },
  paid: { label: "ชำระเงินสำเร็จ", badgeClass: "bg-[#f1eeff] text-brand-purple" },
  preparing: { label: "กำลังเตรียมสินค้า", badgeClass: "bg-[#f1eeff] text-brand-purple" },
  shipping: { label: "กำลังจัดส่ง", badgeClass: "bg-[#f1eeff] text-brand-purple" },
  completed: { label: "สำเร็จ", badgeClass: "bg-success-soft text-success" },
  cancelled: { label: "ยกเลิกแล้ว", badgeClass: "bg-surface-gray text-ink-gray" },
};

const HOME = MOCK_ADDRESSES[0];
const OFFICE = MOCK_ADDRESSES[1];
const lipTint = (variantLabel: string, price = 299, qty = 1): OrderItem => ({ name: "ลิปทินท์ Y2K Glow", variantLabel, qty, price, image: orderItemLipTint });
const foundation = (qty = 1): OrderItem => ({ name: "รองพื้น Soft Matte", variantLabel: "02 Natural Beige", qty, price: 459, image: orderItemFoundation });
const blush = (qty = 1): OrderItem => ({ name: "บลัชออนแบบแท่ง", variantLabel: "Peach Pop", qty, price: 259, image: orderItemBlush });

/**
 * Phase 05 mock purchase history — covers every tracking state for UX
 * review (State 1–6 = สั่งซื้อสำเร็จ → จัดส่งสำเร็จ) plus pending-payment and
 * cancelled. CH10188 carries the full multi-hub DHL history. Tracking
 * numbers are mock (DHL's site won't find them). Read only through
 * `orderHistory.ts`'s repository, never directly by UI.
 */
export const MOCK_ORDERS: Order[] = [
  {
    // State 1 — สั่งซื้อสำเร็จ
    id: "CH10312",
    status: "paid",
    placedAt: "2026-10-02T09:32:00+07:00",
    items: [lipTint("01 Melody Pink", 299, 2)],
    total: 598,
    shippingAddress: HOME,
    payment: { method: "พร้อมเพย์ (PromptPay)", subtotal: 598, shippingFee: 0, discount: 0, coinDiscount: 0 },
    shipment: { carrier: "dhl", method: "จัดส่งมาตรฐาน", events: [{ status: "ordered", timestamp: "2026-10-02T09:32:00+07:00", description: "ได้รับคำสั่งซื้อและชำระเงินเรียบร้อย" }] },
  },
  {
    // State 2 — กำลังเตรียมสินค้า
    id: "CH10305",
    status: "preparing",
    placedAt: "2026-10-01T20:10:00+07:00",
    items: [foundation(), blush()],
    total: 778,
    shippingAddress: OFFICE,
    payment: { method: "บัตรเครดิต / เดบิต", subtotal: 718, shippingFee: 60, discount: 0, coinDiscount: 0 },
    shipment: {
      carrier: "dhl",
      method: "จัดส่งด่วน",
      events: [
        { status: "ordered", timestamp: "2026-10-01T20:10:00+07:00", description: "ได้รับคำสั่งซื้อและชำระเงินเรียบร้อย" },
        { status: "preparing", timestamp: "2026-10-02T08:45:00+07:00", description: "Charmiss กำลังแพ็กสินค้าของคุณ" },
      ],
    },
  },
  {
    // State 3 — ส่งสินค้าแล้ว
    id: "CH10298",
    status: "shipping",
    placedAt: "2026-09-30T13:05:00+07:00",
    items: [lipTint("04 Sugar Coral")],
    total: 299,
    shippingAddress: HOME,
    payment: { method: "TrueMoney Wallet", subtotal: 299, shippingFee: 0, discount: 0, coinDiscount: 0 },
    shipment: {
      carrier: "dhl",
      method: "จัดส่งมาตรฐาน",
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
    id: "CH10234",
    status: "shipping",
    placedAt: "2026-09-28T10:12:00+07:00",
    items: [lipTint("03 Cherry Coke"), foundation(), blush()],
    total: 1057,
    shippingAddress: HOME,
    payment: { method: "บัตรเครดิต / เดบิต", subtotal: 1017, shippingFee: 60, discount: 0, coinDiscount: 20 },
    shipment: {
      carrier: "dhl",
      method: "จัดส่งมาตรฐาน",
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
    id: "CH10270",
    status: "shipping",
    placedAt: "2026-09-27T19:48:00+07:00",
    items: [blush(2)],
    total: 518,
    shippingAddress: OFFICE,
    payment: { method: "พร้อมเพย์ (PromptPay)", subtotal: 518, shippingFee: 0, discount: 0, coinDiscount: 0 },
    shipment: {
      carrier: "dhl",
      method: "จัดส่งมาตรฐาน",
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
    id: "CH10188",
    status: "completed",
    placedAt: "2026-09-12T09:32:00+07:00",
    items: [foundation(), blush()],
    total: 598,
    shippingAddress: HOME,
    payment: { method: "บัตรเครดิต / เดบิต", subtotal: 718, shippingFee: 0, discount: 120, coinDiscount: 0 },
    shipment: {
      carrier: "dhl",
      method: "จัดส่งมาตรฐาน",
      trackingNumber: "5093522187",
      events: [
        { status: "ordered", timestamp: "2026-09-12T09:32:00+07:00", description: "ได้รับคำสั่งซื้อและชำระเงินเรียบร้อย" },
        { status: "preparing", timestamp: "2026-09-12T14:20:00+07:00", description: "Charmiss กำลังแพ็กสินค้าของคุณ" },
        { status: "shipped", timestamp: "2026-09-13T10:15:00+07:00", description: "ส่งมอบพัสดุให้ DHL แล้ว", location: "คลังสินค้า Charmiss บางนา" },
        { status: "in_transit", timestamp: "2026-09-13T21:05:00+07:00", description: "พัสดุถึงศูนย์คัดแยก", location: "DHL Hub บางพลี" },
        { status: "in_transit", timestamp: "2026-09-14T04:40:00+07:00", description: "พัสดุออกจากศูนย์คัดแยก", location: "DHL Hub บางพลี" },
        { status: "in_transit", timestamp: "2026-09-14T06:55:00+07:00", description: "พัสดุถึงสาขาปลายทาง", location: "DHL สาขาวัฒนา" },
        { status: "out_for_delivery", timestamp: "2026-09-14T08:30:00+07:00", description: "พนักงานกำลังนำส่งพัสดุ", location: "DHL สาขาวัฒนา" },
        { status: "delivered", timestamp: "2026-09-14T13:12:00+07:00", description: "จัดส่งสำเร็จ ผู้รับ: กมลชนก", location: "กรุงเทพมหานคร" },
      ],
    },
  },
  {
    id: "CH10102",
    status: "pending_payment",
    placedAt: "2026-09-11T18:22:00+07:00",
    items: [lipTint("Peach Pop", 259)],
    total: 259,
    shippingAddress: HOME,
    payment: { method: "พร้อมเพย์ (PromptPay)", subtotal: 259, shippingFee: 0, discount: 0, coinDiscount: 0 },
    shipment: { carrier: "dhl", method: "จัดส่งมาตรฐาน", events: [] },
  },
  {
    id: "CH09977",
    status: "cancelled",
    placedAt: "2026-09-11T11:03:00+07:00",
    cancelledAt: "2026-09-11T12:30:00+07:00",
    items: [lipTint("03 Cherry Coke")],
    total: 299,
    shippingAddress: HOME,
    payment: { method: "บัตรเครดิต / เดบิต", subtotal: 299, shippingFee: 0, discount: 0, coinDiscount: 0 },
    shipment: { carrier: "dhl", method: "จัดส่งมาตรฐาน", events: [{ status: "ordered", timestamp: "2026-09-11T11:03:00+07:00" }] },
  },
];
