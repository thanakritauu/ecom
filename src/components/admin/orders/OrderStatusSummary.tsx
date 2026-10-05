import { For } from "solid-js";
import { ORDER_STATUS_META, type OrderStatus } from "~/lib/adminOrders";

const TABS: ("all" | OrderStatus)[] = ["all", "pending_payment", "preparing", "handed_over", "shipping", "completed", "cancelled"];

/**
 * PART 6 — Order Status summary tabs (the storefront's 6 statuses), distinct from the Payment/Fulfillment/
 * Date/Value dropdown filters in FilterBar below it. Reuses the same
 * horizontal-scroll-rail pattern the storefront's own category nav already
 * established (app.css `.scroll-rail`) instead of a new horizontal-list
 * treatment.
 */
export function OrderStatusSummary(props: {
  value: "all" | OrderStatus;
  counts: Partial<Record<"all" | OrderStatus, number>>;
  onChange: (value: "all" | OrderStatus) => void;
}) {
  return (
    <div class="scroll-rail !mx-0 !px-0">
      <For each={TABS}>
        {(tab) => {
          const active = () => props.value === tab;
          return (
            <button
              type="button"
              onClick={() => props.onChange(tab)}
              aria-pressed={active()}
              class={`flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-pill px-4 text-sm font-medium transition-colors duration-150 ${
                active() ? "bg-brand-pink text-white" : "border border-border bg-surface-card text-ink-gray hover:bg-surface-pink/40"
              }`}
            >
              {tab === "all" ? "ทั้งหมด" : ORDER_STATUS_META[tab].label}
              <span class={`rounded-pill px-1.5 py-0.5 text-xs ${active() ? "bg-white/20" : "bg-surface-gray text-ink-gray"}`}>
                {props.counts[tab] ?? 0}
              </span>
            </button>
          );
        }}
      </For>
    </div>
  );
}
