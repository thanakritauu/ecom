import { createRoot, createSignal, For, Show } from "solid-js";
import { Portal } from "solid-js/web";
import { CloseIcon } from "~/components/shared/icons";

export type ToastTone = "success" | "warning" | "error" | "info";

type Toast = {
  id: number;
  message: string;
  /** Optional second line (e.g. auth's "ยินดีต้อนรับกลับมา 👋") — every existing single-line call site is unaffected. */
  description?: string;
  tone: ToastTone;
};

// Wrapped in `createRoot` so this module-scope signal has an owner to be
// disposed under — otherwise Solid's dev build warns "computations created
// outside a `createRoot` or `render` will never be disposed" on every load.
const [toasts, setToasts] = createRoot(() => createSignal<Toast[]>([]));
let nextId = 0;

/**
 * Toast Final Specification (Global UI Correction — Final Refinement #22-24)
 * — this overrides every earlier toast color spec in the project. Meaning
 * now lives entirely in a *soft* semantic background; icon and text stay
 * normal dark ink so the message reads as calmly as any other card, not a
 * loud alert banner. Maps onto the design system's `*-soft` tokens
 * (`success-soft`/`warning-soft`/`danger-soft`/`info-soft`) — `warning-soft`
 * and `info-soft` were promoted from StatusBadge's inline hex values into
 * named tokens for this (tailwind.config.cjs). `error` doubles as
 * "Destructive" per the rule's own precedent (a successful Cancel Order
 * still reads as `error`) — callers choose `error` for that class of event,
 * not only for genuine failures.
 */
const toneClass: Record<ToastTone, string> = {
  success: "bg-success-soft",
  warning: "bg-warning-soft",
  error: "bg-danger-soft",
  info: "bg-info-soft",
};

function ToastIcon(props: { tone: ToastTone; class?: string }) {
  switch (props.tone) {
    case "success":
      return (
        <svg viewBox="0 0 24 24" class={props.class} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="m8 12.5 2.5 2.5L16 9.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      );
    case "warning":
      return (
        <svg viewBox="0 0 24 24" class={props.class} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
          <path d="M12 3.5 21 19H3L12 3.5Z" stroke-linejoin="round" />
          <path d="M12 10v4" stroke-linecap="round" />
          <circle cx="12" cy="16.7" r="0.9" fill="currentColor" stroke="none" />
        </svg>
      );
    case "error":
      return (
        <svg viewBox="0 0 24 24" class={props.class} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="m9 9 6 6M15 9l-6 6" stroke-linecap="round" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" class={props.class} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5.2" stroke-linecap="round" />
          <circle cx="12" cy="7.8" r="0.9" fill="currentColor" stroke="none" />
        </svg>
      );
  }
}

/** Errors/destructive events stay on screen longer than a routine success — PART 9's "Error ที่สำคัญควรอยู่นานกว่า Success". */
const toneDurationMs: Record<ToastTone, number> = {
  success: 2800,
  info: 2800,
  warning: 3600,
  error: 4200,
};

/**
 * Minimal global toast queue. No provider/context needed since a page only
 * ever needs one toast viewport — `pushToast` can be called from anywhere
 * (product card, newsletter form, coupon button, auth modal, ...).
 */
export function pushToast(message: string, tone: ToastTone = "success", description?: string) {
  const id = nextId++;
  setToasts((list) => [...list, { id, message, tone, description }]);
  setTimeout(() => dismissToast(id), toneDurationMs[tone]);
}

/** Manual dismiss (the reference spec's "×" button) — same removal the auto-dismiss timeout already does, just triggered early. */
function dismissToast(id: number) {
  setToasts((list) => list.filter((t) => t.id !== id));
}

export function ToastViewport() {
  return (
    <Show when={toasts().length > 0}>
      <Portal>
        {/* bottom-24 (not bottom-4) so a page's own fixed bottom action bar
            (AdminFloatingBar, StickyAddToCartBar, ...) never sits under a
            toast — PART 9's "ไม่บัง Floating Action Bar / มีระยะห่างจาก
            Bottom Action Bar" — this clears one comfortably whether or not
            the current page actually has one mounted. */}
        <div class="fixed inset-x-4 bottom-24 z-[100] mx-auto flex max-w-[420px] flex-col gap-2" role="status" aria-live="polite">
          <For each={toasts()}>
            {(toast) => (
              <div
                class={`flex w-full min-w-0 items-start gap-2.5 break-words rounded-card px-4 py-3 text-left text-ink animate-toast-in shadow-card motion-reduce:animate-none ${toneClass[toast.tone]}`}
              >
                <ToastIcon tone={toast.tone} class="mt-0.5 size-5 shrink-0 text-ink" />
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-semibold">{toast.message}</p>
                  <Show when={toast.description}>
                    <p class="mt-0.5 text-xs text-ink-gray">{toast.description}</p>
                  </Show>
                </div>
                <button
                  type="button"
                  onClick={() => dismissToast(toast.id)}
                  aria-label="ปิด"
                  class="-m-1 flex size-6 shrink-0 items-center justify-center rounded-pill text-ink-gray transition-colors duration-150 hover:bg-ink/10 hover:text-ink"
                >
                  <CloseIcon class="size-3" />
                </button>
              </div>
            )}
          </For>
        </div>
      </Portal>
    </Show>
  );
}
