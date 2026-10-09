import { For, Show, type JSX } from "solid-js";
import { ChevronDownIcon } from "./icons";

export type SelectFieldOption = { value: string; label: string; disabled?: boolean };

/**
 * The form select every admin form copies by hand (ADMIN_DSL 6): label with
 * red `*` when required, native select in the TextField shell, chevron,
 * helper text and error. Pass `placeholder` for an empty first option
 * (`ไม่ระบุ` when optional, `เลือก{noun}` when required).
 */
export function SelectField(props: {
  label: string;
  value: string;
  options: SelectFieldOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  hint?: JSX.Element;
  class?: string;
  name?: string;
}) {
  return (
    <label class={`flex flex-col gap-1.5 ${props.class ?? ""}`}>
      <span class="text-sm font-medium text-ink">
        {props.label}
        <Show when={props.required}>
          {" "}
          <span class="text-system-red">*</span>
        </Show>
      </span>
      <div class="relative">
        <select
          name={props.name}
          value={props.value}
          disabled={props.disabled}
          aria-invalid={props.error ? true : undefined}
          onChange={(e) => props.onChange(e.currentTarget.value)}
          class={`h-11 w-full appearance-none rounded-card border bg-surface-card pl-4 pr-9 text-sm text-ink outline-none focus:border-brand-pink disabled:cursor-not-allowed disabled:bg-surface-gray ${
            props.error ? "border-system-red" : "border-border"
          }`}
        >
          <Show when={props.placeholder !== undefined}>
            <option value="">{props.placeholder}</option>
          </Show>
          <For each={props.options}>
            {(opt) => (
              <option value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            )}
          </For>
        </select>
        <ChevronDownIcon class="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-gray" />
      </div>
      <Show when={props.hint && !props.error}>
        <span class="text-xs text-ink-gray">{props.hint}</span>
      </Show>
      <Show when={props.error}>
        <p class="text-sm text-system-red">{props.error}</p>
      </Show>
    </label>
  );
}
