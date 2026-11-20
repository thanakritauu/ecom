import { createSignal } from "solid-js";
import type { Order } from "~/lib/types";
import { SheetModal } from "../shared/SheetModal";
import { Button } from "../shared/Button";
import { pushToast } from "~/lib/toast";
import coinMark from "~/assets/icons/charmiss-coin.png";

/**
 * "ยืนยันรับสินค้า" on a delivered order (`canConfirmReceived`): the order's คะแนน Charmiss Club are credited
 * at once instead of after the loyalty system's 7-15 days, and a return is no longer possible. On success the
 * review dialog opens next (`onConfirmed`, or the order list's `openReviewNow`); reviewing is optional.
 */
export function ConfirmReceivedDialog(props: {
  order: Order;
  /** คะแนน this order earns (`computeCoinsEarned`). */
  points: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Saves the confirmation (`createOrderHistory().confirmReceived`) and credits the points. */
  onConfirm: () => Promise<Order>;
  /** After saving, e.g. open the review dialog next (the order list does this itself: `openReviewNow`). */
  onConfirmed?: (order: Order) => void;
}) {
  const [saving, setSaving] = createSignal(false);
  const [error, setError] = createSignal<string>();
  const pointsLabel = () => props.points.toLocaleString("th-TH");

  const confirm = async () => {
    setSaving(true);
    setError(undefined);
    try {
      const updated = await props.onConfirm();
      props.onOpenChange(false);
      pushToast(`ได้รับ +${pointsLabel()} คะแนนแล้ว`, "success", "ขอบคุณที่ยืนยันรับสินค้า");
      props.onConfirmed?.(updated);
    } catch {
      setError("ยืนยันรับสินค้าไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SheetModal
      open={props.open}
      onOpenChange={(open) => !saving() && props.onOpenChange(open)}
      height="auto"
      title="ยืนยันรับสินค้า"
      description={`คำสั่งซื้อ ${props.order.id}`}
      footer={
        <Button type="button" variant="primary" size="lg" class="w-full" loading={saving()} onClick={confirm}>
          ยืนยันรับสินค้าเพื่อรับ {pointsLabel()} คะแนน
        </Button>
      }
    >
      <div class="flex flex-col gap-4">
        <div class="flex items-center gap-3 rounded-card bg-surface-pink p-4">
          <img src={coinMark} alt="" class="size-10 shrink-0" />
          <div class="min-w-0">
            <p class="text-sm text-ink-gray">กดยืนยันแล้วจะได้รับคะแนนทันที</p>
            <p class="text-xl font-bold text-brand-pink">+{pointsLabel()} คะแนน</p>
          </div>
        </div>
        <p class="text-sm leading-[1.75] text-ink-gray">
          เมื่อยืนยันรับสินค้าแล้ว จะไม่สามารถขอคืนสินค้าได้ หากยังไม่กดยืนยัน คะแนนจะเข้าบัญชีภายใน 7-15 วันทำการหลังจัดส่งสำเร็จ
        </p>
        {error() && <p class="text-sm text-system-red">{error()}</p>}
      </div>
    </SheetModal>
  );
}
