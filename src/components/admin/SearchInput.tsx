import { Show } from "solid-js";
import { SearchIcon, CloseXIcon } from "./icons";

/**
 * Reusable search box (PART 27) — meant for Products today and Orders/
 * Customers/Reviews once those modules exist, so it takes plain
 * value/onInput rather than anything Product-shaped.
 */
export function SearchInput(props: {
  value: string;
  onInput: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  class?: string;
}) {
  return (
    <div class={`relative flex min-h-11 items-center ${props.class ?? ""}`}>
      <SearchIcon class="pointer-events-none absolute left-3.5 size-4 text-ink-placeholder" />
      <input
        type="text"
        value={props.value}
        disabled={props.disabled}
        placeholder={props.placeholder ?? "ค้นหา..."}
        onInput={(e) => props.onInput(e.currentTarget.value)}
        class="h-11 w-full rounded-pill border border-surface-gray bg-white py-2 pl-10 pr-10 text-sm text-ink outline-none transition-colors duration-150 placeholder:text-ink-placeholder focus:border-brand-pink disabled:cursor-not-allowed disabled:bg-surface-gray disabled:text-ink-gray"
      />
      <Show when={props.value.length > 0 && !props.disabled}>
        <button
          type="button"
          onClick={() => props.onInput("")}
          aria-label="ล้างการค้นหา"
          class="absolute right-2 flex size-8 items-center justify-center rounded-pill text-ink-gray hover:bg-surface-gray"
        >
          <CloseXIcon class="size-3" />
        </button>
      </Show>
    </div>
  );
}
