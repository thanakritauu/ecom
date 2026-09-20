import { Show, type JSX } from "solid-js";
import { Skeleton } from "~/components/admin/Skeleton";
import { ArrowUpIcon, ArrowDownIcon } from "~/components/admin/icons";

export function KpiCard(props: {
  label: string;
  value: string;
  changePercent?: number;
  comparisonLabel?: string;
  icon: JSX.Element;
}) {
  const isPositive = () => (props.changePercent ?? 0) >= 0;

  return (
    <div class="flex flex-col gap-3 rounded-card bg-white p-4 shadow-card sm:p-5">
      <div class="flex items-center justify-between gap-2">
        <p class="text-sm font-medium text-ink-gray">{props.label}</p>
        <div class="flex size-9 shrink-0 items-center justify-center rounded-pill bg-surface-pink text-brand-pink">{props.icon}</div>
      </div>
      <p class="text-2xl font-bold text-ink sm:text-[28px]">{props.value}</p>
      <Show when={props.changePercent !== undefined}>
        <div class="flex flex-wrap items-center gap-1.5 text-xs">
          <span class={`inline-flex items-center gap-0.5 font-semibold ${isPositive() ? "text-success" : "text-system-red"}`}>
            {isPositive() ? <ArrowUpIcon /> : <ArrowDownIcon />}
            {Math.abs(props.changePercent!).toFixed(1)}%
          </span>
          <span class="text-ink-placeholder">{props.comparisonLabel ?? "จากช่วงก่อนหน้า"}</span>
        </div>
      </Show>
    </div>
  );
}

export function KpiCardSkeleton() {
  return (
    <div class="flex flex-col gap-3 rounded-card bg-white p-4 shadow-card sm:p-5">
      <div class="flex items-center justify-between">
        <Skeleton class="h-4 w-20" />
        <Skeleton class="size-9 rounded-pill" />
      </div>
      <Skeleton class="h-7 w-28" />
      <Skeleton class="h-4 w-24" />
    </div>
  );
}
