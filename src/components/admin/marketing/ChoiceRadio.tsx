import { For, Show } from "solid-js";

/**
 * A small radio group of bordered choices ("ระดับสินค้า" / "ระดับตัวเลือกสินค้า",
 * "ทั้งสินค้า" / "เลือกตัวเลือกสินค้า"). Shared by the Flash Sale editor and
 * the promotion form's product scope.
 */
export function ChoiceRadio<T extends string>(props: {
  name: string;
  value: T;
  options: { value: T; label: string; hint?: string; disabled?: boolean }[];
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <div role="radiogroup" class="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      <For each={props.options}>
        {(option) => (
          <label
            class="flex min-h-11 cursor-pointer items-start gap-2.5 rounded-card border px-3 py-2.5 text-sm transition-colors duration-150 sm:flex-1"
            classList={{
              "border-brand-pink bg-surface-pink/40": props.value === option.value,
              "border-border bg-surface-card": props.value !== option.value,
              "cursor-not-allowed opacity-60": !!(props.disabled || option.disabled),
            }}
          >
            <input
              type="radio"
              name={props.name}
              checked={props.value === option.value}
              disabled={props.disabled || option.disabled}
              onChange={() => props.onChange(option.value)}
              class="mt-0.5 size-4 shrink-0 accent-brand-pink"
            />
            <span class="flex min-w-0 flex-col gap-0.5">
              <span class="font-medium text-ink">{option.label}</span>
              <Show when={option.hint}>
                <span class="text-xs text-ink-gray">{option.hint}</span>
              </Show>
            </span>
          </label>
        )}
      </For>
    </div>
  );
}
