import { createMemo, createSignal, Show } from "solid-js";
import { TextField } from "~/components/shared/TextField";
import { Button } from "~/components/shared/Button";
import { AdminFloatingBar } from "~/components/admin/AdminFloatingBar";
import { ProductSelector } from "./ProductSelector";
import {
  isValidDateRange,
  formatMarketingDate,
  formatPromotionDiscount,
  PROMOTION_TYPE_META,
  type Promotion,
  type PromotionType,
  type MarketingStatus,
} from "~/lib/adminMarketing";

const TYPE_OPTIONS: { value: PromotionType; label: string }[] = Object.entries(PROMOTION_TYPE_META).map(([value, meta]) => ({
  value: value as PromotionType,
  label: meta.label,
}));

const STATUS_OPTIONS: { value: MarketingStatus; label: string }[] = [
  { value: "draft", label: "แบบร่าง" },
  { value: "scheduled", label: "ตั้งเวลาไว้" },
  { value: "active", label: "กำลังใช้งาน" },
  { value: "disabled", label: "ปิดใช้งาน" },
];

export type PromotionFormValues = Omit<Promotion, "id" | "createdAt" | "updatedAt" | "usageCount">;

/**
 * Shared Create/Edit form (Phase 07 #12) — same "one form, two routes"
 * shape as `ProductForm.tsx`: `/new` and `/:id/edit` only differ in
 * `initial` and what `onSubmit` does with the result.
 */
export function PromotionForm(props: {
  initial?: Promotion;
  submitLabel: string;
  onSubmit: (values: PromotionFormValues) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = createSignal(props.initial?.name ?? "");
  const [description, setDescription] = createSignal(props.initial?.description ?? "");
  const [type, setType] = createSignal<PromotionType>(props.initial?.type ?? "percentage");
  const [status, setStatus] = createSignal<MarketingStatus>(props.initial?.status ?? "draft");
  const [discountValue, setDiscountValue] = createSignal(props.initial?.discountValue !== undefined ? String(props.initial.discountValue) : "");
  const [buyQty, setBuyQty] = createSignal(props.initial?.buyQty !== undefined ? String(props.initial.buyQty) : "2");
  const [getQty, setGetQty] = createSignal(props.initial?.getQty !== undefined ? String(props.initial.getQty) : "1");
  const [applyToAll, setApplyToAll] = createSignal((props.initial?.productIds.length ?? 0) === 0);
  const [productIds, setProductIds] = createSignal<string[]>(props.initial?.productIds ?? []);
  const [startDate, setStartDate] = createSignal(props.initial?.startDate ?? "");
  const [startTime, setStartTime] = createSignal(props.initial?.startTime ?? "00:00");
  const [endDate, setEndDate] = createSignal(props.initial?.endDate ?? "");
  const [endTime, setEndTime] = createSignal(props.initial?.endTime ?? "23:59");

  const [errors, setErrors] = createSignal<Record<string, string>>({});
  const [saving, setSaving] = createSignal(false);
  const [submitError, setSubmitError] = createSignal<string>();

  const dateRangeValid = createMemo(() => isValidDateRange(startDate(), startTime(), endDate(), endTime()));

  const validate = (): Record<string, string> => {
    const next: Record<string, string> = {};
    if (!name().trim()) next.name = "กรุณากรอกชื่อโปรโมชั่น";
    if (type() !== "free_shipping" && type() !== "buy_x_get_y") {
      const v = Number(discountValue());
      if (!discountValue().trim() || Number.isNaN(v) || v <= 0) next.discountValue = "กรุณากรอกส่วนลดที่ถูกต้อง";
    }
    if (!startDate()) next.startDate = "กรุณาเลือกวันเริ่ม";
    if (!endDate()) next.endDate = "กรุณาเลือกวันสิ้นสุด";
    if (startDate() && endDate() && !dateRangeValid()) next.endDate = "วันสิ้นสุดต้องอยู่หลังวันเริ่ม";
    return next;
  };

  const previewValues = (): PromotionFormValues => ({
    name: name().trim(),
    description: description().trim() || undefined,
    type: type(),
    discountValue: discountValue().trim() ? Number(discountValue()) : undefined,
    buyQty: type() === "buy_x_get_y" ? Number(buyQty()) : undefined,
    getQty: type() === "buy_x_get_y" ? Number(getQty()) : undefined,
    productIds: applyToAll() ? [] : productIds(),
    startDate: startDate(),
    startTime: startTime(),
    endDate: endDate(),
    endTime: endTime(),
    status: status(),
  });

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSaving(true);
    setSubmitError(undefined);
    try {
      await props.onSubmit(previewValues());
    } catch {
      setSubmitError("บันทึกโปรโมชั่นไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} class="flex flex-col gap-6">
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div class="flex flex-col gap-6 lg:col-span-2">
          <Section title="ข้อมูลพื้นฐาน">
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField label="ชื่อโปรโมชั่น" required value={name()} onInput={(e) => setName(e.currentTarget.value)} error={errors().name} disabled={saving()} class="sm:col-span-2" />
              <label class="flex flex-col gap-1.5 sm:col-span-2">
                <span class="text-sm font-medium text-ink">คำอธิบาย</span>
                <textarea
                  value={description()}
                  disabled={saving()}
                  onInput={(e) => setDescription(e.currentTarget.value)}
                  rows={3}
                  class="rounded-card border border-surface-gray bg-white px-4 py-3 text-sm text-ink outline-none focus:border-brand-pink disabled:cursor-not-allowed disabled:bg-surface-gray"
                />
              </label>
              <label class="flex flex-col gap-1.5">
                <span class="text-sm font-medium text-ink">ประเภทโปรโมชั่น</span>
                <select
                  value={type()}
                  disabled={saving()}
                  onChange={(e) => setType(e.currentTarget.value as PromotionType)}
                  class="h-11 rounded-card border border-surface-gray bg-white px-4 text-sm text-ink outline-none focus:border-brand-pink disabled:cursor-not-allowed disabled:bg-surface-gray"
                >
                  {TYPE_OPTIONS.map((opt) => (
                    <option value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </label>
              <label class="flex flex-col gap-1.5">
                <span class="text-sm font-medium text-ink">สถานะ</span>
                <select
                  value={status()}
                  disabled={saving()}
                  onChange={(e) => setStatus(e.currentTarget.value as MarketingStatus)}
                  class="h-11 rounded-card border border-surface-gray bg-white px-4 text-sm text-ink outline-none focus:border-brand-pink disabled:cursor-not-allowed disabled:bg-surface-gray"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </label>
            </div>
          </Section>

          <Section title="ส่วนลด">
            <Show when={type() === "percentage" || type() === "fixed"}>
              <TextField
                label={type() === "percentage" ? "เปอร์เซ็นต์ส่วนลด (%)" : "จำนวนเงินส่วนลด (฿)"}
                required
                type="number"
                min="0"
                step={type() === "percentage" ? "1" : "0.01"}
                value={discountValue()}
                onInput={(e) => setDiscountValue(e.currentTarget.value)}
                error={errors().discountValue}
                disabled={saving()}
              />
            </Show>
            <Show when={type() === "free_shipping"}>
              <p class="text-sm text-ink-gray">โปรโมชั่นประเภทนี้ไม่ต้องกำหนดจำนวนส่วนลด</p>
            </Show>
            <Show when={type() === "buy_x_get_y"}>
              <div class="grid grid-cols-2 gap-4">
                <TextField label="ซื้อจำนวน" type="number" min="1" value={buyQty()} onInput={(e) => setBuyQty(e.currentTarget.value)} disabled={saving()} />
                <TextField label="แถมจำนวน" type="number" min="1" value={getQty()} onInput={(e) => setGetQty(e.currentTarget.value)} disabled={saving()} />
              </div>
            </Show>
          </Section>

          <Section title="วันที่เริ่มต้น - สิ้นสุด">
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField label="วันเริ่ม" required type="date" value={startDate()} onInput={(e) => setStartDate(e.currentTarget.value)} error={errors().startDate} disabled={saving()} />
              <TextField label="เวลาเริ่ม" type="time" value={startTime()} onInput={(e) => setStartTime(e.currentTarget.value)} disabled={saving()} />
              <TextField label="วันสิ้นสุด" required type="date" value={endDate()} onInput={(e) => setEndDate(e.currentTarget.value)} error={errors().endDate} disabled={saving()} />
              <TextField label="เวลาสิ้นสุด" type="time" value={endTime()} onInput={(e) => setEndTime(e.currentTarget.value)} disabled={saving()} />
            </div>
          </Section>

          <Section title="สินค้าที่เข้าร่วม">
            <label class="flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" checked={applyToAll()} onChange={(e) => setApplyToAll(e.currentTarget.checked)} class="size-4 rounded accent-brand-pink" />
              ใช้กับสินค้าทั้งหมด
            </label>
            <Show when={!applyToAll()}>
              <ProductSelector selectedIds={productIds()} onChange={setProductIds} />
            </Show>
          </Section>
        </div>

        <div class="flex flex-col gap-6">
          <Section title="ตัวอย่างโปรโมชั่น">
            <div class="flex flex-col gap-2 text-sm">
              <p class="text-base font-semibold text-ink">{name() || "ชื่อโปรโมชั่น"}</p>
              <p class="font-medium text-brand-pink">{formatPromotionDiscount(previewValues())}</p>
              <p class="text-ink-gray">{applyToAll() ? "ทุกสินค้า" : `${productIds().length} สินค้าที่เลือก`}</p>
              <Show when={startDate() && endDate()}>
                <p class="text-ink-gray">
                  {formatMarketingDate(startDate())} {startTime()} — {formatMarketingDate(endDate())} {endTime()}
                </p>
              </Show>
              <Show when={startDate() && endDate() && !dateRangeValid()}>
                <p class="text-system-red">ช่วงวันที่ไม่ถูกต้อง</p>
              </Show>
            </div>
          </Section>
        </div>
      </div>

      <Show when={submitError()}>
        <p role="alert" class="rounded-card bg-danger-soft px-4 py-3 text-sm font-medium text-danger-strong">
          {submitError()}
        </p>
      </Show>

      <AdminFloatingBar>
        <div class="flex w-full justify-end gap-3">
          <Button type="button" variant="outline" onClick={props.onCancel} disabled={saving()}>
            ยกเลิก
          </Button>
          <Button type="submit" variant="primary" loading={saving()}>
            {saving() ? "กำลังบันทึก..." : props.submitLabel}
          </Button>
        </div>
      </AdminFloatingBar>
      <div class="h-16" aria-hidden="true" />
    </form>
  );
}

function Section(props: { title: string; children: import("solid-js").JSX.Element }) {
  return (
    <div class="flex flex-col gap-4 rounded-card bg-white p-4 shadow-card sm:p-5">
      <h2 class="text-base font-semibold text-ink">{props.title}</h2>
      {props.children}
    </div>
  );
}
