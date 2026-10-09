import { For, Show } from "solid-js";
import { ArrowUpIcon, ArrowDownIcon } from "~/components/admin/icons";
import { formatAdminCurrency } from "~/lib/adminDashboard";
import { changePercent, type OrderKpis } from "~/lib/adminDashboardAnalytics";

type Row = { label: string; current: number; previous: number; format: (v: number) => string };

/**
 * Selected period vs the same number of days right before it, from the order
 * store (`getOrderKpis` for both ranges) — the same numbers the KPI cards show.
 */
export function PeriodComparisonTable(props: { periodLabel: string; current: OrderKpis; previous: OrderKpis }) {
  const count = (v: number) => `${Math.round(v).toLocaleString("th-TH")} รายการ`;
  const people = (v: number) => `${Math.round(v).toLocaleString("th-TH")} คน`;
  const rows = (): Row[] => [
    { label: "ยอดขาย", current: props.current.revenue, previous: props.previous.revenue, format: formatAdminCurrency },
    { label: "คำสั่งซื้อ", current: props.current.orders, previous: props.previous.orders, format: count },
    { label: "มูลค่าเฉลี่ยต่อคำสั่งซื้อ", current: props.current.aov, previous: props.previous.aov, format: formatAdminCurrency },
    { label: "ลูกค้าที่สั่งซื้อ", current: props.current.customers, previous: props.previous.customers, format: people },
  ];

  return (
    <section class="flex flex-col gap-3 rounded-card bg-surface-card p-4 shadow-card sm:p-5">
      <h2 class="text-base font-semibold text-ink">เปรียบเทียบกับช่วงก่อนหน้า</h2>
      <div class="overflow-x-auto">
        <table class="w-full min-w-[480px] text-left text-sm">
          <thead>
            <tr class="border-b border-border text-xs uppercase tracking-wide text-ink-placeholder">
              <th class="py-2 pr-3 font-semibold">ตัวชี้วัด</th>
              <th class="py-2 pr-3 font-semibold">{props.periodLabel}</th>
              <th class="py-2 pr-3 font-semibold">ช่วงก่อนหน้า</th>
              <th class="py-2 pr-3 font-semibold">ผลต่าง</th>
              <th class="py-2 font-semibold">เปลี่ยนแปลง</th>
            </tr>
          </thead>
          <tbody>
            <For each={rows()}>
              {(row) => {
                const diff = () => row.current - row.previous;
                const positive = () => diff() >= 0;
                const pct = () => changePercent(row.current, row.previous);
                return (
                  <tr class="border-b border-border last:border-0">
                    <td class="py-2.5 pr-3 text-ink-gray">{row.label}</td>
                    <td class="py-2.5 pr-3 font-medium text-ink">{row.format(row.current)}</td>
                    <td class="py-2.5 pr-3 text-ink-gray">{row.format(row.previous)}</td>
                    <td class={`py-2.5 pr-3 font-medium ${positive() ? "text-success" : "text-system-red"}`}>
                      {positive() ? "+" : "-"}
                      {row.format(Math.abs(diff()))}
                    </td>
                    <td class="py-2.5 font-semibold">
                      <Show when={pct() !== undefined} fallback={<span class="text-ink-gray">-</span>}>
                        <span class={`inline-flex items-center gap-0.5 ${positive() ? "text-success" : "text-system-red"}`}>
                          {positive() ? <ArrowUpIcon class="size-3" /> : <ArrowDownIcon class="size-3" />}
                          {Math.abs(pct()!).toFixed(1)}%
                        </span>
                      </Show>
                    </td>
                  </tr>
                );
              }}
            </For>
          </tbody>
        </table>
      </div>
    </section>
  );
}
