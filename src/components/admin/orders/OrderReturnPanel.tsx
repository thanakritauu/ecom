import { createSignal, For, Show } from "solid-js";
import { Button } from "~/components/shared/Button";
import { StatusBadge } from "~/components/admin/StatusBadge";
import { ConfirmDialog } from "~/components/admin/ConfirmDialog";
import { formatAdminCurrency } from "~/lib/adminDashboard";
import { formatEventTime } from "~/lib/orderTracking";
import { RETURN_STATUS_META, returnRefundAmount, type AdminOrder, type ReturnRequestStatus } from "~/lib/adminOrders";
import { useAdminOrders } from "~/lib/adminOrderStore";
import { pushToast } from "~/lib/toast";

/**
 * The shopper's "ขอคืนสินค้า" request (storefront `ReturnRequest`: chosen
 * items, one of `RETURN_REASONS`, optional note) and Admin's decision on it.
 * Approve marks the payment คืนเงินแล้ว — mock only, no refund is issued.
 */
export function OrderReturnPanel(props: { order: AdminOrder }) {
  const store = useAdminOrders();
  const [pending, setPending] = createSignal<Exclude<ReturnRequestStatus, "requested"> | null>(null);
  const [saving, setSaving] = createSignal(false);
  const request = () => props.order.returnRequest!;
  const returnedItems = () => request().itemIndexes.map((i) => props.order.items[i]).filter(Boolean);

  const confirm = async () => {
    const decision = pending();
    if (!decision) return;
    setSaving(true);
    try {
      await store.decideReturn(props.order.id, decision);
      pushToast(decision === "approved" ? "อนุมัติคำขอคืนสินค้าแล้ว" : "ปฏิเสธคำขอคืนสินค้าแล้ว", decision === "approved" ? "success" : "error");
      setPending(null);
    } catch {
      pushToast("บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div class="flex flex-col gap-3 text-sm">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <span class="text-ink-gray">ส่งคำขอเมื่อ {formatEventTime(request().requestedAt)}</span>
        <StatusBadge tone={RETURN_STATUS_META[request().status].tone}>{RETURN_STATUS_META[request().status].label}</StatusBadge>
      </div>
      <div class="flex flex-col gap-2">
        <For each={returnedItems()}>
          {(item) => (
            <div class="flex items-center gap-3">
              <img src={item.image} alt="" class="size-10 shrink-0 rounded-media object-cover" />
              <div class="min-w-0 flex-1">
                <p class="truncate font-medium text-ink">{item.name}</p>
                <p class="text-xs text-ink-gray">
                  {item.variantLabel ? `${item.variantLabel} · ` : ""}× {item.qty}
                </p>
              </div>
              <span class="shrink-0 text-ink">{formatAdminCurrency(item.lineTotal)}</span>
            </div>
          )}
        </For>
      </div>
      <dl class="flex flex-col gap-1.5 border-t border-border pt-3">
        <div class="flex flex-col gap-0.5">
          <dt class="text-ink-gray">เหตุผล</dt>
          <dd class="font-medium text-ink">{request().reason}</dd>
        </div>
        <Show when={request().note}>
          <div class="flex flex-col gap-0.5">
            <dt class="text-ink-gray">รายละเอียดเพิ่มเติม</dt>
            <dd class="text-ink">{request().note}</dd>
          </div>
        </Show>
        <div class="flex items-center justify-between gap-3">
          <dt class="text-ink-gray">ยอดคืนเงิน</dt>
          <dd class="font-semibold text-ink">{formatAdminCurrency(returnRefundAmount(props.order))}</dd>
        </div>
        <Show when={request().decidedAt}>
          {(at) => (
            <div class="flex items-center justify-between gap-3">
              <dt class="text-ink-gray">ตัดสินใจเมื่อ</dt>
              <dd class="text-ink">{formatEventTime(at())}</dd>
            </div>
          )}
        </Show>
      </dl>

      <Show when={request().status === "requested"}>
        <div class="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" class="!border-system-red !text-system-red" onClick={() => setPending("rejected")}>
            ปฏิเสธคำขอ
          </Button>
          <Button type="button" onClick={() => setPending("approved")}>
            อนุมัติคืนสินค้า
          </Button>
        </div>
      </Show>

      <ConfirmDialog
        open={pending() !== null}
        onOpenChange={(open) => !open && !saving() && setPending(null)}
        title={pending() === "approved" ? "อนุมัติคำขอคืนสินค้า?" : "ปฏิเสธคำขอคืนสินค้า?"}
        description={
          pending() === "approved"
            ? `ระบบจะบันทึกสถานะการชำระเงินเป็น "คืนเงินแล้ว" ยอด ${formatAdminCurrency(returnRefundAmount(props.order))}`
            : "คำขอคืนสินค้านี้จะถูกปิดโดยไม่คืนเงิน"
        }
        confirmLabel={pending() === "approved" ? "อนุมัติ" : "ปฏิเสธคำขอ"}
        tone={pending() === "rejected" ? "danger" : "default"}
        loading={saving()}
        onConfirm={confirm}
      />
    </div>
  );
}
