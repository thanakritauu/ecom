import { createMemo, createSignal, Show } from "solid-js";
import { TextField } from "~/components/shared/TextField";
import { Button } from "~/components/shared/Button";
import { AdminFloatingBar } from "~/components/admin/AdminFloatingBar";
import { AdminFormPreviewLayout } from "~/components/admin/AdminFormPreviewLayout";
import { ChevronDownIcon } from "~/components/admin/icons";
import { isValidDateRange, formatMarketingDate, formatCouponDiscount, type Coupon, type MarketingStatus } from "~/lib/adminMarketing";
import { CouponCard, type Coupon as PreviewCoupon } from "~/components/shared/CouponCard";
import { pushToast } from "~/lib/toast";

const STATUS_OPTIONS: { value: MarketingStatus; label: string }[] = [
  { value: "draft", label: "แบบร่าง" },
  { value: "scheduled", label: "ตั้งเวลาไว้" },
  { value: "active", label: "กำลังใช้งาน" },
  { value: "disabled", label: "ปิดใช้งาน" },
];

export type CouponFormValues = Omit<Coupon, "id" | "createdAt" | "updatedAt" | "usageCount">;

/** Phase 07 #20 — same "one form, two routes" pattern as `PromotionForm`/`ProductForm`. */
export function CouponForm(props: {
  initial?: Coupon;
  submitLabel: string;
  onSubmit: (values: CouponFormValues) => Promise<void>;
  onCancel: () => void;
}) {
  const [code, setCode] = createSignal(props.initial?.code ?? "");
  const [description, setDescription] = createSignal(props.initial?.description ?? "");
  const [discountType, setDiscountType] = createSignal<"percentage" | "fixed">(props.initial?.discountType ?? "percentage");
  const [discountValue, setDiscountValue] = createSignal(props.initial ? String(props.initial.discountValue) : "");
  const [minSpend, setMinSpend] = createSignal(props.initial?.minSpend !== undefined ? String(props.initial.minSpend) : "");
  const [maxDiscount, setMaxDiscount] = createSignal(props.initial?.maxDiscount !== undefined ? String(props.initial.maxDiscount) : "");
  const [usageLimit, setUsageLimit] = createSignal(props.initial?.usageLimit !== undefined ? String(props.initial.usageLimit) : "");
  const [perCustomerLimit, setPerCustomerLimit] = createSignal(props.initial?.perCustomerLimit !== undefined ? String(props.initial.perCustomerLimit) : "1");
  const [status, setStatus] = createSignal<MarketingStatus>(props.initial?.status ?? "draft");
  const [startDate, setStartDate] = createSignal(props.initial?.startDate ?? "");
  const [startTime, setStartTime] = createSignal(props.initial?.startTime ?? "00:00");
  const [endDate, setEndDate] = createSignal(props.initial?.endDate ?? "");
  const [endTime, setEndTime] = createSignal(props.initial?.endTime ?? "23:59");

  const [errors, setErrors] = createSignal<Record<string, string>>({});
  const [saving, setSaving] = createSignal(false);
  const [submitError, setSubmitError] = createSignal<string>();
  const [previewCollected, setPreviewCollected] = createSignal(false);

  const dateRangeValid = createMemo(() => isValidDateRange(startDate(), startTime(), endDate(), endTime()));

  const validate = (): Record<string, string> => {
    const next: Record<string, string> = {};
    if (!code().trim()) next.code = "กรุณากรอกรหัสคูปอง";
    const v = Number(discountValue());
    if (!discountValue().trim() || Number.isNaN(v) || v <= 0) next.discountValue = "กรุณากรอกส่วนลดที่ถูกต้อง";
    if (!startDate()) next.startDate = "กรุณาเลือกวันเริ่ม";
    if (!endDate()) next.endDate = "กรุณาเลือกวันสิ้นสุด";
    if (startDate() && endDate() && !dateRangeValid()) next.endDate = "วันสิ้นสุดต้องอยู่หลังวันเริ่ม";
    return next;
  };

  const previewValues = (): CouponFormValues => ({
    code: code().trim().toUpperCase(),
    description: description().trim() || undefined,
    discountType: discountType(),
    discountValue: Number(discountValue()) || 0,
    minSpend: minSpend().trim() ? Number(minSpend()) : undefined,
    maxDiscount: maxDiscount().trim() ? Number(maxDiscount()) : undefined,
    usageLimit: usageLimit().trim() ? Number(usageLimit()) : undefined,
    perCustomerLimit: perCustomerLimit().trim() ? Number(perCustomerLimit()) : undefined,
    startDate: startDate(),
    startTime: startTime(),
    endDate: endDate(),
    endTime: endTime(),
    status: status(),
  });

  /**
   * REAL-TIME LIVE PREVIEW SYSTEM §7/§12/§13 — Preview Adapter: reshapes
   * this form's in-progress values into the exact `{amountLabel,
   * minSpendLabel, expiryLabel}` shape the real `CouponCard` (the same
   * component the customer-facing homepage Coupon section renders) needs.
   */
  const previewCoupon = createMemo<PreviewCoupon>(() => {
    const v = previewValues();
    return {
      id: props.initial?.id ?? "preview-draft",
      amountLabel: formatCouponDiscount(v),
      minSpendLabel: v.minSpend ? `ขั้นต่ำ ฿${v.minSpend.toLocaleString("th-TH")}` : "ไม่มีขั้นต่ำ",
      expiryLabel: v.endDate ? `หมดอายุ ${formatMarketingDate(v.endDate)}` : "ยังไม่ระบุวันหมดอายุ",
    };
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
      setSubmitError("บันทึกคูปองไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setSaving(false);
    }
  };

  const couponForm = (
    <>
      <div class="flex flex-col gap-6">
        <Section title="ข้อมูลคูปอง">
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                label="รหัสคูปอง"
                required
                value={code()}
                onInput={(e) => setCode(e.currentTarget.value.toUpperCase())}
                error={errors().code}
                disabled={saving()}
                placeholder="เช่น SAVE100"
              />
              <label class="flex flex-col gap-1.5">
                <span class="text-sm font-medium text-ink">สถานะ</span>
                <div class="relative">
                  <select
                    value={status()}
                    disabled={saving()}
                    onChange={(e) => setStatus(e.currentTarget.value as MarketingStatus)}
                    class="h-11 w-full appearance-none rounded-card border border-border bg-surface-card pl-4 pr-9 text-sm text-ink outline-none focus:border-brand-pink disabled:cursor-not-allowed disabled:bg-surface-gray"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <ChevronDownIcon class="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-gray" />
                </div>
              </label>
              <label class="flex flex-col gap-1.5 sm:col-span-2">
                <span class="text-sm font-medium text-ink">คำอธิบาย</span>
                <textarea
                  value={description()}
                  disabled={saving()}
                  onInput={(e) => setDescription(e.currentTarget.value)}
                  rows={2}
                  class="rounded-card border border-border bg-surface-card px-4 py-3 text-sm text-ink outline-none focus:border-brand-pink disabled:cursor-not-allowed disabled:bg-surface-gray"
                />
              </label>
            </div>
          </Section>

          <Section title="ส่วนลด">
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label class="flex flex-col gap-1.5">
                <span class="text-sm font-medium text-ink">ประเภทส่วนลด</span>
                <div class="relative">
                  <select
                    value={discountType()}
                    disabled={saving()}
                    onChange={(e) => setDiscountType(e.currentTarget.value as "percentage" | "fixed")}
                    class="h-11 w-full appearance-none rounded-card border border-border bg-surface-card pl-4 pr-9 text-sm text-ink outline-none focus:border-brand-pink disabled:cursor-not-allowed disabled:bg-surface-gray"
                  >
                    <option value="percentage">เปอร์เซ็นต์ (%)</option>
                    <option value="fixed">จำนวนเงิน (฿)</option>
                  </select>
                  <ChevronDownIcon class="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-gray" />
                </div>
              </label>
              <TextField
                label={discountType() === "percentage" ? "เปอร์เซ็นต์ส่วนลด" : "จำนวนเงินส่วนลด"}
                required
                type="number"
                min="0"
                step={discountType() === "percentage" ? "1" : "0.01"}
                value={discountValue()}
                onInput={(e) => setDiscountValue(e.currentTarget.value)}
                error={errors().discountValue}
                disabled={saving()}
              />
              <TextField label="ยอดซื้อขั้นต่ำ (฿)" type="number" min="0" step="0.01" value={minSpend()} onInput={(e) => setMinSpend(e.currentTarget.value)} disabled={saving()} />
              <TextField label="ส่วนลดสูงสุด (฿)" type="number" min="0" step="0.01" value={maxDiscount()} onInput={(e) => setMaxDiscount(e.currentTarget.value)} disabled={saving()} />
              <TextField label="จำนวนสิทธิ์ใช้ทั้งหมด" type="number" min="0" value={usageLimit()} onInput={(e) => setUsageLimit(e.currentTarget.value)} disabled={saving()} />
              <TextField label="จำกัดต่อลูกค้า (ครั้ง)" type="number" min="0" value={perCustomerLimit()} onInput={(e) => setPerCustomerLimit(e.currentTarget.value)} disabled={saving()} />
            </div>
          </Section>

          <Section title="วันที่เริ่มต้น - สิ้นสุด">
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField label="วันเริ่ม" required type="date" value={startDate()} onInput={(e) => setStartDate(e.currentTarget.value)} error={errors().startDate} disabled={saving()} />
              <TextField label="เวลาเริ่ม" type="time" value={startTime()} onInput={(e) => setStartTime(e.currentTarget.value)} disabled={saving()} />
              <TextField label="วันสิ้นสุด" required type="date" value={endDate()} onInput={(e) => setEndDate(e.currentTarget.value)} error={errors().endDate} disabled={saving()} />
              <TextField label="เวลาสิ้นสุด" type="time" value={endTime()} onInput={(e) => setEndTime(e.currentTarget.value)} disabled={saving()} />
            </div>
          </Section>
      </div>

      <Show when={startDate() && endDate() && !dateRangeValid()}>
        <p role="alert" class="rounded-card bg-danger-soft px-4 py-3 text-sm font-medium text-danger-strong">
          ช่วงวันที่ไม่ถูกต้อง
        </p>
      </Show>

      <Show when={submitError()}>
        <p role="alert" class="rounded-card bg-danger-soft px-4 py-3 text-sm font-medium text-danger-strong">
          {submitError()}
        </p>
      </Show>
    </>
  );

  const couponPreview = (
    <div class="p-4 sm:p-5">
      <div class="overflow-hidden rounded-media border border-border">
        <CouponCard
          coupon={previewCoupon()}
          collected={previewCollected()}
          onCollect={async () => {
            setPreviewCollected(true);
            pushToast("นี่คือ Preview — ไม่มีการเก็บคูปองจริง", "success");
          }}
        />
      </div>
      <Show when={code()}>
        <p class="mt-3 font-mono text-sm font-semibold text-ink">{code()}</p>
      </Show>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} class="flex flex-col gap-6">
      <AdminFormPreviewLayout form={couponForm} preview={couponPreview} />

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
    <div class="flex flex-col gap-4 rounded-card bg-surface-card p-4 shadow-card sm:p-5">
      <h2 class="text-base font-semibold text-ink">{props.title}</h2>
      {props.children}
    </div>
  );
}
