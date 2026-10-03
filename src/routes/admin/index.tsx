import { createSignal, onMount, Show, For } from "solid-js";
import { PageHeader } from "~/components/shared/PageHeader";
import { EmptyState } from "~/components/admin/EmptyState";
import { DateRangeSelector } from "~/components/admin/dashboard/DateRangeSelector";
import { KpiCard, KpiCardSkeleton } from "~/components/admin/dashboard/KpiCard";
import { DailySalesChart } from "~/components/admin/dashboard/DailySalesChart";
import { OrderOverview } from "~/components/admin/dashboard/OrderOverview";
import { BestSellingProducts } from "~/components/admin/dashboard/BestSellingProducts";
import { LowStockList } from "~/components/admin/dashboard/LowStockList";
import { RecentOrdersTable } from "~/components/admin/dashboard/RecentOrdersTable";
import { QuickActions } from "~/components/admin/dashboard/QuickActions";
import { PeriodComparisonTable } from "~/components/admin/dashboard/PeriodComparisonTable";
import { StatusDistribution } from "~/components/admin/dashboard/StatusDistribution";
import { PerformancePanels } from "~/components/admin/dashboard/PerformancePanels";
import { ComparisonPanel } from "~/components/admin/dashboard/ComparisonPanel";
import { Skeleton } from "~/components/admin/Skeleton";
import { RevenueIcon, OrdersIcon, AovIcon, CustomersIcon, RefreshIcon } from "~/components/admin/icons";
import { formatAdminCurrency, DASHBOARD_PERIODS, type DashboardPeriodKey } from "~/lib/adminDashboard";
import { useAdminCustomers } from "~/lib/adminCustomerStore";
import type { AsyncStatus } from "~/lib/types";

/**
 * CMS Final Admin UX Refinement §14-17 — section order is now fixed to:
 * KPI → Sales Chart → Performance (Category/Brand/Promotion) → Comparison
 * (Period table + dataset Line Chart) → Order Overview → Recent Orders →
 * Order Status Distribution → Best Selling Products → Low Stock → Quick
 * Actions. This is the authoritative order at every breakpoint (a single
 * `flex flex-col` — nothing here reorders itself per breakpoint), per the
 * spec's explicit "ยึดตำแหน่งนี้เป็นหลัก ไม่ต้อง preserve order เดิม".
 */
export default function AdminDashboardPage() {
  const customerStore = useAdminCustomers();
  const [period, setPeriod] = createSignal<DashboardPeriodKey>("7d");
  const [salesStatus, setSalesStatus] = createSignal<AsyncStatus>("idle");
  const [sectionsReady, setSectionsReady] = createSignal(false);

  const loadSales = () => {
    setSalesStatus("loading");
    setTimeout(() => {
      // Small, deliberate chance to demonstrate the widget's error/retry state (PART 25) — same kind of mock failure rate cart.tsx/auth.tsx already use elsewhere in this prototype.
      setSalesStatus(Math.random() < 0.1 ? "error" : "success");
    }, 550);
  };

  onMount(() => {
    loadSales();
    setTimeout(() => setSectionsReady(true), 450);
  });

  /**
   * Phase 05 §26 — "Customers" is the one KPI this Dashboard already had a
   * slot for that a real Store now backs; every other KPI (revenue/orders/
   * AOV) stays exactly the period-mocked value it always was — swapping
   * those too would need real historical per-period order data this
   * prototype doesn't track, which is a redesign this phase explicitly
   * defers. Only `.value` is overridden (a live, accurate "how many
   * customers exist right now" count from the real Customer Store);
   * `changePercent` stays the existing mock, since an accurate period-over-
   * period change needs historical customer snapshots this prototype has no
   * source for. Overridden once here (not inside `KpiCard`/
   * `PeriodComparisonTable` themselves) so both readers of `data()` can never
   * disagree about what "Customers" means, per §30.
   */
  const data = () => {
    const base = DASHBOARD_PERIODS[period()];
    return { ...base, kpis: { ...base.kpis, customers: { ...base.kpis.customers, value: customerStore.customers().length } } };
  };

  return (
    <div class="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        description="ภาพรวมการขายและการดำเนินงานของ Charmiss"
        actions={<DateRangeSelector value={period()} onChange={setPeriod} />}
      />

      {/* KPI Cards */}
      <Show
        when={salesStatus() !== "loading"}
        fallback={
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <For each={[0, 1, 2, 3]}>{() => <KpiCardSkeleton />}</For>
          </div>
        }
      >
        <Show
          when={salesStatus() === "success"}
          fallback={
            <EmptyState
              tone="error"
              icon={<RefreshIcon />}
              title="ไม่สามารถโหลดข้อมูลยอดขายได้"
              description="เกิดข้อผิดพลาดชั่วคราว ลองโหลดข้อมูลอีกครั้ง"
              actionLabel="ลองอีกครั้ง"
              onAction={loadSales}
              class="bg-surface-card shadow-card"
            />
          }
        >
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="ยอดขาย"
              value={formatAdminCurrency(data().kpis.revenue.value)}
              changePercent={data().kpis.revenue.changePercent}
              icon={<RevenueIcon />}
            />
            <KpiCard
              label="Orders"
              value={`${data().kpis.orders.value.toLocaleString("th-TH")} orders`}
              changePercent={data().kpis.orders.changePercent}
              icon={<OrdersIcon />}
            />
            <KpiCard
              label="Average Order Value"
              value={formatAdminCurrency(data().kpis.aov.value)}
              changePercent={data().kpis.aov.changePercent}
              icon={<AovIcon />}
            />
            <KpiCard
              label="Customers"
              value={data().kpis.customers.value.toLocaleString("th-TH")}
              changePercent={data().kpis.customers.changePercent}
              icon={<CustomersIcon />}
            />
          </div>
        </Show>
      </Show>

      {/* กราฟยอดขาย — day-of-month Line Chart, own month picker */}
      <DailySalesChart />

      {/* ประสิทธิภาพตามหมวดหมู่ / แบรนด์ / โปรโมชั่น — §14, right after the Sales Chart */}
      <div class="flex flex-col gap-3">
        <h2 class="text-base font-semibold text-ink">ประสิทธิภาพตามหมวดหมู่ / แบรนด์ / โปรโมชั่น</h2>
        <Show
          when={sectionsReady()}
          fallback={
            <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <For each={[0, 1, 2, 3]}>{() => <Skeleton class="h-52 rounded-card" />}</For>
            </div>
          }
        >
          <PerformancePanels />
        </Show>
      </div>

      {/* กราฟเปรียบเทียบข้อมูล — Period-over-period table + the dataset Line Chart, kept adjacent */}
      <Show when={salesStatus() === "success"}>
        <PeriodComparisonTable data={data()} />
      </Show>
      <Show when={sectionsReady()} fallback={<Skeleton class="h-72 rounded-card" />}>
        <ComparisonPanel />
      </Show>

      {/* Order Overview */}
      <div class="flex flex-col gap-3">
        <h2 class="text-base font-semibold text-ink">Order Overview</h2>
        <Show
          when={sectionsReady()}
          fallback={
            <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <For each={[0, 1, 2, 3, 4]}>{() => <Skeleton class="h-20 rounded-card" />}</For>
            </div>
          }
        >
          <OrderOverview />
        </Show>
      </div>

      {/* คำสั่งซื้อล่าสุด */}
      <div class="flex flex-col gap-3">
        <h2 class="text-base font-semibold text-ink">คำสั่งซื้อล่าสุด</h2>
        <Show when={sectionsReady()} fallback={<Skeleton class="h-64 rounded-card" />}>
          <RecentOrdersTable />
        </Show>
      </div>

      {/* การกระจายสถานะคำสั่งซื้อ — §15, right after Recent Orders */}
      <div class="flex flex-col gap-3">
        <h2 class="text-base font-semibold text-ink">การกระจายสถานะคำสั่งซื้อ</h2>
        <Show
          when={sectionsReady()}
          fallback={
            <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <For each={[0, 1, 2]}>{() => <Skeleton class="h-40 rounded-card" />}</For>
            </div>
          }
        >
          <StatusDistribution />
        </Show>
      </div>

      {/* Best Selling Products + Low Stock */}
      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div class="rounded-card bg-surface-card p-4 shadow-card sm:p-5">
          <h2 class="mb-2 text-base font-semibold text-ink">สินค้าขายดี</h2>
          <Show when={sectionsReady()} fallback={<SectionListSkeleton />}>
            <BestSellingProducts />
          </Show>
        </div>
        <div class="rounded-card bg-surface-card p-4 shadow-card sm:p-5">
          <h2 class="mb-2 text-base font-semibold text-ink">สินค้าใกล้หมด</h2>
          <Show when={sectionsReady()} fallback={<SectionListSkeleton />}>
            <LowStockList />
          </Show>
        </div>
      </div>

      {/* Quick Actions */}
      <div class="flex flex-col gap-3">
        <h2 class="text-base font-semibold text-ink">Quick Actions</h2>
        <QuickActions />
      </div>
    </div>
  );
}

function SectionListSkeleton() {
  return (
    <div class="flex flex-col gap-3 py-1">
      <For each={[0, 1, 2]}>
        {() => (
          <div class="flex items-center gap-3">
            <Skeleton class="size-12 shrink-0 rounded-media" />
            <div class="flex flex-1 flex-col gap-1.5">
              <Skeleton class="h-4 w-3/4" />
              <Skeleton class="h-3 w-1/3" />
            </div>
          </div>
        )}
      </For>
    </div>
  );
}
