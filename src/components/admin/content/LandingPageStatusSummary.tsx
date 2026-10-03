import { For } from "solid-js";
import { LANDING_PAGE_STATUS_META, type LandingPageStatus } from "~/lib/adminContent";

const TABS: ("all" | LandingPageStatus)[] = ["all", "draft", "scheduled", "published", "unpublished"];

/** Landing Page Architecture & Promotion Page Migration — was `PromotionPageStatusSummary.tsx`. Same horizontal status-tab pattern as `MarketingStatusSummary`, generalized across `LandingPageStatus` instead. */
export function LandingPageStatusSummary(props: {
  value: "all" | LandingPageStatus;
  counts: Partial<Record<"all" | LandingPageStatus, number>>;
  onChange: (value: "all" | LandingPageStatus) => void;
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
              {tab === "all" ? "ทั้งหมด" : LANDING_PAGE_STATUS_META[tab].label}
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
