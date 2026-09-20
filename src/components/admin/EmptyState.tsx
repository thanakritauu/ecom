import type { JSX } from "solid-js";
import { Show } from "solid-js";
import { Button } from "~/components/shared/Button";

/**
 * One shape covers both "no data yet" (PART 24) and "this widget failed to
 * load" (PART 25) — an icon, a title, a short description, and an optional
 * action button is the same layout either way; only the tone and the
 * action's label differ. Reused across every Dashboard section that can be
 * empty or error, and meant to keep being reused by Orders/Products/
 * Customers/Inventory/Reviews once those modules exist.
 */
export function EmptyState(props: {
  tone?: "neutral" | "error";
  icon?: JSX.Element;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  class?: string;
}) {
  const tone = props.tone ?? "neutral";
  return (
    <div class={`flex flex-col items-center gap-3 rounded-card px-6 py-10 text-center ${props.class ?? ""}`}>
      <Show when={props.icon}>
        <div class={`flex size-11 items-center justify-center rounded-pill ${tone === "error" ? "bg-danger-soft text-danger-strong" : "bg-surface-gray text-ink-gray"}`}>
          {props.icon}
        </div>
      </Show>
      <p class="text-sm font-semibold text-ink">{props.title}</p>
      <Show when={props.description}>
        <p class="max-w-xs text-sm text-ink-gray">{props.description}</p>
      </Show>
      <Show when={props.actionLabel && props.onAction}>
        <Button type="button" variant="outline" size="sm" onClick={props.onAction}>
          {props.actionLabel}
        </Button>
      </Show>
    </div>
  );
}
