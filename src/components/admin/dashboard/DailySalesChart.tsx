import { createMemo, createSignal, For } from "solid-js";
import { ChevronDownIcon } from "~/components/admin/icons";
import { formatAdminCurrency } from "~/lib/adminDashboard";
import { getDailySeries, getMonthOptions, monthKey } from "~/lib/adminDashboardDaily";
import { LineChart } from "./DashboardCharts";

const MONTH_OPTIONS = getMonthOptions();
const SELECT_CLASS = "h-10 appearance-none rounded-pill border border-border bg-surface-card pl-4 pr-9 text-sm text-ink outline-none focus:border-brand-pink";

/**
 * CMS Dashboard & Admin UX Refinement §01 — "ยอดขาย" as a real day-of-month
 * Line Chart (X-axis 1..N, full range of the selected month — no skipped or
 * out-of-order days since it's generated straight from `daysInMonth`), Y in
 * THB via the same `formatAdminCurrency` every other Admin money figure
 * uses.
 */
export function DailySalesChart() {
  const [selectedKey, setSelectedKey] = createSignal(monthKey(MONTH_OPTIONS[0].year, MONTH_OPTIONS[0].month));
  const activeMonth = createMemo(() => MONTH_OPTIONS.find((m) => monthKey(m.year, m.month) === selectedKey()) ?? MONTH_OPTIONS[0]);
  const series = createMemo(() => [
    { key: "sales", label: "ยอดขาย", colorClass: "stroke-brand-pink", data: getDailySeries(activeMonth().year, activeMonth().month, 0) },
  ]);

  return (
    <div class="rounded-card bg-surface-card p-4 shadow-card sm:p-5">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 class="text-base font-semibold text-ink">ยอดขาย (บาท)</h2>
        <div class="relative">
          <select value={selectedKey()} onChange={(e) => setSelectedKey(e.currentTarget.value)} class={SELECT_CLASS}>
            <For each={MONTH_OPTIONS}>{(m) => <option value={monthKey(m.year, m.month)}>{m.label}</option>}</For>
          </select>
          <ChevronDownIcon class="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-gray" />
        </div>
      </div>
      <LineChart series={series()} formatValue={formatAdminCurrency} />
    </div>
  );
}
