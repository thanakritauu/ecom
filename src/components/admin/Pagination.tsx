import { For, Show } from "solid-js";
import { ChevronRightIcon, ChevronDownIcon } from "./icons";

const PAGE_SIZE_OPTIONS = [10, 20, 50];

/**
 * Frontend-only pagination (PART 11) — reused for any future list module,
 * not just Products. No server exists to paginate against, so this just
 * slices whatever array the caller already filtered/sorted.
 */
export function Pagination(props: {
  page: number;
  totalPages: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  /** Page-size choices (default 10 / 20 / 50). */
  pageSizeOptions?: number[];
}) {
  const pageNumbers = () => {
    const total = Math.max(props.totalPages, 1);
    // Keep the row short — up to 5 page numbers centered on the current page, not every page.
    const span = 5;
    let start = Math.max(1, props.page - Math.floor(span / 2));
    const end = Math.min(total, start + span - 1);
    start = Math.max(1, end - span + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  return (
    <div class="flex flex-col items-center justify-between gap-3 sm:flex-row">
      <label class="flex items-center gap-2 text-sm text-ink-gray">
        แสดงต่อหน้า
        <div class="relative">
          <select
            value={props.pageSize}
            onChange={(e) => props.onPageSizeChange(Number(e.currentTarget.value))}
            class="h-9 w-full appearance-none rounded-card border border-border bg-surface-card py-1 pl-3 pr-8 text-sm text-ink outline-none focus:border-brand-pink"
          >
            <For each={props.pageSizeOptions ?? PAGE_SIZE_OPTIONS}>{(size) => <option value={size}>{size}</option>}</For>
          </select>
          <ChevronDownIcon class="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-gray" />
        </div>
      </label>

      <div class="flex items-center gap-1">
        <button
          type="button"
          disabled={props.page <= 1}
          onClick={() => props.onPageChange(props.page - 1)}
          aria-label="หน้าก่อนหน้า"
          class="flex size-9 items-center justify-center rounded-pill text-ink-gray transition-colors duration-150 hover:bg-surface-pink disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRightIcon class="size-4 rotate-180" />
        </button>

        <Show when={pageNumbers()[0] > 1}>
          <button type="button" onClick={() => props.onPageChange(1)} class="flex size-9 items-center justify-center rounded-pill text-sm text-ink-gray hover:bg-surface-pink">
            1
          </button>
          <span class="px-1 text-ink-placeholder">...</span>
        </Show>

        <For each={pageNumbers()}>
          {(n) => (
            <button
              type="button"
              onClick={() => props.onPageChange(n)}
              aria-current={n === props.page ? "page" : undefined}
              class={`flex size-9 items-center justify-center rounded-pill text-sm font-medium transition-colors duration-150 ${
                n === props.page ? "bg-brand-pink text-white" : "text-ink-gray hover:bg-surface-pink"
              }`}
            >
              {n}
            </button>
          )}
        </For>

        <Show when={pageNumbers()[pageNumbers().length - 1] < props.totalPages}>
          <span class="px-1 text-ink-placeholder">...</span>
          <button
            type="button"
            onClick={() => props.onPageChange(props.totalPages)}
            class="flex size-9 items-center justify-center rounded-pill text-sm text-ink-gray hover:bg-surface-pink"
          >
            {props.totalPages}
          </button>
        </Show>

        <button
          type="button"
          disabled={props.page >= props.totalPages}
          onClick={() => props.onPageChange(props.page + 1)}
          aria-label="หน้าถัดไป"
          class="flex size-9 items-center justify-center rounded-pill text-ink-gray transition-colors duration-150 hover:bg-surface-pink disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRightIcon class="size-4" />
        </button>
      </div>
    </div>
  );
}
