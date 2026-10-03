import { Dialog } from "@kobalte/core/dialog";
import { createSignal, For, Show } from "solid-js";
import { SearchInput } from "./SearchInput";
import { Button } from "~/components/shared/Button";
import { ChevronDownIcon, CloseXIcon } from "./icons";

export type SelectFilterOption = { value: string; label: string };
export type SelectFilterConfig = {
  id: string;
  label: string;
  value: string;
  options: SelectFilterOption[];
};

/**
 * Reusable list toolbar (PART 26) — Search + N select-style filters + one
 * Sort select. Deliberately not Product-shaped: a caller (Products today,
 * Orders/Customers/Inventory/Reviews later) passes its own filter configs
 * and reads results back through plain id/value pairs. Desktop shows every
 * filter inline (native `<select>`, same pill style Product Listing's own
 * Sort dropdown already uses); mobile collapses them into one "ตัวกรอง"
 * button that opens a bottom sheet with a draft-then-Apply step, matching
 * the customer Product Listing's MobileFilterDrawer pattern.
 */
export function FilterBar(props: {
  search: { value: string; onInput: (value: string) => void; placeholder?: string };
  filters: SelectFilterConfig[];
  onFilterChange: (id: string, value: string) => void;
  sort: { value: string; options: SelectFilterOption[]; onChange: (value: string) => void };
}) {
  const [mobileOpen, setMobileOpen] = createSignal(false);
  const [draft, setDraft] = createSignal<Record<string, string>>({});

  const activeCount = () => props.filters.filter((f) => f.value !== "all").length;

  const openMobile = () => {
    setDraft(Object.fromEntries(props.filters.map((f) => [f.id, f.value])));
    setMobileOpen(true);
  };

  const applyMobile = () => {
    Object.entries(draft()).forEach(([id, value]) => props.onFilterChange(id, value));
    setMobileOpen(false);
  };

  const resetMobile = () => {
    setDraft(Object.fromEntries(props.filters.map((f) => [f.id, "all"])));
  };

  return (
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
      <SearchInput
        class="sm:flex-1"
        value={props.search.value}
        onInput={props.search.onInput}
        placeholder={props.search.placeholder}
      />

      <div class="flex items-center gap-2">
        <div class="hidden items-center gap-2 lg:flex">
          <For each={props.filters}>
            {(filter) => <NativeSelect config={filter} onChange={(value) => props.onFilterChange(filter.id, value)} />}
          </For>
        </div>

        <Show when={props.filters.length > 0}>
          <button
            type="button"
            onClick={openMobile}
            class="flex min-h-11 shrink-0 items-center gap-2 rounded-pill border border-border bg-surface-card px-4 text-sm font-medium text-ink lg:hidden"
          >
            ตัวกรอง
            <Show when={activeCount() > 0}>
              <span class="flex size-5 items-center justify-center rounded-pill bg-brand-pink text-xs font-medium text-white">
                {activeCount()}
              </span>
            </Show>
          </button>
        </Show>

        <NativeSelect
          config={{ id: "sort", label: "เรียงตาม", value: props.sort.value, options: props.sort.options }}
          onChange={props.sort.onChange}
        />
      </div>

      <Dialog open={mobileOpen()} onOpenChange={setMobileOpen}>
        <Dialog.Portal>
          <Dialog.Overlay class="fixed inset-0 z-40 bg-ink/40 motion-reduce:animate-none data-[expanded]:animate-overlay-in data-[closed]:animate-overlay-out" />
          <div class="fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col">
            <Dialog.Content class="flex max-h-[85vh] flex-col overflow-hidden rounded-t-card bg-surface-card shadow-card outline-none motion-reduce:animate-none data-[expanded]:animate-sheet-in data-[closed]:animate-sheet-out">
              <div class="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
                <Dialog.Title class="text-lg font-semibold text-ink">ตัวกรอง</Dialog.Title>
                <Dialog.CloseButton
                  aria-label="ปิดตัวกรอง"
                  class="flex size-11 items-center justify-center rounded-pill bg-surface-gray text-ink hover:bg-surface-gray/70"
                >
                  <CloseXIcon />
                </Dialog.CloseButton>
              </div>
              <div class="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
                <For each={props.filters}>
                  {(filter) => (
                    <div class="flex flex-col gap-1.5">
                      <label class="text-sm font-medium text-ink">{filter.label}</label>
                      <div class="relative">
                        <select
                          value={draft()[filter.id] ?? filter.value}
                          onChange={(e) => setDraft((d) => ({ ...d, [filter.id]: e.currentTarget.value }))}
                          class="h-11 w-full appearance-none rounded-card border border-border bg-surface-card py-3 pl-3 pr-9 text-sm text-ink outline-none focus:border-brand-pink"
                        >
                          <For each={filter.options}>{(opt) => <option value={opt.value}>{opt.label}</option>}</For>
                        </select>
                        <ChevronDownIcon class="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-gray" />
                      </div>
                    </div>
                  )}
                </For>
              </div>
              <div class="flex shrink-0 gap-3 border-t border-border p-4">
                <Button type="button" variant="outline" class="flex-1" onClick={resetMobile}>
                  ล้างตัวกรอง
                </Button>
                <Button type="button" variant="primary" class="flex-1" onClick={applyMobile}>
                  แสดงผล
                </Button>
              </div>
            </Dialog.Content>
          </div>
        </Dialog.Portal>
      </Dialog>
    </div>
  );
}

/** §22 — the arrow previously sat almost flush with the pill's own edge (`right-3` inside `px-4`, `pr-5` on the select); this gives it real breathing room on both sides, consistent with every other dropdown. */
function NativeSelect(props: { config: SelectFilterConfig; onChange: (value: string) => void }) {
  return (
    <div class="relative flex h-11 shrink-0 items-center rounded-pill border border-border bg-surface-card pl-4 pr-9">
      <span class="sr-only">{props.config.label}</span>
      <select
        aria-label={props.config.label}
        value={props.config.value}
        onChange={(e) => props.onChange(e.currentTarget.value)}
        class="w-full max-w-[9rem] appearance-none bg-transparent text-sm font-medium text-ink outline-none"
      >
        <For each={props.config.options}>{(opt) => <option value={opt.value}>{opt.label}</option>}</For>
      </select>
      <ChevronDownIcon class="pointer-events-none absolute right-3.5 size-4 text-ink-gray" />
    </div>
  );
}
