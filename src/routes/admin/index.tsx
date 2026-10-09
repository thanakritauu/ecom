import { createMemo, createSignal, onMount, Show, For } from "solid-js";
import { PageHeader } from "~/components/shared/PageHeader";
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
import { Skeleton } from "~/components/admin/Skeleton";
import { RevenueIcon, OrdersIcon, AovIcon, CustomersIcon } from "~/components/admin/icons";
import { formatAdminCurrency, DASHBOARD_PERIOD_OPTIONS, type DashboardPeriodKey, type DateRange } from "~/lib/adminDashboard";
import { changePercent, getOrderKpis, previousRange, resolvePeriodRange } from "~/lib/adminDashboardAnalytics";
import { formatMarketingDate } from "~/lib/adminMarketing";
import { useAdminOrders } from "~/lib/adminOrderStore";

/**
 * Dashboard — every number comes from the Admin stores: KPIs and the period
 * comparison from orders in the selected range (vs the same number of days
 * before it), daily sales from paid orders, rankings from the catalog, and
 * status counts / recent orders from the order store.
 */
export default function AdminDashboardPage() {
  const orderStore = useAdminOrders();
  const [period, setPeriod] = createSignal<DashboardPeriodKey>("7d");
  const [customRange, setCustomRange] = createSignal<DateRange>();
  const [ready, setReady] = createSignal(false);

  onMount(() => setTimeout(() => setReady(true), 450));

  const range = createMemo(() => resolvePeriodRange(period(), customRange()));
  const current = createMemo(() => getOrderKpis(orderStore.orders(), range()));
  const previous = createMemo(() => getOrderKpis(orderStore.orders(), previousRange(range())));
  const periodLabel = () =>
    period() === "custom" ? `${formatMarketingDate(range().from)} - ${formatMarketingDate(range().to)}` : (DASHBOARD_PERIOD_OPTIONS.find((o) => o.key === period())?.label ?? "");

  const handlePeriodChange = (key: DashboardPeriodKey, next?: DateRange) => {
    setPeriod(key);
    if (next) setCustomRange(next);
  };

  return (
    <div class="flex flex-col gap-6">
      <PageHeader
        title="แดชบอร์ด"
        description="ดูภาพรวมยอดขาย คำสั่งซื้อ และสินค้าของ Charmiss"
        actions={<DateRangeSelector value={period()} range={customRange()} onChange={handlePeriodChange} />}
      />

      <Show
        when={ready()}
        fallback={
          <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <For each={[0, 1, 2, 3]}>{() => <KpiCardSkeleton />}</For>
          </div>
        }
      >
        <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="ยอดขาย" value={formatAdminCurrency(current().revenue)} changePercent={changePercent(current().revenue, previous().revenue)} icon={<RevenueIcon />} />
          <KpiCard
            label="คำสั่งซื้อ"
            value={`${current().orders.toLocaleString("th-TH")} รายการ`}
            changePercent={changePercent(current().orders, previous().orders)}
            icon={<OrdersIcon />}
          />
          <KpiCard label="มูลค่าเฉลี่ยต่อคำสั่งซื้อ" value={formatAdminCurrency(current().aov)} changePercent={changePercent(current().aov, previous().aov)} icon={<AovIcon />} />
          <KpiCard
            label="ลูกค้า"
            value={`${current().customers.toLocaleString("th-TH")} คน`}
            changePercent={changePercent(current().customers, previous().customers)}
            icon={<CustomersIcon />}
          />
        </div>
      </Show>

      <DailySalesChart />

      <Show when={ready()} fallback={<Skeleton class="h-56 rounded-card" />}>
        <PeriodComparisonTable periodLabel={periodLabel()} current={current()} previous={previous()} />
      </Show>

      <Show
        when={ready()}
        fallback={
          <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <For each={[0, 1, 2, 3]}>{() => <Skeleton class="h-52 rounded-card" />}</For>
          </div>
        }
      >
        <PerformancePanels />
      </Show>

      <section class="flex flex-col gap-3">
        <h2 class="text-base font-semibold text-ink">ภาพรวมคำสั่งซื้อ</h2>
        <Show
          when={ready()}
          fallback={
            <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <For each={[0, 1, 2, 3, 4, 5]}>{() => <Skeleton class="h-20 rounded-card" />}</For>
            </div>
          }
        >
          <OrderOverview />
        </Show>
      </section>

      <section class="flex flex-col gap-3">
        <h2 class="text-base font-semibold text-ink">คำสั่งซื้อล่าสุด</h2>
        <Show when={ready()} fallback={<Skeleton class="h-64 rounded-card" />}>
          <RecentOrdersTable />
        </Show>
      </section>

      <Show
        when={ready()}
        fallback={
          <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <For each={[0, 1, 2]}>{() => <Skeleton class="h-40 rounded-card" />}</For>
          </div>
        }
      >
        <StatusDistribution />
      </Show>

      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section class="flex flex-col gap-3 rounded-card bg-surface-card p-4 shadow-card sm:p-5">
          <h2 class="text-base font-semibold text-ink">สินค้าขายดี</h2>
          <Show when={ready()} fallback={<SectionListSkeleton />}>
            <BestSellingProducts />
          </Show>
        </section>
        <section class="flex flex-col gap-3 rounded-card bg-surface-card p-4 shadow-card sm:p-5">
          <h2 class="text-base font-semibold text-ink">สินค้าใกล้หมด</h2>
          <Show when={ready()} fallback={<SectionListSkeleton />}>
            <LowStockList />
          </Show>
        </section>
      </div>

      <section class="flex flex-col gap-3">
        <h2 class="text-base font-semibold text-ink">ทางลัด</h2>
        <QuickActions />
      </section>
    </div>
  );
}

function SectionListSkeleton() {
  return (
    <div class="flex flex-col gap-3 py-1">
      <For each={[0, 1, 2]}>
        {() => (
          <div class="flex items-center gap-3">
            <Skeleton class="size-11 shrink-0 rounded-media" />
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
