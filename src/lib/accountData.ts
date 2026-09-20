import type { Order, OrderStatus, User } from "./types";
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
  pending: { label: "รอชำระเงิน", badgeClass: "bg-[#fff4e6] text-ink" },
  shipping: { label: "กำลังจัดส่ง", badgeClass: "bg-[#f1eeff] text-brand-purple" },
  success: { label: "สำเร็จ", badgeClass: "bg-success-soft text-success" },
  cancelled: { label: "ยกเลิก", badgeClass: "bg-surface-gray text-ink-gray" },
};

/** Matches Figma's 4 example orders (id, status, date, item count/total) exactly. */
export const MOCK_ORDERS: Order[] = [
  {
    id: "CH10234",
    status: "shipping",
    date: "28 ส.ค. 2569",
    total: 1057,
    items: [
      { name: "ลิปทินท์ Y2K Glow", variantLabel: "03 Cherry Coke", qty: 1, price: 299, image: orderItemLipTint },
      { name: "รองพื้น Soft Matte", variantLabel: "02 Natural Beige", qty: 1, price: 459, image: orderItemFoundation },
      { name: "บลัชออนแบบแท่ง", variantLabel: "Peach Pop", qty: 1, price: 259, image: orderItemBlush },
    ],
  },
  {
    id: "CH10188",
    status: "success",
    date: "12 ส.ค. 2569",
    total: 598,
    items: [
      { name: "รองพื้น Soft Matte", variantLabel: "02 Natural Beige", qty: 1, price: 459, image: orderItemFoundation },
      { name: "บลัชออนแบบแท่ง", variantLabel: "Peach Pop", qty: 1, price: 259, image: orderItemBlush },
    ],
  },
  {
    id: "CH10102",
    status: "pending",
    date: "11 ส.ค. 2569",
    total: 259,
    items: [{ name: "ลิปทินท์ Y2K Glow", variantLabel: "Peach Pop", qty: 1, price: 259, image: orderItemLipTint }],
  },
  {
    id: "CH09977",
    status: "cancelled",
    date: "11 ส.ค. 2569",
    total: 299,
    items: [{ name: "ลิปทินท์ Y2K Glow", variantLabel: "03 Cherry Coke", qty: 1, price: 299, image: orderItemLipTint }],
  },
];
