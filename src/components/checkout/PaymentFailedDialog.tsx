import { Dialog } from "@kobalte/core/dialog";
import { FAILURE_MESSAGES, type PaymentFailureReason } from "~/lib/payment";
import { Button } from "../shared/Button";
import { CloseMark } from "../shared/icons";
import { WarningIcon } from "./WarningIcon";

/**
 * Beam came back cancelled / failed — a centered alert card (the Home promo popup's overlay + card
 * language, not the 668px sheet: one message, two actions). The order already exists as
 * "รอชำระเงิน", so it says where to pay later. The red inline boxes in `PaymentSection` stay
 * on the page after this closes.
 */
export function PaymentFailedDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason: PaymentFailureReason;
  /** Opens Beam again — runs inside the click (popup blockers). */
  onRetry: () => void;
}) {
  const msg = () => FAILURE_MESSAGES[props.reason];
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay class="fixed inset-0 z-40 bg-ink/60 data-[expanded]:animate-toast-in" />
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Content role="alertdialog" class="relative flex max-h-[90dvh] w-full max-w-[400px] flex-col items-center gap-4 overflow-y-auto rounded-card bg-white px-5 pb-6 pt-8 text-center shadow-card outline-none sm:max-w-[460px] sm:px-8 sm:pb-8 data-[expanded]:animate-toast-in">
            <Dialog.CloseButton class="group absolute right-1 top-1 flex size-11 items-center justify-center">
              <CloseMark />
              <span class="sr-only">ปิด</span>
            </Dialog.CloseButton>

            <span class="flex size-16 shrink-0 items-center justify-center rounded-pill bg-danger-soft text-system-red ring-2 ring-system-red" aria-hidden="true">
              <WarningIcon class="size-8" />
            </span>
            <div class="flex flex-col gap-1">
              <Dialog.Title class="text-2xl font-bold leading-[1.75] text-system-red">ไม่สามารถชำระเงินได้</Dialog.Title>
              <p class="font-semibold leading-[1.75] text-ink">{msg().title}</p>
            </div>
            <Dialog.Description class="flex flex-col gap-1 text-sm leading-[1.75] text-ink-gray sm:text-base sm:leading-[1.75]">
              <span>คำสั่งซื้อของคุณยังรอชำระเงินอยู่ ระบบยังไม่ได้ตัดเงินจากรายการนี้</span>
              <span>
                ชำระภายหลังได้ที่เมนู<span class="font-semibold text-ink">โปรไฟล์</span> หัวข้อ<span class="font-semibold text-ink">ประวัติการซื้อ</span>{" "}
                ในแท็บ<span class="font-semibold text-ink">รอชำระเงิน</span>
              </span>
            </Dialog.Description>

            <div class="mt-1 flex w-full flex-col gap-2">
              <Button type="button" variant="primary" size="lg" class="w-full" onClick={props.onRetry}>
                ลองชำระอีกครั้ง
              </Button>
              <Button href="/account?tab=pending_payment" variant="outline" size="lg" class="w-full" onClick={() => props.onOpenChange(false)}>
                ไปที่ประวัติการซื้อ
              </Button>
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog>
  );
}
