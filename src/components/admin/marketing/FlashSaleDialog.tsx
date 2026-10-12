import { createEffect, createSignal, on, Show } from "solid-js";
import { Dialog } from "@kobalte/core/dialog";
import { Button } from "~/components/shared/Button";
import { TextField } from "~/components/shared/TextField";
import { Toggle } from "~/components/admin/Toggle";
import { CloseXIcon } from "~/components/admin/icons";
import { FormErrorSummary } from "~/components/admin/FormErrorSummary";
import { clearFieldError, reportFormErrors, type FormErrors } from "~/lib/adminFormValidation";
import { ProductSkuPicker } from "~/components/admin/ProductSkuPicker";
import type { ProductSkuRef } from "~/lib/productSkuRef";

export type FlashSaleTiming = { daily: true } | { daily: false; startsAt: number; endsAt: number };

const LABELS: Record<string, string> = { products: "สินค้า", percent: "ส่วนลดเริ่มต้น", startsAt: "เวลาเริ่ม", endsAt: "เวลาจบ" };

function toDatetimeLocal(epochMs: number): string {
  const d = new Date(epochMs);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Add products to the Home Flash Sale, or change the timing of ones
 * already in it. Daily round = the storefront's default (ends every night
 * at midnight Bangkok time and starts again); otherwise one fixed window
 * (start and end): before the start the product isn't in the flash sale yet.
 * `productIds` given = edit those; omitted = pick products first.
 */
export function FlashSaleDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Products being edited; when unset the dialog asks which products to add. */
  productIds?: string[];
  initial?: { daily: boolean; startsAt?: number; endsAt?: number };
  /** `percent` = starting flash price ("ลด %" of the normal price) for products being added; unset when editing timing. */
  /** `skuPicks`: products added with "เลือก SKU" (product id to its picked options); they start at option level with only those options on. */
  onSave: (productIds: string[], timing: FlashSaleTiming, percent?: number, skuPicks?: Record<string, string[]>) => Promise<void>;
}) {
  const [picked, setPicked] = createSignal<ProductSkuRef[]>([]);
  const [daily, setDaily] = createSignal(true);
  const [startsAt, setStartsAt] = createSignal("");
  const [endsAt, setEndsAt] = createSignal("");
  const [percent, setPercent] = createSignal("10");
  const [errors, setErrors] = createSignal<FormErrors>({});
  const fix = (key: string) => setErrors((e) => clearFieldError(e, key));
  const [saving, setSaving] = createSignal(false);
  const editing = () => props.productIds !== undefined;

  createEffect(
    on(
      () => props.open,
      (open) => {
        if (!open) return;
        setPicked([]);
        setPercent("10");
        setDaily(props.initial?.daily ?? true);
        setStartsAt(toDatetimeLocal(props.initial?.startsAt ?? Date.now()));
        setEndsAt(toDatetimeLocal(props.initial?.endsAt ?? Date.now() + 24 * 60 * 60 * 1000));
        setErrors({});
      },
    ),
  );

  const save = async () => {
    const ids = props.productIds ?? picked().map((r) => r.productId);
    const next: FormErrors = {};
    if (ids.length === 0) next.products = "กรุณาเลือกสินค้าอย่างน้อย 1 รายการ";
    const pct = Number(percent());
    if (!editing() && (!Number.isInteger(pct) || pct < 1 || pct > 99)) next.percent = "ส่วนลดต้องเป็นจำนวนเต็ม 1-99%";
    const start = new Date(startsAt()).getTime();
    const end = new Date(endsAt()).getTime();
    if (!daily()) {
      if (!startsAt() || Number.isNaN(start)) next.startsAt = "กรุณาเลือกเวลาเริ่ม";
      if (!endsAt() || Number.isNaN(end)) next.endsAt = "กรุณาเลือกเวลาจบ";
      else if (!next.startsAt && end <= start) next.endsAt = "เวลาจบต้องอยู่หลังเวลาเริ่ม";
      else if (end <= Date.now()) next.endsAt = "เวลาจบต้องอยู่หลังเวลาปัจจุบัน";
    }
    setErrors(next);
    if (reportFormErrors(next, LABELS)) return;
    setSaving(true);
    try {
      const skuPicks = editing() ? undefined : Object.fromEntries(picked().filter((r) => r.variantIds.length > 0).map((r) => [r.productId, r.variantIds]));
      await props.onSave(ids, daily() ? { daily: true } : { daily: false, startsAt: start, endsAt: end }, editing() ? undefined : pct, skuPicks);
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
          <Dialog.Content class="flex max-h-[90dvh] w-full max-w-3xl flex-col rounded-card bg-surface-card shadow-card outline-none motion-reduce:animate-none data-[expanded]:animate-modal-in data-[closed]:animate-modal-out">
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
              <FormErrorSummary errors={errors()} labels={LABELS} />
              <Show when={!editing()}>
                <div class="flex flex-col gap-1.5" data-field="products">
                  <span class="text-sm font-medium text-ink">
                    สินค้า <span class="text-system-red">*</span>
                  </span>
                  <ProductSkuPicker
                    value={picked()}
                    onChange={(next) => {
                      setPicked(next);
                      if (next.length > 0) fix("products");
                    }}
                    disabled={saving()}
                    error={errors().products}
                  />
                  <p class="text-xs text-ink-gray">ระดับตัวเลือกสินค้า: สินค้าจะเข้าแฟลชเซลเฉพาะ SKU ที่เปิดไว้</p>
                </div>
                <div class="flex flex-col gap-1.5">
                  <TextField
                    label="ส่วนลดเริ่มต้น (%)"
                    required
                    type="number"
                    min="1"
                    max="99"
                    data-field="percent"
                    value={percent()}
                    onInput={(e) => {
                      setPercent(e.currentTarget.value);
                      fix("percent");
                    }}
                    error={errors().percent}
                    disabled={saving()}
                  />
                  <p class="text-xs text-ink-gray">ราคาแฟลชเซลเริ่มที่ราคาปกติลดตาม % นี้ ปรับราคาเป็นบาท แยกตามตัวเลือก หรือจำกัดจำนวนได้ทีละสินค้าหลังเพิ่ม</p>
                </div>
              </Show>

              <label class="flex flex-col gap-1.5">
                <span class="text-sm font-medium text-ink">รอบรายวัน</span>
                <Toggle
                  checked={daily()}
                  onChange={(on) => {
                    setDaily(on);
                    if (on) setErrors((e) => clearFieldError(clearFieldError(e, "startsAt"), "endsAt"));
                  }}
                  onLabel="จบเที่ยงคืนและเริ่มใหม่ทุกวัน"
                  offLabel="ตั้งเวลาเริ่มและจบเอง"
                  disabled={saving()}
                />
              </label>
              <Show when={!daily()}>
                <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <TextField
                    label="เวลาเริ่ม"
                    required
                    type="datetime-local"
                    data-field="startsAt"
                    value={startsAt()}
                    onInput={(e) => {
                      setStartsAt(e.currentTarget.value);
                      fix("startsAt");
                      fix("endsAt");
                    }}
                    error={errors().startsAt}
                    disabled={saving()}
                  />
                  <TextField
                    label="เวลาจบ"
                    required
                    type="datetime-local"
                    data-field="endsAt"
                    value={endsAt()}
                    onInput={(e) => {
                      setEndsAt(e.currentTarget.value);
                      fix("endsAt");
                    }}
                    error={errors().endsAt}
                    disabled={saving()}
                  />
                </div>
                <p class="-mt-2 text-xs text-ink-gray">ก่อนถึงเวลาเริ่ม สินค้าจะยังไม่ขึ้นในแฟลชเซลหน้าแรก</p>
              </Show>
              <p class="text-xs text-ink-gray">ช่วงแฟลชเซล การ์ดแสดงราคาแฟลชเซลและขีดฆ่าราคาขายปกติ หมดเวลาแล้วกลับเป็นราคาปกติเอง</p>
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
