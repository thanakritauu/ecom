import { Dialog } from "@kobalte/core/dialog";
import { Button } from "~/components/shared/Button";

/**
 * One generic confirmation modal (PART 28) reused for every "are you sure"
 * moment Product Management needs (delete, disable, ...) instead of a
 * bespoke dialog per action. Same Kobalte Dialog + centered-modal treatment
 * as DateRangeSelector's custom-range dialog from Phase 02.
 */
export function ConfirmDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
  loading?: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay class="fixed inset-0 z-40 bg-ink/40 motion-reduce:animate-none data-[expanded]:animate-overlay-in data-[closed]:animate-overlay-out" />
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Content class="w-full max-w-sm rounded-card bg-surface-card p-5 shadow-card outline-none motion-reduce:animate-none data-[expanded]:animate-modal-in data-[closed]:animate-modal-out">
            <Dialog.Title class="text-lg font-semibold text-ink">{props.title}</Dialog.Title>
            <Dialog.Description class="mt-2 text-sm text-ink-gray">{props.description}</Dialog.Description>
            <div class="mt-5 flex gap-3">
              <Button type="button" variant="outline" class="flex-1" onClick={() => props.onOpenChange(false)} disabled={props.loading}>
                {props.cancelLabel ?? "ยกเลิก"}
              </Button>
              <Button
                type="button"
                variant="primary"
                class={`flex-1 ${props.tone === "danger" ? "!bg-system-red hover:!bg-system-red/90" : ""}`}
                onClick={props.onConfirm}
                loading={props.loading}
              >
                {props.confirmLabel}
              </Button>
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog>
  );
}
