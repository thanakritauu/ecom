import { Dialog } from "@kobalte/core/dialog";
import { createEffect, createSignal, For, on, Show, type JSX } from "solid-js";
import type { Order, ReturnRequest } from "~/lib/types";
import { RETURN_REASONS } from "~/lib/orderTracking";
import { Button } from "../shared/Button";
import { formatTHB } from "../shared/PriceDisplay";

/** Bottom sheet on mobile, centered dialog from `sm:` — same shell as QuickAddSheet. */
function Sheet(props: { open: boolean; onOpenChange: (open: boolean) => void; title: string; description?: string; children: JSX.Element; footer?: JSX.Element }) {
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
              <Dialog.CloseButton class="-mr-2 -mt-2 flex size-11 shrink-0 items-center justify-center rounded-pill text-2xl text-ink-gray hover:bg-surface-pink">
                <span aria-hidden="true">×</span>
                <span class="sr-only">ปิด</span>
              </Dialog.CloseButton>
            </div>
            <div class="min-h-0 flex-1 overflow-y-auto px-5 py-3">{props.children}</div>
            <Show when={props.footer}>
              <div class="flex flex-col gap-2 border-t border-surface-gray px-5 py-4">{props.footer}</div>
            </Show>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog>
  );
}

export function CancelOrderDialog(props: { order: Order; open: boolean; onOpenChange: (open: boolean) => void; onConfirm: () => Promise<void> }) {
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
      title="ยืนยันการยกเลิกคำสั่งซื้อ?"
      description={`คำสั่งซื้อ #${props.order.id} · ${formatTHB(props.order.total)}`}
      footer={
        <>
          <Show when={status() === "error"}>
            <p class="text-sm text-system-red" role="alert">
              ยกเลิกไม่สำเร็จ กรุณาลองอีกครั้ง
            </p>
          </Show>
          <Button type="button" variant="primary" size="lg" class="w-full !bg-system-red hover:!bg-system-red/90" loading={status() === "loading"} onClick={confirm}>
            ยกเลิกคำสั่งซื้อ
          </Button>
          <Button type="button" variant="outline" size="lg" class="w-full" disabled={status() === "loading"} onClick={() => props.onOpenChange(false)}>
            กลับไปดูรายการ
          </Button>
        </>
      }
    >
      <p class="text-sm text-ink">
        เมื่อยกเลิกแล้วจะไม่สามารถกู้คืนคำสั่งซื้อนี้ได้
        <Show when={props.order.status !== "pending_payment"}> หากชำระเงินแล้ว ระบบจะคืนเงินตามช่องทางที่ชำระ</Show>
      </p>
    </Sheet>
  );
}

type ReturnStep = "items" | "reason" | "review" | "done";

/** ขอคืนสินค้า: เลือกสินค้า → เลือกเหตุผล → ตรวจสอบ → ยืนยัน → success. Mock only — no refund/logistics API. */
export function ReturnRequestDialog(props: {
  order: Order;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (request: Omit<ReturnRequest, "requestedAt">) => Promise<void>;
}) {
  const [step, setStep] = createSignal<ReturnStep>("items");
  const [selected, setSelected] = createSignal<number[]>([]);
  const [reason, setReason] = createSignal<string>("");
  const [note, setNote] = createSignal("");
  const [error, setError] = createSignal<string>();
  const [status, setStatus] = createSignal<"idle" | "loading">("idle");

  createEffect(
    on(
      () => props.open,
      (open) => {
        if (!open) return;
        setStep("items");
        setSelected(props.order.items.length === 1 ? [0] : []);
        setReason("");
        setNote("");
        setError(undefined);
      },
    ),
  );

  const toggleItem = (i: number) => setSelected((list) => (list.includes(i) ? list.filter((x) => x !== i) : [...list, i].sort()));
  const refundEstimate = () => selected().reduce((sum, i) => sum + props.order.items[i].price * props.order.items[i].qty, 0);
  const needsNote = () => reason() === "อื่น ๆ";

  const next = () => {
    setError(undefined);
    if (step() === "items") {
      if (selected().length === 0) return setError("กรุณาเลือกสินค้าที่ต้องการคืนอย่างน้อย 1 รายการ");
      setStep("reason");
    } else if (step() === "reason") {
      if (!reason()) return setError("กรุณาเลือกเหตุผลในการคืนสินค้า");
      if (needsNote() && !note().trim()) return setError("กรุณาระบุรายละเอียดเหตุผล");
      setStep("review");
    }
  };

  const submit = async () => {
    setStatus("loading");
    try {
      await props.onSubmit({ itemIndexes: selected(), reason: reason(), note: note().trim() || undefined });
      setStep("done");
    } catch {
      setError("ส่งคำขอไม่สำเร็จ กรุณาลองอีกครั้ง");
    } finally {
      setStatus("idle");
    }
  };

  const STEP_LABELS: Record<Exclude<ReturnStep, "done">, string> = { items: "1. เลือกสินค้า", reason: "2. เหตุผล", review: "3. ตรวจสอบ" };
  const title = () => (step() === "done" ? "ส่งคำขอคืนสินค้าแล้ว" : "ขอคืนสินค้า");

  return (
    <Sheet
      open={props.open}
      onOpenChange={props.onOpenChange}
      title={title()}
      description={step() === "done" ? undefined : `คำสั่งซื้อ #${props.order.id}`}
      footer={
        <Show
          when={step() !== "done"}
          fallback={
            <Button type="button" variant="primary" size="lg" class="w-full" onClick={() => props.onOpenChange(false)}>
              กลับไปที่คำสั่งซื้อ
            </Button>
          }
        >
          <Show when={error()}>
            <p class="text-sm text-system-red" role="alert">
              {error()}
            </p>
          </Show>
          <Show
            when={step() === "review"}
            fallback={
              <Button type="button" variant="primary" size="lg" class="w-full" onClick={next}>
                ถัดไป
              </Button>
            }
          >
            <Button type="button" variant="primary" size="lg" class="w-full" loading={status() === "loading"} onClick={submit}>
              ยืนยันคำขอคืนสินค้า
            </Button>
          </Show>
          <Show when={step() !== "items"}>
            <Button type="button" variant="outline" size="lg" class="w-full" disabled={status() === "loading"} onClick={() => setStep(step() === "review" ? "reason" : "items")}>
              ย้อนกลับ
            </Button>
          </Show>
        </Show>
      }
    >
      <Show when={step() !== "done"}>
        <ol class="mb-4 flex gap-2 text-xs" aria-label="ขั้นตอน">
          <For each={Object.entries(STEP_LABELS)}>
            {([key, label]) => (
              <li
                class="flex-1 rounded-pill px-2 py-1 text-center"
                classList={{ "bg-brand-pink text-white font-semibold": step() === key, "bg-surface-gray text-ink-gray": step() !== key }}
                aria-current={step() === key ? "step" : undefined}
              >
                {label}
              </li>
            )}
          </For>
        </ol>
      </Show>

      <Show when={step() === "items"}>
        <fieldset class="flex flex-col gap-2">
          <legend class="mb-2 text-sm font-medium text-ink">เลือกสินค้าที่ต้องการคืน</legend>
          <For each={props.order.items}>
            {(item, i) => (
              <label
                class="flex min-h-[60px] cursor-pointer items-center gap-3 rounded-2xl border p-3"
                classList={{ "border-brand-pink bg-surface-pink": selected().includes(i()), "border-surface-gray": !selected().includes(i()) }}
              >
                <input type="checkbox" checked={selected().includes(i())} onChange={() => toggleItem(i())} class="size-5 shrink-0 rounded accent-brand-pink" />
                <img src={item.image} alt="" class="size-12 shrink-0 rounded-xl border border-surface-gray object-cover" />
                <span class="min-w-0 flex-1">
                  <span class="line-clamp-1 text-sm font-medium leading-[1.75] text-ink">{item.name}</span>
                  <span class="text-xs text-ink-gray">
                    {item.variantLabel} · x{item.qty}
                  </span>
                </span>
                <span class="shrink-0 text-sm font-semibold text-ink">{formatTHB(item.price * item.qty)}</span>
              </label>
            )}
          </For>
        </fieldset>
      </Show>

      <Show when={step() === "reason"}>
        <fieldset class="flex flex-col gap-2">
          <legend class="mb-2 text-sm font-medium text-ink">เหตุผลในการคืนสินค้า</legend>
          <For each={RETURN_REASONS}>
            {(r) => (
              <label class="flex min-h-11 cursor-pointer items-center gap-3 rounded-2xl border px-3" classList={{ "border-brand-pink bg-surface-pink": reason() === r, "border-surface-gray": reason() !== r }}>
                <input type="radio" name="return-reason" checked={reason() === r} onChange={() => setReason(r)} class="size-5 shrink-0 accent-brand-pink" />
                <span class="text-sm text-ink">{r}</span>
              </label>
            )}
          </For>
          <label class="mt-2 flex flex-col gap-1.5">
            <span class="text-sm font-medium text-ink">
              รายละเอียดเพิ่มเติม {needsNote() ? <span class="text-system-red">*</span> : <span class="text-ink-gray">(ไม่บังคับ)</span>}
            </span>
            <textarea
              rows={3}
              value={note()}
              onInput={(e) => setNote(e.currentTarget.value)}
              placeholder="เช่น ได้รับตัวเลือกสินค้า 02 แต่สั่งตัวเลือกสินค้า 03"
              class="rounded-card border border-border bg-surface-card px-4 py-3 text-base text-ink outline-none placeholder:text-ink-placeholder focus:border-brand-pink"
            />
          </label>
        </fieldset>
      </Show>

      <Show when={step() === "review"}>
        <div class="flex flex-col gap-4 text-sm">
          <div class="flex flex-col gap-2">
            <p class="font-medium text-ink">สินค้าที่ขอคืน</p>
            <For each={selected()}>
              {(i) => (
                <p class="flex justify-between gap-3 text-ink">
                  <span class="min-w-0 truncate">
                    {props.order.items[i].name} ({props.order.items[i].variantLabel}) x{props.order.items[i].qty}
                  </span>
                  <span class="shrink-0">{formatTHB(props.order.items[i].price * props.order.items[i].qty)}</span>
                </p>
              )}
            </For>
          </div>
          <div class="flex flex-col gap-1">
            <p class="font-medium text-ink">เหตุผล</p>
            <p class="text-ink">{reason()}</p>
            <Show when={note().trim()}>
              <p class="text-ink-gray">{note().trim()}</p>
            </Show>
          </div>
          <div class="flex justify-between rounded-2xl bg-surface-gray/60 px-3 py-2">
            <span class="text-ink-gray">ยอดคืนเงินโดยประมาณ</span>
            <span class="font-semibold text-ink">{formatTHB(refundEstimate())}</span>
          </div>
          <p class="text-xs text-ink-gray">ทีมงานจะตรวจสอบคำขอและติดต่อกลับภายใน 1–2 วันทำการ พร้อมแจ้งวิธีส่งสินค้าคืน</p>
        </div>
      </Show>

      <Show when={step() === "done"}>
        <div class="flex flex-col items-center gap-3 py-6 text-center">
          <span class="flex size-14 items-center justify-center rounded-pill bg-success-soft text-2xl text-success" aria-hidden="true">
            ✓
          </span>
          <p class="text-base font-semibold text-ink">ส่งคำขอคืนสินค้าแล้ว</p>
          <p class="max-w-xs text-sm text-ink-gray">ทีมงานจะตรวจสอบคำขอและติดต่อกลับภายใน 1–2 วันทำการ คุณสามารถดูสถานะได้ในหน้าคำสั่งซื้อนี้</p>
        </div>
      </Show>
    </Sheet>
  );
}
