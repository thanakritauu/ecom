import type { AdminProduct } from "./adminProductStore";
import type { AdminCategory } from "./adminCategories";
import type { PromotionPage, PromotionPageProductRef } from "./adminContent";
import type { AdminOrder, OrderStatus, PaymentStatus, FulfillmentStatus } from "./adminOrders";
import { ORDER_STATUS_META, PAYMENT_STATUS_META, FULFILLMENT_STATUS_META, ORDERS_TODAY_ISO_DATE } from "./adminOrders";
import { productsInCategory } from "./masterDataRelations";
import type { DashboardPeriodKey, DateRange } from "./adminDashboard";

/**
 * Dashboard numbers, all derived from the live Admin stores (orders,
 * products, categories, promotion pages) — no mock series, no
 * randomness. Pure functions of the caller's current store snapshot.
 */

// ---------------------------------------------------------------------------
// Periods (relative to the order module's "today", `ORDERS_TODAY_ISO_DATE`)
// ---------------------------------------------------------------------------

const DAY_MS = 86_400_000;
const isoToMs = (iso: string) => Date.parse(`${iso}T00:00:00+07:00`);
const msToIso = (ms: number) => new Date(ms + 7 * 3_600_000).toISOString().slice(0, 10);
const addDays = (iso: string, days: number) => msToIso(isoToMs(iso) + days * DAY_MS);

/** The inclusive date range a preset covers; `custom` uses the range the admin picked (falls back to the last 30 days). */
export function resolvePeriodRange(key: DashboardPeriodKey, custom?: DateRange): DateRange {
  const today = ORDERS_TODAY_ISO_DATE;
  switch (key) {
    case "today":
      return { from: today, to: today };
    case "7d":
      return { from: addDays(today, -6), to: today };
    case "month":
      return { from: `${today.slice(0, 7)}-01`, to: today };
    case "custom":
      if (custom) return custom;
      return { from: addDays(today, -29), to: today };
    default:
      return { from: addDays(today, -29), to: today };
  }
}

/** The same number of days immediately before `range`. */
export function previousRange(range: DateRange): DateRange {
  const days = Math.round((isoToMs(range.to) - isoToMs(range.from)) / DAY_MS) + 1;
  return { from: addDays(range.from, -days), to: addDays(range.from, -1) };
}

/** An order's Bangkok calendar date (placedAt is stored in the "+07:00" form). */
export const orderDate = (order: Pick<AdminOrder, "placedAt">) => msToIso(Date.parse(order.placedAt));

export const isWithinRange = (order: Pick<AdminOrder, "placedAt">, range: DateRange) => {
  const d = orderDate(order);
  return d >= range.from && d <= range.to;
};

/** Paid = money actually received: not waiting for payment and not cancelled. */
export const isPaidOrder = (order: Pick<AdminOrder, "orderStatus">) => order.orderStatus !== "pending_payment" && order.orderStatus !== "cancelled";

export type OrderKpis = { revenue: number; orders: number; aov: number; customers: number };

/** Revenue / AOV from paid orders; order count includes every order placed; customers = distinct buyers. */
export function getOrderKpis(orders: AdminOrder[], range: DateRange): OrderKpis {
  const inRange = orders.filter((o) => isWithinRange(o, range));
  const paid = inRange.filter(isPaidOrder);
  const revenue = paid.reduce((sum, o) => sum + o.totals.grandTotal, 0);
  return {
    revenue,
    orders: inRange.length,
    aov: paid.length > 0 ? revenue / paid.length : 0,
    customers: new Set(inRange.map((o) => o.customerId)).size,
  };
}

/** % change vs the previous value; undefined when there's nothing to compare against. */
export function changePercent(current: number, previous: number): number | undefined {
  if (previous === 0) return undefined;
  return ((current - previous) / previous) * 100;
}

// ---------------------------------------------------------------------------
// Daily sales (paid orders per day of a month)
// ---------------------------------------------------------------------------

const THAI_MONTHS = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];

export type MonthOption = { key: string; year: number; month: number; label: string };

/** The current month plus the 5 before it, newest first. */
export function getMonthOptions(count = 6): MonthOption[] {
  let year = Number(ORDERS_TODAY_ISO_DATE.slice(0, 4));
  let month = Number(ORDERS_TODAY_ISO_DATE.slice(5, 7));
  const options: MonthOption[] = [];
  for (let i = 0; i < count; i++) {
    options.push({ key: `${year}-${String(month).padStart(2, "0")}`, year, month, label: `${THAI_MONTHS[month - 1]} ${year + 543}` });
    month -= 1;
    if (month === 0) {
      month = 12;
      year -= 1;
    }
  }
  return options;
}

/** Paid revenue per day of the month (1..N). */
export function getDailySales(orders: AdminOrder[], year: number, month: number): { day: number; value: number }[] {
  const days = new Date(year, month, 0).getDate();
  const prefix = `${year}-${String(month).padStart(2, "0")}-`;
  const totals = new Array<number>(days).fill(0);
  for (const o of orders) {
    const d = orderDate(o);
    if (!d.startsWith(prefix) || !isPaidOrder(o)) continue;
    totals[Number(d.slice(8, 10)) - 1] += o.totals.grandTotal;
  }
  return totals.map((value, i) => ({ day: i + 1, value }));
}

// ---------------------------------------------------------------------------
// Performance rankings (catalog sales figures) + coupons used in orders
// ---------------------------------------------------------------------------

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

export function getPromotionPagePerformance(pages: PromotionPage[], products: AdminProduct[]): PerformanceEntry[] {
  return pages
    .filter((p) => !p.isHomepage)
    .map((p) => {
      const list = resolveRefs(p.products, products);
      return { id: p.id, name: p.name, revenue: revenueOf(list), unitsSold: unitsOf(list), href: `/admin/promotion-pages/${p.id}` };
    })
    .sort((a, b) => b.revenue - a.revenue);
}

export type CouponUsageEntry = { code: string; uses: number };

/** Coupon codes used in orders (cancelled orders excluded), most used first. */
export function getCouponUsageFromOrders(orders: AdminOrder[]): CouponUsageEntry[] {
  const tally = new Map<string, number>();
  for (const o of orders) {
    const code = o.totals.couponCode;
    if (!code || o.orderStatus === "cancelled") continue;
    tally.set(code, (tally.get(code) ?? 0) + 1);
  }
  return [...tally].map(([code, uses]) => ({ code, uses })).sort((a, b) => b.uses - a.uses);
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
