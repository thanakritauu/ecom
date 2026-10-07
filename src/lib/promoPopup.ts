import { AVAILABLE_COUPONS } from "./cartSelectors";
import membershipBg from "~/assets/images/membership/membership-bg.png";

/**
 * Home promo popup content — one typed object so the campaign can be swapped
 * (and later come from Admin) without touching `PromoPopup.tsx`. `id` keys
 * the "ไม่ต้องแสดงอีก" flag, so a new campaign (new id) shows again even to
 * someone who hid the previous one.
 */
export type PromoPopupContent = {
  id: string;
  image: { src: string; alt: string; objectPosition?: string };
  title: string;
  /** `\n` starts a new line. */
  description: string;
  /** Code / condition line, e.g. "ใช้โค้ด SAVE100 · ขั้นต่ำ ฿2,000". */
  condition?: string;
  /** Guest CTA opens the sign-in / sign-up modal; a signed-in member gets the shop CTA instead. */
  guestCta: string;
  memberCta: { label: string; href: string };
};

// The new-member reward is the real ฿100 coupon, so the line matches what Checkout accepts.
const reward = AVAILABLE_COUPONS.find((c) => c.code === "SAVE100");

export const HOME_PROMO_POPUP: PromoPopupContent = {
  id: "new-member-100",
  image: { src: membershipBg, alt: "Charmiss Club", objectPosition: "72% 30%" },
  title: "สมาชิกใหม่รับส่วนลด ฿100",
  description: "สมัคร Charmiss Club วันนี้ รับคูปองส่วนลดทันที\nพร้อมสะสมคอยน์ทุกการช้อป",
  condition: reward ? `ใช้โค้ด ${reward.code} · ขั้นต่ำ ฿${reward.minSpend.toLocaleString("th-TH")} · ${reward.expiresLabel}` : undefined,
  guestCta: "สมัครสมาชิกรับส่วนลด",
  memberCta: { label: "ช้อปเลย", href: "/products" },
};

const HIDDEN_KEY = "charmiss:promo-popup-hidden";

export function isPromoHidden(id: string): boolean {
  try {
    return localStorage.getItem(HIDDEN_KEY) === id;
  } catch {
    return false;
  }
}

export function hidePromoForever(id: string) {
  try {
    localStorage.setItem(HIDDEN_KEY, id);
  } catch {
    // storage unavailable (private mode) — it just shows again next load.
  }
}
