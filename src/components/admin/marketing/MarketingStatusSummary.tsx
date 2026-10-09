import { For } from "solid-js";
import { MARKETING_PHASES, MARKETING_PHASE_META, type MarketingPhase } from "~/lib/adminMarketing";

export type StatusTab<K extends string> = { value: K; label: string };

/** Promotions/Coupons tabs: ทั้งหมด + the four shown states. */
export const MARKETING_PHASE_TABS: StatusTab<"all" | MarketingPhase>[] = [
  { value: "all", label: "ทั้งหมด" },
  ...MARKETING_PHASES.map((phase) => ({ value: phase, label: MARKETING_PHASE_META[phase].label })),
];

/** Horizontal status tabs with counts (same pattern as `OrderStatusSummary`), for any set of tabs. */
export function MarketingStatusSummary<K extends string>(props: {
  tabs: StatusTab<K>[];
  value: K;
  counts: Partial<Record<K, number>>;
  onChange: (value: K) => void;
}) {
  return (
    <div class="scroll-rail !mx-0 !px-0">
      <For each={props.tabs}>
        {(tab) => {
          const active = () => props.value === tab.value;
          return (
            <button
              type="button"
              onClick={() => props.onChange(tab.value)}
              aria-pressed={active()}
              class={`flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-pill px-4 text-sm font-medium transition-colors duration-150 ${
                active() ? "bg-brand-pink text-white" : "border border-border bg-surface-card text-ink-gray hover:bg-surface-pink/40"
              }`}
            >
              {tab.label}
              <span class={`rounded-pill px-1.5 py-0.5 text-xs ${active() ? "bg-white/20" : "bg-surface-gray text-ink-gray"}`}>{props.counts[tab.value] ?? 0}</span>
            </button>
          );
        }}
      </For>
    </div>
  );
}
