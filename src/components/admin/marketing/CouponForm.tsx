import { createMemo, createSignal, Show, type JSX } from "solid-js";
import { TextField } from "~/components/shared/TextField";
import { Button } from "~/components/shared/Button";
import { AdminFloatingBar } from "~/components/admin/AdminFloatingBar";
import { AdminFormPreviewLayout } from "~/components/admin/AdminFormPreviewLayout";
import { Toggle } from "~/components/admin/Toggle";
import { SelectField } from "~/components/admin/SelectField";
import { SingleImageUploader } from "~/components/admin/SingleImageUploader";
import {
  COUPON_DISCOUNT_TYPE_META,
  isValidDateRange,
  formatMarketingDateShort,
  formatCouponAmount,
  formatCouponCap,
  formatCouponMinSpend,
  type Coupon,
  type CouponDiscountType,
} from "~/lib/adminMarketing";
import { CouponCard, type Coupon as PreviewCoupon } from "~/components/shared/CouponCard";

export type CouponFormValues = Omit<Coupon, "id" | "createdAt" | "updatedAt">;

/**
 * Shared Create/Edit form (same "one form, two routes" pattern as
 * `ProductForm`). Exactly what the storefront coupon does: baht or % off
 * the product subtotal (a % one optionally capped), an optional minimum,
 * usage limits (total and per customer), a ticket thumbnail, a date-time
 * window, and where it's shown (Home tickets / Checkout list). Any live
 * code can also be typed in at Checkout.
 */

/** Ticket thumbnails are shown at 64px: the picked file is cropped square and shrunk to 160px so it fits in the stored record. */
async function toThumbnailDataUrl(src: string): Promise<string> {
  const img = new Image();
  img.src = src;
  await img.decode();
  const side = Math.min(img.naturalWidth, img.naturalHeight);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 160;
  canvas.getContext("2d")!.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, 160, 160);
  return canvas.toDataURL("image/jpeg", 0.85);
}
export function CouponForm(props: {
  initial?: Coupon;
  submitLabel: string;
  /** Codes already used by other coupons (upper case). */
  takenCodes: string[];
  onSubmit: (values: CouponFormValues) => Promise<void>;
  onCancel: () => void;
}) {
  const [code, setCode] = createSignal(props.initial?.code ?? "");
  const [discountType, setDiscountType] = createSignal<CouponDiscountType>(props.initial?.discountType ?? "baht");
  const [discount, setDiscount] = createSignal(props.initial ? String(props.initial.discount) : "");
  const [maxDiscount, setMaxDiscount] = createSignal(props.initial?.maxDiscount ? String(props.initial.maxDiscount) : "");
  const [usageLimit, setUsageLimit] = createSignal(props.initial?.usageLimit ? String(props.initial.usageLimit) : "");
  const [perCustomerLimit, setPerCustomerLimit] = createSignal(props.initial?.perCustomerLimit ? String(props.initial.perCustomerLimit) : "");
  const [image, setImage] = createSignal(props.initial?.image ?? "");
  const pickImage = async (url: string) => {
    setImage(url);
    if (!url.startsWith("blob:")) return;
    try {
      const small = await toThumbnailDataUrl(url);
      if (image() === url) setImage(small);
    } catch {
      setImage("");
      setErrors((e) => ({ ...e, image: "อ่านไฟล์รูปไม่ได้ กรุณาเลือกไฟล์รูปภาพอื่น" }));
    }
  };
  const [minSpend, setMinSpend] = createSignal(props.initial?.minSpend ? String(props.initial.minSpend) : "");
  const [enabled, setEnabled] = createSignal(props.initial ? props.initial.status === "active" : false);
  const [showOnHome, setShowOnHome] = createSignal(props.initial?.showOnHome ?? true);
  const [showAtCheckout, setShowAtCheckout] = createSignal(props.initial?.showAtCheckout ?? true);
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
    const c = code().trim().toUpperCase();
    if (!c) next.code = "กรุณากรอกโค้ดคูปอง";
    else if (!/^[A-Z0-9-]+$/.test(c)) next.code = "ใช้ได้เฉพาะตัวอักษรภาษาอังกฤษ ตัวเลข และขีด";
    else if (props.takenCodes.includes(c)) next.code = "โค้ดนี้ถูกใช้ไปแล้ว กรุณาตั้งโค้ดอื่น";
    const d = Number(discount());
    const isPercent = discountType() === "percent";
    if (isPercent) {
      if (!discount().trim() || !Number.isInteger(d) || d < 1 || d > 100) next.discount = "กรุณากรอกเปอร์เซ็นต์เป็นจำนวนเต็ม 1-100";
      if (maxDiscount().trim()) {
        const cap = Number(maxDiscount());
        if (!Number.isInteger(cap) || cap <= 0) next.maxDiscount = "กรุณากรอกส่วนลดสูงสุดเป็นจำนวนเต็มบาท";
      }
    } else if (!discount().trim() || !Number.isInteger(d) || d <= 0) next.discount = "กรุณากรอกส่วนลดเป็นจำนวนเต็มบาท";
    if (minSpend().trim()) {
      const m = Number(minSpend());
      if (Number.isNaN(m) || m < 0) next.minSpend = "กรุณากรอกยอดซื้อขั้นต่ำที่ถูกต้อง";
      else if (!isPercent && m > 0 && d > m) next.minSpend = "ยอดซื้อขั้นต่ำต้องไม่น้อยกว่าส่วนลด";
    }
    const total = Number(usageLimit());
    if (usageLimit().trim() && (!Number.isInteger(total) || total < 1)) next.usageLimit = "กรุณากรอกจำนวนครั้งเป็นจำนวนเต็มอย่างน้อย 1";
    const each = Number(perCustomerLimit());
    if (perCustomerLimit().trim()) {
      if (!Number.isInteger(each) || each < 1) next.perCustomerLimit = "กรุณากรอกจำนวนครั้งเป็นจำนวนเต็มอย่างน้อย 1";
      else if (usageLimit().trim() && each > total) next.perCustomerLimit = "ต้องไม่มากกว่าจำนวนครั้งทั้งหมด";
    }
    if (!startDate()) next.startDate = "กรุณาเลือกวันเริ่ม";
    if (!endDate()) next.endDate = "กรุณาเลือกวันสิ้นสุด";
    if (startDate() && endDate() && !dateRangeValid()) next.endDate = "วันสิ้นสุดต้องอยู่หลังวันเริ่ม";
    return next;
  };

  const values = (): CouponFormValues => ({
    code: code().trim().toUpperCase(),
    discountType: discountType(),
    discount: Number(discount()) || 0,
    maxDiscount: discountType() === "percent" && Number(maxDiscount()) > 0 ? Number(maxDiscount()) : undefined,
    minSpend: Number(minSpend()) > 0 ? Number(minSpend()) : undefined,
    usageLimit: Number(usageLimit()) > 0 ? Number(usageLimit()) : undefined,
    perCustomerLimit: Number(perCustomerLimit()) > 0 ? Number(perCustomerLimit()) : undefined,
    image: image() || undefined,
    showOnHome: showOnHome(),
    showAtCheckout: showAtCheckout(),
    startDate: startDate(),
    startTime: startTime(),
    endDate: endDate(),
    endTime: endTime(),
    status: enabled() ? "active" : "disabled",
  });

  /** The form's values in the shape the storefront's own `CouponCard` takes. */
  const previewCoupon = createMemo<PreviewCoupon>(() => {
    const v = values();
    return {
      id: props.initial?.id ?? "preview-draft",
      amountLabel: formatCouponAmount(v),
      capLabel: formatCouponCap(v),
      image: v.image,
      minSpendLabel: formatCouponMinSpend(v),
      expiryLabel: v.endDate ? `หมดอายุ ${formatMarketingDateShort(v.endDate)}` : "ยังไม่ได้ตั้งวันหมดอายุ",
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
      await props.onSubmit(values());
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
              label="โค้ดคูปอง"
              required
              value={code()}
              onInput={(e) => setCode(e.currentTarget.value.toUpperCase())}
              error={errors().code}
              disabled={saving()}
              placeholder="เช่น SAVE100"
            />
            <label class="flex flex-col gap-1.5">
              <span class="text-sm font-medium text-ink">สถานะการใช้งาน</span>
              <Toggle checked={enabled()} onChange={setEnabled} disabled={saving()} />
              <span class="text-xs text-ink-gray">{enabled() ? "ใช้ได้ที่หน้าร้านตามช่วงเวลาที่ตั้งไว้" : "ลูกค้ายังใช้คูปองนี้ไม่ได้"}</span>
            </label>
          </div>
          <div class="flex flex-col gap-1.5">
            <SingleImageUploader
              label="รูปคูปอง"
              hint="รูปสี่เหลี่ยมจัตุรัส แสดงที่ด้านซ้ายของคูปองแทนไอคอน % ถ้าไม่ใส่จะใช้ไอคอนเดิม"
              value={image()}
              onChange={(url) => {
                setErrors(({ image: _i, ...rest }) => rest);
                void pickImage(url);
              }}
            />
            <Show when={errors().image}>
              <p class="text-sm text-system-red">{errors().image}</p>
            </Show>
          </div>
        </Section>

        <Section title="ส่วนลด">
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SelectField
              label="ประเภทส่วนลด"
              required
              value={discountType()}
              options={(Object.keys(COUPON_DISCOUNT_TYPE_META) as CouponDiscountType[]).map((t) => ({ value: t, label: COUPON_DISCOUNT_TYPE_META[t].label }))}
              onChange={(v) => {
                setDiscountType(v as CouponDiscountType);
                setErrors(({ discount: _d, maxDiscount: _m, minSpend: _s, ...rest }) => rest);
              }}
              disabled={saving()}
            />
            <TextField
              label={discountType() === "percent" ? "ส่วนลด (%)" : "ส่วนลด (บาท)"}
              required
              type="number"
              min="1"
              max={discountType() === "percent" ? "100" : undefined}
              step="1"
              value={discount()}
              onInput={(e) => setDiscount(e.currentTarget.value)}
              error={errors().discount}
              disabled={saving()}
            />
            <Show when={discountType() === "percent"}>
              <TextField
                label="ลดสูงสุด (บาท)"
                type="number"
                min="1"
                step="1"
                value={maxDiscount()}
                onInput={(e) => setMaxDiscount(e.currentTarget.value)}
                error={errors().maxDiscount}
                disabled={saving()}
                placeholder="ไม่จำกัด"
              />
            </Show>
            <TextField
              label="ยอดซื้อขั้นต่ำ (บาท)"
              type="number"
              min="0"
              step="1"
              value={minSpend()}
              onInput={(e) => setMinSpend(e.currentTarget.value)}
              error={errors().minSpend}
              disabled={saving()}
              placeholder="ไม่มีขั้นต่ำ"
            />
          </div>
          <p class="text-xs text-ink-gray">
            {discountType() === "percent"
              ? "ลดเป็นเปอร์เซ็นต์ของยอดสินค้า ปัดเศษลงเป็นบาท ไม่รวมค่าจัดส่ง เว้นลดสูงสุดว่างไว้ถ้าไม่จำกัด"
              : "ลดจากยอดสินค้า ไม่รวมค่าจัดส่ง"}{" "}
            ใช้ได้ 1 คูปองต่อคำสั่งซื้อ เว้นยอดขั้นต่ำว่างไว้ถ้าไม่มีขั้นต่ำ
          </p>
        </Section>

        <Section title="จำกัดการใช้">
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              label="จำกัดจำนวนครั้ง"
              type="number"
              min="1"
              step="1"
              value={usageLimit()}
              onInput={(e) => setUsageLimit(e.currentTarget.value)}
              error={errors().usageLimit}
              disabled={saving()}
              placeholder="ไม่จำกัด"
            />
            <TextField
              label="จำกัดต่อลูกค้า"
              type="number"
              min="1"
              step="1"
              value={perCustomerLimit()}
              onInput={(e) => setPerCustomerLimit(e.currentTarget.value)}
              error={errors().perCustomerLimit}
              disabled={saving()}
              placeholder="ไม่จำกัด"
            />
          </div>
          <p class="text-xs text-ink-gray">จำกัดจำนวนครั้งนับรวมทุกคำสั่งซื้อของลูกค้าทุกคน ไม่นับคำสั่งซื้อที่ยกเลิก เมื่อครบแล้วลูกค้าจะใช้คูปองนี้ไม่ได้ เว้นว่างไว้ถ้าไม่จำกัด</p>
        </Section>

        <Section title="การแสดงผลหน้าร้าน">
          <div class="flex flex-col gap-4">
            <ToggleRow title="แสดงในหน้าแรก" hint='แสดงเป็นคูปองให้กดเก็บในส่วน "คูปองส่วนลด" ของหน้าแรก'>
              <Toggle checked={showOnHome()} onChange={setShowOnHome} onLabel="แสดง" offLabel="ไม่แสดง" disabled={saving()} />
            </ToggleRow>
            <ToggleRow title="แสดงในหน้าชำระเงิน" hint="แสดงในรายการคูปองที่ลูกค้าเลือกใช้ได้ตอนชำระเงิน">
              <Toggle checked={showAtCheckout()} onChange={setShowAtCheckout} onLabel="แสดง" offLabel="ไม่แสดง" disabled={saving()} />
            </ToggleRow>
            <p class="text-xs text-ink-gray">ถ้าไม่แสดงทั้งสองที่ ลูกค้ายังกรอกโค้ดนี้เองได้ที่หน้าชำระเงิน</p>
          </div>
        </Section>

        <Section title="ระยะเวลา">
          <p class="text-xs text-ink-gray">เวลาประเทศไทย คูปองเริ่มและหมดอายุเองตามเวลาที่ตั้งไว้</p>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField label="วันเริ่ม" required type="date" value={startDate()} onInput={(e) => setStartDate(e.currentTarget.value)} error={errors().startDate} disabled={saving()} />
            <TextField label="เวลาเริ่ม" type="time" value={startTime()} onInput={(e) => setStartTime(e.currentTarget.value)} disabled={saving()} />
            <TextField label="วันสิ้นสุด" required type="date" value={endDate()} onInput={(e) => setEndDate(e.currentTarget.value)} error={errors().endDate} disabled={saving()} />
            <TextField label="เวลาสิ้นสุด" type="time" value={endTime()} onInput={(e) => setEndTime(e.currentTarget.value)} disabled={saving()} />
          </div>
        </Section>
      </div>

      <Show when={submitError()}>
        <p role="alert" class="rounded-card bg-danger-soft px-4 py-3 text-sm font-medium text-danger-strong">
          {submitError()}
        </p>
      </Show>
    </>
  );

  const couponPreview = (
    <div class="flex flex-col gap-3 p-4 sm:p-5">
      <div class="px-1 pt-1">
        <CouponCard coupon={previewCoupon()} display />
      </div>
      <Show when={code()}>
        <p class="text-sm text-ink-gray">
          โค้ด <span class="font-semibold text-ink">{code()}</span>
        </p>
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

function Section(props: { title: string; children: JSX.Element }) {
  return (
    <div class="flex flex-col gap-4 rounded-card bg-surface-card p-4 shadow-card sm:p-5">
      <h2 class="text-base font-semibold text-ink">{props.title}</h2>
      {props.children}
    </div>
  );
}

function ToggleRow(props: { title: string; hint: string; children: JSX.Element }) {
  return (
    <div class="flex items-center justify-between gap-4">
      <div class="min-w-0">
        <p class="text-sm font-medium text-ink">{props.title}</p>
        <p class="text-xs text-ink-gray">{props.hint}</p>
      </div>
      {props.children}
    </div>
  );
}
