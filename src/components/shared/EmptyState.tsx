import { Show, type Component } from "solid-js";
import { Dynamic } from "solid-js/web";
import { Button } from "./Button";

/**
 * Design system rule: the one empty state on the storefront. Whenever a
 * list or section can end up with nothing in it (reviews, orders, wishlist,
 * addresses, cards, coupons, search, listings), it shows this instead of a
 * blank box: an optional line icon in a soft pink circle, a short title,
 * one line of help, and an optional action (the shared `Button`).
 *
 * `size="page"` fills a page or panel body; `size="compact"` sits inside a
 * card, sheet or dropdown. Home merchandising rails don't use it: an empty
 * rail hides the whole section instead.
 *
 * Copy: plain Thai, say what is empty and what to do next.
 */
export type EmptyStateAction = {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "outline";
};

export function EmptyState(props: {
  /**
   * A line icon component from `icons.tsx` (pass the component itself, e.g. `icon={HeartIcon}`); it is sized here.
   * A component rather than an element so the icon is created once, in render order (safe for SSR hydration).
   */
  icon?: Component<{ class?: string }>;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  size?: "page" | "compact";
  class?: string;
}) {
  const compact = () => props.size === "compact";
  return (
    <div
      class={`flex w-full flex-col items-center text-center ${compact() ? "gap-2 px-4 py-8" : "gap-3 px-4 py-14 sm:py-16"} ${props.class ?? ""}`}
      role="status"
    >
      <Show when={props.icon}>
        {(icon) => (
          <span
            class={`flex shrink-0 items-center justify-center rounded-pill bg-surface-pink text-brand-pink ${compact() ? "mb-1 size-12" : "mb-1 size-16"}`}
            aria-hidden="true"
          >
            <Dynamic component={icon()} class={compact() ? "size-6" : "size-8"} />
          </span>
        )}
      </Show>
      <p class={`max-w-full text-ink [overflow-wrap:anywhere] ${compact() ? "text-base font-semibold" : "text-lg font-semibold"}`}>{props.title}</p>
      <Show when={props.description}>
        <p class={`max-w-xs leading-relaxed text-ink-gray ${compact() ? "text-xs sm:text-sm" : "text-sm"}`}>{props.description}</p>
      </Show>
      <Show when={props.action}>
        {(action) => (
          <div class={compact() ? "mt-1" : "mt-2"}>
            <Show
              when={action().href}
              fallback={
                <Button type="button" variant={action().variant ?? "primary"} size={compact() ? "sm" : "md"} onClick={() => action().onClick?.()}>
                  {action().label}
                </Button>
              }
            >
              {(href) => (
                <Button href={href()} variant={action().variant ?? "primary"} size={compact() ? "sm" : "md"}>
                  {action().label}
                </Button>
              )}
            </Show>
          </div>
        )}
      </Show>
    </div>
  );
}
