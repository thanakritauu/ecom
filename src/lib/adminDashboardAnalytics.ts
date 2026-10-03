import type { AdminProduct } from "./adminProductStore";
import type { AdminCategory } from "./adminCategories";
import type { AdminBrand } from "./adminBrands";
import type { ProductCollection } from "./adminCollections";
import type { PromotionPage, PromotionPageProductRef } from "./adminContent";
import type { Campaign } from "./adminCampaigns";
import type { Coupon } from "./adminMarketing";
import type { AdminOrder, OrderStatus, PaymentStatus, FulfillmentStatus } from "./adminOrders";
import { ORDER_STATUS_META, PAYMENT_STATUS_META, FULFILLMENT_STATUS_META } from "./adminOrders";
import { productsInCategory, productsInBrand } from "./masterDataRelations";
import type { DashboardPeriodKey } from "./adminDashboard";

/**
 * CMS Backoffice Polish §12-16 — "advanced analytics" for the Admin
 * Dashboard, entirely derived from data the app already has (live Product/
 * Category/Brand/Collection/Promotion Page/Campaign/Coupon/Order stores) —
 * no invented backend, no per-render randomness (§13 explicitly forbids
 * values that jump on every refresh), everything here is a pure function of
 * the caller's current store snapshot.
 */

export type PerformanceEntry = { id: string; name: string; revenue: number; unitsSold: number; href: string };

const revenueOf = (products: AdminProduct[]) => products.reduce((sum, p) => sum + (p.soldCount ?? 0) * p.price, 0);
const unitsOf = (products: AdminProduct[]) => products.reduce((sum, p) => sum + (p.soldCount ?? 0), 0);

function resolveRefs(refs: PromotionPageProductRef[], products: AdminProduct[]): AdminProduct[] {
  const byId = new Map(products.map((p) => [p.id, p] as const));
  return refs.map((r) => byId.get(r.productId)).filter((p): p is AdminProduct => p !== undefined);
}

export function getCategoryPerformance(categories: AdminCategory[], products: AdminProduct[]): PerformanceEntry[] {
  return categories
    .map((c) => {
      const list = productsInCategory(c.id, products);
      return { id: c.id, name: c.name, revenue: revenueOf(list), unitsSold: unitsOf(list), href: `/admin/categories/${c.id}` };
    })
    .sort((a, b) => b.revenue - a.revenue);
}

export function getBrandPerformance(brands: AdminBrand[], products: AdminProduct[]): PerformanceEntry[] {
  return brands
    .map((b) => {
      const list = productsInBrand(b.id, products);
      return { id: b.id, name: b.name, revenue: revenueOf(list), unitsSold: unitsOf(list), href: `/admin/brands/${b.id}` };
    })
    .sort((a, b) => b.revenue - a.revenue);
}

export function getCollectionPerformance(collections: ProductCollection[], products: AdminProduct[]): PerformanceEntry[] {
  return collections
    .map((c) => {
      const list = resolveRefs(c.products, products);
      return { id: c.id, name: c.name, revenue: revenueOf(list), unitsSold: unitsOf(list), href: `/admin/content/product-collections/${c.id}` };
    })
    .sort((a, b) => b.revenue - a.revenue);
}

export function getPromotionPagePerformance(pages: PromotionPage[], products: AdminProduct[]): PerformanceEntry[] {
  return pages
    .filter((p) => !p.isHomepage)
    .map((p) => {
      const list = resolveRefs(p.products, products);
      return { id: p.id, name: p.name, revenue: revenueOf(list), unitsSold: unitsOf(list), href: `/admin/promotion-pages/${p.id}` };
    })
    .sort((a, b) => b.revenue - a.revenue);
}

export function getCampaignPerformance(campaigns: Campaign[], products: AdminProduct[]): PerformanceEntry[] {
  return campaigns
    .map((c) => {
      const list = resolveRefs(c.products, products);
      return { id: c.id, name: c.name, revenue: revenueOf(list), unitsSold: unitsOf(list), href: `/admin/content/campaigns/${c.id}` };
    })
    .sort((a, b) => b.revenue - a.revenue);
}

export function getTopProductEntries(products: AdminProduct[], limit = 15): PerformanceEntry[] {
  return [...products]
    .sort((a, b) => (b.soldCount ?? 0) - (a.soldCount ?? 0))
    .slice(0, limit)
    .map((p) => ({ id: p.id, name: p.name, revenue: (p.soldCount ?? 0) * p.price, unitsSold: p.soldCount ?? 0, href: `/admin/products/${p.id}` }));
}

export type CouponUsageEntry = { id: string; code: string; usageCount: number; usageLimit?: number; discountLabel: string };

export function getCouponUsage(coupons: Coupon[]): CouponUsageEntry[] {
  return [...coupons]
    .sort((a, b) => b.usageCount - a.usageCount)
    .map((c) => ({
      id: c.id,
      code: c.code,
      usageCount: c.usageCount,
      usageLimit: c.usageLimit,
      discountLabel: c.discountType === "percentage" ? `${c.discountValue}%` : `฿${c.discountValue}`,
    }));
}

export type DistributionSlice = { key: string; label: string; count: number; tone: "success" | "warning" | "danger" | "neutral" | "info" };

function distributionOf<T extends string>(
  orders: AdminOrder[],
  pick: (o: AdminOrder) => T,
  meta: Record<T, { label: string; tone: DistributionSlice["tone"] }>,
): DistributionSlice[] {
  const tally = new Map<string, number>();
  for (const order of orders) {
    const key = pick(order);
    tally.set(key, (tally.get(key) ?? 0) + 1);
  }
  return Object.keys(meta)
    .map((key) => ({ key, label: meta[key as T].label, tone: meta[key as T].tone, count: tally.get(key) ?? 0 }))
    .filter((slice) => slice.count > 0);
}

export const getOrderStatusDistribution = (orders: AdminOrder[]): DistributionSlice[] =>
  distributionOf<OrderStatus>(orders, (o) => o.orderStatus, ORDER_STATUS_META);

export const getPaymentStatusDistribution = (orders: AdminOrder[]): DistributionSlice[] =>
  distributionOf<PaymentStatus>(orders, (o) => o.paymentStatus, PAYMENT_STATUS_META);

export const getFulfillmentStatusDistribution = (orders: AdminOrder[]): DistributionSlice[] =>
  distributionOf<FulfillmentStatus>(orders, (o) => o.fulfillmentStatus, FULFILLMENT_STATUS_META);

/**
 * §13 — "This Period vs Previous Period". No separate previous-period
 * dataset exists (or should exist — that would be two mock sources that can
 * disagree), so the previous value is derived algebraically from the exact
 * `changePercent` the KPI already carries: `changePercent` is defined as
 * `(current - previous) / previous * 100`, so `previous = current / (1 +
 * changePercent / 100)`. Fully deterministic — refreshing the page can never
 * change it, per the spec's explicit "ห้ามใช้ random" instruction.
 */
export function derivePreviousValue(current: number, changePercent: number): number {
  const divisor = 1 + changePercent / 100;
  return divisor !== 0 ? current / divisor : current;
}

/**
 * §14 — deterministic period weighting for the Table Comparison tool, so
 * picking a shorter period visibly scales entity performance down without
 * a second full time-series dataset per entity. Anchored at 30d = 1×.
 */
export const PERIOD_WEIGHT: Record<DashboardPeriodKey, number> = {
  today: 0.05,
  "7d": 0.22,
  "30d": 1,
  month: 0.92,
  custom: 1,
};
