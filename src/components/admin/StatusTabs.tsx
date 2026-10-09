import { For } from "solid-js";

export type StatusTab<V extends string> = { value: V; label: string };

/**
 * Generic status-summary tabs (ADMIN_DSL 3.1), the shape every
 * `*StatusSummary` copies: pill per status with its row count, pink when
 * active. Sits between PageHeader and FilterBar; when a page has these, its
 * FilterBar must not repeat the status filter.
 *
 * <StatusTabs value={tab()} onChange={setTab}
 *   tabs={[{ value: "all", label: "ทั้งหมด" }, ...]} counts={{ all: 12, active: 4 }} />
 */
export function StatusTabs<V extends string>(props: {
  tabs: StatusTab<V>[];
  value: V;
  counts?: Partial<Record<V, number>>;
  onChange: (value: V) => void;
  /** Accessible name for the tab group. */
  label?: string;
}) {
  return (
    <div class="scroll-rail !mx-0 !px-0" role="group" aria-label={props.label ?? "กรองตามสถานะ"}>
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
              {props.counts ? (
                <span class={`rounded-pill px-1.5 py-0.5 text-xs ${active() ? "bg-white/20" : "bg-surface-gray text-ink-gray"}`}>
                  {(props.counts[tab.value] ?? 0).toLocaleString("th-TH")}
                </span>
              ) : null}
            </button>
          );
        }}
      </For>
    </div>
  );
}
