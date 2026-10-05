import promoBadge99 from "~/assets/images/promo/promo-strip-badge-99.png";
import deliveryIcon from "~/assets/icons/delivery.svg";

/**
 * CMS Final Admin UX Refinement §02-08 — "โปรโมชั่นแถบ" (user-facing name;
 * internal model name kept as "NotificationBar" per the spec's own "ไม่
 * จำเป็นต้องเปลี่ยน" allowance). Exactly two FIXED, distinctly-shaped slots —
 * not a reorderable list — matching the real storefront's two hardcoded
 * bars (Header.tsx's purple "Promo strip" + pink "Utility bar"):
 *   - `purple`: Icon + Text + Link + a single on/off Toggle.
 *   - `pink`: Icon (optional) + Text + Link (optional), always visible, no
 *     toggle, no order — position and left-alignment are fixed by which
 *     slot it is, never admin-configurable (§06/§07).
 * Management UI only this phase — nothing here is read by the Customer
 * Frontend yet (Header.tsx keeps rendering its own hardcoded copy).
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

const TODAY_LABEL = "22 ก.ย. 2569";

/** §16 (prior phase) — the exact two bars the real storefront currently hardcodes, reproduced here as the seed so the CMS starts out truthfully describing what's live today. */
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

/** A state persisted before a field existed on it comes back with it `undefined` unless backfilled — same root-cause guard every other Admin store's `normalize*` applies. */
/** `/promotions` never had a route — saved bars from before the fix point at the real promotions page instead. */
const fixLegacyLink = <T extends { linkUrl?: string }>(bar: T): T => (bar.linkUrl === "/promotions" ? { ...bar, linkUrl: "/promotion/promotions" } : bar);

export function normalizePromotionStripState(state: PromotionStripState): PromotionStripState {
  const seed = buildMockPromotionStripState();
  return {
    purple: fixLegacyLink({ ...seed.purple, ...state.purple, enabled: state.purple?.enabled ?? true }),
    pink: fixLegacyLink({ ...seed.pink, ...state.pink }),
    updatedAt: state.updatedAt ?? TODAY_LABEL,
  };
}
