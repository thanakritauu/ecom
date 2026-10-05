import type { StatusTone } from "~/components/admin/StatusBadge";
import { formatAdminCurrency } from "./adminDashboard";
import { AVAILABLE_COUPONS } from "./cartSelectors";

/**
 * Phase 07 — Marketing Management. One status model shared by all four
 * entities (Promotion/Coupon/Flash Sale/Bundle) — exactly the 5 values the
 * spec lists (#5/#19), nothing invented on top. Unlike Order Management's
 * status, this one is a plain stored field an admin sets directly (same
 * shape as `AdminProductStatus`), not something derived by comparing dates
 * against "now" — a real scheduler/engine that flips `scheduled → active →
 * expired` on its own is exactly the "Real Promotion Engine" #41 forbids.
 */
export type MarketingStatus = "draft" | "scheduled" | "active" | "expired" | "disabled";

export const MARKETING_STATUS_META: Record<MarketingStatus, { label: string; tone: StatusTone }> = {
  draft: { label: "แบบร่าง", tone: "neutral" },
  scheduled: { label: "ตั้งเวลาไว้", tone: "info" },
  active: { label: "กำลังใช้งาน", tone: "success" },
  expired: { label: "หมดอายุ", tone: "warning" },
  disabled: { label: "ปิดใช้งาน", tone: "neutral" },
};

const THAI_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

/** `date` is a plain `YYYY-MM-DD` (what `<input type="date">` gives/takes) — this is only the *display* form, matching the "17 ก.ย. 2569" style already used everywhere else in Admin. */
export function formatMarketingDate(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return date;
  return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
}

export function formatMarketingDateTime(date: string, time: string): string {
  return `${formatMarketingDate(date)} ${time}`;
}

/** #16 — the one validation rule Create/Edit must enforce for every entity that has a date range. */
export function isValidDateRange(startDate: string, startTime: string, endDate: string, endTime: string): boolean {
  if (!startDate || !endDate) return true;
  const start = new Date(`${startDate}T${startTime || "00:00"}`).getTime();
  const end = new Date(`${endDate}T${endTime || "00:00"}`).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return true;
  return end > start;
}

/** "Today" anchor matching the rest of Admin's mock timeline (Phase 02/04's own `TODAY_DAY = 17`, September 2026). */
export const MARKETING_TODAY = "2026-09-17";

/** Storefront-style short date ("11 ก.ย.") — the exact form the Home coupon tickets / Checkout coupon list print their `expiresLabel` in (no year). */
export function formatMarketingDateShort(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return date;
  return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]}`;
}

// ---------------------------------------------------------------------------
// Promotions
// ---------------------------------------------------------------------------

export type PromotionType = "percentage" | "fixed" | "free_shipping" | "buy_x_get_y" | "gift_with_purchase";

export const PROMOTION_TYPE_META: Record<PromotionType, { label: string }> = {
  percentage: { label: "ลดตามเปอร์เซ็นต์" },
  fixed: { label: "ลดเป็นจำนวนเงิน" },
  free_shipping: { label: "ส่งฟรี" },
  buy_x_get_y: { label: "ซื้อ X แถม Y" },
  gift_with_purchase: { label: "ซื้อครบรับของแถม" },
};

/** Types whose condition is a cart subtotal ("ซื้อครบ ฿X") rather than a per-product discount. */
export const PROMOTION_TYPES_WITH_MIN_SPEND: readonly PromotionType[] = ["free_shipping", "gift_with_purchase"];

export type Promotion = {
  id: string;
  name: string;
  description?: string;
  type: PromotionType;
  discountValue?: number;
  buyQty?: number;
  getQty?: number;
  /** `free_shipping` / `gift_with_purchase` — cart subtotal that unlocks it (storefront `FREE_SHIPPING_THRESHOLD` / `GIFT_PROMOTION.threshold`). */
  minSpend?: number;
  /** `gift_with_purchase` only — the catalog product given free (storefront `GIFT_PROMOTION.productId`). */
  giftProductId?: string;
  giftQty?: number;
  /**
   * "แสดงในตะกร้า" — whether the Cart Drawer / Cart Page leads with this
   * promo's progress banner. The storefront shows one banner at a time: the
   * gift promo (`GiftPromotionBanner`) — free shipping still applies but its
   * banner isn't shown. Optional so records saved before this field read as off.
   */
  showInCart?: boolean;
  /** Empty = applies to every product ("ทุกสินค้า"). */
  productIds: string[];
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  status: MarketingStatus;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
};

/**
 * One-line summary used by the list, Quick View, detail page and form
 * preview. `giftName` is the gift product's name (callers look it up in the
 * admin Product store) — this module stays free of store access.
 */
export function formatPromotionDiscount(
  p: Pick<Promotion, "type" | "discountValue" | "buyQty" | "getQty" | "minSpend" | "giftQty">,
  giftName?: string,
): string {
  switch (p.type) {
    case "percentage":
      return `ลด ${p.discountValue ?? 0}%`;
    case "fixed":
      return `ลด ${formatAdminCurrency(p.discountValue ?? 0)}`;
    case "free_shipping":
      return p.minSpend ? `ส่งฟรีเมื่อซื้อครบ ${formatAdminCurrency(p.minSpend)}` : "ส่งฟรี";
    case "buy_x_get_y":
      return `ซื้อ ${p.buyQty ?? 1} แถม ${p.getQty ?? 1}`;
    case "gift_with_purchase": {
      const qty = (p.giftQty ?? 1) > 1 ? ` x${p.giftQty}` : "";
      return `ซื้อครบ ${formatAdminCurrency(p.minSpend ?? 0)} รับฟรี ${giftName ?? "ของแถม"}${qty}`;
    }
  }
}

/*
 * Seeds mirror what the storefront actually runs today (cartSelectors.ts):
 * the ฿590 gift (`GIFT_PROMOTION` → feature-9, the setting spray, x1) is the
 * banner shown in the cart; free shipping at ฿990 (`FREE_SHIPPING_THRESHOLD`,
 * same copy as the Notification Bar) still applies but isn't shown there.
 * The rest are admin-only examples covering the other types/statuses.
 */
const PROMOTION_SEEDS: Omit<Promotion, "id" | "createdAt" | "updatedAt">[] = [
  { name: "ซื้อครบ ฿590 รับของแถมฟรี", description: "ซื้อครบ ฿590 รับฟรี Charmiss เพอร์เฟค ฮาร์ท แมตต์ ฟินิช เซ็ตติ้ง สเปรย์ 50มล. 1 ชิ้นทันที — แสดงเป็นแถบของแถมในตะกร้าและหน้าตะกร้าสินค้า", type: "gift_with_purchase", minSpend: 590, giftProductId: "feature-9", giftQty: 1, showInCart: true, productIds: [], startDate: "2026-09-01", startTime: "00:00", endDate: "2026-10-31", endTime: "23:59", status: "active", usageCount: 1342 },
  { name: "ส่งฟรีทั่วไทย", description: "จัดส่งฟรีทั่วประเทศ เมื่อซื้อครบ 990.- (ข้อความเดียวกับแถบประกาศด้านบนเว็บไซต์)", type: "free_shipping", minSpend: 990, showInCart: false, productIds: [], startDate: "2026-09-01", startTime: "00:00", endDate: "2026-12-31", endTime: "23:59", status: "active", usageCount: 890 },
  { name: "ลดกระหน่ำต้อนรับเดือนใหม่", description: "ลด 20% ทุกหมวดหมู่ สูงสุด 300 บาท", type: "percentage", discountValue: 20, productIds: [], startDate: "2026-08-01", startTime: "00:00", endDate: "2026-08-31", endTime: "23:59", status: "expired", usageCount: 482 },
  { name: "ซื้อ 2 แถม 1 คุชชั่น", description: "ซื้อคุชชั่น 2 ชิ้น แถมฟรี 1 ชิ้น", type: "buy_x_get_y", buyQty: 2, getQty: 1, productIds: ["feature-1", "feature-2"], startDate: "2026-09-25", startTime: "00:00", endDate: "2026-10-05", endTime: "23:59", status: "scheduled", usageCount: 0 },
  { name: "โปรทดลองระบบ", description: "อยู่ระหว่างร่าง ยังไม่เผยแพร่", type: "percentage", discountValue: 10, productIds: [], startDate: "2026-10-01", startTime: "00:00", endDate: "2026-10-15", endTime: "23:59", status: "draft", usageCount: 0 },
  { name: "ลดพิเศษคุชชั่นขายดี", description: "ลด 50 บาท คุชชั่นขายดีที่คัดสรร", type: "fixed", discountValue: 50, productIds: ["best-2", "best-5"], startDate: "2026-09-05", startTime: "00:00", endDate: "2026-09-15", endTime: "23:59", status: "disabled", usageCount: 63 },
];

// ---------------------------------------------------------------------------
// Coupons
// ---------------------------------------------------------------------------

export type Coupon = {
  id: string;
  code: string;
  description?: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minSpend?: number;
  maxDiscount?: number;
  usageLimit?: number;
  perCustomerLimit?: number;
  usageCount: number;
  /** "แสดงในหน้าแรก" — shown as a collectable ticket in Home's "คูปองส่วนลด" section. Optional: older saved records read as off. */
  showOnHome?: boolean;
  /** "แสดงในหน้าชำระเงิน" — listed in Checkout's coupon picker (and accepted when typed there). */
  showAtCheckout?: boolean;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  status: MarketingStatus;
  createdAt: string;
  updatedAt: string;
};

/** "ลด ฿100" / "ลด 15%" — whole baht, exactly the storefront coupon label (`AVAILABLE_COUPONS` `label`). */
export function formatCouponDiscount(c: Pick<Coupon, "discountType" | "discountValue">): string {
  return c.discountType === "percentage" ? `ลด ${c.discountValue}%` : `ลด ฿${c.discountValue.toLocaleString("th-TH")}`;
}

/** Where a coupon appears on the storefront — one short label for the list/Quick View ("หน้าแรก · ชำระเงิน"). */
export function formatCouponPlacement(c: Pick<Coupon, "showOnHome" | "showAtCheckout">): string {
  const places = [c.showOnHome && "หน้าแรก", c.showAtCheckout && "ชำระเงิน"].filter(Boolean);
  return places.length > 0 ? places.join(" · ") : "ไม่แสดง";
}

/*
 * The three active codes are the storefront's `AVAILABLE_COUPONS`
 * (cartSelectors.ts) 1:1 — fixed amount, same min spend, end date = its
 * `expiresAt` — and, like the storefront, all three are Home tickets and
 * Checkout picker coupons. Below them, admin-only examples for the other
 * statuses (codes that don't clash with the storefront's).
 */
const STOREFRONT_COUPON_USAGE: Record<string, Pick<Coupon, "usageLimit" | "perCustomerLimit" | "usageCount">> = {
  SAVE100: { usageLimit: 1000, perCustomerLimit: 1, usageCount: 214 },
  SAVE50: { usageLimit: 1000, perCustomerLimit: 1, usageCount: 673 },
  SAVE20: { usageLimit: 2000, perCustomerLimit: 2, usageCount: 1058 },
};

const COUPON_SEEDS: Omit<Coupon, "id" | "createdAt" | "updatedAt">[] = [
  ...AVAILABLE_COUPONS.map((c): Omit<Coupon, "id" | "createdAt" | "updatedAt"> => ({
    code: c.code,
    description: `${c.label} เมื่อซื้อขั้นต่ำ ฿${c.minSpend.toLocaleString("th-TH")}`,
    discountType: "fixed",
    discountValue: c.discount,
    minSpend: c.minSpend,
    ...STOREFRONT_COUPON_USAGE[c.code],
    showOnHome: true,
    showAtCheckout: true,
    startDate: "2026-09-01",
    startTime: "00:00",
    endDate: c.expiresAt.slice(0, 10),
    endTime: "23:59",
    status: "active",
  })),
  { code: "VIP15", description: "สิทธิพิเศษลูกค้า VIP ลด 15%", discountType: "percentage", discountValue: 15, minSpend: 1000, maxDiscount: 500, usageLimit: 100, perCustomerLimit: 3, usageCount: 0, showOnHome: false, showAtCheckout: false, startDate: "2026-09-25", startTime: "00:00", endDate: "2026-10-10", endTime: "23:59", status: "scheduled" },
  { code: "FLASH50", description: "ลด 50 บาท ไม่มีขั้นต่ำ", discountType: "fixed", discountValue: 50, usageLimit: 300, perCustomerLimit: 1, usageCount: 300, showOnHome: false, showAtCheckout: false, startDate: "2026-08-15", startTime: "00:00", endDate: "2026-08-31", endTime: "23:59", status: "expired" },
  { code: "DRAFT2026", description: "คูปองร่างสำหรับแคมเปญถัดไป", discountType: "fixed", discountValue: 30, minSpend: 300, usageLimit: 200, perCustomerLimit: 1, usageCount: 0, showOnHome: false, showAtCheckout: false, startDate: "2026-10-15", startTime: "00:00", endDate: "2026-10-31", endTime: "23:59", status: "draft" },
  { code: "OLDPROMO", description: "โค้ดเก่าที่ปิดใช้งานแล้ว", discountType: "fixed", discountValue: 30, usageLimit: 500, perCustomerLimit: 1, usageCount: 88, showOnHome: false, showAtCheckout: false, startDate: "2026-08-01", startTime: "00:00", endDate: "2026-12-31", endTime: "23:59", status: "disabled" },
];

// ---------------------------------------------------------------------------
// Flash Sale
// ---------------------------------------------------------------------------

/**
 * One product in a Flash Sale — what the storefront's Flash Sale section card
 * shows: `salePrice` is the price on the card (never above the product's own
 * storefront price), `saleLimit` is the stock reserved for the sale (the
 * card's stock bar total, `stockTotal`), `soldCount` how much of it is gone
 * (the bar shows `saleLimit - soldCount` left; 0 left = "สินค้าหมด").
 */
export type FlashSaleItem = { productId: string; salePrice: number; saleLimit?: number; soldCount: number };

/**
 * The struck-through "before" price on the storefront's Flash Sale card is
 * the product's `compareAtPrice` (falls back to its `price`), and the
 * discount % is taken against it — same as the card's own badge.
 */
export function flashSaleOriginalPrice(product: { price: number; compareAtPrice?: number }): number {
  return product.compareAtPrice ?? product.price;
}

export function flashSaleDiscountPercent(product: { price: number; compareAtPrice?: number }, salePrice: number): number {
  const original = flashSaleOriginalPrice(product);
  return original > 0 ? Math.round((1 - salePrice / original) * 100) : 0;
}

export type FlashSale = {
  id: string;
  name: string;
  items: FlashSaleItem[];
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  status: MarketingStatus;
  createdAt: string;
  updatedAt: string;
};

/*
 * The active seed is the storefront's Flash Sale rail (flash-1…flash-12,
 * products.ts) at the exact prices the cards show (watsonsCatalog.ts), each
 * with a 30-piece allocation and the same stock left as the cards (flash-2 /
 * flash-10 sold out). Its end time is the countdown's target — the
 * storefront counts down to the end of today's sale.
 */
const FLASH_RAIL_PRICES = [129, 199, 119, 199, 69, 99, 199, 199, 89, 89, 59, 59];
const FLASH_RAIL_STOCK_LEFT = [20, 0, 10, 10, 20, 20, 20, 20, 20, 0, 10, 10];

const FLASH_SALE_SEEDS: Omit<FlashSale, "id" | "createdAt" | "updatedAt">[] = [
  // Daily round 00:00–23:59 — the storefront countdown targets the next
  // Bangkok midnight (`flashSaleRoundEndsAt` in products.ts).
  {
    name: "Flash Sale วันนี้",
    items: FLASH_RAIL_PRICES.map((salePrice, i) => ({ productId: `flash-${i + 1}`, salePrice, saleLimit: 30, soldCount: 30 - FLASH_RAIL_STOCK_LEFT[i] })),
    startDate: "2026-09-17",
    startTime: "00:00",
    endDate: "2026-09-17",
    endTime: "23:59",
    status: "active",
  },
  { name: "9.9 มหกรรมลดราคา", items: [{ productId: "best-1", salePrice: 129, saleLimit: 100, soldCount: 84 }, { productId: "best-3", salePrice: 109, saleLimit: 80, soldCount: 80 }, { productId: "new-2", salePrice: 189, saleLimit: 40, soldCount: 12 }], startDate: "2026-09-09", startTime: "00:00", endDate: "2026-09-09", endTime: "23:59", status: "expired" },
  { name: "Flash Sale วันหยุดยาว", items: [{ productId: "trend-1", salePrice: 129, saleLimit: 60, soldCount: 0 }], startDate: "2026-09-25", startTime: "00:00", endDate: "2026-09-27", endTime: "23:59", status: "scheduled" },
  { name: "แคมเปญร่างทดสอบราคา", items: [{ productId: "feature-1", salePrice: 299, saleLimit: 20, soldCount: 0 }], startDate: "2026-10-01", startTime: "00:00", endDate: "2026-10-02", endTime: "23:59", status: "draft" },
];

// ---------------------------------------------------------------------------
// Bundle / Set
// ---------------------------------------------------------------------------

export type BundleItem = { productId: string; qty: number };

export type Bundle = {
  id: string;
  name: string;
  description?: string;
  items: BundleItem[];
  bundlePrice: number;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  status: MarketingStatus;
  createdAt: string;
  updatedAt: string;
};

/* Bundle prices sit below the sum of the items' storefront prices (watsonsCatalog.ts), noted per seed. */
const BUNDLE_SEEDS: Omit<Bundle, "id" | "createdAt" | "updatedAt">[] = [
  // ลิปเซรั่ม ฿149 + คุชชั่น ฿349 + บลัช ฿129 = ฿627
  { name: "เซ็ตแต่งหน้าครบชุด", description: "ลิป + คุชชั่น + บลัชออน ในราคาสุดคุ้ม", items: [{ productId: "best-1", qty: 1 }, { productId: "feature-1", qty: 1 }, { productId: "best-3", qty: 1 }], bundlePrice: 529, startDate: "2026-09-01", startTime: "00:00", endDate: "2026-09-30", endTime: "23:59", status: "active" },
  // ฿149 + ฿199 + ฿219 = ฿567
  { name: "เซ็ตลิปสุดคุ้ม 3 ชิ้น", description: "ลิปยอดนิยม 3 ชิ้น", items: [{ productId: "best-1", qty: 1 }, { productId: "best-4", qty: 1 }, { productId: "best-6", qty: 1 }], bundlePrice: 459, startDate: "2026-08-01", startTime: "00:00", endDate: "2026-08-31", endTime: "23:59", status: "expired" },
  // ฿349 + ฿259 = ฿608
  { name: "เซ็ตเทศกาลปลายปี", description: "ชุดของขวัญคุชชั่นคู่ส่งท้ายปี", items: [{ productId: "feature-1", qty: 1 }, { productId: "feature-2", qty: 1 }], bundlePrice: 499, startDate: "2026-09-25", startTime: "00:00", endDate: "2026-10-15", endTime: "23:59", status: "scheduled" },
  // ฿219 + ฿199 = ฿418
  { name: "เซ็ตร่างรอตรวจสอบ", description: "เซ็ตทดลองยังไม่เผยแพร่", items: [{ productId: "new-2", qty: 1 }, { productId: "new-4", qty: 1 }], bundlePrice: 349, startDate: "2026-10-01", startTime: "00:00", endDate: "2026-10-20", endTime: "23:59", status: "draft" },
];

const TODAY_LABEL = "17 ก.ย. 2569";
/**
 * Seed ids are their position (`promo-001`, `coupon-002`, …) — stable across
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
export function buildMockFlashSales(): FlashSale[] {
  return FLASH_SALE_SEEDS.map((seed, i) => ({ ...seed, id: seedId("flash", i), createdAt: TODAY_LABEL, updatedAt: TODAY_LABEL }));
}
export function buildMockBundles(): Bundle[] {
  return BUNDLE_SEEDS.map((seed, i) => ({ ...seed, id: seedId("bundle", i), createdAt: TODAY_LABEL, updatedAt: TODAY_LABEL }));
}
