import { Dialog } from "@kobalte/core/dialog";
import { Show, type JSX } from "solid-js";

/**
 * Design system rule — the ONE modal frame (DSL baseline: the Product Option
 * Modal). Bottom sheet with a grab handle on phones, centered 668px dialog
 * from `sm`; pinned header (title + description, × close) with a full-bleed
 * divider, a body that is the only thing that scrolls (24px side padding),
 * and an optional pinned footer. Any new modal should be this component, not
 * a fresh Kobalte Dialog.
 *
 * - `height="fixed"` (default, option modal): 90dvh, 680px max on desktop —
 *   the frame doesn't jump while its content changes.
 * - `height="auto"`: grows with short content (e.g. a few coupons), same caps.
 * - `layer`: rendered over the whole sheet (e.g. a media viewer).
 */
export function SheetModal(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: JSX.Element;
  description?: JSX.Element;
  children: JSX.Element;
  footer?: JSX.Element;
  layer?: JSX.Element;
  height?: "fixed" | "auto";
  onEscapeKeyDown?: (e: KeyboardEvent) => void;
}) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay class="fixed inset-0 z-40 bg-ink/40 data-[expanded]:animate-toast-in" />
        <div class="fixed inset-x-0 bottom-0 z-50 flex justify-center sm:inset-0 sm:items-center sm:p-4">
          <Dialog.Content
            onEscapeKeyDown={props.onEscapeKeyDown}
            class="relative flex w-full max-w-[668px] flex-col overflow-hidden rounded-t-card bg-white py-4 shadow-card sm:rounded-card"
            classList={{
              "h-[90dvh] lg:h-[min(680px,90dvh)]": (props.height ?? "fixed") === "fixed",
              "max-h-[90dvh] lg:max-h-[min(680px,90dvh)]": props.height === "auto",
            }}
          >
            <div class="mx-auto mb-2 h-1 w-10 shrink-0 rounded-pill bg-surface-gray sm:hidden" aria-hidden="true" />

            <div class="flex shrink-0 items-start gap-3 border-b border-border px-6 pb-2">
              <div class="min-w-0 flex-1">
                <Dialog.Title class="break-words text-lg font-semibold text-ink">{props.title}</Dialog.Title>
                <Show when={props.description}>
                  <Dialog.Description class="text-[13.65px] leading-[19.792px] text-ink-gray">{props.description}</Dialog.Description>
                </Show>
              </div>
              <Dialog.CloseButton class="-mr-2 -mt-2 flex size-11 shrink-0 items-center justify-center rounded-pill text-2xl text-ink-gray hover:bg-surface-pink">
                <span aria-hidden="true">×</span>
                <span class="sr-only">ปิด</span>
              </Dialog.CloseButton>
            </div>

            <div class="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain px-6 pb-4 pt-4">{props.children}</div>

            <Show when={props.footer}>
              <div class="flex shrink-0 flex-col gap-2 border-t border-border px-6 pt-4">{props.footer}</div>
            </Show>
            {props.layer}
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog>
  );
}
