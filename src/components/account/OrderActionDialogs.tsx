import { Dialog } from "@kobalte/core/dialog";
import { createEffect, createSignal, on, Show, type JSX } from "solid-js";
import { Button } from "../shared/Button";
import { CloseMark } from "../shared/icons";

/** Bottom sheet on mobile, centered dialog from `sm:` — same shell as QuickAddSheet. */
export function Sheet(props: { open: boolean; onOpenChange: (open: boolean) => void; title: string; description?: string; children?: JSX.Element; footer?: JSX.Element }) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay class="fixed inset-0 z-40 bg-ink/40" />
        <div class="fixed inset-x-0 bottom-0 z-50 flex justify-center sm:inset-0 sm:items-center sm:p-4">
          <Dialog.Content class="flex max-h-[90dvh] w-full max-w-[480px] flex-col overflow-hidden rounded-t-card bg-white shadow-card sm:rounded-card">
            <div class="flex items-start justify-between gap-4 px-5 pb-2 pt-5">
              <div>
                <Dialog.Title class="text-lg font-semibold text-ink">{props.title}</Dialog.Title>
                <Show when={props.description}>
                  <Dialog.Description class="mt-1 text-sm text-ink-gray">{props.description}</Dialog.Description>
                </Show>
              </div>
              <Dialog.CloseButton class="group -mr-2 -mt-2 flex size-11 shrink-0 items-center justify-center">
                <CloseMark />
                <span class="sr-only">ปิด</span>
              </Dialog.CloseButton>
            </div>
            <Show when={props.children}>
              <div class="min-h-0 flex-1 overflow-y-auto px-5 py-3">{props.children}</div>
            </Show>
            <Show when={props.footer}>
              <div class="flex flex-col gap-2 border-t border-surface-gray px-5 py-4">{props.footer}</div>
            </Show>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog>
  );
}

/** "Delete this?" confirmation for the account pages (saved address, saved card). */
export function ConfirmRemoveDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
}) {
  const [status, setStatus] = createSignal<"idle" | "loading" | "error">("idle");
  createEffect(on(() => props.open, (open) => open && setStatus("idle")));

  const confirm = async () => {
    setStatus("loading");
    try {
      await props.onConfirm();
      props.onOpenChange(false);
    } catch {
      setStatus("error");
    }
  };

  return (
    <Sheet
      open={props.open}
      onOpenChange={props.onOpenChange}
      title={props.title}
      description={props.description}
      footer={
        <>
          <Show when={status() === "error"}>
            <p class="text-sm text-system-red" role="alert">
              ลบไม่สำเร็จ กรุณาลองอีกครั้ง
            </p>
          </Show>
          <Button type="button" variant="primary" size="lg" class="w-full !bg-system-red hover:!bg-system-red/90" loading={status() === "loading"} onClick={confirm}>
            {props.confirmLabel}
          </Button>
          <Button type="button" variant="outline" size="lg" class="w-full" disabled={status() === "loading"} onClick={() => props.onOpenChange(false)}>
            ยกเลิก
          </Button>
        </>
      }
    />
  );
}
