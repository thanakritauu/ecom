import { createEffect, createMemo, createSignal, For, Show } from "solid-js";
import { createStore, produce } from "solid-js/store";
import { TextField } from "~/components/shared/TextField";
import { Button } from "~/components/shared/Button";
import { ProductCard } from "~/components/shared/ProductCard";
import { AdminFloatingBar } from "~/components/admin/AdminFloatingBar";
import { DraftPublishActions } from "~/components/admin/DraftPublishActions";
import { Toggle } from "~/components/admin/Toggle";
import { AdminFormPreviewLayout } from "~/components/admin/AdminFormPreviewLayout";
import { FormErrorSummary } from "~/components/admin/FormErrorSummary";
import { ProductSkuPicker, type ProductSkuColumn, type ProductSkuLevel } from "~/components/admin/ProductSkuPicker";
import { reportFormErrors, type FormErrors } from "~/lib/adminFormValidation";
import type { ProductSkuRef } from "~/lib/productSkuRef";
import { useAdminProducts, type AdminProduct } from "~/lib/adminProductStore";
import { useAdminMarketing } from "~/lib/adminMarketingStore";
import { formatAdminCurrency } from "~/lib/adminDashboard";
import { formatCombinable } from "~/lib/adminMarketing";
import { formatAudience } from "~/lib/marketingAudience";
import { pushToast } from "~/lib/toast";
import {
  applyFlashPricing,
  effectiveLevel,
  flashLimitError,
  flashPriceFrom,
  flashValueError,
  optionNormalPrice,
  type FlashPriceMode,
  type FlashSaleConfig,
} from "~/lib/flashSalePricing";
import { bangkokEpoch, flashCampaignOverlaps, flashCampaignRoundAt, formatFlashSchedule, type FlashSaleCampaign, type FlashScheduleKind } from "~/lib/flashSaleCampaigns";
import { flashSaleRoundEndsAt } from "~/lib/products";
import { ChoiceRadio } from "./ChoiceRadio";
import { LimitInput, PriceModeInput, previewOf } from "./FlashSaleInputs";
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

export type FlashSaleCampaignFormValues = Omit<FlashSaleCampaign, "id" | "createdAt" | "updatedAt">;

/** One price row as typed (product level, or one SKU at option level). */
type PriceDraft = { mode: FlashPriceMode; value: string; totalLimit: string; customerLimit: string };
type ItemDraft = PriceDraft & { options: Record<string, PriceDraft> };

const str = (n?: number) => (n === undefined ? "" : String(n));
const limitOf = (raw: string) => (raw.trim() === "" ? undefined : Number(raw));
const emptyPrice = (): PriceDraft => ({ mode: "percent", value: "", totalLimit: "", customerLimit: "" });

function toItemDraft(p: AdminProduct | undefined, cfg: FlashSaleConfig | undefined): ItemDraft {
  const base: PriceDraft = cfg ? { mode: cfg.mode, value: cfg.value ? str(cfg.value) : "", totalLimit: str(cfg.totalLimit), customerLimit: str(cfg.customerLimit) } : emptyPrice();
  const options: Record<string, PriceDraft> = {};
  for (const v of p?.adminVariants ?? []) {
    const o = cfg?.level === "option" ? cfg.options.find((x) => x.variantId === v.id) : undefined;
    options[v.id] = o ? { mode: o.mode, value: o.value ? str(o.value) : "", totalLimit: str(o.totalLimit), customerLimit: str(o.customerLimit) } : { ...base, totalLimit: "", customerLimit: "" };
  }
  return { ...base, options };
}

/** At option level the SKU switches are the picker's `variantIds` (all on = []). */
function refFor(p: AdminProduct | undefined, cfg: FlashSaleConfig): ProductSkuRef {
  if (!p || effectiveLevel(p, cfg) !== "option") return { productId: p?.id ?? "", variantIds: [] };
  const on = p.adminVariants.filter((v) => cfg.options.find((o) => o.variantId === v.id)?.enabled).map((v) => v.id);
  return { productId: p.id, variantIds: on.length === p.adminVariants.length || on.length === 0 ? [] : on };
}

/**
 * Create / edit one flash sale campaign (TikTok Shop flash deal style), in the
 * shared marketing block order: ข้อมูลพื้นฐาน (ชื่อ, ช่วงเวลา or รอบรายวัน,
 * กลุ่มลูกค้า), สินค้า (the shared product table with ราคาลด ฿ หรือ ลด %,
 * จำกัดการซื้อทั้งหมด, จำกัดการซื้อของลูกค้า, SKU switches and อัปเดตเป็นชุด),
 * การใช้ร่วมกับโปรอื่น. Draft-first: บันทึกแบบร่าง / ตกลงและเผยแพร่.
 */
export function FlashSaleCampaignForm(props: {
  initial?: FlashSaleCampaign;
  onSubmit: (values: FlashSaleCampaignFormValues) => Promise<void>;
  onCancel: () => void;
}) {
  const productStore = useAdminProducts();
  const marketing = useAdminMarketing();
  const productOf = (id: string) => productStore.getById(id);
  const hasOptions = (id: string) => (productOf(id)?.adminVariants.length ?? 0) > 0;

  const draftFlow = !props.initial || props.initial.status === "draft";
  const [enabled, setEnabled] = createSignal(props.initial ? props.initial.status === "active" : false);
  const [name, setName] = createSignal(props.initial?.name ?? "");
  const [schedule, setSchedule] = createSignal<FlashScheduleKind>(props.initial?.schedule ?? "range");
  const [period, setPeriod] = createStore({
    startDate: props.initial?.startDate ?? "",
    startTime: props.initial?.startTime ?? "00:00",
    endDate: props.initial?.endDate ?? "",
    endTime: props.initial?.endTime ?? "23:59",
  });
  const [dailyAllDay, setDailyAllDay] = createSignal(props.initial?.dailyAllDay ?? true);
  const [dailyStart, setDailyStart] = createSignal(props.initial?.dailyStart ?? "12:00");
  const [dailyEnd, setDailyEnd] = createSignal(props.initial?.dailyEnd ?? "14:00");
  const [audience, setAudience] = createSignal<AudienceDraft>(toAudienceDraft(props.initial?.audience));
  const [combinable, setCombinable] = createSignal(toCombinableDraft(props.initial?.combinableWith));

  // Products: the picker's refs (order + SKU switches) and the typed prices per product.
  const initialItems = props.initial?.items ?? [];
  const [level, setLevel] = createSignal<ProductSkuLevel>(
    initialItems.some((i) => { const p = productOf(i.productId); return !!p && effectiveLevel(p, i.flash) === "option"; }) ? "option" : "product",
  );
  const [refs, setRefs] = createSignal<ProductSkuRef[]>(initialItems.map((i) => ({ ...refFor(productOf(i.productId), i.flash), productId: i.productId })));
  const [drafts, setDrafts] = createStore<Record<string, ItemDraft>>(Object.fromEntries(initialItems.map((i) => [i.productId, toItemDraft(productOf(i.productId), i.flash)])));
  const draftOf = (id: string): ItemDraft => drafts[id] ?? { ...emptyPrice(), options: {} };
  const optionDraftOf = (id: string, variantId: string): PriceDraft => draftOf(id).options[variantId] ?? emptyPrice();
  const isOptionOn = (id: string, variantId: string) => {
    const ref = refs().find((r) => r.productId === id);
    return !ref || ref.variantIds.length === 0 || ref.variantIds.includes(variantId);
  };
  /** Product row holds the price when the list is at product level, or the product has no options. */
  const priceOnProduct = (id: string) => level() === "product" || !hasOptions(id);

  const onRefs = (next: ProductSkuRef[]) => {
    for (const r of next) if (!drafts[r.productId]) setDrafts(r.productId, toItemDraft(productOf(r.productId), undefined));
    setRefs(next);
  };
  const setPrice = (id: string, patch: Partial<PriceDraft>) => setDrafts(id, (d) => ({ ...(d ?? { ...emptyPrice(), options: {} }), ...patch }));
  const setOptionPrice = (id: string, variantId: string, patch: Partial<PriceDraft>) =>
    setDrafts(id, "options", (o) => ({ ...(o ?? {}), [variantId]: { ...(o?.[variantId] ?? emptyPrice()), ...patch } }));
  const changeLevel = (next: ProductSkuLevel) => {
    // Going to option level: SKUs with no price yet start from the product's price.
    if (next === "option") {
      for (const r of refs()) {
        const d = draftOf(r.productId);
        for (const v of productOf(r.productId)?.adminVariants ?? []) {
          if (!optionDraftOf(r.productId, v.id).value.trim() && d.value.trim()) setOptionPrice(r.productId, v.id, { mode: d.mode, value: d.value });
        }
      }
    }
    setLevel(next);
  };

  // ---- values --------------------------------------------------------------

  const configOf = (id: string): FlashSaleConfig => {
    const d = draftOf(id);
    const product = { mode: d.mode, value: Number(d.value) || 0, totalLimit: limitOf(d.totalLimit), customerLimit: limitOf(d.customerLimit) };
    if (priceOnProduct(id)) return { level: "product", ...product, options: [] };
    return {
      level: "option",
      mode: d.mode,
      value: Number(d.value) || 0,
      options: (productOf(id)?.adminVariants ?? []).map((v) => {
        const o = optionDraftOf(id, v.id);
        const on = isOptionOn(id, v.id);
        return { variantId: v.id, enabled: on, mode: o.mode, value: Number(o.value) || 0, totalLimit: on ? limitOf(o.totalLimit) : undefined, customerLimit: on ? limitOf(o.customerLimit) : undefined };
      }),
    };
  };

  const values = (): FlashSaleCampaignFormValues => ({
    name: name().trim(),
    status: enabled() ? "active" : "disabled",
    schedule: schedule(),
    startDate: period.startDate,
    startTime: period.startTime,
    endDate: period.endDate,
    endTime: period.endTime,
    dailyAllDay: dailyAllDay(),
    dailyStart: dailyStart(),
    dailyEnd: dailyEnd(),
    audience: fromAudienceDraft(audience()),
    combinableWith: fromCombinableDraft(combinable()),
    items: refs().map((r) => ({ productId: r.productId, flash: configOf(r.productId) })),
  });

  /** Other published campaigns selling the same products at the same time (warning only; the lower price wins on the storefront). */
  const overlaps = createMemo(() =>
    flashCampaignOverlaps({ ...values(), status: "active", id: props.initial?.id ?? "new", createdAt: "", updatedAt: "" }, marketing.flashSales.items()),
  );
  const overlapText = () =>
    overlaps()
      .map((o) => `${o.campaign.name} (${o.productIds.map((id) => productOf(id)?.name ?? id).join(", ")})`)
      .join(", ");

  // ---- validation ----------------------------------------------------------

  const [errors, setErrors] = createSignal<FormErrors>({});
  const [submitted, setSubmitted] = createSignal(false);
  const [saving, setSaving] = createSignal(false);
  const [submitError, setSubmitError] = createSignal<string>();

  const labels = createMemo(() => {
    const out: Record<string, string> = {
      name: "ชื่อแคมเปญ",
      startDate: "วันเริ่ม",
      endDate: "วันสิ้นสุด",
      dailyEnd: "เวลารอบรายวัน",
      audience: "กลุ่มลูกค้า",
      items: "สินค้า",
    };
    for (const r of refs()) {
      const p = productOf(r.productId);
      const n = p?.name ?? r.productId;
      out[`p-${r.productId}-value`] = `ราคาลด ${n}`;
      out[`p-${r.productId}-total`] = `จำกัดการซื้อทั้งหมด ${n}`;
      out[`p-${r.productId}-customer`] = `จำกัดการซื้อของลูกค้า ${n}`;
      for (const v of p?.adminVariants ?? []) {
        const vn = `${n} ${v.label}`;
        out[`o-${r.productId}-${v.id}-value`] = `ราคาลด ${vn}`;
        out[`o-${r.productId}-${v.id}-total`] = `จำกัดการซื้อทั้งหมด ${vn}`;
        out[`o-${r.productId}-${v.id}-customer`] = `จำกัดการซื้อของลูกค้า ${vn}`;
      }
    }
    return out;
  });

  const validate = (): FormErrors => {
    const next: FormErrors = {};
    if (!name().trim()) next.name = "กรุณากรอกชื่อแคมเปญ";
    const from = bangkokEpoch(period.startDate, period.startTime);
    const to = bangkokEpoch(period.endDate, period.endTime, true);
    if (schedule() === "range") {
      if (from === undefined) next.startDate = "กรุณาเลือกวันเริ่ม";
      if (to === undefined) next.endDate = "กรุณาเลือกวันสิ้นสุด";
      else if (from !== undefined && to <= from) next.endDate = "เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่ม";
      else if (to <= Date.now()) next.endDate = "เวลาสิ้นสุดต้องอยู่หลังเวลาปัจจุบัน";
    } else {
      if (from !== undefined && to !== undefined && to <= from) next.endDate = "วันสิ้นสุดต้องไม่ก่อนวันเริ่ม";
      if (!dailyAllDay() && (!dailyStart() || !dailyEnd() || dailyEnd() <= dailyStart())) next.dailyEnd = "เวลาจบรอบต้องอยู่หลังเวลาเริ่มรอบ";
    }
    const a = audienceError(audience());
    if (a) next.audience = a;
    if (refs().length === 0) next.items = "กรุณาเลือกสินค้าอย่างน้อย 1 รายการ";
    for (const r of refs()) {
      const p = productOf(r.productId);
      if (!p) continue;
      const id = r.productId;
      if (priceOnProduct(id)) {
        const d = draftOf(id);
        const lowest = p.adminVariants.length > 0 ? Math.min(...p.adminVariants.map((v) => optionNormalPrice(p, v))) : p.price;
        const v = flashValueError(d.mode, d.value, lowest);
        if (v) next[`p-${id}-value`] = d.mode === "baht" && p.adminVariants.length > 0 && v === "ราคาแฟลชเซลต้องต่ำกว่าราคาปกติ" ? "ราคาแฟลชเซลต้องต่ำกว่าราคาปกติของทุกตัวเลือก" : v;
        const t = flashLimitError(d.totalLimit);
        if (t) next[`p-${id}-total`] = t;
        const c = flashLimitError(d.customerLimit);
        if (c) next[`p-${id}-customer`] = c;
        continue;
      }
      for (const variant of p.adminVariants) {
        if (!isOptionOn(id, variant.id)) continue;
        const o = optionDraftOf(id, variant.id);
        const key = `o-${id}-${variant.id}`;
        const v = flashValueError(o.mode, o.value, optionNormalPrice(p, variant));
        if (v) next[`${key}-value`] = v;
        const t = flashLimitError(o.totalLimit);
        if (t) next[`${key}-total`] = t;
        const c = flashLimitError(o.customerLimit);
        if (c) next[`${key}-customer`] = c;
      }
    }
    return next;
  };

  /** บันทึกแบบร่าง: only the name, plus anything typed must still be valid. */
  const validateDraft = (): FormErrors => {
    const full = validate();
    const typed = (key: string): boolean => {
      if (key === "name") return true;
      if (key === "endDate") return !!period.startDate && !!period.endDate && !full.endDate?.includes("ปัจจุบัน");
      const m = /^(p|o)-(.+)-(value|total|customer)$/.exec(key);
      if (!m) return false;
      if (m[3] !== "value") return true;
      if (m[1] === "p") return !!draftOf(m[2]).value.trim();
      const id = refs().find((r) => m[2].startsWith(`${r.productId}-`))?.productId;
      return !!id && !!optionDraftOf(id, m[2].slice(id.length + 1)).value.trim();
    };
    return Object.fromEntries(Object.entries(full).filter(([k]) => typed(k)));
  };

  // After a failed save, drop each error as soon as its field is fixed.
  createEffect(() => {
    if (!submitted()) return;
    const now = validate();
    setErrors((prev) => Object.fromEntries(Object.keys(prev).filter((k) => k in now).map((k) => [k, now[k]])));
  });

  const save = async (status: FlashSaleCampaign["status"]) => {
    const next = status === "draft" ? validateDraft() : validate();
    setErrors(next);
    setSubmitted(true);
    if (reportFormErrors(next, labels())) return;
    setSaving(true);
    setSubmitError(undefined);
    const warn = status === "active" && overlaps().length > 0 ? overlapText() : undefined;
    try {
      await props.onSubmit({ ...values(), status });
      if (warn) pushToast("มีสินค้าที่อยู่ในแฟลชเซลอื่นช่วงเวลาเดียวกัน หน้าร้านจะใช้ราคาที่ต่ำกว่า", "warning", warn);
    } catch {
      setSubmitError("บันทึกแฟลชเซลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setSaving(false);
    }
  };

  // ---- bulk ----------------------------------------------------------------

  const [bulk, setBulk] = createStore<PriceDraft>(emptyPrice());
  const [bulkErrors, setBulkErrors] = createSignal<FormErrors>({});
  const applyBulk = (ids: string[]) => {
    const next: FormErrors = {};
    if (bulk.value.trim()) {
      const err = flashValueError(bulk.mode, bulk.value, Number.POSITIVE_INFINITY);
      if (err) next.value = err;
    }
    const t = flashLimitError(bulk.totalLimit);
    if (t) next.total = t;
    const c = flashLimitError(bulk.customerLimit);
    if (c) next.customer = c;
    setBulkErrors(next);
    if (Object.keys(next).length > 0) return;
    const patch: Partial<PriceDraft> = {};
    if (bulk.value.trim()) Object.assign(patch, { mode: bulk.mode, value: bulk.value });
    if (bulk.totalLimit.trim()) patch.totalLimit = bulk.totalLimit;
    if (bulk.customerLimit.trim()) patch.customerLimit = bulk.customerLimit;
    for (const id of ids) {
      if (priceOnProduct(id)) setPrice(id, patch);
      else for (const v of productOf(id)?.adminVariants ?? []) if (isOptionOn(id, v.id)) setOptionPrice(id, v.id, patch);
    }
    setBulk({ value: "", totalLimit: "", customerLimit: "" });
  };

  // ---- table columns (built once; cells read live data) --------------------

  const PerSku = () => <span class="block pt-2.5 text-xs text-ink-gray">ตั้งที่แต่ละ SKU</span>;
  const off = (id: string, variantId: string) => level() !== "option" || !isOptionOn(id, variantId);

  const columns: ProductSkuColumn[] = [
    {
      key: "price",
      label: "ราคาลด",
      required: true,
      minWidth: 220,
      hideOnProductCard: (id) => !priceOnProduct(id),
      product: (id) => (
        <Show when={priceOnProduct(id)} fallback={<PerSku />}>
          <div class="flex flex-col gap-1">
            <PriceModeInput
              field={`p-${id}-value`}
              label="ราคาลด"
              mode={draftOf(id).mode}
              value={draftOf(id).value}
              disabled={saving()}
              error={errors()[`p-${id}-value`]}
              onMode={(m) => setPrice(id, { mode: m })}
              onValue={(v) => setPrice(id, { value: v })}
            />
            <Show when={previewOf(productOf(id)?.price ?? 0, draftOf(id).mode, draftOf(id).value)}>
              {(text) => <span class="text-xs text-ink-gray">{text()}{hasOptions(id) ? " (คิดจากราคาเดิมของแต่ละ SKU)" : ""}</span>}
            </Show>
          </div>
        </Show>
      ),
      sku: (id, variantId) => {
        const normal = () => {
          const p = productOf(id);
          return p ? optionNormalPrice(p, p.adminVariants.find((v) => v.id === variantId)) : 0;
        };
        return (
          <Show
            when={level() === "option"}
            fallback={
              <Show when={draftOf(id).value.trim() !== "" && !Number.isNaN(Number(draftOf(id).value))}>
                <span class="block pt-2 text-xs text-ink-gray">ขาย {formatAdminCurrency(flashPriceFrom(normal(), draftOf(id).mode, Number(draftOf(id).value)))}</span>
              </Show>
            }
          >
            <div class="flex flex-col gap-1">
              <PriceModeInput
                field={`o-${id}-${variantId}-value`}
                label="ราคาลด SKU"
                mode={optionDraftOf(id, variantId).mode}
                value={optionDraftOf(id, variantId).value}
                disabled={saving() || off(id, variantId)}
                error={errors()[`o-${id}-${variantId}-value`]}
                onMode={(m) => setOptionPrice(id, variantId, { mode: m })}
                onValue={(v) => setOptionPrice(id, variantId, { value: v })}
              />
              <Show when={!off(id, variantId) && previewOf(normal(), optionDraftOf(id, variantId).mode, optionDraftOf(id, variantId).value)}>
                {(text) => <span class="text-xs text-ink-gray">{text()}</span>}
              </Show>
            </div>
          </Show>
        );
      },
    },
    ...(
      [
        ["total", "totalLimit", "จำกัดการซื้อทั้งหมด"],
        ["customer", "customerLimit", "จำกัดการซื้อของลูกค้า"],
      ] as const
    ).map(
      ([key, prop, label]): ProductSkuColumn => ({
        key,
        label,
        afterStock: true,
        minWidth: 130,
        hideOnProductCard: (id) => !priceOnProduct(id),
        product: (id) => (
          <Show when={priceOnProduct(id)} fallback={<PerSku />}>
            <LimitInput field={`p-${id}-${key}`} label={label} value={draftOf(id)[prop]} disabled={saving()} error={errors()[`p-${id}-${key}`]} onValue={(v) => setPrice(id, { [prop]: v })} />
          </Show>
        ),
        sku: (id, variantId) => (
          <Show when={level() === "option"}>
            <LimitInput
              field={`o-${id}-${variantId}-${key}`}
              label={`${label} SKU`}
              value={optionDraftOf(id, variantId)[prop]}
              disabled={saving() || off(id, variantId)}
              error={errors()[`o-${id}-${variantId}-${key}`]}
              onValue={(v) => setOptionPrice(id, variantId, { [prop]: v })}
            />
          </Show>
        ),
      }),
    ),
  ];

  // ---- preview -------------------------------------------------------------

  /** The first product as the storefront card shows it during this campaign. */
  const previewProduct = createMemo(() => {
    const first = refs()[0];
    const p = first ? productOf(first.productId) : undefined;
    if (!p) return undefined;
    const priced = applyFlashPricing(p, configOf(p.id));
    const round = flashCampaignRoundAt({ ...values(), status: "active", id: "preview", createdAt: "", updatedAt: "" });
    return { ...priced, flashSaleEndsAt: round?.endsAt ?? flashSaleRoundEndsAt(), stockLeft: Math.max(priced.stockLeft ?? 1, 1) };
  });

  const BULK_LABEL = "text-xs text-ink-gray";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void save(draftFlow ? "active" : enabled() ? "active" : "disabled");
      }}
      noValidate
      class="flex flex-col gap-6"
    >
      <AdminFormPreviewLayout
        previewLabel="ตัวอย่างบนหน้าร้าน"
        form={
          <>
            <FormErrorSummary errors={errors()} labels={labels()} />

            {/* 1) ข้อมูลพื้นฐาน */}
            <FormSection title="ข้อมูลพื้นฐาน">
              <TextField label="ชื่อแคมเปญ" required value={name()} onInput={(e) => setName(e.currentTarget.value)} data-field="name" error={errors().name} disabled={saving()} placeholder="เช่น แฟลชเซลเที่ยงวัน" />
              <Show
                when={!draftFlow}
                fallback={
                  <p class="text-xs text-ink-gray">{props.initial ? "แคมเปญนี้ยังเป็นแบบร่าง ยังไม่มีผลที่หน้าร้าน" : "บันทึกแบบร่างไว้ก่อนได้ แล้วกด ตกลงและเผยแพร่ เมื่อข้อมูลครบ"}</p>
                }
              >
                <SettingRow title="สถานะการใช้งาน" hint={enabled() ? "เปิดใช้ตามเวลาที่ตั้งไว้" : "ปิดอยู่ ยังไม่มีผล"}>
                  <Toggle checked={enabled()} onChange={setEnabled} disabled={saving()} />
                </SettingRow>
              </Show>

              <div class="flex flex-col gap-2">
                <span class="text-sm font-medium text-ink">รูปแบบเวลา</span>
                <ChoiceRadio
                  name="flash-schedule"
                  value={schedule()}
                  disabled={saving()}
                  onChange={setSchedule}
                  options={[
                    { value: "range", label: "ช่วงเวลา", hint: "ขายราคาแฟลชเซลครั้งเดียว ตั้งแต่เวลาเริ่มถึงเวลาสิ้นสุด" },
                    { value: "daily", label: "รอบรายวัน", hint: "ขายทุกวันในเวลาเดิม เช่น 12:00-14:00 หรือทั้งวัน" },
                  ]}
                />
              </div>

              <Show
                when={schedule() === "daily"}
                fallback={
                  <PeriodFields
                    value={{ ...period }}
                    onChange={(patch) => setPeriod(patch)}
                    errors={errors()}
                    disabled={saving()}
                    hint="เวลาประเทศไทย ราคาแฟลชเซลเริ่มและหยุดเองตามเวลาที่ตั้งไว้ การ์ดสินค้านับถอยหลังถึงเวลาสิ้นสุด"
                  />
                }
              >
                <div class="flex flex-col gap-3" data-field="dailyEnd">
                  <SettingRow title="ทั้งวัน" hint="00:00 ถึงเที่ยงคืน แล้วเริ่มรอบใหม่ทุกวัน">
                    <Toggle checked={dailyAllDay()} onChange={setDailyAllDay} onLabel="ทั้งวัน" offLabel="ตั้งเวลา" disabled={saving()} />
                  </SettingRow>
                  <Show when={!dailyAllDay()}>
                    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <TextField label="เวลาเริ่มรอบ" type="time" required value={dailyStart()} onInput={(e) => setDailyStart(e.currentTarget.value)} disabled={saving()} />
                      <TextField label="เวลาจบรอบ" type="time" required value={dailyEnd()} onInput={(e) => setDailyEnd(e.currentTarget.value)} error={errors().dailyEnd} disabled={saving()} />
                    </div>
                  </Show>
                  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <TextField label="เริ่มวันที่" type="date" value={period.startDate} onInput={(e) => setPeriod("startDate", e.currentTarget.value)} disabled={saving()} />
                    <TextField label="ถึงวันที่" type="date" value={period.endDate} onInput={(e) => setPeriod({ endDate: e.currentTarget.value, endTime: "23:59" })} data-field="endDate" error={errors().endDate} disabled={saving()} />
                  </div>
                  <p class="text-xs text-ink-gray">เวลาประเทศไทย เว้นวันที่ว่างไว้ได้ ถ้าไม่ได้ตั้งจะมีรอบทุกวันจนกว่าจะปิดหรือสิ้นสุดแคมเปญ</p>
                </div>
              </Show>

              <AudienceField value={audience()} onChange={setAudience} error={errors().audience} disabled={saving()} />
            </FormSection>

            {/* 2) สินค้า */}
            <FormSection title="สินค้า" description="เลือกสินค้า ตั้งราคาแฟลชเซลและจำนวนจำกัด ราคาขายปกติของสินค้าไม่เปลี่ยน">
              <div data-field="items">
                <ProductSkuPicker
                  value={refs()}
                  onChange={onRefs}
                  disabled={saving()}
                  error={errors().items}
                  levels="both"
                  level={level()}
                  onLevelChange={changeLevel}
                  levelHints={{ option: "ตั้งราคาแฟลชเซลแยกสำหรับตัวเลือกสินค้าแต่ละรายการ", product: "กำหนดราคาลดเพียงราคาเดียวสำหรับสินค้าและตัวเลือกสินค้าทุกรายการ" }}
                  levelNote={{ product: "ส่วนลดที่ตั้งจะใช้กับทุก SKU ถ้าต้องการราคาแยกแต่ละ SKU ให้เลือกระดับตัวเลือกสินค้า", option: "SKU ที่ปิดขายราคาเดิม การ์ดสินค้าแสดงราคาแฟลชเซลที่ต่ำที่สุด" }}
                  columns={columns}
                  bulk={(selected) => (
                    <div class="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1.4fr)_1fr_1fr_auto]">
                      <div class="flex min-w-0 flex-col gap-1">
                        <span class={BULK_LABEL}>ราคาลด</span>
                        <PriceModeInput field="bulk-value" label="ราคาลดแบบเป็นชุด" mode={bulk.mode} value={bulk.value} disabled={saving()} error={bulkErrors().value} onMode={(m) => setBulk("mode", m)} onValue={(v) => setBulk("value", v)} />
                      </div>
                      <div class="flex min-w-0 flex-col gap-1">
                        <span class={BULK_LABEL}>จำกัดการซื้อทั้งหมด</span>
                        <LimitInput field="bulk-total" label="จำกัดการซื้อทั้งหมดแบบเป็นชุด" value={bulk.totalLimit} disabled={saving()} error={bulkErrors().total} onValue={(v) => setBulk("totalLimit", v)} />
                      </div>
                      <div class="flex min-w-0 flex-col gap-1">
                        <span class={BULK_LABEL}>จำกัดการซื้อของลูกค้า</span>
                        <LimitInput field="bulk-customer" label="จำกัดการซื้อของลูกค้าแบบเป็นชุด" value={bulk.customerLimit} disabled={saving()} error={bulkErrors().customer} onValue={(v) => setBulk("customerLimit", v)} />
                      </div>
                      <div class="flex flex-col gap-1">
                        <span class={`${BULK_LABEL} hidden lg:block`}>&nbsp;</span>
                        <Button type="button" variant="primary" size="sm" disabled={saving() || selected().length === 0} onClick={() => applyBulk(selected())}>
                          อัปเดตเป็นชุด
                        </Button>
                      </div>
                    </div>
                  )}
                />
              </div>
              <p class="text-xs text-ink-gray">จำกัดการซื้อทั้งหมด คือจำนวนชิ้นที่ขายในราคาแฟลชเซล แถบบนการ์ดนับจากจำนวนนี้ จำกัดการซื้อของลูกค้า คือชิ้นต่อคำสั่งซื้อ ส่วนที่เกินคิดราคาเดิม</p>
              <Show when={overlaps().length > 0}>
                <div role="status" class="rounded-card bg-warning-soft px-4 py-3 text-sm text-ink">
                  <p class="font-medium">มีสินค้าที่อยู่ในแฟลชเซลอื่นช่วงเวลาเดียวกัน</p>
                  <ul class="mt-1 flex flex-col gap-0.5 text-xs text-ink-gray">
                    <For each={overlaps()}>
                      {(o) => (
                        <li>
                          {o.campaign.name} ({formatFlashSchedule(o.campaign)}): {o.productIds.map((id) => productOf(id)?.name ?? id).join(", ")}
                        </li>
                      )}
                    </For>
                  </ul>
                  <p class="mt-1 text-xs text-ink-gray">บันทึกได้ตามปกติ ช่วงที่ซ้อนกันหน้าร้านจะใช้ราคาแฟลชเซลที่ต่ำกว่า</p>
                </div>
              </Show>
            </FormSection>

            {/* 3) การใช้ร่วมกับโปรอื่น */}
            <FormSection title="การใช้ร่วมกับโปรอื่น" description="แฟลชเซลนี้ใช้ร่วมกับโปรประเภทไหนได้บ้างในคำสั่งซื้อเดียวกัน">
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
          <div class="flex flex-col gap-3 p-4 text-sm sm:p-5">
            <Show when={previewProduct()} fallback={<p class="text-ink-gray">เลือกสินค้าเพื่อดูตัวอย่างการ์ดสินค้า</p>}>
              {(p) => (
                <div class="max-w-[260px]">
                  <ProductCard product={p()} flashSale />
                </div>
              )}
            </Show>
            <p class="text-base font-semibold text-ink">{name() || "ชื่อแคมเปญ"}</p>
            <p class="text-ink-gray">{formatFlashSchedule(values())}</p>
            <p class="text-ink-gray">สินค้า {refs().length.toLocaleString("th-TH")} รายการ</p>
            <p class="text-ink-gray">กลุ่มลูกค้า: {formatAudience(fromAudienceDraft(audience()))}</p>
            <p class="text-ink-gray">{formatCombinable(fromCombinableDraft(combinable()))}</p>
            <p class="text-ink-gray">{draftFlow ? "แบบร่าง" : enabled() ? "เปิดใช้งาน" : "ปิดใช้งาน"}</p>
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
