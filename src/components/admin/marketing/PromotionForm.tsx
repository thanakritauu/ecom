import { createEffect, createMemo, createSignal, For, Index, Show } from "solid-js";
import { TextField } from "~/components/shared/TextField";
import { Button } from "~/components/shared/Button";
import { AdminFloatingBar } from "~/components/admin/AdminFloatingBar";
import { DraftPublishActions } from "~/components/admin/DraftPublishActions";
import { Toggle } from "~/components/admin/Toggle";
import { AdminFormPreviewLayout } from "~/components/admin/AdminFormPreviewLayout";
import { FormErrorSummary } from "~/components/admin/FormErrorSummary";
import { reportFormErrors, type FormErrors } from "~/lib/adminFormValidation";
import { ProductSkuPicker, skuRefsSummary } from "~/components/admin/ProductSkuPicker";
import type { ProductSkuRef } from "~/lib/productSkuRef";
import { BundlePriceSummary, fromItemDrafts, itemDraftsValid, PromotionItemsBox, toItemDrafts, type PromotionItemDraft } from "./PromotionItems";
import { useAdminProducts } from "~/lib/adminProductStore";
import { ChoiceRadio } from "./ChoiceRadio";
import {
  AudienceField,
  CombinableField,
  FormSection,
  PeriodFields,
  SettingRow,
  audienceError,
  fromAudienceDraft,
  fromCombinableDraft,
  toAudienceDraft,
  toCombinableDraft,
  type AudienceDraft,
} from "./MarketingFormBlocks";
import { formatAudience } from "~/lib/marketingAudience";
import {
  MAX_DISCOUNT_TIERS,
  MARKETING_TOOL_META,
  formatCombinable,
  formatDiscountValue,
  promotionDiscountTiers,
  promotionTypeForTool,
  type DiscountKind,
  type PromotionTool,
  MAX_GIFT_TIERS,
  PROMOTION_CONDITION_META,
  formatPromotionThreshold,
  promotionGiftTiers,
  type PromotionCondition,
  isValidDateRange,
  formatMarketingDateTime,
  formatPromotionDiscount,
  promotionUsesCondition,
  promotionHasProductScope,
  promotionItemsTotal,
  type Promotion,
  type PromotionType,
  promotionBadgeLabel,
} from "~/lib/adminMarketing";

export type PromotionFormValues = Omit<Promotion, "id" | "createdAt" | "updatedAt">;

/** A gift tier as typed into the form (strings until saved). */
type TierDraft = { threshold: string; giftProductId: string; giftQty: string; giftVariantIds: string[] };
const emptyTier = (): TierDraft => ({ threshold: "", giftProductId: "", giftQty: "1", giftVariantIds: [] });
/** A ยิ่งซื้อยิ่งคุ้ม step as typed. */
type DiscountTierDraft = { threshold: string; value: string };

const BASE_LABELS: Record<string, string> = {
  name: "ชื่อโปรโมชั่น",
  discountPercent: "ส่วนลด (%)",
  maxDiscount: "ลดสูงสุด",
  discountAmount: "ส่วนลด (บาท)",
  minSpend: "ยอดซื้อขั้นต่ำ",
  bundleItems: "สินค้าในเซ็ต",
  bundlePrice: "ราคาเซ็ต",
  buyItems: "สินค้าที่ต้องซื้อ",
  getItems: "สินค้าที่แถม",
  startDate: "วันเริ่ม",
  endDate: "วันสิ้นสุด",
  productIds: "สินค้าที่เข้าร่วม",
  audience: "กลุ่มลูกค้า",
};
/** `tier-0-threshold` etc. read as "ขั้นที่ 1 ซื้อครบ"; `dtier-0-value` as "ขั้นที่ 1 ส่วนลด". */
function promotionLabel(key: string): string {
  const step = /^dtier-(\d+)-(threshold|value)$/.exec(key);
  if (step) return `ขั้นที่ ${Number(step[1]) + 1} ${step[2] === "threshold" ? "ซื้อครบ" : "ส่วนลด"}`;
  const tier = /^tier-(\d+)-(threshold|giftQty|gift)$/.exec(key);
  if (!tier) return BASE_LABELS[key] ?? key;
  const field = tier[2] === "threshold" ? "ซื้อครบ" : tier[2] === "giftQty" ? "จำนวนของแถม" : "สินค้าของแถม";
  return `ขั้นที่ ${Number(tier[1]) + 1} ${field}`;
}

/**
 * Shared Create/Edit form, same "one form, two routes" shape as
 * `ProductForm.tsx`. The tool (picked on the hub's gallery, or read from the
 * record) decides the สิทธิประโยชน์ block; every tool has the same block
 * order (`MarketingFormBlocks`). The cart runs free shipping and
 * ซื้อครบรับของแถม; ส่วนลดสินค้า, ยิ่งซื้อยิ่งคุ้ม, buy X get Y and bundle
 * are set up ahead of time.
 */
export function PromotionForm(props: {
  tool: PromotionTool;
  initial?: Promotion;
  submitLabel: string;
  onSubmit: (values: PromotionFormValues) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = createSignal(props.initial?.name ?? "");
  const [type, setType] = createSignal<PromotionType>(props.initial?.type ?? promotionTypeForTool(props.tool));
  const [audience, setAudience] = createSignal<AudienceDraft>(toAudienceDraft(props.initial?.audience));
  const [combinable, setCombinable] = createSignal(toCombinableDraft(props.initial?.combinableWith));
  const [tierDiscountType, setTierDiscountType] = createSignal<DiscountKind>(props.initial?.tierDiscountType ?? "percent");
  const initialSteps = props.initial ? promotionDiscountTiers(props.initial) : [];
  const [discountTiers, setDiscountTiers] = createSignal<DiscountTierDraft[]>(
    initialSteps.length > 0 ? initialSteps.map((t) => ({ threshold: String(t.threshold), value: String(t.value) })) : [{ threshold: "", value: "" }],
  );
  const updateStep = (i: number, patch: Partial<DiscountTierDraft>) => setDiscountTiers((list) => list.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  /**
   * Draft-first rule: a new promotion, or one still in แบบร่าง, gets
   * "บันทึกแบบร่าง" (name only, never runs in the cart) and "บันทึกและเผยแพร่"
   * (full checks, switched on). After its first publish the เปิด / ปิด switch
   * decides and the one button is "บันทึกการเปลี่ยนแปลง".
   */
  const draftFlow = !props.initial || props.initial.status === "draft";
  const [enabled, setEnabled] = createSignal(props.initial ? props.initial.status === "active" : false);
  const [minSpend, setMinSpend] = createSignal(props.initial?.type !== "gift_with_purchase" && props.initial?.minSpend !== undefined ? String(props.initial.minSpend) : "");
  const [discountPercent, setDiscountPercent] = createSignal(props.initial?.discountPercent ? String(props.initial.discountPercent) : "");
  const [maxDiscount, setMaxDiscount] = createSignal(props.initial?.maxDiscount ? String(props.initial.maxDiscount) : "");
  const [discountAmount, setDiscountAmount] = createSignal(props.initial?.discountAmount ? String(props.initial.discountAmount) : "");
  const [bundleItems, setBundleItems] = createSignal<PromotionItemDraft[]>(toItemDrafts(props.initial?.bundleItems));
  const [bundlePrice, setBundlePrice] = createSignal(props.initial?.bundlePrice ? String(props.initial.bundlePrice) : "");
  const [buyItems, setBuyItems] = createSignal<PromotionItemDraft[]>(toItemDrafts(props.initial?.buyItems));
  const [getItems, setGetItems] = createSignal<PromotionItemDraft[]>(toItemDrafts(props.initial?.getItems));
  /** Types counted in baht or pieces ("นับจาก"), with a progress banner in the cart ("แสดงในตะกร้า"). */
  const usesCondition = () => promotionUsesCondition(type());
  const runsInCart = usesCondition;
  const isProductDiscount = () => type() === "percent_off" || type() === "baht_off";
  const bundleNormalTotal = () => promotionItemsTotal(fromItemDrafts(bundleItems()), (id) => productStore.getById(id)?.price);
  const [conditionType, setConditionType] = createSignal<PromotionCondition>(props.initial?.conditionType ?? "amount");
  const initialTiers = props.initial ? promotionGiftTiers(props.initial) : [];
  const [tiers, setTiers] = createSignal<TierDraft[]>(
    initialTiers.length > 0
      ? initialTiers.map((t) => ({ threshold: String(t.threshold), giftProductId: t.giftProductId, giftQty: String(t.giftQty), giftVariantIds: t.giftVariantIds ?? [] }))
      : [emptyTier()],
  );
  // ยิ่งซื้อยิ่งคุ้ม shows its banner unless switched off (older records have no value).
  const [showInCart, setShowInCart] = createSignal(props.initial?.showInCart ?? (props.initial?.type ?? promotionTypeForTool(props.tool)) === "tiered_discount");
  const [badgeLabel, setBadgeLabel] = createSignal(props.initial?.badgeLabel ?? "");
  const [showBadge, setShowBadge] = createSignal(props.initial?.showBadge !== false);
  const productStore = useAdminProducts();
  const productName = (id: string) => productStore.getById(id)?.name;
  const unitLabel = () => (conditionType() === "qty" ? "ชิ้น" : "฿");
  const updateTier = (i: number, patch: Partial<TierDraft>) => setTiers((list) => list.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  const addTier = () => {
    setTiers((list) => [...list, emptyTier()]);
  };
  const removeTier = (i: number) => {
    setTiers((list) => list.filter((_, j) => j !== i));
  };
  const [applyToAll, setApplyToAll] = createSignal((props.initial?.productIds.length ?? 0) === 0);
  // Picked products; per product `variantIds` empty = ทั้งสินค้า, else only those SKUs count (saved as productIds + productVariantIds).
  const [scopeRefs, setScopeRefs] = createSignal<ProductSkuRef[]>(
    (props.initial?.productIds ?? []).map((productId) => ({ productId, variantIds: props.initial?.productVariantIds?.[productId] ?? [] })),
  );
  const productIds = () => scopeRefs().map((r) => r.productId);
  /** Saved form of the SKU picks: only products limited to some of their options. */
  const savedVariantIds = (): Record<string, string[]> | undefined => {
    const entries = scopeRefs().flatMap((r): [string, string[]][] => (r.variantIds.length > 0 ? [[r.productId, r.variantIds]] : []));
    return entries.length > 0 ? Object.fromEntries(entries) : undefined;
  };
  const [startDate, setStartDate] = createSignal(props.initial?.startDate ?? "");
  const [startTime, setStartTime] = createSignal(props.initial?.startTime ?? "00:00");
  const [endDate, setEndDate] = createSignal(props.initial?.endDate ?? "");
  const [endTime, setEndTime] = createSignal(props.initial?.endTime ?? "23:59");

  const [errors, setErrors] = createSignal<FormErrors>({});
  const [submitted, setSubmitted] = createSignal(false);
  const labels = () => Object.fromEntries(Object.keys(errors()).map((k) => [k, promotionLabel(k)]));
  const [saving, setSaving] = createSignal(false);
  const [submitError, setSubmitError] = createSignal<string>();

  const dateRangeValid = createMemo(() => isValidDateRange(startDate(), startTime(), endDate(), endTime()));

  const validate = (): Record<string, string> => {
    const next: Record<string, string> = {};
    if (!name().trim()) next.name = "กรุณากรอกชื่อโปรโมชั่น";
    if (type() === "gift_with_purchase") {
      let prev = 0;
      tiers().forEach((t, i) => {
        const value = Number(t.threshold);
        if (!t.threshold.trim() || Number.isNaN(value) || value <= 0) next[`tier-${i}-threshold`] = "กรุณากรอกเงื่อนไขของขั้นนี้";
        else if (conditionType() === "qty" && !Number.isInteger(value)) next[`tier-${i}-threshold`] = "จำนวนชิ้นต้องเป็นจำนวนเต็ม";
        else if (value <= prev) next[`tier-${i}-threshold`] = "ต้องมากกว่าขั้นก่อนหน้า";
        if (!Number.isNaN(value)) prev = Math.max(prev, value);
        const qty = Number(t.giftQty);
        if (!Number.isInteger(qty) || qty < 1) next[`tier-${i}-giftQty`] = "จำนวนต้องเป็นจำนวนเต็มอย่างน้อย 1";
        if (!t.giftProductId) next[`tier-${i}-gift`] = "กรุณาเลือกสินค้าของแถม";
      });
    }
    if ((type() === "free_shipping" || type() === "percent_off" || type() === "baht_off") && minSpend().trim()) {
      const spend = Number(minSpend());
      if (Number.isNaN(spend) || spend < 0) next.minSpend = "กรุณากรอกขั้นต่ำที่ถูกต้อง";
      else if (type() === "free_shipping" && conditionType() === "qty" && !Number.isInteger(spend)) next.minSpend = "จำนวนชิ้นต้องเป็นจำนวนเต็ม";
    }
    if (type() === "percent_off") {
      const pct = Number(discountPercent());
      if (!discountPercent().trim() || !Number.isInteger(pct) || pct < 1 || pct > 100) next.discountPercent = "กรุณากรอกเปอร์เซ็นต์เป็นจำนวนเต็ม 1-100";
      const cap = Number(maxDiscount());
      if (maxDiscount().trim() && (Number.isNaN(cap) || cap <= 0)) next.maxDiscount = "กรุณากรอกส่วนลดสูงสุดที่ถูกต้อง";
    }
    if (type() === "baht_off") {
      const amount = Number(discountAmount());
      if (!discountAmount().trim() || Number.isNaN(amount) || amount <= 0) next.discountAmount = "กรุณากรอกจำนวนเงินที่ลด";
      else if (minSpend().trim() && Number(minSpend()) > 0 && amount > Number(minSpend())) next.minSpend = "ยอดซื้อขั้นต่ำต้องไม่น้อยกว่าส่วนลด";
    }
    if (type() === "bundle") {
      if (bundleItems().length < 2) next.bundleItems = "เลือกสินค้าอย่างน้อย 2 รายการ";
      else if (!itemDraftsValid(bundleItems())) next.bundleItems = "จำนวนต้องเป็นจำนวนเต็มอย่างน้อย 1";
      const price = Number(bundlePrice());
      if (!bundlePrice().trim() || Number.isNaN(price) || price <= 0) next.bundlePrice = "กรุณากรอกราคาเซ็ต";
      else if (bundleNormalTotal() > 0 && price >= bundleNormalTotal()) next.bundlePrice = "ราคาเซ็ตต้องต่ำกว่าราคาปกติรวม";
    }
    if (type() === "buy_x_get_y") {
      if (buyItems().length === 0) next.buyItems = "กรุณาเลือกสินค้าที่ต้องซื้อ";
      else if (!itemDraftsValid(buyItems())) next.buyItems = "จำนวนต้องเป็นจำนวนเต็มอย่างน้อย 1";
      if (getItems().length === 0) next.getItems = "กรุณาเลือกสินค้าที่แถม";
      else if (!itemDraftsValid(getItems())) next.getItems = "จำนวนต้องเป็นจำนวนเต็มอย่างน้อย 1";
    }
    // "เฉพาะสินค้าที่เลือก" with nothing picked would apply to no product at all.
    if (type() === "tiered_discount") {
      let prevThreshold = 0;
      let prevValue = 0;
      discountTiers().forEach((t, i) => {
        const threshold = Number(t.threshold);
        if (!t.threshold.trim() || Number.isNaN(threshold) || threshold <= 0) next[`dtier-${i}-threshold`] = "กรุณากรอกเงื่อนไขของขั้นนี้";
        else if (conditionType() === "qty" && !Number.isInteger(threshold)) next[`dtier-${i}-threshold`] = "จำนวนชิ้นต้องเป็นจำนวนเต็ม";
        else if (threshold <= prevThreshold) next[`dtier-${i}-threshold`] = "ต้องมากกว่าขั้นก่อนหน้า";
        if (!Number.isNaN(threshold)) prevThreshold = Math.max(prevThreshold, threshold);
        const value = Number(t.value);
        if (tierDiscountType() === "percent" && (!t.value.trim() || !Number.isInteger(value) || value < 1 || value > 100)) next[`dtier-${i}-value`] = "กรุณากรอกเปอร์เซ็นต์เป็นจำนวนเต็ม 1-100";
        else if (tierDiscountType() === "baht" && (!t.value.trim() || Number.isNaN(value) || value <= 0)) next[`dtier-${i}-value`] = "กรุณากรอกจำนวนเงินที่ลด";
        else if (value <= prevValue) next[`dtier-${i}-value`] = "ส่วนลดต้องมากกว่าขั้นก่อนหน้า";
        if (!Number.isNaN(value)) prevValue = Math.max(prevValue, value);
      });
    }
    if (promotionHasProductScope(type()) && !applyToAll() && productIds().length === 0) next.productIds = "กรุณาเลือกสินค้าอย่างน้อย 1 รายการ";
    const audienceProblem = audienceError(audience());
    if (audienceProblem) next.audience = audienceProblem;
    if (!startDate()) next.startDate = "กรุณาเลือกวันเริ่ม";
    if (!endDate()) next.endDate = "กรุณาเลือกวันสิ้นสุด";
    if (startDate() && endDate() && !dateRangeValid()) next.endDate = "วันสิ้นสุดต้องอยู่หลังวันเริ่ม";
    return next;
  };

  /** "บันทึกแบบร่าง": just the name, plus anything typed in must still be valid (e.g. no text in a number field). */
  const validateDraft = (): Record<string, string> => {
    const full = validate();
    const typed = (key: string): boolean => {
      const step = /^dtier-(\d+)-(threshold|value)$/.exec(key);
      if (step) {
        const t = discountTiers()[Number(step[1])];
        return step[2] === "threshold" ? !!t?.threshold.trim() : !!t?.value.trim();
      }
      const tier = /^tier-(\d+)-(threshold|giftQty|gift)$/.exec(key);
      if (tier) {
        const t = tiers()[Number(tier[1])];
        return tier[2] === "threshold" ? !!t?.threshold.trim() : tier[2] === "giftQty";
      }
      switch (key) {
        case "name":
        case "minSpend":
        case "maxDiscount":
          return true;
        case "discountPercent":
          return !!discountPercent().trim();
        case "discountAmount":
          return !!discountAmount().trim();
        case "bundlePrice":
          return !!bundlePrice().trim();
        case "bundleItems":
          return bundleItems().length > 0 && !itemDraftsValid(bundleItems());
        case "buyItems":
          return buyItems().length > 0 && !itemDraftsValid(buyItems());
        case "getItems":
          return getItems().length > 0 && !itemDraftsValid(getItems());
        case "endDate":
          return !!startDate() && !!endDate();
        default:
          return false;
      }
    };
    return Object.fromEntries(Object.entries(full).filter(([key]) => typed(key)));
  };

  // After a failed save, drop each error as soon as its field is fixed (never adds new ones while typing).
  createEffect(() => {
    if (!submitted()) return;
    const now = validate();
    setErrors((prev) => Object.fromEntries(Object.keys(prev).filter((k) => k in now).map((k) => [k, now[k]])));
  });

  const previewValues = (): PromotionFormValues => ({
    name: name().trim(),
    type: type(),
    minSpend: (type() === "free_shipping" || type() === "percent_off" || type() === "baht_off") && Number(minSpend()) > 0 ? Number(minSpend()) : undefined,
    conditionType: usesCondition() ? conditionType() : undefined,
    discountTiers: type() === "tiered_discount" ? discountTiers().map((t) => ({ threshold: Number(t.threshold) || 0, value: Number(t.value) || 0 })) : undefined,
    tierDiscountType: type() === "tiered_discount" ? tierDiscountType() : undefined,
    audience: fromAudienceDraft(audience()),
    combinableWith: fromCombinableDraft(combinable()),
    discountPercent: type() === "percent_off" ? Number(discountPercent()) || 0 : undefined,
    maxDiscount: type() === "percent_off" && Number(maxDiscount()) > 0 ? Number(maxDiscount()) : undefined,
    discountAmount: type() === "baht_off" ? Number(discountAmount()) || 0 : undefined,
    bundleItems: type() === "bundle" ? fromItemDrafts(bundleItems()) : undefined,
    bundlePrice: type() === "bundle" ? Number(bundlePrice()) || 0 : undefined,
    buyItems: type() === "buy_x_get_y" ? fromItemDrafts(buyItems()) : undefined,
    getItems: type() === "buy_x_get_y" ? fromItemDrafts(getItems()) : undefined,
    tiers:
      type() === "gift_with_purchase"
        ? tiers().map((t) => ({
            threshold: Number(t.threshold) || 0,
            giftProductId: t.giftProductId,
            giftQty: Number(t.giftQty) || 1,
            giftVariantIds: t.giftVariantIds.length > 0 ? t.giftVariantIds : undefined,
          }))
        : undefined,
    giftProductId: undefined,
    giftQty: undefined,
    showInCart: runsInCart() ? showInCart() : undefined,
    badgeLabel: showBadge() ? badgeLabel().trim() || undefined : undefined,
    showBadge: showBadge(),
    productIds: promotionHasProductScope(type()) && !applyToAll() ? productIds() : [],
    productVariantIds: promotionHasProductScope(type()) && !applyToAll() ? savedVariantIds() : undefined,
    startDate: startDate(),
    startTime: startTime(),
    endDate: endDate(),
    endTime: endTime(),
    status: enabled() ? "active" : "disabled",
  });

  const handleSubmit = (e: SubmitEvent) => {
    e.preventDefault();
    void save(draftFlow ? "active" : enabled() ? "active" : "disabled");
  };

  const save = async (nextStatus: Promotion["status"]) => {
    const validationErrors = nextStatus === "draft" ? validateDraft() : validate();
    setErrors(validationErrors);
    setSubmitted(true);
    if (reportFormErrors(validationErrors, Object.fromEntries(Object.keys(validationErrors).map((k) => [k, promotionLabel(k)])))) return;

    setSaving(true);
    setSubmitError(undefined);
    try {
      await props.onSubmit({ ...previewValues(), status: nextStatus });
    } catch {
      setSubmitError("บันทึกโปรโมชั่นไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setSaving(false);
    }
  };

  const discountUnit = () => (tierDiscountType() === "baht" ? "บาท" : "%");

  const conditionPicker = (
    <fieldset class="flex flex-col gap-2">
      <legend class="mb-2 text-sm font-medium text-ink">นับจาก</legend>
      <div class="flex flex-wrap gap-2" role="radiogroup">
        <For each={Object.entries(PROMOTION_CONDITION_META) as [PromotionCondition, { label: string }][]}>
          {([value, meta]) => (
            <button
              type="button"
              role="radio"
              aria-checked={conditionType() === value}
              disabled={saving()}
              onClick={() => setConditionType(value)}
              class={`min-h-11 rounded-pill border px-4 text-sm font-medium transition-colors duration-150 ${
                conditionType() === value ? "border-brand-pink bg-surface-pink text-brand-pink" : "border-border bg-surface-card text-ink hover:bg-surface-gray"
              }`}
            >
              {meta.label}
            </button>
          )}
        </For>
      </div>
      <p class="text-xs text-ink-gray">นับเฉพาะสินค้าที่เข้าร่วม ราคาก่อนหักคูปองและคอยน์ ไม่นับของแถม</p>
    </fieldset>
  );

  return (
    <form onSubmit={handleSubmit} noValidate class="flex flex-col gap-6">
      <AdminFormPreviewLayout
        previewLabel="ตัวอย่างโปรโมชั่น"
        form={
        <>
          <FormErrorSummary errors={errors()} labels={labels()} />

          {/* 1) ข้อมูลพื้นฐาน */}
          <FormSection title="ข้อมูลพื้นฐาน">
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField label="ชื่อโปรโมชั่น" required value={name()} onInput={(e) => setName(e.currentTarget.value)} data-field="name" error={errors().name} disabled={saving()} class="sm:col-span-2" />
              <Show
                when={!draftFlow}
                fallback={
                  <p class="text-xs text-ink-gray sm:col-span-2">
                    {props.initial ? "โปรโมชั่นนี้ยังเป็นแบบร่าง ยังไม่มีผลที่หน้าร้าน" : "บันทึกแบบร่างไว้ก่อนได้ แล้วกด ตกลงและเผยแพร่ เมื่อข้อมูลครบ"}
                  </p>
                }
              >
                <label class="flex flex-col gap-1.5">
                  <span class="text-sm font-medium text-ink">สถานะการใช้งาน</span>
                  <Toggle checked={enabled()} onChange={setEnabled} disabled={saving()} />
                  <span class="text-xs text-ink-gray">{enabled() ? "เปิดใช้ตามช่วงเวลาที่ตั้งไว้" : "ปิดอยู่ ยังไม่มีผล"}</span>
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
              }}
              errors={errors()}
              disabled={saving()}
              hint="เวลาประเทศไทย โปรเริ่มและหยุดเองตามเวลาที่ตั้งไว้"
            />
            <AudienceField value={audience()} onChange={setAudience} error={errors().audience} disabled={saving()} />
          </FormSection>

          {/* 2) สิทธิประโยชน์ */}
          <FormSection title="สิทธิประโยชน์">
            <Show when={usesCondition()}>{conditionPicker}</Show>
            <Show when={isProductDiscount()}>
              <div class="flex flex-col gap-2">
                <span class="text-sm font-medium text-ink">ประเภทส่วนลด</span>
                <ChoiceRadio
                  name="product-discount-kind"
                  value={type() === "baht_off" ? "baht" : "percent"}
                  disabled={saving()}
                  onChange={(kind) => {
                    setType(kind === "baht" ? "baht_off" : "percent_off");
                    setErrors(({ discountPercent: _p, discountAmount: _a, maxDiscount: _m, minSpend: _s, ...rest }) => rest);
                  }}
                  options={[
                    { value: "percent", label: "ลดเป็น %", hint: "ลดเป็นเปอร์เซ็นต์ ตั้งลดสูงสุดได้" },
                    { value: "baht", label: "ลดเป็นเงิน (฿)", hint: "ลดเป็นจำนวนเงินจากยอดสินค้าที่เข้าร่วม" },
                  ]}
                />
              </div>
            </Show>
            <Show when={type() === "percent_off"}>
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextField label="ส่วนลด (%)" required type="number" min="1" max="100" step="1" value={discountPercent()} onInput={(e) => setDiscountPercent(e.currentTarget.value)} data-field="discountPercent" error={errors().discountPercent} disabled={saving()} />
                <TextField label="ลดสูงสุด (บาท)" type="number" min="1" step="1" value={maxDiscount()} onInput={(e) => setMaxDiscount(e.currentTarget.value)} data-field="maxDiscount" error={errors().maxDiscount} disabled={saving()} placeholder="ไม่จำกัด" />
              </div>
              <p class="text-xs text-ink-gray">ลดเป็นเปอร์เซ็นต์จากราคาสินค้าที่เข้าร่วม เว้นลดสูงสุดว่างไว้ถ้าไม่จำกัด</p>
            </Show>
            <Show when={type() === "baht_off"}>
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextField label="ส่วนลด (บาท)" required type="number" min="1" step="1" value={discountAmount()} onInput={(e) => setDiscountAmount(e.currentTarget.value)} data-field="discountAmount" error={errors().discountAmount} disabled={saving()} />
              </div>
              <p class="text-xs text-ink-gray">ลดเป็นจำนวนเงินจากยอดสินค้าที่เข้าร่วม</p>
            </Show>
            <Show when={type() === "tiered_discount"}>
              <div class="flex flex-col gap-2">
                <span class="text-sm font-medium text-ink">ประเภทส่วนลด</span>
                <ChoiceRadio
                  name="tier-discount-kind"
                  value={tierDiscountType()}
                  disabled={saving()}
                  onChange={(kind) => {
                    setTierDiscountType(kind);
                    setErrors((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => !/^dtier-\d+-value$/.test(k))));
                  }}
                  options={[
                    { value: "percent", label: "ลดเป็น %" },
                    { value: "baht", label: "ลดเป็นเงิน (฿)" },
                  ]}
                />
              </div>
              <div class="flex flex-col gap-3">
                <div class="flex flex-wrap items-baseline justify-between gap-2">
                  <span class="text-sm font-medium text-ink">ขั้นส่วนลด</span>
                  <span class="text-sm text-ink-gray">ตั้งได้สูงสุด {MAX_DISCOUNT_TIERS} ขั้น</span>
                </div>
                <Index each={discountTiers()}>
                  {(step, i) => (
                    <div class="flex flex-col gap-3 rounded-card border border-border p-4">
                      <div class="flex items-center justify-between gap-2">
                        <span class="text-sm font-semibold text-ink">ขั้นที่ {i + 1}</span>
                        <Show when={discountTiers().length > 1}>
                          <button
                            type="button"
                            onClick={() => setDiscountTiers((list) => list.filter((_, j) => j !== i))}
                            disabled={saving()}
                            class="min-h-11 px-2 text-sm font-medium text-danger-strong hover:underline"
                          >
                            ลบขั้นนี้
                          </button>
                        </Show>
                      </div>
                      <div class="grid grid-cols-2 gap-4">
                        <TextField
                          label={`ซื้อครบ (${unitLabel()})`}
                          required
                          type="number"
                          min="0"
                          step={conditionType() === "qty" ? "1" : "0.01"}
                          value={step().threshold}
                          onInput={(e) => updateStep(i, { threshold: e.currentTarget.value })}
                          data-field={`dtier-${i}-threshold`}
                          error={errors()[`dtier-${i}-threshold`]}
                          disabled={saving()}
                        />
                        <TextField
                          label={`ส่วนลด (${discountUnit()})`}
                          required
                          type="number"
                          min="1"
                          max={tierDiscountType() === "percent" ? "100" : undefined}
                          step="1"
                          value={step().value}
                          onInput={(e) => updateStep(i, { value: e.currentTarget.value })}
                          data-field={`dtier-${i}-value`}
                          error={errors()[`dtier-${i}-value`]}
                          disabled={saving()}
                        />
                      </div>
                    </div>
                  )}
                </Index>
                <Show when={discountTiers().length < MAX_DISCOUNT_TIERS}>
                  <Button type="button" variant="outline" disabled={saving()} onClick={() => setDiscountTiers((list) => [...list, { threshold: "", value: "" }])} class="self-start">
                    เพิ่มขั้นส่วนลด
                  </Button>
                </Show>
              </div>
              <p class="text-xs text-ink-gray">ลูกค้าได้ส่วนลดของขั้นสูงสุดที่ซื้อถึง ไม่รวมกันหลายขั้น</p>
            </Show>
            <Show when={type() === "buy_x_get_y"}>
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div data-field="buyItems" class="min-w-0"><PromotionItemsBox title="สินค้าที่ต้องซื้อ" hint="ลูกค้าต้องซื้อครบทุกรายการตามจำนวน" items={buyItems()} onChange={setBuyItems} error={errors().buyItems} disabled={saving()} /></div>
                <div data-field="getItems" class="min-w-0"><PromotionItemsBox title="สินค้าที่แถม" hint="ลูกค้าได้รับฟรีทุกรายการตามจำนวน" items={getItems()} onChange={setGetItems} error={errors().getItems} disabled={saving()} accent /></div>
              </div>
            </Show>
            <Show when={type() === "bundle"}>
              <div data-field="bundleItems" class="min-w-0"><PromotionItemsBox title="สินค้าในเซ็ต" hint="เลือกอย่างน้อย 2 รายการ" items={bundleItems()} onChange={setBundleItems} error={errors().bundleItems} disabled={saving()} /></div>
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextField label="ราคาเซ็ต (บาท)" required type="number" min="1" step="1" value={bundlePrice()} onInput={(e) => setBundlePrice(e.currentTarget.value)} data-field="bundlePrice" error={errors().bundlePrice} disabled={saving()} />
              </div>
              <BundlePriceSummary normal={bundleNormalTotal()} price={Number(bundlePrice()) || 0} />
            </Show>
            <Show when={type() === "free_shipping"}>
              <TextField
                label={`ส่งฟรีเมื่อซื้อครบ (${unitLabel()})`}
                type="number"
                min="0"
                step={conditionType() === "qty" ? "1" : "0.01"}
                value={minSpend()}
                onInput={(e) => setMinSpend(e.currentTarget.value)}
                data-field="minSpend"
                error={errors().minSpend}
                disabled={saving()}
              />
              <p class="text-xs text-ink-gray">เว้นว่างไว้ถ้าต้องการส่งฟรีทุกออเดอร์</p>
            </Show>
            <Show when={type() === "gift_with_purchase"}>
              <div class="flex flex-col gap-3">
                <div class="flex flex-wrap items-baseline justify-between gap-2">
                  <span class="text-sm font-medium text-ink">
                    ขั้นของแถม {tiers().length > 1 ? `(ขั้นบันได ${tiers().length} ขั้น)` : ""}
                  </span>
                  <span class="text-sm text-ink-gray">ตั้งได้สูงสุด {MAX_GIFT_TIERS} ขั้น</span>
                </div>
                <Index each={tiers()}>
                  {(tier, i) => (
                    <div class="flex flex-col gap-3 rounded-card border border-border p-4">
                      <div class="flex items-center justify-between gap-2">
                        <span class="text-sm font-semibold text-ink">ขั้นที่ {i + 1}</span>
                        <Show when={tiers().length > 1}>
                          <button type="button" onClick={() => removeTier(i)} disabled={saving()} class="min-h-11 px-2 text-sm font-medium text-danger-strong hover:underline">
                            ลบขั้นนี้
                          </button>
                        </Show>
                      </div>
                      <div class="grid grid-cols-2 gap-4">
                        <TextField
                          label={`ซื้อครบ (${unitLabel()})`}
                          required
                          type="number"
                          min="0"
                          step={conditionType() === "qty" ? "1" : "0.01"}
                          value={tier().threshold}
                          onInput={(e) => updateTier(i, { threshold: e.currentTarget.value })}
                          data-field={`tier-${i}-threshold`}
                          error={errors()[`tier-${i}-threshold`]}
                          disabled={saving()}
                        />
                        <TextField
                          label="จำนวนของแถม"
                          required
                          type="number"
                          min="1"
                          value={tier().giftQty}
                          onInput={(e) => updateTier(i, { giftQty: e.currentTarget.value })}
                          data-field={`tier-${i}-giftQty`}
                          error={errors()[`tier-${i}-giftQty`]}
                          disabled={saving()}
                        />
                      </div>
                      <div data-field={`tier-${i}-gift`} class="flex flex-col gap-2">
                        <span class="text-sm font-medium text-ink">
                          สินค้าของแถม <span class="text-system-red">*</span>
                        </span>
                        <ProductSkuPicker
                          single
                          value={tier().giftProductId ? [{ productId: tier().giftProductId, variantIds: tier().giftVariantIds }] : []}
                          onChange={(refs) => updateTier(i, { giftProductId: refs[0]?.productId ?? "", giftVariantIds: refs[0]?.variantIds ?? [] })}
                          disabled={saving()}
                          error={errors()[`tier-${i}-gift`]}
                        />
                        <Show when={tier().giftProductId}>
                          <p class="text-xs text-ink-gray">ระดับสินค้า: ลูกค้าเลือกตัวเลือกไหนก็ได้ในตะกร้า ระดับตัวเลือกสินค้า: ลูกค้าเลือกได้เฉพาะ SKU ที่เปิดไว้ ถ้าเปิดไว้ตัวเดียว ลูกค้าจะได้ตัวนั้นเลย ตัวเลือกที่สินค้าหมดจะไม่แสดงให้เลือก</p>
                        </Show>
                      </div>
                    </div>
                  )}
                </Index>
                <Show when={tiers().length < MAX_GIFT_TIERS}>
                  <Button type="button" variant="outline" disabled={saving()} onClick={addTier} class="self-start">
                    เพิ่มขั้นของแถม
                  </Button>
                </Show>
              </div>
              <p class="text-xs text-ink-gray">ลูกค้าได้ของแถมทุกขั้นที่ซื้อถึงแบบสะสม ของแถมไม่นับเป็นสินค้าในตะกร้า ไม่คิดราคา และหายไปเองเมื่อยอดต่ำกว่าขั้น</p>
            </Show>
          </FormSection>

          {/* 3) สินค้า */}
          <FormSection title="สินค้า">
            <Show
              when={promotionHasProductScope(type())}
              fallback={<p class="text-sm text-ink-gray">{type() === "bundle" ? "สินค้าในเซ็ตเลือกไว้ในส่วนสิทธิประโยชน์ด้านบน" : "สินค้าที่ต้องซื้อและสินค้าที่แถมเลือกไว้ในส่วนสิทธิประโยชน์ด้านบน"}</p>}
            >
              <div data-field="productIds" class="flex flex-col gap-3">
                <ChoiceRadio
                  name="promotion-product-scope"
                  value={applyToAll() ? "all" : "selected"}
                  disabled={saving()}
                  onChange={(mode) => setApplyToAll(mode === "all")}
                  options={[
                    { value: "all", label: "ทั้งร้าน", hint: "ใช้กับทุกสินค้าในตะกร้า" },
                    { value: "selected", label: "เฉพาะสินค้าที่เลือก", hint: "นับเฉพาะสินค้าหรือ SKU ที่เลือก" },
                  ]}
                />
                <Show when={!applyToAll()}>
                  <ProductSkuPicker value={scopeRefs()} onChange={setScopeRefs} disabled={saving()} error={errors().productIds} />
                </Show>
              </div>
            </Show>
          </FormSection>

          {/* 4) จำกัดการใช้ */}
          <FormSection title="จำกัดการใช้">
            <Show
              when={isProductDiscount()}
              fallback={<p class="text-sm text-ink-gray">ลูกค้าได้รับสิทธิ์ทุกคำสั่งซื้อที่ถึงเงื่อนไข ตามกลุ่มลูกค้าและช่วงเวลาที่ตั้งไว้</p>}
            >
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextField label="ยอดซื้อขั้นต่ำ (บาท)" type="number" min="0" step="1" value={minSpend()} onInput={(e) => setMinSpend(e.currentTarget.value)} data-field="minSpend" error={errors().minSpend} disabled={saving()} placeholder="ไม่มีขั้นต่ำ" />
              </div>
              <p class="text-xs text-ink-gray">
                ไม่มีขั้นต่ำและไม่จำกัดลดสูงสุด: ลดที่ราคาสินค้าโดยตรง หน้าร้านแสดงเป็นราคาลดบนการ์ดและหน้าสินค้า ถ้าตั้งขั้นต่ำหรือลดสูงสุด: ลดจากยอดสินค้าที่เข้าร่วมในตะกร้าเมื่อถึงเงื่อนไข และแสดงเป็นรายการส่วนลดในสรุปคำสั่งซื้อ
              </p>
            </Show>
          </FormSection>

          {/* 5) การแสดงผล */}
          <FormSection title="การแสดงผล">
            <Show when={runsInCart()}>
              <SettingRow title="แสดงในตะกร้า" hint="แสดงแถบความคืบหน้าของโปรนี้ในตะกร้าและหน้าตะกร้าสินค้า ถ้าไม่แสดง โปรยังมีผลตามเงื่อนไขเหมือนเดิม">
                <Toggle checked={showInCart()} onChange={setShowInCart} onLabel="แสดง" offLabel="ไม่แสดง" disabled={saving()} />
              </SettingRow>
            </Show>
            <SettingRow title="แสดงป้ายโปรโมชั่น" hint="ป้ายสีแดงบนการ์ดสินค้าและหน้าสินค้าที่ร่วมโปรนี้ ปิดได้ถ้าเป็นโปรทั้งร้านที่ไม่อยากให้ขึ้นทุกการ์ด">
              <Toggle checked={showBadge()} onChange={setShowBadge} onLabel="แสดง" offLabel="ไม่แสดง" disabled={saving()} />
            </SettingRow>
            <Show when={showBadge()}>
              <TextField
                label="ข้อความบนป้ายโปรโมชั่น"
                placeholder={promotionBadgeLabel({ ...previewValues(), badgeLabel: undefined })}
                value={badgeLabel()}
                maxLength={40}
                disabled={saving()}
                onInput={(e) => setBadgeLabel(e.currentTarget.value)}
              />
              <p class="-mt-2 text-xs text-ink-gray">เว้นว่างจะใช้ข้อความตามเงื่อนไขของโปร</p>
            </Show>
          </FormSection>

          {/* 6) การใช้ร่วมกับโปรอื่น */}
          <FormSection title="การใช้ร่วมกับโปรอื่น" description="โปรนี้ใช้ร่วมกับโปรประเภทไหนได้บ้างในคำสั่งซื้อเดียวกัน">
            <CombinableField value={combinable()} onChange={setCombinable} disabled={saving()} />
          </FormSection>

          <Show when={submitError()}>
            <p role="alert" class="rounded-card bg-danger-soft px-4 py-3 text-sm font-medium text-danger-strong">
              {submitError()}
            </p>
          </Show>
        </>
        }
        preview={
            <div class="flex flex-col gap-2 p-4 text-sm sm:p-5">
              <p class="text-xs font-medium text-ink-gray">{MARKETING_TOOL_META[props.tool].label}</p>
              <p class="text-base font-semibold text-ink">{name() || "ชื่อโปรโมชั่น"}</p>
              <p class="font-medium text-brand-pink">{formatPromotionDiscount(previewValues(), productName)}</p>
              <Show when={type() === "gift_with_purchase" && tiers().length > 1}>
                <ol class="flex flex-col gap-1 text-ink-gray">
                  <For each={tiers()}>
                    {(t, i) => (
                      <li class="truncate">
                        ขั้นที่ {i() + 1} ซื้อครบ {t.threshold ? formatPromotionThreshold(conditionType(), Number(t.threshold)) : "-"} รับ {productName(t.giftProductId) ?? "ยังไม่เลือกของแถม"}
                      </li>
                    )}
                  </For>
                </ol>
              </Show>
              <Show when={type() === "tiered_discount" && discountTiers().length > 1}>
                <ol class="flex flex-col gap-1 text-ink-gray">
                  <For each={discountTiers()}>
                    {(t, i) => (
                      <li class="truncate">
                        ขั้นที่ {i() + 1} ซื้อครบ {t.threshold ? formatPromotionThreshold(conditionType(), Number(t.threshold)) : "-"} {t.value ? formatDiscountValue(tierDiscountType(), Number(t.value)) : ""}
                      </li>
                    )}
                  </For>
                </ol>
              </Show>
              <Show when={promotionHasProductScope(type())}>
                <p class="text-ink-gray">สินค้า: {applyToAll() ? "ทั้งร้าน" : skuRefsSummary(scopeRefs())}</p>
              </Show>
              <p class="text-ink-gray">กลุ่มลูกค้า: {formatAudience(fromAudienceDraft(audience()))}</p>
              <Show when={startDate() && endDate()}>
                <p class="text-ink-gray">
                  {formatMarketingDateTime(startDate(), startTime())} - {formatMarketingDateTime(endDate(), endTime())}
                </p>
              </Show>
              <Show when={runsInCart()}>
                <p class="text-ink-gray">{showInCart() ? "แสดงในตะกร้า" : "ไม่แสดงในตะกร้า"}</p>
              </Show>
              <Show when={showBadge()}>
                <p class="self-start rounded-pill bg-danger-soft px-2.5 py-0.5 text-xs text-danger-strong">{promotionBadgeLabel(previewValues())}</p>
              </Show>
              <p class="text-ink-gray">{formatCombinable(fromCombinableDraft(combinable()))}</p>
              <p class="text-ink-gray">{draftFlow ? "แบบร่าง" : enabled() ? "เปิดใช้งาน" : "ปิดใช้งาน"}</p>
              <Show when={startDate() && endDate() && !dateRangeValid()}>
                <p class="text-system-red">ช่วงวันที่ไม่ถูกต้อง</p>
              </Show>
            </div>
        }
      />

      <AdminFloatingBar>
        <DraftPublishActions
          draft={draftFlow}
          saving={saving()}
          publishLabel="ตกลงและเผยแพร่"
          onCancel={props.onCancel}
          onSaveDraft={() => void save("draft")}
          onPublish={() => void save("active")}
          onSave={() => void save(enabled() ? "active" : "disabled")}
        />
      </AdminFloatingBar>
      <div class="h-16" aria-hidden="true" />
    </form>
  );
}
