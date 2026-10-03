import { Dialog } from "@kobalte/core/dialog";
import type { JSX } from "solid-js";
import { Button } from "~/components/shared/Button";
import { CloseXIcon } from "./icons";

/**
 * Global Admin UX Rule #10-15 — "Fast Scan → Quick Check → Full Detail only
 * when needed". Reused by every list module (Products, Orders, and future
 * Customers/Inventory/...) instead of one bespoke drawer per entity: this
 * component only owns the shell (slide-in-from-right, overlay, ESC/
 * click-outside/close-button, and the fixed "ดูรายละเอียดทั้งหมด" footer);
 * each entity supplies its own summary fields as `children`.
 *
 * Same Kobalte Dialog + `drawer-in`/`drawer-out` animation CartDrawer already
 * uses, just anchored right instead of left/right-as-cart. Width sits in the
 * 420–560px range on desktop (PART 11); full-width on mobile, still a
 * right-side *drawer* (not a full page) so the list underneath isn't lost —
 * closing it returns exactly where the list was scrolled to.
 */
export function QuickViewDrawer(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  onViewFull: () => void;
  children: JSX.Element;
}) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay class="fixed inset-0 z-40 bg-ink/40 motion-reduce:animate-none data-[expanded]:animate-overlay-in data-[closed]:animate-overlay-out" />
        <div class="fixed inset-y-0 right-0 z-50 flex w-full sm:w-[480px]">
          <Dialog.Content class="flex size-full flex-col overflow-hidden bg-surface-card shadow-card outline-none motion-reduce:animate-none data-[expanded]:animate-drawer-in data-[closed]:animate-drawer-out">
            <div class="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4">
              <div class="min-w-0">
                <Dialog.Title class="truncate text-lg font-semibold text-ink">{props.title}</Dialog.Title>
                {props.subtitle ? <p class="truncate text-sm text-ink-gray">{props.subtitle}</p> : null}
              </div>
              <Dialog.CloseButton
                aria-label="ปิด"
                class="flex size-11 shrink-0 items-center justify-center rounded-pill text-ink-gray transition-colors duration-150 hover:bg-surface-pink"
              >
                <CloseXIcon />
              </Dialog.CloseButton>
            </div>

            <div class="flex-1 overflow-y-auto p-5">{props.children}</div>

            <div class="shrink-0 border-t border-border p-4" style={{ "padding-bottom": "max(1rem, env(safe-area-inset-bottom))" }}>
              <Button type="button" variant="primary" onClick={props.onViewFull} class="w-full">
                ดูรายละเอียดทั้งหมด
              </Button>
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog>
  );
}
