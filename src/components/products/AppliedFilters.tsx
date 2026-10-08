import { For, Show } from "solid-js";
import type { CategoryFacet, ProductFilters } from "~/lib/productListing";
import type { Product } from "~/lib/types";
import { CloseIcon } from "../shared/icons";

export function AppliedFilters(props: {
  products: Product[];
  filters: ProductFilters;
  facets: CategoryFacet[];
  onChange: (next: ProductFilters) => void;
  onClearAll: () => void;
}) {
  const categoryChips = () =>
    props.filters.categories.map((key) => ({ key, label: props.facets.find((f) => f.key === key)?.label ?? key }));

  const hasSearchChip = () => props.filters.search.trim() !== "";

  const removeCategory = (key: string) => props.onChange({ ...props.filters, categories: props.filters.categories.filter((k) => k !== key) });
  const removeSearch = () => props.onChange({ ...props.filters, search: "" });

  return (
    <div class="flex flex-wrap items-center gap-2 pb-4">
      <Show when={hasSearchChip()}>
        <Chip label={`"${props.filters.search}"`} onRemove={removeSearch} />
      </Show>
      <For each={categoryChips()}>{(chip) => <Chip label={chip.label} onRemove={() => removeCategory(chip.key)} />}</For>
      <button type="button" onClick={props.onClearAll} class="flex min-h-[32px] items-center px-1.5 py-1 text-xs font-medium text-ink-gray underline">
        ล้างทั้งหมด
      </button>
    </div>
  );
}

function Chip(props: { label: string; onRemove: () => void }) {
  return (
    <span class="flex h-[31px] items-center gap-1.5 rounded-pill border border-brand-pink bg-surface-pink px-3 text-xs font-semibold text-brand-pink">
      {props.label}
      <button type="button" onClick={props.onRemove} aria-label={`ลบตัวกรอง ${props.label}`} class="flex size-4 shrink-0 items-center justify-center">
        <CloseIcon class="size-3" />
      </button>
    </span>
  );
}
