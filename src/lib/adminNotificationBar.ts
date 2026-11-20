import promoBadge99 from "~/assets/images/promo/promo-strip-badge-99.png";
import deliveryIcon from "~/assets/icons/delivery.svg";

/**
 * The storefront's two top bars (`PromoStrip` purple + `UtilityBar` pink in
 * `~/components/shared/PromotionStrip.tsx`). Admin edits them in
 * /admin/notifications; the storefront reads the same localStorage key live
 * (`~/lib/storefrontPromotionStrip`), seed = the original hardcoded copy.
 *   - `purple` (แถบประกาศที่ 1, top): icon + text + optional link + colour + on/off.
 *   - `pink` (แถบประกาศที่ 2): icon + text + optional link + colour, always shown (desktop only).
 * The keys keep their original names (saved data); the colour is now Admin's choice.
 */
export type PromotionStripContent = {
  icon: string;
  text: string;
  linkLabel?: string;
  linkUrl?: string;
  /** Bar background, `#rrggbb`. The text turns white or dark by itself (`stripTone`), so it always reads. */
  bgColor: string;
};

/** DSL colours offered first in Admin; any other hex is allowed too. */
export const STRIP_COLOR_PRESETS: { label: string; value: string }[] = [
  { label: "ม่วง", value: "#7650ff" },
  { label: "ชมพู", value: "#f1336e" },
  { label: "ชมพูอ่อน", value: "#feebf1" },
  { label: "ส้ม", value: "#ff9300" },
  { label: "เขียว", value: "#009b4d" },
  { label: "กรมท่า", value: "#1e3146" },
  { label: "ขาว", value: "#ffffff" },
];

export const isStripColor = (v: unknown): v is string => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);

/** "dark" = the bar is dark, so its text is white; "light" = dark text (relative luminance, WCAG). */
export function stripTone(hex: string): "dark" | "light" {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  // White and ink (#1e3146) text tie on contrast near 0.24; a little above keeps the brand green on white.
  // Purple, pink, green and navy get white text; orange, light pink and white get ink.
  return luminance < 0.26 ? "dark" : "light";
}

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
      bgColor: "#7650ff",
      enabled: true,
    },
    pink: {
      icon: deliveryIcon,
      text: "จัดส่งฟรีทั่วประเทศ เมื่อซื้อครบ 990.- ของแท้จากเว็บไซต์อย่างเป็นทางการของ Charmiss",
      linkLabel: undefined,
      linkUrl: undefined,
      bgColor: "#feebf1",
    },
    updatedAt: TODAY_LABEL,
  };
}

/** `/promotions` never had a route — saved bars from before the fix point at the real promotions page instead. */
const fixLegacyLink = <T extends { linkUrl?: string }>(bar: T): T => (bar.linkUrl === "/promotions" ? { ...bar, linkUrl: "/promotion/promotions" } : bar);

export function normalizePromotionStripState(state: Partial<PromotionStripState> | undefined): PromotionStripState {
  const seed = buildMockPromotionStripState();
  return {
    purple: fixLegacyLink({
      ...seed.purple,
      ...state?.purple,
      bgColor: isStripColor(state?.purple?.bgColor) ? state.purple.bgColor : seed.purple.bgColor,
      enabled: state?.purple?.enabled ?? true,
    }),
    pink: fixLegacyLink({ ...seed.pink, ...state?.pink, bgColor: isStripColor(state?.pink?.bgColor) ? state.pink.bgColor : seed.pink.bgColor }),
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
