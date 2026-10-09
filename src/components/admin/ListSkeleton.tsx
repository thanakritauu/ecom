import { For } from "solid-js";
import { Skeleton } from "./Skeleton";

/**
 * The Products list loading state (ADMIN_DSL 3.3): a search-pill bar, then
 * `rows` card rows of thumb + two text lines + a badge. Use inside
 * `<Show when={listStatus() !== "loading"} fallback={<ListSkeleton />}>`.
 */
export function ListSkeleton(props: { rows?: number; withSearch?: boolean; withThumb?: boolean }) {
  const rows = () => Array.from({ length: props.rows ?? 6 }, (_, i) => i);
  return (
    <div class="flex flex-col gap-3" aria-busy="true" aria-label="กำลังโหลด">
      {props.withSearch !== false ? <Skeleton class="h-11 w-full rounded-pill" /> : null}
      <For each={rows()}>
        {() => (
          <div class="flex items-center gap-3 rounded-card bg-surface-card p-3 shadow-card">
            {props.withThumb !== false ? <Skeleton class="size-11 shrink-0 rounded-media" /> : null}
            <div class="flex flex-1 flex-col gap-1.5">
              <Skeleton class="h-4 w-1/2" />
              <Skeleton class="h-3 w-1/4" />
            </div>
            <Skeleton class="h-8 w-16 rounded-pill" />
          </div>
        )}
      </For>
    </div>
  );
}
