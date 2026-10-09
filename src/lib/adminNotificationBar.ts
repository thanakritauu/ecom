import promoBadge99 from "~/assets/images/promo/promo-strip-badge-99.png";
import deliveryIcon from "~/assets/icons/delivery.svg";

/**
 * The storefront's two top bars (`PromoStrip` purple + `UtilityBar` pink in
 * `~/components/shared/PromotionStrip.tsx`). Admin edits them in
 * /admin/notifications; the storefront reads the same localStorage key live
 * (`~/lib/storefrontPromotionStrip`), seed = the original hardcoded copy.
 *   - `purple`: icon + text + optional link + on/off.
 *   - `pink`: icon + text + optional link, always shown (desktop only).
 */
export type PromotionStripContent = {
  icon: string;
  text: string;
  linkLabel?: string;
  linkUrl?: string;
};

export type PromotionStripState = {
  purple: PromotionStripContent & { enabled: boolean };
  pink: PromotionStripContent;
  updatedAt: string;
};

export const PROMOTION_STRIP_STORAGE_KEY = "charmiss:admin:promotion-strip";
/** Fired by the admin store after it saves so a storefront page in the same tab updates (the `storage` event only reaches other tabs). */
export const PROMOTION_STRIP_CHANGED_EVENT = "charmiss:promotion-strip-changed";

const TODAY_LABEL = "22 ก.ย. 2569";

/** The two bars exactly as the storefront shipped them. */
export function buildMockPromotionStripState(): PromotionStripState {
  return {
    purple: {
      icon: promoBadge99,
      text: "Charmiss MEGA SALE ลดสูงสุด 70% รับคูปองลดเพิ่ม 25%",
      linkLabel: "ช็อปเลย!",
      linkUrl: "/promotion/promotions",
      enabled: true,
    },
    pink: {
      icon: deliveryIcon,
      text: "จัดส่งฟรีทั่วประเทศ เมื่อซื้อครบ 990.- ของแท้จากเว็บไซต์อย่างเป็นทางการของ Charmiss",
      linkLabel: undefined,
      linkUrl: undefined,
    },
    updatedAt: TODAY_LABEL,
  };
}

/** `/promotions` never had a route — saved bars from before the fix point at the real promotions page instead. */
const fixLegacyLink = <T extends { linkUrl?: string }>(bar: T): T => (bar.linkUrl === "/promotions" ? { ...bar, linkUrl: "/promotion/promotions" } : bar);

export function normalizePromotionStripState(state: Partial<PromotionStripState> | undefined): PromotionStripState {
  const seed = buildMockPromotionStripState();
  return {
    purple: fixLegacyLink({ ...seed.purple, ...state?.purple, enabled: state?.purple?.enabled ?? true }),
    pink: fixLegacyLink({ ...seed.pink, ...state?.pink }),
    updatedAt: state?.updatedAt ?? TODAY_LABEL,
  };
}

/** Reads the saved bars (or the seed). Safe on the server. */
export function readStoredPromotionStrip(): PromotionStripState {
  if (typeof localStorage === "undefined") return buildMockPromotionStripState();
  try {
    const raw = localStorage.getItem(PROMOTION_STRIP_STORAGE_KEY);
    return raw ? normalizePromotionStripState(JSON.parse(raw) as PromotionStripState) : buildMockPromotionStripState();
  } catch {
    return buildMockPromotionStripState();
  }
}
