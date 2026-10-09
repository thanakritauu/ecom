import { createMemo, createSignal, For } from "solid-js";
import { ChevronDownIcon } from "~/components/admin/icons";
import { formatAdminCurrency } from "~/lib/adminDashboard";
import { getDailySales, getMonthOptions } from "~/lib/adminDashboardAnalytics";
import { useAdminOrders } from "~/lib/adminOrderStore";
import { LineChart } from "./DashboardCharts";

const MONTH_OPTIONS = getMonthOptions();

/**
 * "ยอดขายรายวัน" — paid order totals per day of the selected month (X-axis
 * 1..N), straight from the order store; cancelled and unpaid orders don't
 * count.
 */
export function DailySalesChart() {
  const orders = useAdminOrders();
  const [selectedKey, setSelectedKey] = createSignal(MONTH_OPTIONS[0].key);
  const activeMonth = createMemo(() => MONTH_OPTIONS.find((m) => m.key === selectedKey()) ?? MONTH_OPTIONS[0]);
  const series = createMemo(() => [
    { key: "sales", label: "ยอดขาย", colorClass: "stroke-brand-pink", data: getDailySales(orders.orders(), activeMonth().year, activeMonth().month) },
  ]);

  return (
    <section class="flex flex-col gap-3 rounded-card bg-surface-card p-4 shadow-card sm:p-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 class="text-base font-semibold text-ink">ยอดขายรายวัน</h2>
        <label class="relative">
          <span class="sr-only">เลือกเดือน</span>
          <select
            value={selectedKey()}
            onChange={(e) => setSelectedKey(e.currentTarget.value)}
            class="h-11 w-full appearance-none rounded-card border border-border bg-surface-card pl-4 pr-9 text-sm text-ink outline-none focus:border-brand-pink"
          >
            <For each={MONTH_OPTIONS}>{(m) => <option value={m.key}>{m.label}</option>}</For>
          </select>
          <ChevronDownIcon class="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-gray" />
        </label>
      </div>
      <LineChart series={series()} formatValue={formatAdminCurrency} />
    </section>
  );
}
