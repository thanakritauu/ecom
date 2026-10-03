import { Show, createUniqueId, splitProps, type JSX } from "solid-js";

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
      <label for={id} class="text-sm font-medium text-ink">
        {local.label}
        <Show when={local.required}>
          <span class="text-system-red" aria-hidden="true">
            {" "}
            *
          </span>
        </Show>
      </label>
      <input
        {...rest}
        id={id}
        aria-invalid={!!local.error}
        aria-describedby={local.error ? errorId : undefined}
        class={`h-11 rounded-card border bg-surface-card px-4 text-base text-ink outline-none transition-colors duration-150 placeholder:text-ink-placeholder focus:border-brand-pink disabled:cursor-not-allowed disabled:bg-surface-gray disabled:text-ink-gray ${
          local.error ? "border-system-red" : "border-border"
        } ${local.class ?? ""}`}
      />
      <Show when={local.error}>
        <p id={errorId} role="alert" class="text-sm text-system-red">
          {local.error}
        </p>
      </Show>
    </div>
  );
}
