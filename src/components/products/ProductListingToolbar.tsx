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
  /** Defaults to "สินค้าทั้งหมด" (All Products' own title) — Category Listing pages pass their own title (e.g. "FACE") so this same toolbar reads correctly there too, instead of a second toolbar component. */
  title?: string;
  /** Items on this page (after filters) — shown as "N รายการ". */
  totalCount: number;
  view: ListingView;
  onViewChange: (view: ListingView) => void;
  sort: SortValue;
  onSortChange: (sort: SortValue) => void;
  activeFilterCount: number;
  /** The page renders its own centred heading (`ListingHeading`) — this row keeps only the count + controls. */
  hideTitle?: boolean;
  /** Omit entirely (e.g. Category Listing, which has no Filter Sidebar) to hide the mobile "ตัวกรอง" button — Sort alone then fills the row. */
  onOpenMobileFilter?: () => void;
}) {
  return (
    <div class="flex w-full flex-col gap-3">
      {/* Desktop: (optional title) + view toggle and sort on the right. */}
      <div class="hidden w-full items-center justify-between gap-3 lg:flex">
        <div class="flex items-baseline gap-4">
          <Show when={!props.hideTitle}>
            <h1 class="text-2xl font-bold text-ink lg:text-[31px]">{props.title ?? "สินค้าทั้งหมด"}</h1>
          </Show>
          <ItemCount count={props.totalCount} />
        </div>
        <div class="flex items-center gap-3">
          <ViewToggle view={props.view} onViewChange={props.onViewChange} />
          <SortSelect sort={props.sort} onSortChange={props.onSortChange} />
        </div>
      </div>
      <Show when={!props.hideTitle}>
        <h1 class="text-2xl font-bold text-ink lg:hidden">{props.title ?? "สินค้าทั้งหมด"}</h1>
      </Show>

      {/* Tablet/phone: the filter on its own full-width row, then sort + view. */}
      <Show when={props.onOpenMobileFilter}>
        {(onOpenMobileFilter) => (
          <button
            type="button"
            onClick={onOpenMobileFilter()}
            class="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-pill border border-surface-gray bg-white px-4 text-sm font-medium text-ink lg:hidden"
          >
            <FilterIcon class="size-[18px]" />
            <Show when={props.activeFilterCount > 0} fallback="ตัวกรอง">
              ตัวกรอง ({props.activeFilterCount})
            </Show>
          </button>
        )}
      </Show>
      {/* Count | sort | view — one row at every size. */}
      <div class="flex items-center gap-2 sm:gap-3 lg:hidden">
        <ItemCount count={props.totalCount} class="shrink-0 whitespace-nowrap" />
        <SortSelect sort={props.sort} onSortChange={props.onSortChange} class="min-h-[44px] min-w-0 flex-1" />
        {/* Grid/list on phones too — the list card has its own phone layout. */}
        <ViewToggle view={props.view} onViewChange={props.onViewChange} class="h-[44px]" />
      </div>
    </div>
  );
}

function ItemCount(props: { count: number; class?: string }) {
  return <p class={`text-sm text-ink-gray ${props.class ?? ""}`}>{props.count.toLocaleString("th-TH")} รายการ</p>;
}

function ViewToggle(props: { view: ListingView; onViewChange: (view: ListingView) => void; class?: string }) {
  return (
    <div class={`flex shrink-0 items-center gap-1 rounded-pill border border-surface-gray bg-white p-1 ${props.class ?? "h-[39px]"}`}>
      <button
        type="button"
        aria-pressed={props.view === "grid"}
        aria-label="มุมมองตาราง"
        onClick={() => props.onViewChange("grid")}
        class="flex h-full aspect-square items-center justify-center rounded-pill transition-colors duration-150"
        classList={{ "bg-surface-pink text-brand-pink": props.view === "grid", "text-ink-gray": props.view !== "grid" }}
      >
        <GridIcon class="size-[18px]" />
      </button>
      <button
        type="button"
        aria-pressed={props.view === "list"}
        aria-label="มุมมองรายการ"
        onClick={() => props.onViewChange("list")}
        class="flex h-full aspect-square items-center justify-center rounded-pill transition-colors duration-150"
        classList={{ "bg-surface-pink text-brand-pink": props.view === "list", "text-ink-gray": props.view !== "list" }}
      >
        <ListIcon class="size-[18px]" />
      </button>
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
