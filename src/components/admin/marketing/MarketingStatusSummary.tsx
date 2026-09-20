import { For } from "solid-js";
import { MARKETING_STATUS_META, type MarketingStatus } from "~/lib/adminMarketing";

const TABS: ("all" | MarketingStatus)[] = ["all", "draft", "scheduled", "active", "expired", "disabled"];

/** Same horizontal status-tab pattern as `OrderStatusSummary`, generalized across the one shared `MarketingStatus` model instead of Order's own. */
export function MarketingStatusSummary(props: {
  value: "all" | MarketingStatus;
  counts: Partial<Record<"all" | MarketingStatus, number>>;
  onChange: (value: "all" | MarketingStatus) => void;
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
                active() ? "bg-brand-pink text-white" : "border border-surface-gray bg-white text-ink-gray hover:bg-surface-pink/40"
              }`}
            >
              {tab === "all" ? "ทั้งหมด" : MARKETING_STATUS_META[tab].label}
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
