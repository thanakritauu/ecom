import { Show } from "solid-js";
import { SORT_OPTIONS, type SortValue } from "~/lib/productListing";

export type ListingView = "grid" | "list";

/**
 * Desktop (lg+): title/count on the left, Grid/List toggle + Sort dropdown
 * on the right — matches Figma's toolbar row exactly. Below `lg` that same
 * row collapses to just title/count, and a separate `[ Filter ] [ Sort ]`
 * button pair (PART 24's bracket notation, taken literally) opens the
 * bottom-sheet Filter drawer / drives the same sort select inline.
 */
export function ProductListingToolbar(props: {
  resultCount: number;
  totalCount: number;
  view: ListingView;
  onViewChange: (view: ListingView) => void;
  sort: SortValue;
  onSortChange: (sort: SortValue) => void;
  activeFilterCount: number;
  onOpenMobileFilter: () => void;
}) {
  return (
    <div class="flex w-full flex-col gap-3">
      <div class="flex w-full flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap items-baseline gap-4">
          <h1 class="text-2xl font-bold text-ink lg:text-[31px]">สินค้าทั้งหมด</h1>
          <p class="text-sm text-ink-gray">
            แสดง {props.resultCount} จาก {props.totalCount} รายการ
          </p>
        </div>

        <div class="hidden items-center gap-3 lg:flex">
          <div class="flex h-[39px] items-center gap-1 rounded-pill border border-surface-gray bg-white p-1">
            <button
              type="button"
              aria-pressed={props.view === "grid"}
              aria-label="มุมมองตาราง"
              onClick={() => props.onViewChange("grid")}
              class="flex size-[31px] items-center justify-center rounded-pill transition-colors duration-150"
              classList={{ "bg-surface-pink text-brand-pink": props.view === "grid", "text-ink-gray": props.view !== "grid" }}
            >
              <GridIcon class="size-[18px]" />
            </button>
            <button
              type="button"
              aria-pressed={props.view === "list"}
              aria-label="มุมมองรายการ"
              onClick={() => props.onViewChange("list")}
              class="flex size-[31px] items-center justify-center rounded-pill transition-colors duration-150"
              classList={{ "bg-surface-pink text-brand-pink": props.view === "list", "text-ink-gray": props.view !== "list" }}
            >
              <ListIcon class="size-[18px]" />
            </button>
          </div>

          <SortSelect sort={props.sort} onSortChange={props.onSortChange} />
        </div>
      </div>

      <div class="flex items-center gap-3 lg:hidden">
        <button
          type="button"
          onClick={props.onOpenMobileFilter}
          class="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-pill border border-surface-gray bg-white px-4 text-sm font-semibold text-ink"
        >
          <FilterIcon class="size-[18px]" />
          <Show when={props.activeFilterCount > 0} fallback="ตัวกรอง">
            ตัวกรอง ({props.activeFilterCount})
          </Show>
        </button>
        <SortSelect sort={props.sort} onSortChange={props.onSortChange} class="min-h-[44px] flex-1" />
      </div>
    </div>
  );
}

function SortSelect(props: { sort: SortValue; onSortChange: (sort: SortValue) => void; class?: string }) {
  return (
    <div class={`relative flex h-[39px] items-center gap-2 rounded-pill border border-surface-gray bg-white px-4 ${props.class ?? ""}`}>
      <label for="listing-sort" class="shrink-0 whitespace-nowrap text-sm font-medium text-ink-gray">
        เรียงตาม:
      </label>
      <select
        id="listing-sort"
        value={props.sort}
        onChange={(e) => props.onSortChange(e.currentTarget.value as SortValue)}
        class="w-full appearance-none bg-transparent pr-5 text-sm font-semibold text-ink outline-none"
      >
        {SORT_OPTIONS.map((opt) => (
          <option value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <ChevronIcon class="pointer-events-none absolute right-3 size-4 text-ink-gray" />
    </div>
  );
}

function GridIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function ListIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <path d="M8 6h13M8 12h13M8 18h13" stroke-linecap="round" />
      <path d="M3 6h.01M3 12h.01M3 18h.01" stroke-linecap="round" stroke-width="2.4" />
    </svg>
  );
}

function FilterIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <path d="M4 6h16M7 12h10M10 18h4" stroke-linecap="round" />
    </svg>
  );
}

function ChevronIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class} fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
      <path d="M6 9l6 6 6-6" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}
