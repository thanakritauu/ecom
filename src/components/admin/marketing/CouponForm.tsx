import { createMemo, createSignal, Show } from "solid-js";
import { TextField } from "~/components/shared/TextField";
import { AdminFloatingBar } from "~/components/admin/AdminFloatingBar";
import { DraftPublishActions } from "~/components/admin/DraftPublishActions";
import { AdminFormPreviewLayout } from "~/components/admin/AdminFormPreviewLayout";
import { Toggle } from "~/components/admin/Toggle";
import { SelectField } from "~/components/admin/SelectField";
import { SingleImageUploader } from "~/components/admin/SingleImageUploader";
import {
  AudienceField,
  CombinableField,
  FormSection as Section,
  PeriodFields,
  SettingRow as ToggleRow,
  audienceError,
  fromAudienceDraft,
  fromCombinableDraft,
  toAudienceDraft,
  toCombinableDraft,
  type AudienceDraft,
} from "./MarketingFormBlocks";
import {
  type CouponTool,
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
import { CouponDetailBody } from "~/components/shared/CouponDetailSheet";
import { RichTextEditor } from "~/components/admin/RichTextEditor";
import { FormErrorSummary } from "~/components/admin/FormErrorSummary";
import { clearFieldError, reportFormErrors, type FormErrors } from "~/lib/adminFormValidation";
import { isRichTextEmpty } from "~/lib/richText";
import { buildCoupon } from "~/lib/cartSelectors";
import { ProductSkuPicker } from "~/components/admin/ProductSkuPicker";
import { ChoiceRadio } from "./ChoiceRadio";
import { normalizeSkuRefs, type ProductSkuRef } from "~/lib/productSkuRef";

/** Field names for the "ยังกรอกข้อมูลไม่ครบ" toast and summary (`~/lib/adminFormValidation`). */
const LABELS: Record<string, string> = {
  code: "โค้ดคูปอง",
  image: "รูปคูปอง",
  discount: "ส่วนลด",
  maxDiscount: "ลดสูงสุด",
  minSpend: "ยอดซื้อขั้นต่ำ",
  productScope: "ใช้ได้กับสินค้า",
  usageLimit: "จำกัดจำนวนครั้ง",
  perCustomerLimit: "จำกัดต่อลูกค้า",
  startDate: "วันเริ่ม",
  endDate: "วันสิ้นสุด",
  audience: "กลุ่มลูกค้า",
};

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
  /** The coupon tool: คูปอง, คูปองลูกค้าใหม่ (audience fixed to new customers) or โค้ดส่วนลด (never listed, typed only). */
  tool: CouponTool;
  initial?: Coupon;
  submitLabel: string;
  /** Codes already used by other coupons (upper case). */
  takenCodes: string[];
  onSubmit: (values: CouponFormValues) => Promise<void>;
  onCancel: () => void;
}) {
  const [code, setCode] = createSignal(props.initial?.code ?? "");
  const isNewCustomerTool = props.tool === "coupon_new";
  const isCodeTool = props.tool === "coupon_code";
  const [audience, setAudience] = createSignal<AudienceDraft>(isNewCustomerTool ? { kind: "new", tiers: [] } : toAudienceDraft(props.initial?.audience));
  const [combinable, setCombinable] = createSignal(toCombinableDraft(props.initial?.combinableWith));
  const [discountType, setDiscountType] = createSignal<CouponDiscountType>(props.initial?.discountType ?? "baht");
  const [discount, setDiscount] = createSignal(props.initial ? String(props.initial.discount) : "");
  const [maxDiscount, setMaxDiscount] = createSignal(props.initial?.maxDiscount ? String(props.initial.maxDiscount) : "");
  const [usageLimit, setUsageLimit] = createSignal(props.initial?.usageLimit ? String(props.initial.usageLimit) : "");
  // คูปองลูกค้าใหม่ starts at once per customer.
  const [perCustomerLimit, setPerCustomerLimit] = createSignal(props.initial ? (props.initial.perCustomerLimit ? String(props.initial.perCustomerLimit) : "") : isNewCustomerTool ? "1" : "");
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
  // "ใช้ได้กับสินค้า": undefined productScope = ทั้งร้าน.
  const [scopeRefs, setScopeRefs] = createSignal<ProductSkuRef[]>(normalizeSkuRefs(props.initial?.productScope));
  const [scopeMode, setScopeMode] = createSignal<"all" | "selected">(props.initial?.productScope !== undefined ? "selected" : "all");
  const [minSpend, setMinSpend] = createSignal(props.initial?.minSpend ? String(props.initial.minSpend) : "");
  /**
   * Draft-first rule: a new coupon, or one still in แบบร่าง, gets
   * "บันทึกแบบร่าง" (code only, never listed or usable at checkout) and
   * "บันทึกและเผยแพร่" (full checks, switched on). After its first publish
   * the เปิด / ปิด switch decides and the one button is "บันทึกการเปลี่ยนแปลง".
   */
  const draftFlow = !props.initial || props.initial.status === "draft";
  const [enabled, setEnabled] = createSignal(props.initial ? props.initial.status === "active" : false);
  const [showOnHome, setShowOnHome] = createSignal(isCodeTool ? false : (props.initial?.showOnHome ?? true));
  const [showAtCheckout, setShowAtCheckout] = createSignal(isCodeTool ? false : (props.initial?.showAtCheckout ?? true));
  const [startDate, setStartDate] = createSignal(props.initial?.startDate ?? "");
  const [startTime, setStartTime] = createSignal(props.initial?.startTime ?? "00:00");
  const [endDate, setEndDate] = createSignal(props.initial?.endDate ?? "");
  const [endTime, setEndTime] = createSignal(props.initial?.endTime ?? "23:59");
  const [extraConditions, setExtraConditions] = createSignal(props.initial?.extraConditions ?? "");

  const [errors, setErrors] = createSignal<FormErrors>({});
  /** Drops these fields' errors once the admin edits them. */
  const fix = (...keys: string[]) => setErrors((e) => keys.reduce(clearFieldError, e));
  const [saving, setSaving] = createSignal(false);
  const [submitError, setSubmitError] = createSignal<string>();

  const dateRangeValid = createMemo(() => isValidDateRange(startDate(), startTime(), endDate(), endTime()));

  const validate = (): FormErrors => {
    const next: FormErrors = {};
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
    if (scopeMode() === "selected" && scopeRefs().length === 0) next.productScope = "กรุณาเลือกสินค้าอย่างน้อย 1 รายการ";
    if (!startDate()) next.startDate = "กรุณาเลือกวันเริ่ม";
    if (!endDate()) next.endDate = "กรุณาเลือกวันสิ้นสุด";
    if (startDate() && endDate() && !dateRangeValid()) next.endDate = "วันสิ้นสุดต้องอยู่หลังวันเริ่ม";
    const audienceProblem = audienceError(audience());
    if (audienceProblem) next.audience = audienceProblem;
    return next;
  };

  /** "บันทึกแบบร่าง": just the code, plus anything typed in must still be valid (e.g. no text in a number field). */
  const validateDraft = (): FormErrors => {
    const full = validate();
    const typed: Record<string, boolean> = {
      code: true,
      discount: !!discount().trim(),
      maxDiscount: true,
      minSpend: true,
      usageLimit: true,
      perCustomerLimit: true,
      image: true,
      endDate: !!startDate() && !!endDate(),
    };
    return Object.fromEntries(Object.entries(full).filter(([key]) => typed[key]));
  };

  const values = (): CouponFormValues => ({
    code: code().trim().toUpperCase(),
    discountType: discountType(),
    discount: Number(discount()) || 0,
    maxDiscount: discountType() === "percent" && Number(maxDiscount()) > 0 ? Number(maxDiscount()) : undefined,
    minSpend: Number(minSpend()) > 0 ? Number(minSpend()) : undefined,
    usageLimit: Number(usageLimit()) > 0 ? Number(usageLimit()) : undefined,
    perCustomerLimit: Number(perCustomerLimit()) > 0 ? Number(perCustomerLimit()) : undefined,
    // ทั้งร้าน = unset; a draft may keep "เฉพาะสินค้าที่เลือก" with nothing picked yet ([]).
    productScope: scopeMode() === "selected" ? scopeRefs() : undefined,
    image: image() || undefined,
    showOnHome: isCodeTool ? false : showOnHome(),
    showAtCheckout: isCodeTool ? false : showAtCheckout(),
    audience: fromAudienceDraft(audience()),
    combinableWith: fromCombinableDraft(combinable()),
    tool: props.tool,
    startDate: startDate(),
    startTime: startTime(),
    endDate: endDate(),
    endTime: endTime(),
    status: enabled() ? "active" : "disabled",
    extraConditions: isRichTextEmpty(extraConditions()) ? undefined : extraConditions(),
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

  const handleSubmit = (e: SubmitEvent) => {
    e.preventDefault();
    void save(draftFlow ? "active" : enabled() ? "active" : "disabled");
  };

  const save = async (nextStatus: Coupon["status"]) => {
    const validationErrors = nextStatus === "draft" ? validateDraft() : validate();
    setErrors(validationErrors);
    if (reportFormErrors(validationErrors, LABELS)) return;

    setSaving(true);
    setSubmitError(undefined);
    try {
      await props.onSubmit({ ...values(), status: nextStatus });
    } catch {
      setSubmitError("บันทึกคูปองไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setSaving(false);
    }
  };

  /** The same values as the storefront coupon, for the conditions sheet preview. */
  const previewSheetCoupon = createMemo(() => {
    const v = values();
    return buildCoupon({ ...v, code: v.code, endDate: v.endDate, usedCount: 0 });
  });

  const couponForm = (
    <>
      <FormErrorSummary errors={errors()} labels={LABELS} />
      <div class="flex flex-col gap-6">
        {/* 1) ข้อมูลพื้นฐาน */}
        <Section title="ข้อมูลพื้นฐาน">
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              label="โค้ดคูปอง"
              required
              value={code()}
              data-field="code"
              onInput={(e) => {
                setCode(e.currentTarget.value.toUpperCase());
                fix("code");
              }}
              error={errors().code}
              disabled={saving()}
              placeholder={isNewCustomerTool ? "เช่น NEW100" : "เช่น SAVE100"}
            />
            <Show
              when={!draftFlow}
              fallback={
                <p class="self-end text-xs text-ink-gray">
                  {props.initial ? "คูปองนี้ยังเป็นแบบร่าง ลูกค้ายังใช้ไม่ได้" : "บันทึกแบบร่างไว้ก่อนได้ แล้วกด ตกลงและเผยแพร่ เมื่อข้อมูลครบ"}
                </p>
              }
            >
              <label class="flex flex-col gap-1.5">
                <span class="text-sm font-medium text-ink">สถานะการใช้งาน</span>
                <Toggle checked={enabled()} onChange={setEnabled} disabled={saving()} />
                <span class="text-xs text-ink-gray">{enabled() ? "ใช้ได้ที่หน้าร้านตามช่วงเวลาที่ตั้งไว้" : "ลูกค้ายังใช้คูปองนี้ไม่ได้"}</span>
              </label>
            </Show>
          </div>
          <PeriodFields
            value={{ startDate: startDate(), startTime: startTime(), endDate: endDate(), endTime: endTime() }}
            onChange={(patch) => {
              if (patch.startDate !== undefined) setStartDate(patch.startDate);
              if (patch.startTime !== undefined) setStartTime(patch.startTime);
              if (patch.endDate !== undefined) setEndDate(patch.endDate);
              if (patch.endTime !== undefined) setEndTime(patch.endTime);
              if (patch.startDate !== undefined) fix("startDate");
              fix("endDate");
            }}
            errors={errors()}
            disabled={saving()}
            hint="เวลาประเทศไทย คูปองเริ่มและหมดอายุเองตามเวลาที่ตั้งไว้"
          />
          <AudienceField
            value={audience()}
            onChange={(next) => {
              setAudience(next);
              fix("audience");
            }}
            locked={isNewCustomerTool}
            error={errors().audience}
            disabled={saving()}
          />
        </Section>

        {/* 2) สิทธิประโยชน์ */}
        <Section title="สิทธิประโยชน์">
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
              data-field="discount"
              onInput={(e) => {
                setDiscount(e.currentTarget.value);
                fix("discount", "minSpend");
              }}
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
                data-field="maxDiscount"
                onInput={(e) => {
                  setMaxDiscount(e.currentTarget.value);
                  fix("maxDiscount");
                }}
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
              data-field="minSpend"
              onInput={(e) => {
                setMinSpend(e.currentTarget.value);
                fix("minSpend");
              }}
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

        {/* 3) สินค้า */}
        <Section title="สินค้า">
          <div data-field="productScope" class="flex flex-col gap-3">
            <ChoiceRadio
              name="coupon-product-scope"
              value={scopeMode()}
              disabled={saving()}
              onChange={(mode) => {
                setScopeMode(mode);
                if (mode === "all") fix("productScope");
              }}
              options={[
                { value: "all", label: "ทั้งร้าน", hint: "ใช้ได้กับทุกสินค้าในตะกร้า" },
                { value: "selected", label: "เฉพาะสินค้าที่เลือก", hint: "ลดและนับยอดขั้นต่ำเฉพาะสินค้าหรือ SKU ที่เลือก" },
              ]}
            />
            <Show when={scopeMode() === "selected"}>
              <ProductSkuPicker
                value={scopeRefs()}
                onChange={(next) => {
                  setScopeRefs(next);
                  if (next.length > 0) fix("productScope");
                }}
                disabled={saving()}
                error={errors().productScope}
              />
            </Show>
          </div>
        </Section>

        {/* 4) จำกัดการใช้ */}
        <Section title="จำกัดการใช้">
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              label="จำกัดจำนวนครั้ง"
              type="number"
              min="1"
              step="1"
              value={usageLimit()}
              data-field="usageLimit"
              onInput={(e) => {
                setUsageLimit(e.currentTarget.value);
                fix("usageLimit", "perCustomerLimit");
              }}
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
              data-field="perCustomerLimit"
              onInput={(e) => {
                setPerCustomerLimit(e.currentTarget.value);
                fix("perCustomerLimit");
              }}
              error={errors().perCustomerLimit}
              disabled={saving()}
              placeholder="ไม่จำกัด"
            />
          </div>
          <p class="text-xs text-ink-gray">จำกัดจำนวนครั้งนับรวมทุกคำสั่งซื้อของลูกค้าทุกคน ไม่นับคำสั่งซื้อที่ยกเลิก เมื่อครบแล้วลูกค้าจะใช้คูปองนี้ไม่ได้ เว้นว่างไว้ถ้าไม่จำกัด</p>
        </Section>

        {/* 5) การแสดงผล */}
        <Section title="การแสดงผล">
          <Show
            when={!isCodeTool}
            fallback={<p class="text-sm text-ink-gray">โค้ดส่วนลดไม่แสดงที่หน้าแรกและหน้าชำระเงิน ลูกค้ากรอกโค้ดเองที่หน้าชำระเงิน</p>}
          >
            <div class="flex flex-col gap-4">
              <ToggleRow title="แสดงในหน้าแรก" hint='แสดงเป็นคูปองให้กดเก็บในส่วน "คูปองส่วนลด" ของหน้าแรก'>
                <Toggle checked={showOnHome()} onChange={setShowOnHome} onLabel="แสดง" offLabel="ไม่แสดง" disabled={saving()} />
              </ToggleRow>
              <ToggleRow title="แสดงในหน้าชำระเงิน" hint="แสดงในรายการคูปองที่ลูกค้าเลือกใช้ได้ตอนชำระเงิน">
                <Toggle checked={showAtCheckout()} onChange={setShowAtCheckout} onLabel="แสดง" offLabel="ไม่แสดง" disabled={saving()} />
              </ToggleRow>
              <p class="text-xs text-ink-gray">ถ้าไม่แสดงทั้งสองที่ ลูกค้ายังกรอกโค้ดนี้เองได้ที่หน้าชำระเงิน</p>
            </div>
          </Show>
          <div class="flex flex-col gap-1.5" data-field="image">
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
          <RichTextEditor
            field="extraConditions"
            label="เงื่อนไขเพิ่มเติม"
            value={extraConditions()}
            onChange={setExtraConditions}
            disabled={saving()}
            placeholder="เช่น รายละเอียดอื่นที่ลูกค้าควรรู้"
            hint='ไม่บังคับ แสดงต่อท้ายเงื่อนไขการใช้งานในหน้าต่าง "รายละเอียดคูปอง" เงื่อนไขหลักด้านบนระบบสร้างให้เองจากข้อมูลคูปอง'
            minHeightClass="min-h-[140px]"
          />
        </Section>

        {/* 6) การใช้ร่วมกับโปรอื่น */}
        <Section title="การใช้ร่วมกับโปรอื่น" description="คูปองนี้ใช้ร่วมกับโปรประเภทไหนได้บ้างในคำสั่งซื้อเดียวกัน">
          <CombinableField value={combinable()} onChange={setCombinable} disabled={saving()} />
        </Section>
      </div>

      <Show when={submitError()}>
        <p role="alert" class="rounded-card bg-danger-soft px-4 py-3 text-sm font-medium text-danger-strong">
          {submitError()}
        </p>
      </Show>
    </>
  );

  // The ticket, then what the shopper's "รายละเอียดคูปอง" sheet shows (the storefront's own sheet body).
  const couponPreview = (
    <div class="flex flex-col gap-5 p-4 sm:p-5">
      <div class="px-1 pt-1">
        <CouponCard coupon={previewCoupon()} display />
      </div>
      <div class="flex flex-col gap-5 border-t border-border pt-4">
        <p class="text-base font-semibold text-ink">รายละเอียดคูปอง</p>
        <CouponDetailBody coupon={previewSheetCoupon()} />
      </div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} class="flex flex-col gap-6">
      <AdminFormPreviewLayout form={couponForm} preview={couponPreview} />

      <AdminFloatingBar>
        <DraftPublishActions
          draft={draftFlow}
          saving={saving()}
          onCancel={props.onCancel}
          onSaveDraft={() => void save("draft")}
          onPublish={() => void save("active")}
          onSave={() => void save(enabled() ? "active" : "disabled")}
          publishLabel="ตกลงและเผยแพร่"
        />
      </AdminFloatingBar>
      <div class="h-16" aria-hidden="true" />
    </form>
  );
}
