import type { AdminProduct } from "./adminProductStore";
import { getStockStatus } from "./adminProductStore";
import { formatTHB } from "~/components/shared/PriceDisplay";

/**
 * Global UI Correction — Final Overrides #1: every money figure in Admin
 * must always show 2 decimal places, no exceptions (this overrides the
 * previous whole-baht-summary convention this function used to apply).
 * Delegates to `formatTHB` (shared/PriceDisplay) — the one Global Price
 * Formatting Utility already established for the customer frontend — rather
 * than a second, Admin-only formatting implementation. Every Admin call
 * site already imports `formatAdminCurrency` from here, so this one change
 * propagates the 2-decimal rule everywhere at once.
 */
export function formatAdminCurrency(value: number): string {
  return formatTHB(value);
}

export type DashboardPeriodKey = "today" | "7d" | "30d" | "month" | "custom";

export const DASHBOARD_PERIOD_OPTIONS: { key: DashboardPeriodKey; label: string }[] = [
  { key: "today", label: "วันนี้" },
  { key: "7d", label: "7 วันที่ผ่านมา" },
  { key: "30d", label: "30 วันที่ผ่านมา" },
  { key: "month", label: "เดือนนี้" },
  { key: "custom", label: "กำหนดช่วงเวลา" },
];

export type DashboardKpis = {
  revenue: { value: number; changePercent: number };
  orders: { value: number; changePercent: number };
  aov: { value: number; changePercent: number };
  customers: { value: number; changePercent: number };
};

export type SalesTrendPoint = { label: string; revenue: number };

export type DashboardPeriodData = {
  label: string;
  kpis: DashboardKpis;
  salesTrend: SalesTrendPoint[];
};

/**
 * Everything the date-range selector (PART 22) actually swaps: the 4 KPI
 * cards and the Sales Trend chart. Every other Dashboard section (Order
 * Overview, Best Sellers, Low Stock, Recent Orders) is a current-state
 * snapshot rather than a time-series, so it intentionally doesn't re-slice
 * with the period the way real revenue/orders data would.
 *
 * "custom" (กำหนดช่วงเวลา) reuses the 30-day shape with its own label —
 * there's no real date picker/analytics backend to compute a true custom
 * range against, so this stands in for "whatever range the admin just
 * picked" the same way the rest of this prototype mocks a result instead of
 * computing one.
 */
export const DASHBOARD_PERIODS: Record<DashboardPeriodKey, DashboardPeriodData> = {
  today: {
    label: "วันนี้",
    kpis: {
      revenue: { value: 18420, changePercent: 6.4 },
      orders: { value: 27, changePercent: 4.1 },
      aov: { value: 682, changePercent: 2.2 },
      customers: { value: 21, changePercent: -3.5 },
    },
    salesTrend: [
      { label: "06:00", revenue: 1200 },
      { label: "09:00", revenue: 3400 },
      { label: "12:00", revenue: 5100 },
      { label: "15:00", revenue: 3900 },
      { label: "18:00", revenue: 6300 },
      { label: "21:00", revenue: 4300 },
    ],
  },
  "7d": {
    label: "7 วันที่ผ่านมา",
    kpis: {
      revenue: { value: 128450, changePercent: 12.5 },
      orders: { value: 328, changePercent: 8.2 },
      aov: { value: 392, changePercent: -1.3 },
      customers: { value: 1248, changePercent: 5.1 },
    },
    salesTrend: [
      { label: "จ", revenue: 14200 },
      { label: "อ", revenue: 16800 },
      { label: "พ", revenue: 15100 },
      { label: "พฤ", revenue: 19600 },
      { label: "ศ", revenue: 24300 },
      { label: "ส", revenue: 21400 },
      { label: "อา", revenue: 17050 },
    ],
  },
  "30d": {
    label: "30 วันที่ผ่านมา",
    kpis: {
      revenue: { value: 512300, changePercent: 9.8 },
      orders: { value: 1284, changePercent: 6.7 },
      aov: { value: 399, changePercent: -0.6 },
      customers: { value: 3860, changePercent: 11.4 },
    },
    salesTrend: [
      { label: "1 ก.ย.", revenue: 78400 },
      { label: "6 ก.ย.", revenue: 92100 },
      { label: "11 ก.ย.", revenue: 84300 },
      { label: "16 ก.ย.", revenue: 101200 },
      { label: "21 ก.ย.", revenue: 96500 },
      { label: "26 ก.ย.", revenue: 59800 },
    ],
  },
  month: {
    label: "เดือนนี้",
    kpis: {
      revenue: { value: 298100, changePercent: 15.2 },
      orders: { value: 742, changePercent: 10.9 },
      aov: { value: 402, changePercent: 3.7 },
      customers: { value: 2210, changePercent: 7.6 },
    },
    salesTrend: [
      { label: "1 ก.ย.", revenue: 41200 },
      { label: "4 ก.ย.", revenue: 52800 },
      { label: "7 ก.ย.", revenue: 47100 },
      { label: "10 ก.ย.", revenue: 61900 },
      { label: "13 ก.ย.", revenue: 58400 },
      { label: "17 ก.ย.", revenue: 36700 },
    ],
  },
  custom: {
    label: "ช่วงเวลาที่กำหนด",
    kpis: {
      revenue: { value: 512300, changePercent: 9.8 },
      orders: { value: 1284, changePercent: 6.7 },
      aov: { value: 399, changePercent: -0.6 },
      customers: { value: 3860, changePercent: 11.4 },
    },
    salesTrend: [
      { label: "1 ก.ย.", revenue: 78400 },
      { label: "6 ก.ย.", revenue: 92100 },
      { label: "11 ก.ย.", revenue: 84300 },
      { label: "16 ก.ย.", revenue: 101200 },
      { label: "21 ก.ย.", revenue: 96500 },
      { label: "26 ก.ย.", revenue: 59800 },
    ],
  },
};

export type BestSellerEntry = { product: AdminProduct; sku: string; sold: number; revenue: number };

/**
 * Architecture Cleanup & Source of Truth — takes the live `AdminProduct[]`
 * from the caller (`useAdminProducts().products()`) instead of a static
 * `products.ts` import, so an Admin edit is reflected here immediately
 * instead of the Dashboard silently disagreeing with Product Management.
 * Top 5 by `soldCount`, real catalog data, not invented products; each
 * product's own `sku` (Product Management's own field) is shown, not a
 * second, differently-formatted mock SKU.
 */
export function getBestSellingProducts(products: AdminProduct[]): BestSellerEntry[] {
  return [...products]
    .filter((p) => typeof p.soldCount === "number")
    .sort((a, b) => (b.soldCount ?? 0) - (a.soldCount ?? 0))
    .slice(0, 5)
    .map((product) => ({
      product,
      sku: product.sku,
      sold: product.soldCount ?? 0,
      revenue: (product.soldCount ?? 0) * product.price,
    }));
}

export type LowStockEntry = { product: AdminProduct; sku: string; stockLeft: number; status: "low" | "out" };

/**
 * Same live catalog as `getBestSellingProducts`, and the same "low/out of
 * stock" definition Product Management itself uses (`getStockStatus`,
 * `product.lowStockThreshold` — no separate, hardcoded threshold constant
 * that could quietly disagree with what Product Management shows).
 */
export function getLowStockProducts(products: AdminProduct[]): LowStockEntry[] {
  return [...products]
    .filter((p): p is AdminProduct & { stockLeft: number } => typeof p.stockLeft === "number" && getStockStatus(p) !== "in_stock")
    .sort((a, b) => a.stockLeft - b.stockLeft)
    .slice(0, 5)
    .map((product) => ({
      product,
      sku: product.sku,
      stockLeft: product.stockLeft,
      status: product.stockLeft === 0 ? "out" : "low",
    }));
}
