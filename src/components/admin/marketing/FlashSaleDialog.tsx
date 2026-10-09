import { createEffect, createSignal, on, Show } from "solid-js";
import { Dialog } from "@kobalte/core/dialog";
import { Button } from "~/components/shared/Button";
import { TextField } from "~/components/shared/TextField";
import { Toggle } from "~/components/admin/Toggle";
import { CloseXIcon } from "~/components/admin/icons";
import { ProductSelector } from "./ProductSelector";

export type FlashSaleTiming = { daily: true } | { daily: false; endsAt: number };

function toDatetimeLocal(epochMs: number): string {
  const d = new Date(epochMs);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Add products to the Home Flash Sale, or change the end time of ones
 * already in it. Daily round = the storefront's default (ends every night
 * at midnight Bangkok time and starts again); otherwise one fixed end time.
 * `productIds` given = edit those; omitted = pick products first.
 */
export function FlashSaleDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Products being edited; when unset the dialog asks which products to add. */
  productIds?: string[];
  initial?: { daily: boolean; endsAt?: number };
  onSave: (productIds: string[], timing: FlashSaleTiming) => Promise<void>;
}) {
  const [picked, setPicked] = createSignal<string[]>([]);
  const [daily, setDaily] = createSignal(true);
  const [endsAt, setEndsAt] = createSignal("");
  const [errors, setErrors] = createSignal<Record<string, string>>({});
  const [saving, setSaving] = createSignal(false);
  const editing = () => props.productIds !== undefined;

  createEffect(
    on(
      () => props.open,
      (open) => {
        if (!open) return;
        setPicked([]);
        setDaily(props.initial?.daily ?? true);
        setEndsAt(toDatetimeLocal(props.initial?.endsAt ?? Date.now() + 24 * 60 * 60 * 1000));
        setErrors({});
      },
    ),
  );

  const save = async () => {
    const ids = props.productIds ?? picked();
    const next: Record<string, string> = {};
    if (ids.length === 0) next.products = "กรุณาเลือกสินค้าอย่างน้อย 1 รายการ";
    const end = new Date(endsAt()).getTime();
    if (!daily()) {
      if (!endsAt() || Number.isNaN(end)) next.endsAt = "กรุณาเลือกเวลาจบ";
      else if (end <= Date.now()) next.endsAt = "เวลาจบต้องอยู่หลังเวลาปัจจุบัน";
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setSaving(true);
    try {
      await props.onSave(ids, daily() ? { daily: true } : { daily: false, endsAt: end });
      props.onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={props.open} onOpenChange={(open) => !saving() && props.onOpenChange(open)}>
      <Dialog.Portal>
        <Dialog.Overlay class="fixed inset-0 z-40 bg-ink/40 motion-reduce:animate-none data-[expanded]:animate-overlay-in data-[closed]:animate-overlay-out" />
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Content class="flex max-h-[90dvh] w-full max-w-lg flex-col rounded-card bg-surface-card shadow-card outline-none motion-reduce:animate-none data-[expanded]:animate-modal-in data-[closed]:animate-modal-out">
            <div class="flex items-start justify-between gap-3 px-5 pt-5">
              <div class="min-w-0">
                <Dialog.Title class="text-lg font-semibold text-ink">{editing() ? "ตั้งเวลาแฟลชเซล" : "เพิ่มสินค้าในแฟลชเซล"}</Dialog.Title>
                <Dialog.Description class="mt-1 text-sm text-ink-gray">
                  {editing() ? `${props.productIds!.length} สินค้าที่เลือก` : "สินค้าจะขึ้นในส่วนแฟลชเซลหน้าแรกพร้อมเวลานับถอยหลัง"}
                </Dialog.Description>
              </div>
              <Dialog.CloseButton aria-label="ปิด" disabled={saving()} class="-mr-2 -mt-2 flex size-11 shrink-0 items-center justify-center rounded-pill text-ink-gray transition-colors duration-150 hover:bg-surface-pink">
                <CloseXIcon class="size-5" />
              </Dialog.CloseButton>
            </div>

            <div class="flex flex-col gap-4 overflow-y-auto p-5">
              <Show when={!editing()}>
                <div class="flex flex-col gap-1.5">
                  <span class="text-sm font-medium text-ink">
                    สินค้า <span class="text-system-red">*</span>
                  </span>
                  <ProductSelector selectedIds={picked()} onChange={setPicked} />
                  <Show when={errors().products}>
                    <p class="text-sm text-system-red">{errors().products}</p>
                  </Show>
                </div>
              </Show>

              <label class="flex flex-col gap-1.5">
                <span class="text-sm font-medium text-ink">รอบรายวัน</span>
                <Toggle checked={daily()} onChange={setDaily} onLabel="จบเที่ยงคืนและเริ่มใหม่ทุกวัน" offLabel="ตั้งเวลาจบเอง" disabled={saving()} />
              </label>
              <Show when={!daily()}>
                <TextField
                  label="เวลาจบ"
                  required
                  type="datetime-local"
                  value={endsAt()}
                  onInput={(e) => setEndsAt(e.currentTarget.value)}
                  error={errors().endsAt}
                  disabled={saving()}
                />
              </Show>
              <p class="text-xs text-ink-gray">ราคาบนการ์ดคือราคาขายของสินค้า ราคาขีดฆ่าคือราคาก่อนลด และแถบสต๊อกใช้สต๊อกของสินค้า แก้ได้ที่หน้าสินค้า</p>
            </div>

            <div class="flex gap-3 border-t border-border p-4">
              <Button type="button" variant="outline" class="flex-1" onClick={() => props.onOpenChange(false)} disabled={saving()}>
                ยกเลิก
              </Button>
              <Button type="button" variant="primary" class="flex-1" onClick={save} loading={saving()}>
                {saving() ? "กำลังบันทึก..." : editing() ? "บันทึกการเปลี่ยนแปลง" : "เพิ่มในแฟลชเซล"}
              </Button>
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog>
  );
}
