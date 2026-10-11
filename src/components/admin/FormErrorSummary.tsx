import { For, Show } from "solid-js";
import { scrollToField, type FormErrors } from "~/lib/adminFormValidation";
import { WarningIcon } from "~/components/checkout/WarningIcon";

/**
 * Top-of-form list of what still blocks saving (see `~/lib/adminFormValidation`).
 * Each field name scrolls to that field. Renders nothing when the form is clean.
 */
export function FormErrorSummary(props: { errors: FormErrors; labels?: Record<string, string> }) {
  const keys = () => Object.keys(props.errors);
  return (
    <Show when={keys().length > 0}>
      <div role="alert" class="flex gap-3 rounded-card border border-system-red/40 bg-danger-soft p-4">
        <span class="flex size-8 shrink-0 items-center justify-center rounded-pill bg-system-red text-white" aria-hidden="true">
          <WarningIcon class="size-4" />
        </span>
        <div class="flex min-w-0 flex-1 flex-col gap-1.5">
          <p class="text-sm font-semibold text-danger-strong">ยังกรอกข้อมูลไม่ครบ {keys().length} รายการ</p>
          <ul class="flex flex-wrap gap-x-4 gap-y-1">
            <For each={keys()}>
              {(key) => (
                <li>
                  <button type="button" onClick={() => scrollToField(key)} class="text-sm text-danger-strong underline">
                    {props.labels?.[key] ?? props.errors[key]}
                  </button>
                </li>
              )}
            </For>
          </ul>
        </div>
      </div>
    </Show>
  );
}
