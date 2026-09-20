import { createSignal, onMount, Show, For } from "solid-js";
import { PageHeader } from "~/components/shared/PageHeader";
import { EmptyState } from "~/components/admin/EmptyState";
import { DateRangeSelector } from "~/components/admin/dashboard/DateRangeSelector";
import { KpiCard, KpiCardSkeleton } from "~/components/admin/dashboard/KpiCard";
import { SalesTrendChart, SalesTrendChartSkeleton } from "~/components/admin/dashboard/SalesTrendChart";
import { OrderOverview } from "~/components/admin/dashboard/OrderOverview";
import { BestSellingProducts } from "~/components/admin/dashboard/BestSellingProducts";
import { LowStockList } from "~/components/admin/dashboard/LowStockList";
import { RecentOrdersTable } from "~/components/admin/dashboard/RecentOrdersTable";
import { QuickActions } from "~/components/admin/dashboard/QuickActions";
import { Skeleton } from "~/components/admin/Skeleton";
import { RevenueIcon, OrdersIcon, AovIcon, CustomersIcon, RefreshIcon } from "~/components/admin/icons";
import { formatAdminCurrency, DASHBOARD_PERIODS, type DashboardPeriodKey } from "~/lib/adminDashboard";
import type { AsyncStatus } from "~/lib/types";

/**
 * PART 3 — sections stack top to bottom: KPIs → Sales/Orders overview → Best
 * Sellers/Low Stock → Recent Orders → Quick Actions. Only the KPI row + chart
 * react to the date-range selector (PART 22); everything else is a
 * current-state snapshot (see adminDashboard.ts's own comment on why).
 */
export default function AdminDashboardPage() {
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

  const data = () => DASHBOARD_PERIODS[period()];

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
              class="bg-white shadow-card"
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

          {/* Sales Overview */}
          <div class="mt-3 rounded-card bg-white p-4 shadow-card sm:p-5">
            <h2 class="mb-4 text-base font-semibold text-ink">ยอดขาย</h2>
            <SalesTrendChart points={data().salesTrend} />
          </div>
        </Show>
      </Show>

      <Show when={salesStatus() === "loading"}>
        <div class="rounded-card bg-white p-4 shadow-card sm:p-5">
          <Skeleton class="mb-4 h-5 w-24" />
          <SalesTrendChartSkeleton />
        </div>
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

      {/* Best Selling Products + Low Stock */}
      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div class="rounded-card bg-white p-4 shadow-card sm:p-5">
          <h2 class="mb-2 text-base font-semibold text-ink">สินค้าขายดี</h2>
          <Show when={sectionsReady()} fallback={<SectionListSkeleton />}>
            <BestSellingProducts />
          </Show>
        </div>
        <div class="rounded-card bg-white p-4 shadow-card sm:p-5">
          <h2 class="mb-2 text-base font-semibold text-ink">สินค้าใกล้หมด</h2>
          <Show when={sectionsReady()} fallback={<SectionListSkeleton />}>
            <LowStockList />
          </Show>
        </div>
      </div>

      {/* Recent Orders */}
      <div class="flex flex-col gap-3">
        <h2 class="text-base font-semibold text-ink">คำสั่งซื้อล่าสุด</h2>
        <Show when={sectionsReady()} fallback={<Skeleton class="h-64 rounded-card" />}>
          <RecentOrdersTable />
        </Show>
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
