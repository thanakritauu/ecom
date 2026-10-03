import { createMemo, For } from "solid-js";
import { useAdminOrders } from "~/lib/adminOrderStore";
import { getOrderStatusDistribution, getPaymentStatusDistribution, getFulfillmentStatusDistribution, type DistributionSlice } from "~/lib/adminDashboardAnalytics";
import { DonutChart, type DonutSlice } from "./DashboardCharts";

/** §12 — StatusBadge's 5 tones mapped to concrete strokeable Tailwind colors (`warning`/`danger` only define a `-soft` shade, no bare DEFAULT, so a donut segment can't use `stroke-warning` directly). */
const TONE_STROKE: Record<DistributionSlice["tone"], string> = {
  success: "stroke-success",
  warning: "stroke-system-yellow",
  danger: "stroke-system-red",
  neutral: "stroke-ink-placeholder",
  info: "stroke-brand-purple",
};

function toDonutSlices(slices: DistributionSlice[]): DonutSlice[] {
  return slices.map((s) => ({ key: s.key, label: s.label, count: s.count, colorClass: TONE_STROKE[s.tone] }));
}

/** §12 — Order/Payment/Fulfillment status distribution, three independent donuts (Phase 04's three-dimension Order Status Model — never merged into one). */
export function StatusDistribution() {
  const orders = useAdminOrders();
  const orderDist = createMemo(() => toDonutSlices(getOrderStatusDistribution(orders.orders())));
  const paymentDist = createMemo(() => toDonutSlices(getPaymentStatusDistribution(orders.orders())));
  const fulfillmentDist = createMemo(() => toDonutSlices(getFulfillmentStatusDistribution(orders.orders())));

  return (
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <For each={[
        { title: "สถานะคำสั่งซื้อ", data: orderDist },
        { title: "สถานะการชำระเงิน", data: paymentDist },
        { title: "สถานะการจัดส่ง", data: fulfillmentDist },
      ]}>
        {(panel) => (
          <div class="rounded-card bg-surface-card p-4 shadow-card sm:p-5">
            <h3 class="mb-4 text-sm font-semibold text-ink">{panel.title}</h3>
            <DonutChart slices={panel.data()} />
          </div>
        )}
      </For>
    </div>
  );
}
