import { For } from "solid-js";
import { BANNER_STATUS_META, type BannerStatus } from "~/lib/adminBanners";

const TABS: ("all" | BannerStatus)[] = ["all", "draft", "scheduled", "published", "unpublished", "expired"];

/** Same horizontal status-tab pattern as `PromotionPageStatusSummary`, generalized across `BannerStatus`'s 5 values instead. */
export function BannerStatusSummary(props: {
  value: "all" | BannerStatus;
  counts: Partial<Record<"all" | BannerStatus, number>>;
  onChange: (value: "all" | BannerStatus) => void;
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
              {tab === "all" ? "ทั้งหมด" : BANNER_STATUS_META[tab].label}
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
