import { createMemo, For } from "solid-js";
import { A } from "@solidjs/router";
import { ORDER_STATUS_META, type OrderStatus } from "~/lib/adminOrders";
import { useAdminOrders } from "~/lib/adminOrderStore";
import { StatusBadge } from "~/components/admin/StatusBadge";

/** The storefront's full 6-status model (same order as the customer's timeline) — small enough to show every status. */
const STATUS_ORDER: OrderStatus[] = ["pending_payment", "preparing", "handed_over", "shipping", "completed", "cancelled"];

/**
 * PART 9 (Phase 02) / PART 22 (Phase 04) — a live snapshot of order counts by
 * status, each linking to `/admin/orders?status=...` so Order List (built in
 * Phase 04) opens pre-filtered to that exact status.
 */
export function OrderOverview() {
  const store = useAdminOrders();
  const counts = createMemo(() => {
    const tally: Partial<Record<OrderStatus, number>> = {};
    for (const order of store.orders()) tally[order.orderStatus] = (tally[order.orderStatus] ?? 0) + 1;
    return tally;
  });

  return (
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <For each={STATUS_ORDER}>
        {(status) => {
          const meta = ORDER_STATUS_META[status];
          return (
            <A
              href={`/admin/orders?status=${status}`}
              class="font-normal flex flex-col gap-2 rounded-card bg-surface-card p-4 shadow-card transition-colors duration-150 lg:hover:bg-surface-pink/40"
            >
              <StatusBadge tone={meta.tone} class="w-fit">
                {meta.label}
              </StatusBadge>
              <p class="text-2xl font-bold text-ink">{(counts()[status] ?? 0).toLocaleString("th-TH")}</p>
            </A>
          );
        }}
      </For>
    </div>
  );
}
