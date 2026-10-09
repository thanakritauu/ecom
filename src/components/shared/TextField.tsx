import { Show, createUniqueId, splitProps, type JSX } from "solid-js";

/**
 * The one error look every storefront form field uses (TextField, the address
 * form's textarea / phone / selects, card fields): red border on the control,
 * red text right under it. Export the pieces so non-`<input>` fields match.
 */
export const fieldBorderClass = (error?: string) => (error ? "border-system-red" : "border-border");

export function FieldLabel(props: { for: string; label: string; required?: boolean }) {
  return (
    <label for={props.for} class="text-sm font-medium text-ink">
      {props.label}
      <Show when={props.required}>
        <span class="text-system-red" aria-hidden="true">
          {" "}
          *
        </span>
      </Show>
    </label>
  );
}

/** Red text under a field — `id` is what the control's `aria-describedby` points at. */
export function FieldError(props: { id: string; message?: string }) {
  return (
    <Show when={props.message}>
      <p id={props.id} role="alert" class="text-sm leading-[1.75] text-system-red">
        {props.message}
      </p>
    </Show>
  );
}

/**
 * No boxed text-input existed anywhere in the project before Checkout —
 * every prior `<input>` (Search, the Footer newsletter form) is a plain
 * `bg-transparent` field inside an already-shaped pill, with no independent
 * border/error state of its own. Checkout's address/card forms need real
 * labels, required markers, and inline errors, so this establishes that one
 * missing piece using the same tokens (`border-border`, `border-brand-pink`,
 * `rounded-card`) everything else already uses — not a new design system.
 */
export function TextField(
  props: {
    label: string;
    error?: string;
    required?: boolean;
    class?: string;
  } & JSX.InputHTMLAttributes<HTMLInputElement>,
) {
  const [local, rest] = splitProps(props, ["label", "error", "required", "class", "id"]);
  const id = local.id ?? `field-${createUniqueId()}`;
  const errorId = `${id}-error`;

  return (
    <div class="flex flex-col gap-1.5">
      <FieldLabel for={id} label={local.label} required={local.required} />
      <input
        {...rest}
        id={id}
        aria-required={local.required || undefined}
        aria-invalid={!!local.error}
        aria-describedby={local.error ? errorId : undefined}
        class={`h-11 rounded-card border bg-surface-card px-4 text-base text-ink outline-none transition-colors duration-150 placeholder:text-ink-placeholder focus:border-brand-pink disabled:cursor-not-allowed disabled:bg-surface-gray disabled:text-ink-gray ${fieldBorderClass(
          local.error,
        )} ${local.class ?? ""}`}
      />
      <FieldError id={errorId} message={local.error} />
    </div>
  );
}
