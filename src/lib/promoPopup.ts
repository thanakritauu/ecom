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
  /** Opens the sign-in / sign-up modal. The popup is a new-member offer, so signed-in members never see it. */
  guestCta: string;
};

export const HOME_PROMO_POPUP: PromoPopupContent = {
  id: "new-member-100",
  image: { src: membershipBg, alt: "Charmiss Club", objectPosition: "72% 30%" },
  title: "สมาชิกใหม่รับส่วนลด ฿100",
  description: "สมัคร Charmiss Club วันนี้ รับคูปองส่วนลดทันที\nพร้อมสะสมคอยน์ทุกการช้อป",
  guestCta: "สมัครสมาชิกเลย",
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
