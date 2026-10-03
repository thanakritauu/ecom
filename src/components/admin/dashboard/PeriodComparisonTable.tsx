import { For } from "solid-js";
import { ArrowUpIcon, ArrowDownIcon } from "~/components/admin/icons";
import { formatAdminCurrency, type DashboardPeriodData } from "~/lib/adminDashboard";
import { derivePreviousValue } from "~/lib/adminDashboardAnalytics";

type Row = { label: string; current: number; changePercent: number; format: (v: number) => string };

/**
 * §13 — "Current Period vs Previous Period", as an explicit Value/
 * Difference/%-change table (the KPI cards above already show the %-change
 * badge; this is the fuller breakdown the spec calls out by name). The
 * previous-period value is derived from the exact `changePercent` each KPI
 * already carries (see `derivePreviousValue`) — deterministic, never
 * random, never disagrees with the badge shown on the KPI card above it.
 */
export function PeriodComparisonTable(props: { data: DashboardPeriodData }) {
  const rows: Row[] = [
    { label: "ยอดขาย", current: props.data.kpis.revenue.value, changePercent: props.data.kpis.revenue.changePercent, format: formatAdminCurrency },
    { label: "จำนวนคำสั่งซื้อ", current: props.data.kpis.orders.value, changePercent: props.data.kpis.orders.changePercent, format: (v) => `${Math.round(v).toLocaleString("th-TH")} orders` },
    { label: "มูลค่าเฉลี่ยต่อคำสั่งซื้อ", current: props.data.kpis.aov.value, changePercent: props.data.kpis.aov.changePercent, format: formatAdminCurrency },
    { label: "ลูกค้า", current: props.data.kpis.customers.value, changePercent: props.data.kpis.customers.changePercent, format: (v) => Math.round(v).toLocaleString("th-TH") },
  ];

  return (
    <div class="rounded-card bg-surface-card p-4 shadow-card sm:p-5">
      {/* §12 — matches every sibling section heading's size (`text-base
          font-semibold`), was `text-sm` (one step smaller than the rest of
          the Dashboard's own section headings). §13 — the explanatory
          helper paragraph that used to sit here is removed outright; the
          comparison logic itself (`derivePreviousValue`) is untouched. */}
      <h3 class="mb-4 text-base font-semibold text-ink">เปรียบเทียบช่วงเวลา</h3>
      <div class="overflow-x-auto">
        <table class="w-full min-w-[480px] text-left text-sm">
          <thead>
            <tr class="border-b border-border text-xs uppercase tracking-wide text-ink-placeholder">
              <th class="py-2 pr-3 font-medium">ตัวชี้วัด</th>
              <th class="py-2 pr-3 font-medium">{props.data.label}</th>
              <th class="py-2 pr-3 font-medium">ช่วงก่อนหน้า</th>
              <th class="py-2 pr-3 font-medium">ผลต่าง</th>
              <th class="py-2 font-medium">% เปลี่ยนแปลง</th>
            </tr>
          </thead>
          <tbody>
            <For each={rows}>
              {(row) => {
                const previous = derivePreviousValue(row.current, row.changePercent);
                const diff = row.current - previous;
                const positive = diff >= 0;
                return (
                  <tr class="border-b border-border last:border-0">
                    <td class="py-2.5 pr-3 text-ink-gray">{row.label}</td>
                    <td class="py-2.5 pr-3 font-medium text-ink">{row.format(row.current)}</td>
                    <td class="py-2.5 pr-3 text-ink-gray">{row.format(previous)}</td>
                    <td class={`py-2.5 pr-3 font-medium ${positive ? "text-success" : "text-system-red"}`}>
                      {positive ? "+" : ""}
                      {row.format(diff)}
                    </td>
                    <td class={`py-2.5 font-semibold ${positive ? "text-success" : "text-system-red"}`}>
                      <span class="inline-flex items-center gap-0.5">
                        {positive ? <ArrowUpIcon class="size-3" /> : <ArrowDownIcon class="size-3" />}
                        {Math.abs(row.changePercent).toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                );
              }}
            </For>
          </tbody>
        </table>
      </div>
    </div>
  );
}
