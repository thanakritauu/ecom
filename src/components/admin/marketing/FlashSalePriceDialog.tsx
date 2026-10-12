import { createEffect, createMemo, createSignal, on, Show } from "solid-js";
import { createStore, produce } from "solid-js/store";
import { Dialog } from "@kobalte/core/dialog";
import { Button } from "~/components/shared/Button";
import { ProductSkuPicker, type ProductSkuColumn } from "~/components/admin/ProductSkuPicker";
import type { ProductSkuRef } from "~/lib/productSkuRef";
import { CloseXIcon } from "~/components/admin/icons";
import { FormErrorSummary } from "~/components/admin/FormErrorSummary";
import { clearFieldError, reportFormErrors, type FormErrors } from "~/lib/adminFormValidation";
import { formatAdminCurrency } from "~/lib/adminDashboard";
import type { AdminProduct } from "~/lib/adminProductStore";
import {
  effectiveLevel,
  flashLimitError,
  flashPriceFrom,
  flashValueError,
  optionNormalPrice,
  type FlashPriceMode,
  type FlashSaleConfig,
  type FlashSaleLevel,
} from "~/lib/flashSalePricing";

type OptionRow = {
  variantId: string;
  label: string;
  normal: number;
  enabled: boolean;
  mode: FlashPriceMode;
  value: string;
  totalLimit: string;
  customerLimit: string;
};

const str = (n?: number) => (n === undefined ? "" : String(n));
const limitOf = (raw: string) => (raw.trim() === "" ? undefined : Number(raw));

/** TikTok style ราคาลด: "฿ [ ]  หรือ  [ ] ลด %". Typing in one side switches the mode to it; an empty required value shows "จำเป็น". */
function PriceModeInput(props: {
  mode: FlashPriceMode;
  value: string;
  onMode: (mode: FlashPriceMode) => void;
  onValue: (value: string) => void;
  error?: string;
  field: string;
  label: string;
  disabled?: boolean;
}) {
  const box = (active: boolean) =>
    `flex h-10 min-w-0 flex-1 items-center gap-1 rounded-card border bg-surface-card px-2.5 text-sm focus-within:border-brand-pink ${
      props.error && (active || props.value.trim() === "") ? "border-system-red" : "border-border"
    } ${props.disabled ? "bg-surface-gray" : ""}`;
  const input = (mode: FlashPriceMode) => (e: InputEvent & { currentTarget: HTMLInputElement }) => {
    if (props.mode !== mode) props.onMode(mode);
    props.onValue(e.currentTarget.value);
  };
  return (
    <div class="flex min-w-0 flex-col gap-1" data-field={props.field}>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class={box(props.mode === "baht")}>
          <span class="shrink-0 text-ink-gray">฿</span>
          <input
            type="number"
            min="0"
            inputmode="decimal"
            aria-label={`${props.label} (บาท)`}
            aria-invalid={!!props.error && props.mode === "baht"}
            value={props.mode === "baht" ? props.value : ""}
            disabled={props.disabled}
            onInput={input("baht")}
            class="w-full min-w-0 bg-transparent text-ink outline-none"
          />
        </label>
        <span class="shrink-0 text-xs text-ink-gray">หรือ</span>
        <label class={box(props.mode === "percent")}>
          <input
            type="number"
            min="1"
            max="99"
            inputmode="numeric"
            aria-label={`${props.label} (ลด %)`}
            aria-invalid={!!props.error && props.mode === "percent"}
            value={props.mode === "percent" ? props.value : ""}
            disabled={props.disabled}
            onInput={input("percent")}
            class="w-full min-w-0 bg-transparent text-right text-ink outline-none"
          />
          <span class="shrink-0 text-ink-gray">ลด %</span>
        </label>
      </div>
      <Show when={props.error}>
        <p class="text-xs text-system-red">{props.value.trim() === "" ? "จำเป็น" : props.error}</p>
      </Show>
    </div>
  );
}

function LimitInput(props: { value: string; onValue: (v: string) => void; error?: string; field: string; label: string; disabled?: boolean }) {
  return (
    <div class="flex min-w-0 flex-col gap-1" data-field={props.field}>
      <input
        type="number"
        min="1"
        step="1"
        inputmode="numeric"
        aria-label={props.label}
        aria-invalid={!!props.error}
        value={props.value}
        disabled={props.disabled}
        placeholder="ไม่มีจำกัด"
        onInput={(e) => props.onValue(e.currentTarget.value)}
        class="h-10 w-full min-w-0 rounded-card border bg-surface-card px-3 text-sm text-ink outline-none placeholder:text-ink-placeholder focus:border-brand-pink disabled:bg-surface-gray"
        classList={{ "border-system-red": !!props.error, "border-border": !props.error }}
      />
      <Show when={props.error}>
        <p class="text-xs text-system-red">{props.error}</p>
      </Show>
    </div>
  );
}

/** "฿179" preview under a % price. */
const previewOf = (normal: number, mode: FlashPriceMode, raw: string) => {
  const n = Number(raw);
  if (mode !== "percent" || raw.trim() === "" || Number.isNaN(n) || n < 1 || n > 99) return undefined;
  return `ขาย ${formatAdminCurrency(flashPriceFrom(normal, mode, n))}`;
};

/**
 * The flash sale's own prices and limits for one product, laid out like
 * TikTok Shop's flash-sale editor: level radio (ระดับตัวเลือกสินค้า /
 * ระดับสินค้า), "จัดการแบบเป็นชุด" bar, then the shared product table
 * (`ProductSkuPicker` in `fixed` mode) with ราคาลด (฿ หรือ ลด %), สต๊อก,
 * จำกัดการซื้อทั้งหมด, จำกัดการซื้อของลูกค้า and, at option level, a switch
 * per SKU. Never touches the product's normal price.
 */
export function FlashSalePriceDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: AdminProduct;
  onSave: (config: FlashSaleConfig) => Promise<void>;
}) {
  const [level, setLevel] = createSignal<FlashSaleLevel>("product");
  const [mode, setMode] = createSignal<FlashPriceMode>("percent");
  const [value, setValue] = createSignal("");
  const [totalLimit, setTotalLimit] = createSignal("");
  const [customerLimit, setCustomerLimit] = createSignal("");
  const [rows, setRows] = createStore<OptionRow[]>([]);
  const [bulk, setBulk] = createStore({ mode: "percent" as FlashPriceMode, value: "", totalLimit: "", customerLimit: "" });
  const [errors, setErrors] = createSignal<FormErrors>({});
  const [saving, setSaving] = createSignal(false);
  const fix = (...keys: string[]) => setErrors((e) => keys.reduce(clearFieldError, e));

  const hasOptions = () => (props.product?.adminVariants.length ?? 0) > 0;
  /** Product level in baht must stay below every option's normal price. */
  const lowestNormal = createMemo(() => {
    const p = props.product;
    if (!p) return 0;
    return p.adminVariants.length > 0 ? Math.min(...p.adminVariants.map((v) => optionNormalPrice(p, v))) : p.price;
  });

  createEffect(
    on(
      () => [props.open, props.product?.id] as const,
      ([open]) => {
        const p = props.product;
        if (!open || !p) return;
        const cfg = p.flashSale;
        setLevel(cfg ? effectiveLevel(p) : "product");
        setMode(cfg?.mode ?? "percent");
        setValue(cfg ? str(cfg.value) : "10");
        setTotalLimit(str(cfg?.totalLimit));
        setCustomerLimit(str(cfg?.customerLimit));
        setRows(
          p.adminVariants.map((v): OptionRow => {
            const o = cfg?.options.find((x) => x.variantId === v.id);
            // Switching to option level starts each option from the product-level price.
            return {
              variantId: v.id,
              label: v.label || "ตัวเลือก",
              normal: optionNormalPrice(p, v),
              enabled: o ? o.enabled : !cfg || cfg.options.length === 0,
              mode: o?.mode ?? cfg?.mode ?? "percent",
              value: o ? str(o.value) : cfg ? str(cfg.value) : "10",
              totalLimit: str(o?.totalLimit),
              customerLimit: str(o?.customerLimit),
            };
          }),
        );
        setBulk({ mode: "percent", value: "", totalLimit: "", customerLimit: "" });
        setErrors({});
      },
    ),
  );

  const rowIndex = (variantId: string) => rows.findIndex((r) => r.variantId === variantId);
  /** The table's switches = `variantIds` (all on is stored as []). */
  const refs = createMemo((): ProductSkuRef[] => {
    const p = props.product;
    if (!p) return [];
    const on = rows.filter((r) => r.enabled).map((r) => r.variantId);
    return [{ productId: p.id, variantIds: on.length === rows.length ? [] : on }];
  });
  const onRefs = (next: ProductSkuRef[]) => {
    const ids = next[0]?.variantIds ?? [];
    setRows({ from: 0, to: rows.length - 1 }, "enabled", false);
    rows.forEach((r, i) => setRows(i, "enabled", ids.length === 0 || ids.includes(r.variantId)));
    fix("options");
  };

  const applyBulk = () => {
    const next: FormErrors = {};
    const targets = rows.filter((r) => r.enabled);
    if (bulk.value.trim()) {
      const normal = level() === "product" ? lowestNormal() : Math.min(...targets.map((r) => r.normal));
      const err = flashValueError(bulk.mode, bulk.value, normal);
      if (err) next["bulk-value"] = err;
    }
    const t = flashLimitError(bulk.totalLimit);
    if (t) next["bulk-total"] = t;
    const c = flashLimitError(bulk.customerLimit);
    if (c) next["bulk-customer"] = c;
    if (Object.keys(next).length > 0) {
      setErrors((e) => ({ ...e, ...next }));
      return;
    }
    if (level() === "product") {
      if (bulk.value.trim()) {
        setMode(bulk.mode);
        setValue(bulk.value);
      }
      if (bulk.totalLimit.trim()) setTotalLimit(bulk.totalLimit);
      if (bulk.customerLimit.trim()) setCustomerLimit(bulk.customerLimit);
      fix("value", "totalLimit", "customerLimit");
    } else {
      setRows(
        (r) => r.enabled,
        produce((r) => {
          if (bulk.value.trim()) {
            r.mode = bulk.mode;
            r.value = bulk.value;
          }
          if (bulk.totalLimit.trim()) r.totalLimit = bulk.totalLimit;
          if (bulk.customerLimit.trim()) r.customerLimit = bulk.customerLimit;
        }),
      );
      setErrors((e) => {
        let out = e;
        for (const r of targets) for (const k of ["value", "total", "customer"]) out = clearFieldError(out, `opt-${r.variantId}-${k}`);
        return out;
      });
    }
    setErrors((e) => ["bulk-value", "bulk-total", "bulk-customer"].reduce(clearFieldError, e));
    setBulk({ value: "", totalLimit: "", customerLimit: "" });
  };

  const labels = createMemo(() => {
    const out: Record<string, string> = { value: "ราคาลด", totalLimit: "จำกัดการซื้อทั้งหมด", customerLimit: "จำกัดการซื้อของลูกค้า", options: "ตัวเลือกที่เข้าร่วม" };
    for (const r of rows) {
      out[`opt-${r.variantId}-value`] = `ราคาลด ${r.label}`;
      out[`opt-${r.variantId}-total`] = `จำกัดการซื้อทั้งหมด ${r.label}`;
      out[`opt-${r.variantId}-customer`] = `จำกัดการซื้อของลูกค้า ${r.label}`;
    }
    return out;
  });

  const validate = (): FormErrors => {
    const next: FormErrors = {};
    if (level() === "product") {
      const v = flashValueError(mode(), value(), lowestNormal());
      if (v) next.value = mode() === "baht" && hasOptions() && v === "ราคาแฟลชเซลต้องต่ำกว่าราคาปกติ" ? "ราคาแฟลชเซลต้องต่ำกว่าราคาปกติของทุกตัวเลือก" : v;
      const t = flashLimitError(totalLimit());
      if (t) next.totalLimit = t;
      const c = flashLimitError(customerLimit());
      if (c) next.customerLimit = c;
      return next;
    }
    if (!rows.some((r) => r.enabled)) next.options = "เปิดอย่างน้อย 1 ตัวเลือก";
    for (const r of rows) {
      if (!r.enabled) continue;
      const v = flashValueError(r.mode, r.value, r.normal);
      if (v) next[`opt-${r.variantId}-value`] = v;
      const t = flashLimitError(r.totalLimit);
      if (t) next[`opt-${r.variantId}-total`] = t;
      const c = flashLimitError(r.customerLimit);
      if (c) next[`opt-${r.variantId}-customer`] = c;
    }
    return next;
  };

  const save = async () => {
    const next = validate();
    setErrors(next);
    if (reportFormErrors(next, labels())) return;
    const config: FlashSaleConfig =
      level() === "product"
        ? { level: "product", mode: mode(), value: Number(value()), totalLimit: limitOf(totalLimit()), customerLimit: limitOf(customerLimit()), options: [] }
        : {
            level: "option",
            // Product-level fields keep the last product-level values, so switching back later starts from them.
            mode: mode(),
            value: Number(value()) || 0,
            options: rows.map((r) => ({
              variantId: r.variantId,
              enabled: r.enabled,
              mode: r.mode,
              value: Number(r.value) || 0,
              totalLimit: r.enabled ? limitOf(r.totalLimit) : undefined,
              customerLimit: r.enabled ? limitOf(r.customerLimit) : undefined,
            })),
          };
    setSaving(true);
    try {
      await props.onSave(config);
      props.onOpenChange(false);
    } catch {
      // The page already told the admin (toast); the dialog stays open with their values.
    } finally {
      setSaving(false);
    }
  };

  /** Product row cell at option level: the values live on each SKU. */
  const PerSku = () => <span class="block pt-2.5 text-xs text-ink-gray">ตั้งที่แต่ละ SKU</span>;

  // Built once (no signals read here), so the table keeps its inputs while typing.
  const columns: ProductSkuColumn[] = [
    {
      key: "price",
      label: "ราคาลด",
      required: true,
      minWidth: 220,
      hideOnProductCard: () => level() === "option",
      product: () => (
        <Show when={level() === "product"} fallback={<PerSku />}>
          <div class="flex flex-col gap-1">
            <PriceModeInput
              field="value"
              label="ราคาลด"
              mode={mode()}
              value={value()}
              disabled={saving()}
              error={errors().value}
              onMode={(m) => {
                setMode(m);
                fix("value");
              }}
              onValue={(v) => {
                setValue(v);
                fix("value");
              }}
            />
            <Show when={previewOf(props.product?.price ?? 0, mode(), value())}>
              {(text) => <span class="text-xs text-ink-gray">{text()}{hasOptions() ? " (คิดจากราคาเดิมของแต่ละ SKU)" : ""}</span>}
            </Show>
          </div>
        </Show>
      ),
      sku: (_productId, variantId) => {
        const i = () => rowIndex(variantId);
        const row = () => rows[i()];
        return (
          <Show
            when={level() === "option"}
            fallback={
              <Show when={row() && value().trim() !== "" && !Number.isNaN(Number(value()))}>
                <span class="block pt-2 text-xs text-ink-gray">ขาย {formatAdminCurrency(flashPriceFrom(row()!.normal, mode(), Number(value())))}</span>
              </Show>
            }
          >
            <Show when={row()}>
              {(r) => (
                <div class="flex flex-col gap-1">
                  <PriceModeInput
                    field={`opt-${variantId}-value`}
                    label={`ราคาลด ${r().label}`}
                    mode={r().mode}
                    value={r().value}
                    disabled={saving() || !r().enabled}
                    error={errors()[`opt-${variantId}-value`]}
                    onMode={(m) => {
                      setRows(i(), "mode", m);
                      fix(`opt-${variantId}-value`);
                    }}
                    onValue={(v) => {
                      setRows(i(), "value", v);
                      fix(`opt-${variantId}-value`);
                    }}
                  />
                  <Show when={r().enabled && previewOf(r().normal, r().mode, r().value)}>{(text) => <span class="text-xs text-ink-gray">{text()}</span>}</Show>
                </div>
              )}
            </Show>
          </Show>
        );
      },
    },
    ...(
      [
        ["total", "totalLimit", "จำกัดการซื้อทั้งหมด", totalLimit, setTotalLimit],
        ["customer", "customerLimit", "จำกัดการซื้อของลูกค้า", customerLimit, setCustomerLimit],
      ] as const
    ).map(
      ([key, field, label, get, set]): ProductSkuColumn => ({
        key,
        label,
        afterStock: true,
        minWidth: 130,
        hideOnProductCard: () => level() === "option",
        product: () => (
          <Show when={level() === "product"} fallback={<PerSku />}>
            <LimitInput
              field={field}
              label={label}
              value={get()}
              disabled={saving()}
              error={errors()[field]}
              onValue={(v) => {
                set(v);
                fix(field);
              }}
            />
          </Show>
        ),
        sku: (_productId, variantId) => {
          const i = () => rowIndex(variantId);
          const prop = field === "totalLimit" ? "totalLimit" : "customerLimit";
          return (
            <Show when={level() === "option" && rows[i()]}>
              {(r) => (
                <LimitInput
                  field={`opt-${variantId}-${key}`}
                  label={`${label} ${r().label}`}
                  value={r()[prop]}
                  disabled={saving() || !r().enabled}
                  error={errors()[`opt-${variantId}-${key}`]}
                  onValue={(v) => {
                    setRows(i(), prop, v);
                    fix(`opt-${variantId}-${key}`);
                  }}
                />
              )}
            </Show>
          );
        },
      }),
    ),
  ];

  const BULK_LABEL = "text-xs text-ink-gray";

  return (
    <Dialog open={props.open} onOpenChange={(open) => !saving() && props.onOpenChange(open)}>
      <Dialog.Portal>
        <Dialog.Overlay class="fixed inset-0 z-40 bg-ink/40 motion-reduce:animate-none data-[expanded]:animate-overlay-in data-[closed]:animate-overlay-out" />
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Content class="flex max-h-[90dvh] w-full max-w-6xl flex-col rounded-card bg-surface-card shadow-card outline-none motion-reduce:animate-none data-[expanded]:animate-modal-in data-[closed]:animate-modal-out">
            <div class="flex items-start justify-between gap-3 px-5 pt-5">
              <div class="min-w-0">
                <Dialog.Title class="text-lg font-semibold text-ink">ราคาแฟลชเซล</Dialog.Title>
                <Dialog.Description class="mt-0.5 text-sm text-ink-gray">ตั้งราคาลดและจำนวนจำกัด ราคาเดิมของสินค้าไม่เปลี่ยน</Dialog.Description>
              </div>
              <Dialog.CloseButton aria-label="ปิด" disabled={saving()} class="-mr-2 -mt-2 flex size-11 shrink-0 items-center justify-center rounded-pill text-ink-gray transition-colors duration-150 hover:bg-surface-pink">
                <CloseXIcon class="size-5" />
              </Dialog.CloseButton>
            </div>

            <div class="flex flex-col gap-4 overflow-y-auto p-4 sm:p-5">
              <FormErrorSummary errors={errors()} labels={labels()} />

              <div data-field="options">
                <ProductSkuPicker
                  fixed
                  value={refs()}
                  onChange={onRefs}
                  disabled={saving()}
                  error={errors().options}
                  levels={hasOptions() ? "both" : "product"}
                  level={level()}
                  onLevelChange={(l) => {
                    setLevel(l);
                    setErrors({});
                  }}
                  levelHints={{ option: "ตั้งราคาแฟลชเซลแยกสำหรับตัวเลือกสินค้าแต่ละรายการ", product: "กำหนดราคาลดเพียงราคาเดียวสำหรับสินค้าและตัวเลือกสินค้าทุกรายการ" }}
                  levelNote={{ product: "ส่วนลดที่ตั้งจะใช้กับทุก SKU ถ้าต้องการราคาแยกแต่ละ SKU ให้เลือกระดับตัวเลือกสินค้า", option: "SKU ที่ปิดขายราคาเดิม การ์ดสินค้าแสดงราคาแฟลชเซลที่ต่ำที่สุด" }}
                  columns={columns}
                  bulk={(selected) => (
                    <div class="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1.4fr)_1fr_1fr_auto]">
                      <div class="flex min-w-0 flex-col gap-1">
                        <span class={BULK_LABEL}>ราคาลด</span>
                        <PriceModeInput
                          field="bulk-value"
                          label="ราคาลดแบบเป็นชุด"
                          mode={bulk.mode}
                          value={bulk.value}
                          disabled={saving()}
                          error={errors()["bulk-value"]}
                          onMode={(m) => {
                            setBulk("mode", m);
                            fix("bulk-value");
                          }}
                          onValue={(v) => {
                            setBulk("value", v);
                            fix("bulk-value");
                          }}
                        />
                      </div>
                      <div class="flex min-w-0 flex-col gap-1">
                        <span class={BULK_LABEL}>จำกัดการซื้อทั้งหมด</span>
                        <LimitInput field="bulk-total" label="จำกัดการซื้อทั้งหมดแบบเป็นชุด" value={bulk.totalLimit} disabled={saving()} error={errors()["bulk-total"]} onValue={(v) => { setBulk("totalLimit", v); fix("bulk-total"); }} />
                      </div>
                      <div class="flex min-w-0 flex-col gap-1">
                        <span class={BULK_LABEL}>จำกัดการซื้อของลูกค้า</span>
                        <LimitInput field="bulk-customer" label="จำกัดการซื้อของลูกค้าแบบเป็นชุด" value={bulk.customerLimit} disabled={saving()} error={errors()["bulk-customer"]} onValue={(v) => { setBulk("customerLimit", v); fix("bulk-customer"); }} />
                      </div>
                      <div class="flex flex-col gap-1">
                        <span class={`${BULK_LABEL} hidden lg:block`}>&nbsp;</span>
                        <Button type="button" variant="primary" size="sm" disabled={saving() || selected().length === 0} onClick={applyBulk}>
                          อัปเดตเป็นชุด
                        </Button>
                      </div>
                    </div>
                  )}
                />
              </div>
              <p class="text-xs text-ink-gray">จำกัดการซื้อทั้งหมด คือจำนวนชิ้นที่ขายในราคาแฟลชเซล แถบบนการ์ดนับจากจำนวนนี้ จำกัดการซื้อของลูกค้า คือชิ้นต่อคำสั่งซื้อ ส่วนที่เกินคิดราคาเดิม</p>
            </div>

            <div class="flex gap-3 border-t border-border p-4">
              <Button type="button" variant="outline" class="flex-1" onClick={() => props.onOpenChange(false)} disabled={saving()}>
                ยกเลิก
              </Button>
              <Button type="button" variant="primary" class="flex-1 whitespace-nowrap" onClick={save} loading={saving()}>
                {saving() ? "กำลังบันทึก..." : "บันทึก"}
              </Button>
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog>
  );
}
