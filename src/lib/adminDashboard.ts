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

/** Inclusive Bangkok calendar dates, ISO `YYYY-MM-DD` — what "กำหนดช่วงเวลา" picks. */
export type DateRange = { from: string; to: string };

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
