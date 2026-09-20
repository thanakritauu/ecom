import type { StatusTone } from "~/components/admin/StatusBadge";
import { formatAdminCurrency } from "./adminDashboard";

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

// ---------------------------------------------------------------------------
// Promotions
// ---------------------------------------------------------------------------

export type PromotionType = "percentage" | "fixed" | "free_shipping" | "buy_x_get_y";

export const PROMOTION_TYPE_META: Record<PromotionType, { label: string }> = {
  percentage: { label: "ลดตามเปอร์เซ็นต์" },
  fixed: { label: "ลดเป็นจำนวนเงิน" },
  free_shipping: { label: "ส่งฟรี" },
  buy_x_get_y: { label: "ซื้อ X แถม Y" },
};

export type Promotion = {
  id: string;
  name: string;
  description?: string;
  type: PromotionType;
  discountValue?: number;
  buyQty?: number;
  getQty?: number;
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

export function formatPromotionDiscount(p: Pick<Promotion, "type" | "discountValue" | "buyQty" | "getQty">): string {
  switch (p.type) {
    case "percentage":
      return `ลด ${p.discountValue ?? 0}%`;
    case "fixed":
      return `ลด ${formatAdminCurrency(p.discountValue ?? 0)}`;
    case "free_shipping":
      return "ส่งฟรี";
    case "buy_x_get_y":
      return `ซื้อ ${p.buyQty ?? 1} แถม ${p.getQty ?? 1}`;
  }
}

const PROMOTION_SEEDS: Omit<Promotion, "id" | "createdAt" | "updatedAt">[] = [
  { name: "ลดกระหน่ำต้อนรับเดือนใหม่", description: "ลด 20% ทุกหมวดหมู่ สูงสุด 300 บาท", type: "percentage", discountValue: 20, productIds: [], startDate: "2026-09-01", startTime: "00:00", endDate: "2026-09-30", endTime: "23:59", status: "active", usageCount: 482 },
  { name: "ลิปทินท์ลดพิเศษ", description: "ลด 100 บาท เมื่อซื้อลิปทินท์", type: "fixed", discountValue: 100, productIds: ["best-1", "best-3", "trend-1"], startDate: "2026-09-10", startTime: "00:00", endDate: "2026-09-20", endTime: "23:59", status: "active", usageCount: 156 },
  { name: "ส่งฟรีทั่วไทย", description: "ส่งฟรีเมื่อสั่งซื้อครบ 500 บาท", type: "free_shipping", productIds: [], startDate: "2026-09-01", startTime: "00:00", endDate: "2026-10-31", endTime: "23:59", status: "active", usageCount: 890 },
  { name: "ซื้อ 2 แถม 1 คุชชั่น", description: "ซื้อคุชชั่น 2 ชิ้น แถมฟรี 1 ชิ้น", type: "buy_x_get_y", buyQty: 2, getQty: 1, productIds: ["feature-1", "feature-2"], startDate: "2026-09-25", startTime: "00:00", endDate: "2026-10-05", endTime: "23:59", status: "scheduled", usageCount: 0 },
  { name: "โปรต้อนรับปีใหม่ไทย", description: "ลด 15% สินค้าหมวดตา", type: "percentage", discountValue: 15, productIds: [], startDate: "2026-08-01", startTime: "00:00", endDate: "2026-08-31", endTime: "23:59", status: "expired", usageCount: 1204 },
  { name: "โปรทดลองระบบ", description: "อยู่ระหว่างร่าง ยังไม่เผยแพร่", type: "percentage", discountValue: 10, productIds: [], startDate: "2026-10-01", startTime: "00:00", endDate: "2026-10-15", endTime: "23:59", status: "draft", usageCount: 0 },
  { name: "ลดหนักสินค้าขายดี", description: "ลด 250 บาท สินค้าขายดีที่คัดสรร", type: "fixed", discountValue: 250, productIds: ["best-5", "best-8"], startDate: "2026-09-05", startTime: "00:00", endDate: "2026-09-15", endTime: "23:59", status: "disabled", usageCount: 63 },
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
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  status: MarketingStatus;
  createdAt: string;
  updatedAt: string;
};

export function formatCouponDiscount(c: Pick<Coupon, "discountType" | "discountValue">): string {
  return c.discountType === "percentage" ? `ลด ${c.discountValue}%` : `ลด ${formatAdminCurrency(c.discountValue)}`;
}

const COUPON_SEEDS: Omit<Coupon, "id" | "createdAt" | "updatedAt">[] = [
  { code: "WELCOME100", description: "ส่วนลดต้อนรับลูกค้าใหม่", discountType: "fixed", discountValue: 100, minSpend: 500, usageLimit: 500, perCustomerLimit: 1, usageCount: 214, startDate: "2026-09-01", startTime: "00:00", endDate: "2026-12-31", endTime: "23:59", status: "active" },
  { code: "SAVE20", description: "ลด 20% สูงสุด 200 บาท", discountType: "percentage", discountValue: 20, minSpend: 300, maxDiscount: 200, usageLimit: 1000, perCustomerLimit: 2, usageCount: 673, startDate: "2026-09-01", startTime: "00:00", endDate: "2026-09-30", endTime: "23:59", status: "active" },
  { code: "FLASH50", description: "ลด 50 บาท ไม่มีขั้นต่ำ", discountType: "fixed", discountValue: 50, usageLimit: 300, perCustomerLimit: 1, usageCount: 300, startDate: "2026-08-15", startTime: "00:00", endDate: "2026-08-31", endTime: "23:59", status: "expired" },
  { code: "VIP15", description: "สิทธิพิเศษลูกค้า VIP ลด 15%", discountType: "percentage", discountValue: 15, minSpend: 1000, maxDiscount: 500, usageLimit: 100, perCustomerLimit: 3, usageCount: 12, startDate: "2026-09-25", startTime: "00:00", endDate: "2026-10-10", endTime: "23:59", status: "scheduled" },
  { code: "DRAFT2026", description: "คูปองร่างสำหรับแคมเปญถัดไป", discountType: "percentage", discountValue: 10, usageLimit: 200, perCustomerLimit: 1, usageCount: 0, startDate: "2026-10-15", startTime: "00:00", endDate: "2026-10-31", endTime: "23:59", status: "draft" },
  { code: "OLDPROMO", description: "โค้ดเก่าที่ปิดใช้งานแล้ว", discountType: "fixed", discountValue: 30, usageLimit: 500, perCustomerLimit: 1, usageCount: 88, startDate: "2026-08-01", startTime: "00:00", endDate: "2026-12-31", endTime: "23:59", status: "disabled" },
];

// ---------------------------------------------------------------------------
// Flash Sale
// ---------------------------------------------------------------------------

export type FlashSaleItem = { productId: string; salePrice: number; saleLimit?: number; soldCount: number };

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

const FLASH_SALE_SEEDS: Omit<FlashSale, "id" | "createdAt" | "updatedAt">[] = [
  { name: "Flash Sale เที่ยงคืน", items: [{ productId: "flash-1", salePrice: 149, saleLimit: 50, soldCount: 37 }, { productId: "flash-2", salePrice: 199, saleLimit: 30, soldCount: 30 }], startDate: "2026-09-16", startTime: "20:00", endDate: "2026-09-17", endTime: "23:59", status: "active" },
  { name: "9.9 มหกรรมลดราคา", items: [{ productId: "best-1", salePrice: 259, saleLimit: 100, soldCount: 84 }, { productId: "best-3", salePrice: 179, saleLimit: 80, soldCount: 80 }, { productId: "new-2", salePrice: 299, saleLimit: 40, soldCount: 12 }], startDate: "2026-09-09", startTime: "00:00", endDate: "2026-09-09", endTime: "23:59", status: "expired" },
  { name: "Flash Sale วันหยุดยาว", items: [{ productId: "trend-1", salePrice: 219, saleLimit: 60, soldCount: 0 }], startDate: "2026-09-25", startTime: "00:00", endDate: "2026-09-27", endTime: "23:59", status: "scheduled" },
  { name: "แคมเปญร่างทดสอบราคา", items: [{ productId: "feature-1", salePrice: 890, saleLimit: 20, soldCount: 0 }], startDate: "2026-10-01", startTime: "00:00", endDate: "2026-10-02", endTime: "23:59", status: "draft" },
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

const BUNDLE_SEEDS: Omit<Bundle, "id" | "createdAt" | "updatedAt">[] = [
  { name: "เซ็ตแต่งหน้าครบชุด", description: "ลิปทินท์ + คุชชั่น + บลัชออน ในราคาสุดคุ้ม", items: [{ productId: "best-1", qty: 1 }, { productId: "feature-1", qty: 1 }, { productId: "best-5", qty: 1 }], bundlePrice: 899, startDate: "2026-09-01", startTime: "00:00", endDate: "2026-09-30", endTime: "23:59", status: "active" },
  { name: "เซ็ตลิปสุดคุ้ม 3 ชิ้น", description: "เลือกลิปทินท์ยอดนิยม 3 ชิ้น", items: [{ productId: "best-1", qty: 1 }, { productId: "best-3", qty: 1 }, { productId: "trend-1", qty: 1 }], bundlePrice: 499, startDate: "2026-08-01", startTime: "00:00", endDate: "2026-08-31", endTime: "23:59", status: "expired" },
  { name: "เซ็ตเทศกาลปลายปี", description: "ชุดของขวัญพิเศษส่งท้ายปี", items: [{ productId: "feature-1", qty: 1 }, { productId: "feature-2", qty: 1 }], bundlePrice: 1290, startDate: "2026-09-25", startTime: "00:00", endDate: "2026-10-15", endTime: "23:59", status: "scheduled" },
  { name: "เซ็ตร่างรอตรวจสอบ", description: "เซ็ตทดลองยังไม่เผยแพร่", items: [{ productId: "new-2", qty: 1 }, { productId: "new-4", qty: 1 }], bundlePrice: 399, startDate: "2026-10-01", startTime: "00:00", endDate: "2026-10-20", endTime: "23:59", status: "draft" },
];

const TODAY_LABEL = "17 ก.ย. 2569";
let nextMarketingId = 1;
const genId = (prefix: string) => `${prefix}-${String(nextMarketingId++).padStart(3, "0")}`;

export function buildMockPromotions(): Promotion[] {
  return PROMOTION_SEEDS.map((seed) => ({ ...seed, id: genId("promo"), createdAt: TODAY_LABEL, updatedAt: TODAY_LABEL }));
}
export function buildMockCoupons(): Coupon[] {
  return COUPON_SEEDS.map((seed) => ({ ...seed, id: genId("coupon"), createdAt: TODAY_LABEL, updatedAt: TODAY_LABEL }));
}
export function buildMockFlashSales(): FlashSale[] {
  return FLASH_SALE_SEEDS.map((seed) => ({ ...seed, id: genId("flash"), createdAt: TODAY_LABEL, updatedAt: TODAY_LABEL }));
}
export function buildMockBundles(): Bundle[] {
  return BUNDLE_SEEDS.map((seed) => ({ ...seed, id: genId("bundle"), createdAt: TODAY_LABEL, updatedAt: TODAY_LABEL }));
}
