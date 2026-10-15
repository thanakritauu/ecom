import type { StatusTone } from "~/components/admin/StatusBadge";
import { formatAdminCurrency } from "./adminDashboard";
import { AVAILABLE_COUPONS, couponLabels } from "./cartSelectors";
import { normalizeSkuRefs, type ProductSkuRef } from "./productSkuRef";

/**
 * Marketing (promotions + coupons). What Admin stores is only an on/off
 * switch (`status`) plus a start/end date-time. What the storefront does is
 * derived from both, in Bangkok time: a promo/coupon runs while it's on and
 * now is inside its window. `marketingPhase` is that same rule, worded for
 * Admin's badges, so the badge always says what the shop is doing right now.
 */
export type MarketingStatus = "active" | "disabled" | "draft";

/**
 * Shown state: on + before start / on + inside the window / on + past the end / off /
 * แบบร่าง (draft-first rule: saved but never published, never runs on the storefront).
 */
export type MarketingPhase = "scheduled" | "live" | "expired" | "disabled" | "draft";

export const MARKETING_PHASE_META: Record<MarketingPhase, { label: string; tone: StatusTone }> = {
  live: { label: "กำลังใช้งาน", tone: "success" },
  scheduled: { label: "ตั้งเวลาไว้", tone: "info" },
  expired: { label: "หมดอายุ", tone: "warning" },
  disabled: { label: "ปิดใช้งาน", tone: "neutral" },
  draft: { label: "แบบร่าง", tone: "neutral" },
};

export const MARKETING_PHASES: MarketingPhase[] = ["live", "scheduled", "expired", "disabled", "draft"];

/** Stored status as-is (active / disabled / draft); older values (scheduled / expired) read as on, the dates decide. */
export function normalizeMarketingStatus(status: string | undefined): MarketingStatus {
  return status === "disabled" || status === "draft" ? status : "active";
}

type Window = { startDate: string; startTime: string; endDate: string; endTime: string };

/** Epoch ms of the window's first and last moment, read as Bangkok time (UTC+7, no DST). Empty dates are open-ended. */
export function marketingWindow(w: Window): { startsAt: number; endsAt: number } {
  const startsAt = w.startDate ? Date.parse(`${w.startDate}T${w.startTime || "00:00"}:00+07:00`) : Number.NEGATIVE_INFINITY;
  const endsAt = w.endDate ? Date.parse(`${w.endDate}T${w.endTime || "23:59"}:59.999+07:00`) : Number.POSITIVE_INFINITY;
  return { startsAt: Number.isNaN(startsAt) ? Number.NEGATIVE_INFINITY : startsAt, endsAt: Number.isNaN(endsAt) ? Number.POSITIVE_INFINITY : endsAt };
}

export function marketingPhase(item: Window & { status: MarketingStatus }, now = Date.now()): MarketingPhase {
  if (item.status === "draft") return "draft";
  if (item.status !== "active") return "disabled";
  const { startsAt, endsAt } = marketingWindow(item);
  if (now < startsAt) return "scheduled";
  if (now > endsAt) return "expired";
  return "live";
}

/** True when the storefront runs it right now. */
export const isMarketingLive = (item: Window & { status: MarketingStatus }, now = Date.now()) => marketingPhase(item, now) === "live";

const THAI_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

/** `date` is a plain `YYYY-MM-DD` (what `<input type="date">` gives/takes); this is only the display form ("17 ก.ย. 2569"). */
export function formatMarketingDate(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return date || "-";
  return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
}

export function formatMarketingDateTime(date: string, time: string): string {
  return date ? `${formatMarketingDate(date)} ${time}` : "-";
}

/** Storefront-style short date ("11 ก.ย."), the form the coupon tickets print their expiry in (no year). */
export function formatMarketingDateShort(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return date;
  return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]}`;
}

/** The one validation rule Create/Edit enforces for every entity that has a date range. */
export function isValidDateRange(startDate: string, startTime: string, endDate: string, endTime: string): boolean {
  if (!startDate || !endDate) return true;
  const start = new Date(`${startDate}T${startTime || "00:00"}`).getTime();
  const end = new Date(`${endDate}T${endTime || "00:00"}`).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return true;
  return end > start;
}

// ---------------------------------------------------------------------------
// Promotions: the two cart-threshold types the storefront cart runs (free
// shipping, ซื้อครบรับของแถม) plus four types Admin can set up ahead of time
// (bundle, % off, baht off, buy X get Y). The storefront only applies
// `STOREFRONT_PROMOTION_TYPES`; the rest are stored and shown in Admin only.
// ---------------------------------------------------------------------------

export type PromotionType = "free_shipping" | "gift_with_purchase" | "percent_off" | "baht_off" | "buy_x_get_y" | "bundle";

/** Dropdown order in the form and the list filter. */
export const PROMOTION_TYPES: PromotionType[] = ["gift_with_purchase", "free_shipping", "percent_off", "baht_off", "buy_x_get_y", "bundle"];

export const PROMOTION_TYPE_META: Record<PromotionType, { label: string }> = {
  free_shipping: { label: "ส่งฟรี" },
  gift_with_purchase: { label: "ซื้อครบรับของแถม" },
  percent_off: { label: "ลดเป็น %" },
  baht_off: { label: "ลดเป็นเงิน" },
  buy_x_get_y: { label: "ซื้อ X แถม Y" },
  bundle: { label: "ชุดสินค้า (จัดเซ็ต)" },
};

export const isPromotionType = (t: string): t is PromotionType => (PROMOTION_TYPES as string[]).includes(t);

/** The types the storefront cart actually runs today. Everything else is ignored by `promotionEngine`. */
export const STOREFRONT_PROMOTION_TYPES: readonly PromotionType[] = ["free_shipping", "gift_with_purchase"];
export const isStorefrontPromotion = (p: Pick<Promotion, "type">) => STOREFRONT_PROMOTION_TYPES.includes(p.type);

/** One product + quantity of a bundle, or of either side of a buy X get Y. */
export type PromotionItem = { productId: string; qty: number; /** Only these SKUs count; missing / empty = any option of the product. */ variantIds?: string[] };

/** What a promo counts: the eligible lines' baht total (before coupon/coins) or their piece count. */
export type PromotionCondition = "amount" | "qty";

export const PROMOTION_CONDITION_META: Record<PromotionCondition, { label: string; unit: string }> = {
  amount: { label: "ยอดซื้อ (บาท)", unit: "฿" },
  qty: { label: "จำนวนชิ้น", unit: "ชิ้น" },
};

/** One step of a "ซื้อครบรับของแถม" promo. One tier is a single gift; 2 to 5 make a ขั้นบันได promo. */
export type GiftTier = {
  threshold: number;
  giftProductId: string;
  giftQty: number;
  /**
   * For a gift product with options (shades): which ones the customer may pick
   * in the cart. Unset / empty = every option in stock; exactly one = that
   * option is given, no choice.
   */
  giftVariantIds?: string[];
};

export const MAX_GIFT_TIERS = 5;

/** "฿590" or "3 ชิ้น". */
export function formatPromotionThreshold(condition: PromotionCondition, value: number): string {
  return condition === "qty" ? `${value.toLocaleString("th-TH")} ชิ้น` : formatBaht(value);
}

/** "฿1,290" (no ".00" for whole baht). */
export function formatBaht(value: number): string {
  return formatAdminCurrency(value).replace(/\.00$/, "");
}

export type Promotion = {
  id: string;
  name: string;
  type: PromotionType;
  /** `free_shipping`: the threshold that unlocks it, in `conditionType` units (empty = free on every order). `percent_off` / `baht_off`: optional baht minimum of the eligible products. */
  minSpend?: number;
  /** Count baht or pieces (`free_shipping` / `gift_with_purchase`). Missing reads as "amount". */
  conditionType?: PromotionCondition;
  /** `gift_with_purchase` only: 1 to 5 ascending tiers; reaching a tier gives its gift plus every lower tier's. Read through `promotionGiftTiers`. */
  tiers?: GiftTier[];
  /** Legacy single-gift fields (before `tiers`). `promotionGiftTiers` turns them into one tier; new saves don't write them. */
  giftProductId?: string;
  giftQty?: number;
  /** `percent_off` only: percent off the eligible products (1 to 100). */
  discountPercent?: number;
  /** `percent_off` only: cap in baht ("ลดสูงสุด ฿"). Empty = no cap. */
  maxDiscount?: number;
  /** `baht_off` only: baht off the eligible products. */
  discountAmount?: number;
  /** `bundle` only: the products in the set (2 or more lines) and the set price. */
  bundleItems?: PromotionItem[];
  bundlePrice?: number;
  /** `buy_x_get_y` only: buy every line of `buyItems`, get every line of `getItems` free. */
  buyItems?: PromotionItem[];
  getItems?: PromotionItem[];
  /** "แสดงในตะกร้า": whether the Cart Drawer / Cart Page shows this promo's own progress banner. A hidden promo still applies. */
  showInCart?: boolean;
  /** Text on the storefront promo badge (product card / PDP). Empty = `promotionBadgeLabel` builds it from the conditions. */
  badgeLabel?: string;
  /** Show this promo's badge on product cards and the PDP. Unset = on. */
  showBadge?: boolean;
  /** Empty applies to every product (`free_shipping`, `gift_with_purchase`, `percent_off`, `baht_off`). */
  productIds: string[];
  /**
   * "เลือกตัวเลือกสินค้า": per picked product, the only options that count
   * (product id -> option ids). A product missing here (or the whole field
   * unset, older records) counts with every option ("ทั้งสินค้า").
   */
  productVariantIds?: Record<string, string[]>;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  status: MarketingStatus;
  createdAt: string;
  updatedAt: string;
};

/** Whether a cart line (product + option) counts toward this promo's scope. */
export function promotionCoversLine(p: Pick<Promotion, "productIds" | "productVariantIds">, productId: string, variantId?: string): boolean {
  if (p.productIds.length === 0) return true;
  if (!p.productIds.includes(productId)) return false;
  const options = p.productVariantIds?.[productId];
  if (!options?.length) return true;
  return !!variantId && options.includes(variantId);
}

/** Types whose form has a "สินค้าที่เข้าร่วม" scope (all products or picked ones). */
export const promotionHasProductScope = (type: PromotionType) => type === "free_shipping" || type === "gift_with_purchase" || type === "percent_off" || type === "baht_off";

/** Sum of the items' normal prices (the "ราคาปกติ" a bundle is compared with). Unknown products count as ฿0. */
export function promotionItemsTotal(items: PromotionItem[], price: (id: string) => number | undefined): number {
  return items.reduce((sum, item) => sum + (price(item.productId) ?? 0) * item.qty, 0);
}

const itemsPieces = (items: PromotionItem[] | undefined) => (items ?? []).reduce((n, i) => n + i.qty, 0);

/** Gift tiers of a `gift_with_purchase` promo, ascending. Older records with only `minSpend`/`giftProductId` read as one tier. */
export function promotionGiftTiers(p: Pick<Promotion, "tiers" | "minSpend" | "giftProductId" | "giftQty">): GiftTier[] {
  if (p.tiers?.length) return [...p.tiers].sort((a, b) => a.threshold - b.threshold);
  if (p.giftProductId && p.minSpend) return [{ threshold: p.minSpend, giftProductId: p.giftProductId, giftQty: p.giftQty ?? 1 }];
  return [];
}

export const promotionCondition = (p: Pick<Promotion, "conditionType">): PromotionCondition => p.conditionType ?? "amount";

/** One-line summary for the list, Quick View, detail page and form preview. `productName` looks a gift product's name up. */
export function formatPromotionDiscount(
  p: Pick<Promotion, "type" | "minSpend" | "giftProductId" | "giftQty" | "tiers" | "conditionType" | "discountPercent" | "maxDiscount" | "discountAmount" | "bundleItems" | "bundlePrice" | "buyItems" | "getItems">,
  productName?: (id: string) => string | undefined,
): string {
  const condition = promotionCondition(p);
  const minSpendText = p.minSpend ? ` เมื่อซื้อครบ ${formatBaht(p.minSpend)}` : "";
  switch (p.type) {
    case "free_shipping":
      return p.minSpend ? `ส่งฟรีเมื่อซื้อครบ ${formatPromotionThreshold(condition, p.minSpend)}` : "ส่งฟรีทุกออเดอร์";
    case "percent_off":
      return `ลด ${p.discountPercent ?? 0}%${p.maxDiscount ? ` (สูงสุด ${formatBaht(p.maxDiscount)})` : ""}${minSpendText}`;
    case "baht_off":
      return `ลด ${formatBaht(p.discountAmount ?? 0)}${minSpendText}`;
    case "bundle": {
      const lines = p.bundleItems?.length ?? 0;
      if (lines === 0) return "ยังไม่ได้เลือกสินค้าในเซ็ต";
      return `เซ็ต ${lines} รายการ ราคา ${formatBaht(p.bundlePrice ?? 0)}`;
    }
    case "buy_x_get_y": {
      const buy = p.buyItems ?? [];
      const get = p.getItems ?? [];
      if (buy.length === 0 || get.length === 0) return "ยังไม่ได้เลือกสินค้า";
      if (buy.length === 1 && get.length === 1 && buy[0].productId === get[0].productId) return `ซื้อ ${buy[0].qty} แถม ${get[0].qty}`;
      return `ซื้อ ${itemsPieces(buy)} ชิ้น แถม ${itemsPieces(get)} ชิ้น`;
    }
    case "gift_with_purchase": {
      const tiers = promotionGiftTiers(p);
      if (tiers.length === 0) return "ยังไม่ได้ตั้งขั้นของแถม";
      if (tiers.length > 1) return `ของแถมขั้นบันได ${tiers.length} ขั้น เริ่มที่ซื้อครบ ${formatPromotionThreshold(condition, tiers[0].threshold)}`;
      const [tier] = tiers;
      const qty = tier.giftQty > 1 ? ` ${tier.giftQty} ชิ้น` : "";
      return `ซื้อครบ ${formatPromotionThreshold(condition, tier.threshold)} รับฟรี ${productName?.(tier.giftProductId) ?? "ของแถม"}${qty}`;
    }
  }
}

/** A stored record from any earlier shape (pre-v6 "percentage" / "fixed" / qty-based buy X get Y with `discountValue`, `buyQty`, `getQty`). */
type StoredPromotion = Omit<Promotion, "type"> & { type: string; discountValue?: number; buyQty?: number; getQty?: number; description?: string; usageCount?: number };

/** Reads every stored shape as the current one: old type names are mapped, unknown types dropped, old statuses mapped to on/off. Used by the Admin store and the storefront reader. */
export function normalizePromotions(list: Promotion[]): Promotion[] {
  return (list as StoredPromotion[]).flatMap(({ discountValue, buyQty, getQty, description: _d, usageCount: _u, ...p }): Promotion[] => {
    let type = p.type;
    const extra: Partial<Promotion> = {};
    if (type === "percentage") {
      type = "percent_off";
      extra.discountPercent = p.discountPercent ?? discountValue;
    } else if (type === "fixed") {
      type = "baht_off";
      extra.discountAmount = p.discountAmount ?? discountValue;
    } else if (type === "buy_x_get_y" && !p.buyItems && (buyQty || getQty)) {
      // The old form had one buy/get quantity over its product scope: the same products on both sides.
      extra.buyItems = (p.productIds ?? []).map((productId) => ({ productId, qty: buyQty ?? 1 }));
      extra.getItems = (p.productIds ?? []).map((productId) => ({ productId, qty: getQty ?? 1 }));
      extra.productIds = [];
    }
    if (!isPromotionType(type)) return [];
    return [{ ...p, ...extra, type, productIds: extra.productIds ?? p.productIds ?? [], status: normalizeMarketingStatus(p.status) } as Promotion];
  });
}


/*
 * Seeds: the two promos the storefront cart runs by default (the ฿590 gift,
 * free shipping at ฿990), each with its own cart banner; two gift promos
 * left off so Admin can switch them on to try the cart UI (a 5-step
 * ขั้นบันได by baht and a piece-count one); and one that has ended. New
 * seeds go at the END: ids are positions.
 */
const PROMOTION_SEEDS: Omit<Promotion, "id" | "createdAt" | "updatedAt">[] = [
  // Store-wide promos: badge off, so it isn't on every card. The gift has options, so the cart shows the option picker.
  { name: "ซื้อครบ ฿590 รับของแถมฟรี", type: "gift_with_purchase", conditionType: "amount", tiers: [{ threshold: 590, giftProductId: "flash-1", giftQty: 1 }], showInCart: true, showBadge: false, productIds: [], startDate: "2026-09-01", startTime: "00:00", endDate: "2026-12-31", endTime: "23:59", status: "active" },
  { name: "ส่งฟรีทั่วไทย", type: "free_shipping", conditionType: "amount", minSpend: 990, showInCart: true, showBadge: false, productIds: [], startDate: "2026-09-01", startTime: "00:00", endDate: "2026-12-31", endTime: "23:59", status: "active" },
  {
    name: "ช้อปครบรับของแถมขั้นบันได",
    type: "gift_with_purchase",
    conditionType: "amount",
    tiers: [
      { threshold: 590, giftProductId: "feature-9", giftQty: 1 },
      { threshold: 990, giftProductId: "new-5", giftQty: 1 },
      { threshold: 1500, giftProductId: "trend-5", giftQty: 1 },
      { threshold: 2500, giftProductId: "new-6", giftQty: 1 },
      { threshold: 3500, giftProductId: "best-5", giftQty: 1 },
    ],
    showInCart: true,
    productIds: [],
    startDate: "2026-10-01",
    startTime: "00:00",
    endDate: "2026-12-31",
    endTime: "23:59",
    status: "disabled",
  },
  // Product-specific promos with badges: some cards get one badge, some two (in both), the rest none.
  { name: "ซื้อครบ 3 ชิ้น รับฟรีลิปออยล์", type: "gift_with_purchase", conditionType: "qty", tiers: [{ threshold: 3, giftProductId: "new-10", giftQty: 1 }], showInCart: true, showBadge: true, productIds: ["flash-1", "flash-2", "flash-3", "flash-4", "flash-5", "flash-6", "best-1", "best-2", "best-3", "best-4"], startDate: "2026-10-01", startTime: "00:00", endDate: "2026-12-31", endTime: "23:59", status: "active" },
  { name: "9.9 ส่งฟรีไม่มีขั้นต่ำ", type: "free_shipping", conditionType: "amount", showInCart: true, productIds: [], startDate: "2026-09-09", startTime: "00:00", endDate: "2026-09-09", endTime: "23:59", status: "active" },
  // v7: one of each type set up ahead of time (Admin only for now).
  { name: "ลด 15% ทั้งร้าน สูงสุด ฿200", type: "percent_off", discountPercent: 15, maxDiscount: 200, minSpend: 800, productIds: [], startDate: "2026-11-11", startTime: "00:00", endDate: "2026-11-11", endTime: "23:59", status: "disabled" },
  { name: "ลด ฿100 คุชชั่นขายดี", type: "baht_off", discountAmount: 100, minSpend: 500, productIds: ["feature-1", "feature-2"], startDate: "2026-11-01", startTime: "00:00", endDate: "2026-11-30", endTime: "23:59", status: "disabled" },
  { name: "ซื้อลิป 2 แถม 1", type: "buy_x_get_y", buyItems: [{ productId: "best-1", qty: 2 }], getItems: [{ productId: "best-1", qty: 1 }], productIds: [], startDate: "2026-11-01", startTime: "00:00", endDate: "2026-11-15", endTime: "23:59", status: "disabled" },
  { name: "เซ็ตแต่งหน้าครบชุด", type: "bundle", bundleItems: [{ productId: "best-1", qty: 1 }, { productId: "feature-1", qty: 1 }, { productId: "best-3", qty: 1 }], bundlePrice: 529, productIds: [], startDate: "2026-12-01", startTime: "00:00", endDate: "2026-12-31", endTime: "23:59", status: "disabled" },
  // v9: second product-specific gift promo (overlaps the 3-piece one, so those cards show two badges).
  { name: "ลิปและบลัชครบ ฿500 รับของแถม", type: "gift_with_purchase", conditionType: "amount", tiers: [{ threshold: 500, giftProductId: "flash-1", giftQty: 1 }], showInCart: true, showBadge: true, badgeLabel: "ครบ ฿500 รับของแถม", productIds: ["flash-1", "flash-3", "flash-5", "best-2", "best-6", "best-8"], startDate: "2026-10-01", startTime: "00:00", endDate: "2026-12-31", endTime: "23:59", status: "active" },
];

/**
 * Seed-data version of what the Marketing store persists. Exported so the
 * storefront's read-only mirror upgrades an old stored copy the same way.
 * v6: on/off status + real dates, only free shipping and gift promos,
 * coupons cut down to what the storefront uses, flash sale and bundles gone.
 * v7: % / baht / buy X get Y / bundle promos back (Admin only), coupons get
 * % with a cap, usage limits and a thumbnail; seeds for each.
 * v8: a coupon limited to some products / SKUs (`productScope`).
 * v9: promo badges can be switched off (`showBadge`); seeds show cards with 0, 1 and 2 badges.
 */
export const MARKETING_SEED_VERSION = 9;

// ---------------------------------------------------------------------------
// Coupons: baht or % off the product subtotal, one per order
// ---------------------------------------------------------------------------

export type CouponDiscountType = "baht" | "percent";

export const COUPON_DISCOUNT_TYPE_META: Record<CouponDiscountType, { label: string }> = {
  baht: { label: "ลดเป็นเงิน" },
  percent: { label: "ลดเป็น %" },
};

export type Coupon = {
  id: string;
  code: string;
  /** Missing reads as "baht" (records saved before % coupons came back). */
  discountType: CouponDiscountType;
  /** Baht off, or the percent (1 to 100) for a "percent" coupon. Taken off the product subtotal; shipping untouched. */
  discount: number;
  /** "percent" only: most baht it takes off ("ลดสูงสุด ฿"). Empty = no cap. */
  maxDiscount?: number;
  /** Product subtotal needed to use it. Empty means no minimum. */
  minSpend?: number;
  /** Uses across every customer ("จำกัดจำนวนครั้ง"). Empty = unlimited. */
  usageLimit?: number;
  /** Uses per customer account ("จำกัดต่อลูกค้า"). Empty = unlimited. */
  perCustomerLimit?: number;
  /** Ticket thumbnail (image only). Empty keeps the ticket's % artwork. */
  image?: string;
  /** "เงื่อนไขเพิ่มเติม": rich text (HTML, `~/lib/richText`) shown under the automatic conditions in the storefront coupon sheet. Empty = none. */
  extraConditions?: string;
  /** Shown as a collectable ticket in Home's "คูปองส่วนลด" section. */
  showOnHome: boolean;
  /** Listed in Checkout's coupon picker. Any live code can still be typed in at Checkout. */
  showAtCheckout: boolean;
  /** Products / SKUs it's limited to (empty `variantIds` = every option). Unset or empty = ทั้งร้าน. Min spend and the discount count only these lines. */
  productScope?: ProductSkuRef[];
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  status: MarketingStatus;
  createdAt: string;
  updatedAt: string;
};

type CouponDiscountFields = Pick<Coupon, "discount"> & { discountType?: CouponDiscountType; maxDiscount?: number };

/** "ลด ฿100" / "ลด 10%": the big line on the ticket. */
export const formatCouponAmount = (c: CouponDiscountFields): string => couponLabels(c).amount;

/** "ลดสูงสุด ฿200" for a capped % coupon, else undefined. */
export const formatCouponCap = (c: CouponDiscountFields): string | undefined => couponLabels(c).cap;

/** "ลด ฿100" / "ลด 10% (สูงสุด ฿200)": the one-line coupon label (lists, cart, checkout, toasts). Same as the storefront's `Coupon.label`. */
export const formatCouponDiscount = (c: CouponDiscountFields): string => couponLabels(c).label;

/** "ขั้นต่ำ ฿500" / "ไม่มีขั้นต่ำ", the ticket's second line. */
export function formatCouponMinSpend(c: Pick<Coupon, "minSpend">): string {
  return c.minSpend ? `ขั้นต่ำ ฿${c.minSpend.toLocaleString("th-TH")}` : "ไม่มีขั้นต่ำ";
}

/** "500 ครั้ง" / "ไม่จำกัด". */
export function formatCouponLimit(limit: number | undefined): string {
  return limit ? `${limit.toLocaleString("th-TH")} ครั้ง` : "ไม่จำกัด";
}

/** "12 / 500" or "12" when unlimited: uses so far against the total limit. */
export function formatCouponUsage(used: number, limit: number | undefined): string {
  return limit ? `${used.toLocaleString("th-TH")} / ${limit.toLocaleString("th-TH")}` : used.toLocaleString("th-TH");
}

/** Where a coupon appears on the storefront ("หน้าแรก, ชำระเงิน"). */
export function formatCouponPlacement(c: Pick<Coupon, "showOnHome" | "showAtCheckout">): string {
  const places = [c.showOnHome && "หน้าแรก", c.showAtCheckout && "หน้าชำระเงิน"].filter(Boolean);
  return places.length > 0 ? places.join(", ") : "กรอกโค้ดเท่านั้น";
}

/** How many orders used this code (cancelled orders don't count). `customerId` narrows it to one customer. */
export function couponUsageCount(
  code: string,
  orders: { orderStatus: string; customerId?: string; totals: { couponCode?: string } }[],
  customerId?: string,
): number {
  const key = code.toUpperCase();
  return orders.filter((o) => o.orderStatus !== "cancelled" && o.totals.couponCode?.toUpperCase() === key && (!customerId || o.customerId === customerId)).length;
}

/** A stored record from any earlier shape: pre-v6 `discountType: "percentage" | "fixed"` + `discountValue`, v6 baht-only `discount`. */
type StoredCoupon = Omit<Coupon, "discountType"> & { discountType?: string; discountValue?: number; description?: string; usageCount?: number };

/** Reads every stored coupon shape as the current one (old % coupons come back as "percent", everything else baht). */
export function normalizeCoupons(list: Coupon[]): Coupon[] {
  return (list as StoredCoupon[]).map(({ discountType, discountValue, description: _d, usageCount: _u, ...c }) => {
    const type: CouponDiscountType = discountType === "percent" || discountType === "percentage" ? "percent" : "baht";
    return {
      ...c,
      discountType: type,
      discount: c.discount ?? discountValue ?? 0,
      maxDiscount: type === "percent" && c.maxDiscount ? c.maxDiscount : undefined,
      usageLimit: c.usageLimit || undefined,
      perCustomerLimit: c.perCustomerLimit || undefined,
      // The form stores a small data URL; an object URL from an older save no longer points at anything after a reload.
      image: c.image && !c.image.startsWith("blob:") ? c.image : undefined,
      extraConditions: typeof c.extraConditions === "string" && c.extraConditions.trim() ? c.extraConditions : undefined,
      // An empty list reads as ทั้งร้าน (unset); a draft can keep it, `couponPublishProblems` stops it going live.
      productScope: c.productScope === undefined ? undefined : normalizeSkuRefs(c.productScope),
      showOnHome: !!c.showOnHome,
      showAtCheckout: !!c.showAtCheckout,
      status: normalizeMarketingStatus(c.status),
    };
  });
}

/*
 * The first three are the storefront's `AVAILABLE_COUPONS` (cartSelectors.ts),
 * same amount, min spend and last day, on Home and at Checkout, once per
 * customer. Then: a code that's only typed in (not listed anywhere), one that
 * starts later, one that has ended, one switched off, (v7) a live % coupon
 * with a cap and a total usage limit, and (v8) one limited to some products / SKUs.
 */
const COUPON_SEEDS: Omit<Coupon, "id" | "createdAt" | "updatedAt">[] = [
  ...AVAILABLE_COUPONS.map((c): Omit<Coupon, "id" | "createdAt" | "updatedAt"> => ({
    code: c.code,
    discountType: "baht",
    discount: c.discount,
    minSpend: c.minSpend,
    perCustomerLimit: 1,
    showOnHome: true,
    showAtCheckout: true,
    startDate: "2026-09-01",
    startTime: "00:00",
    endDate: c.expiresAt.slice(0, 10),
    endTime: "23:59",
    status: "active",
  })),
  { code: "CHARMISS80", discountType: "baht", discount: 80, minSpend: 800, showOnHome: false, showAtCheckout: false, startDate: "2026-09-01", startTime: "00:00", endDate: "2026-12-31", endTime: "23:59", status: "active" },
  { code: "NEWYEAR150", discountType: "baht", discount: 150, minSpend: 1500, showOnHome: true, showAtCheckout: true, startDate: "2026-12-25", startTime: "00:00", endDate: "2027-01-05", endTime: "23:59", status: "active" },
  { code: "FLASH50", discountType: "baht", discount: 50, showOnHome: false, showAtCheckout: false, startDate: "2026-08-15", startTime: "00:00", endDate: "2026-08-31", endTime: "23:59", status: "active" },
  { code: "OLDPROMO", discountType: "baht", discount: 30, showOnHome: false, showAtCheckout: false, startDate: "2026-08-01", startTime: "00:00", endDate: "2026-12-31", endTime: "23:59", status: "disabled" },
  { code: "BEAUTY10", discountType: "percent", discount: 10, maxDiscount: 200, minSpend: 500, usageLimit: 300, perCustomerLimit: 2, showOnHome: true, showAtCheckout: true, startDate: "2026-10-01", startTime: "00:00", endDate: "2026-12-31", endTime: "23:59", status: "active" },
  // v8: limited to some products / SKUs (two lip serum shades, every shade of a lip gloss).
  { code: "LIPLOVE15", discountType: "percent", discount: 15, maxDiscount: 100, minSpend: 300, perCustomerLimit: 1, productScope: [{ productId: "best-1", variantIds: ["lip-tint-01", "lip-tint-02"] }, { productId: "best-9", variantIds: [] }], showOnHome: true, showAtCheckout: true, startDate: "2026-10-01", startTime: "00:00", endDate: "2026-12-31", endTime: "23:59", status: "active" },
];

const TODAY_LABEL = "17 ก.ย. 2569";
/**
 * Seed ids are their position (`promo-001`, `coupon-002`, ...), stable across
 * every call/request, so server and client renders agree and the store's
 * seed migration can tell seed records (< 1000) apart from Admin-created
 * ones (`adminMarketingStore` numbers those from 1000 up).
 */
const seedId = (prefix: string, i: number) => `${prefix}-${String(i + 1).padStart(3, "0")}`;

export function buildMockPromotions(): Promotion[] {
  return PROMOTION_SEEDS.map((seed, i) => ({ ...seed, id: seedId("promo", i), createdAt: TODAY_LABEL, updatedAt: TODAY_LABEL }));
}
export function buildMockCoupons(): Coupon[] {
  return COUPON_SEEDS.map((seed, i) => ({ ...seed, id: seedId("coupon", i), createdAt: TODAY_LABEL, updatedAt: TODAY_LABEL }));
}

// ---------------------------------------------------------------------------
// Draft-first rule: what a saved แบบร่าง still lacks before it can be
// published from a list / detail page without opening the form (same
// required fields as the form's full check). Empty = ready.
// ---------------------------------------------------------------------------

export function promotionPublishProblems(p: Promotion): string[] {
  const missing: string[] = [];
  if (!p.name.trim()) missing.push("ชื่อโปรโมชั่น");
  if (p.type === "gift_with_purchase") {
    const tiers = promotionGiftTiers(p);
    if (tiers.length === 0 || tiers.some((t) => !(t.threshold > 0))) missing.push("เงื่อนไขซื้อครบ");
    if (tiers.length === 0 || tiers.some((t) => !t.giftProductId)) missing.push("สินค้าของแถม");
  }
  if (p.type === "percent_off" && !(p.discountPercent && p.discountPercent >= 1 && p.discountPercent <= 100)) missing.push("ส่วนลด (%)");
  if (p.type === "baht_off" && !(p.discountAmount && p.discountAmount > 0)) missing.push("ส่วนลด (บาท)");
  if (p.type === "bundle") {
    if ((p.bundleItems?.length ?? 0) < 2) missing.push("สินค้าในเซ็ต");
    if (!(p.bundlePrice && p.bundlePrice > 0)) missing.push("ราคาเซ็ต");
  }
  if (p.type === "buy_x_get_y") {
    if (!p.buyItems?.length) missing.push("สินค้าที่ต้องซื้อ");
    if (!p.getItems?.length) missing.push("สินค้าที่แถม");
  }
  if (!p.startDate) missing.push("วันเริ่ม");
  if (!p.endDate) missing.push("วันสิ้นสุด");
  return missing;
}

export function couponPublishProblems(c: Coupon): string[] {
  const missing: string[] = [];
  if (!c.code.trim()) missing.push("โค้ดคูปอง");
  const okDiscount = c.discountType === "percent" ? Number.isInteger(c.discount) && c.discount >= 1 && c.discount <= 100 : Number.isInteger(c.discount) && c.discount > 0;
  if (!okDiscount) missing.push("ส่วนลด");
  // ทั้งร้าน is sent as unset; a set but empty list means "เฉพาะสินค้าที่เลือก" with nothing picked.
  if (c.productScope !== undefined && c.productScope.length === 0) missing.push("สินค้าที่ร่วมรายการ");
  if (!c.startDate) missing.push("วันเริ่ม");
  if (!c.endDate) missing.push("วันสิ้นสุด");
  return missing;
}

/**
 * The storefront promo badge text: the admin's own `badgeLabel`, else a short
 * label from the conditions ("ส่งฟรี", "ซื้อครบ ฿590 รับของแถม").
 */
export function promotionBadgeLabel(p: Pick<Promotion, "type" | "badgeLabel" | "minSpend" | "conditionType" | "tiers" | "giftProductId" | "giftQty">): string {
  if (p.badgeLabel?.trim()) return p.badgeLabel.trim();
  const condition = promotionCondition(p);
  if (p.type === "free_shipping") return p.minSpend ? `ส่งฟรีเมื่อซื้อครบ ${formatPromotionThreshold(condition, p.minSpend)}` : "ส่งฟรี";
  if (p.type === "gift_with_purchase") {
    const first = promotionGiftTiers(p)[0];
    return first ? `ซื้อครบ ${formatPromotionThreshold(condition, first.threshold)} รับของแถม` : "รับของแถม";
  }
  return PROMOTION_TYPE_META[p.type].label;
}
