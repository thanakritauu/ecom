import { createEffect, createMemo, createSignal, For, on, Show } from "solid-js";
import { createStore, produce } from "solid-js/store";
import { Dialog } from "@kobalte/core/dialog";
import { Button } from "~/components/shared/Button";
import { Toggle } from "~/components/admin/Toggle";
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
import { ChoiceRadio } from "./ChoiceRadio";

type OptionRow = {
  variantId: string;
  label: string;
  color: string;
  normal: number;
  stock: number;
  enabled: boolean;
  ticked: boolean;
  mode: FlashPriceMode;
  value: string;
  totalLimit: string;
  customerLimit: string;
};

const str = (n?: number) => (n === undefined ? "" : String(n));
const limitOf = (raw: string) => (raw.trim() === "" ? undefined : Number(raw));

/** Amount input with its own ฿ / % switch (ราคาลด as baht, or "ลด %" of the normal price). */
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
  return (
    <div class="flex flex-col gap-1" data-field={props.field}>
      <div class="flex h-10 min-w-0 overflow-hidden rounded-card border bg-surface-card" classList={{ "border-system-red": !!props.error, "border-border": !props.error }}>
        <input
          type="number"
          min="0"
          inputmode="decimal"
          aria-label={props.label}
          aria-invalid={!!props.error}
          value={props.value}
          disabled={props.disabled}
          placeholder={props.mode === "percent" ? "1-99" : "0"}
          onInput={(e) => props.onValue(e.currentTarget.value)}
          class="min-w-0 flex-1 bg-transparent px-3 text-sm text-ink outline-none disabled:bg-surface-gray"
        />
        <div class="flex shrink-0 border-l border-border" role="group" aria-label="หน่วย">
          <For each={[["baht", "฿"], ["percent", "%"]] as const}>
            {([mode, sign]) => (
              <button
                type="button"
                disabled={props.disabled}
                aria-pressed={props.mode === mode}
                onClick={() => props.onMode(mode)}
                class="w-9 text-sm font-medium transition-colors duration-150"
                classList={{ "bg-brand-pink text-white": props.mode === mode, "text-ink-gray hover:bg-surface-pink": props.mode !== mode }}
              >
                {sign}
              </button>
            )}
          </For>
        </div>
      </div>
      <Show when={props.error}>
        <p class="text-xs text-system-red">{props.error}</p>
      </Show>
    </div>
  );
}

function LimitInput(props: { value: string; onValue: (v: string) => void; error?: string; field: string; label: string; disabled?: boolean }) {
  return (
    <div class="flex flex-col gap-1" data-field={props.field}>
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
 * The flash sale's own prices and limits for one product (TikTok Shop style):
 * level "ระดับสินค้า" = one price and one set of limits for every option;
 * "ระดับตัวเลือกสินค้า" = a row per option with its own switch, price (฿ or
 * ลด %) and limits, plus "จัดการแบบเป็นชุด" to apply values to ticked rows.
 * Never touches the product's normal price.
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
              color: v.color || "#CCCCCC",
              normal: optionNormalPrice(p, v),
              stock: v.stock,
              enabled: o ? o.enabled : true,
              ticked: false,
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

  const allTicked = () => rows.length > 0 && rows.every((r) => r.ticked);
  const tickedCount = () => rows.filter((r) => r.ticked).length;

  const applyBulk = () => {
    const next: FormErrors = {};
    if (bulk.value.trim()) {
      const err = flashValueError(bulk.mode, bulk.value, Math.min(...rows.filter((r) => r.ticked).map((r) => r.normal)));
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
    setRows(
      (r) => r.ticked,
      produce((r) => {
        r.enabled = true;
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
      for (const r of rows) if (r.ticked) for (const k of ["value", "total", "customer"]) out = clearFieldError(out, `opt-${r.variantId}-${k}`);
      return ["bulk-value", "bulk-total", "bulk-customer", "options"].reduce(clearFieldError, out);
    });
  };

  const labels = createMemo(() => {
    const out: Record<string, string> = { value: "ราคาแฟลชเซล", totalLimit: "จำกัดการซื้อทั้งหมด", customerLimit: "จำกัดต่อลูกค้า", options: "ตัวเลือกที่เข้าร่วม" };
    for (const r of rows) {
      out[`opt-${r.variantId}-value`] = `ราคาแฟลชเซล ${r.label}`;
      out[`opt-${r.variantId}-total`] = `จำกัดทั้งหมด ${r.label}`;
      out[`opt-${r.variantId}-customer`] = `จำกัดต่อลูกค้า ${r.label}`;
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

  const HEAD = "text-xs font-medium text-ink-gray";

  return (
    <Dialog open={props.open} onOpenChange={(open) => !saving() && props.onOpenChange(open)}>
      <Dialog.Portal>
        <Dialog.Overlay class="fixed inset-0 z-40 bg-ink/40 motion-reduce:animate-none data-[expanded]:animate-overlay-in data-[closed]:animate-overlay-out" />
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Content class="flex max-h-[90dvh] w-full max-w-5xl flex-col rounded-card bg-surface-card shadow-card outline-none motion-reduce:animate-none data-[expanded]:animate-modal-in data-[closed]:animate-modal-out">
            <div class="flex items-start justify-between gap-3 px-5 pt-5">
              <div class="flex min-w-0 items-center gap-3">
                <Show when={props.product?.image}>
                  <img src={props.product!.image} alt="" class="size-11 shrink-0 rounded-media object-cover" />
                </Show>
                <div class="min-w-0">
                  <Dialog.Title class="text-lg font-semibold text-ink">ราคาแฟลชเซล</Dialog.Title>
                  <Dialog.Description class="mt-0.5 truncate text-sm text-ink-gray">
                    {props.product?.name} ราคาปกติ {formatAdminCurrency(props.product?.price ?? 0)}
                  </Dialog.Description>
                </div>
              </div>
              <Dialog.CloseButton aria-label="ปิด" disabled={saving()} class="-mr-2 -mt-2 flex size-11 shrink-0 items-center justify-center rounded-pill text-ink-gray transition-colors duration-150 hover:bg-surface-pink">
                <CloseXIcon class="size-5" />
              </Dialog.CloseButton>
            </div>

            <div class="flex flex-col gap-5 overflow-y-auto p-5">
              <FormErrorSummary errors={errors()} labels={labels()} />

              <div class="flex flex-col gap-2">
                <span class="text-sm font-medium text-ink">ตั้งราคาที่</span>
                <ChoiceRadio
                  name="flash-sale-level"
                  value={level()}
                  disabled={saving()}
                  onChange={(v) => {
                    setLevel(v);
                    setErrors({});
                  }}
                  options={[
                    { value: "product", label: "ระดับสินค้า", hint: "ราคาและจำนวนจำกัดเดียวกันทุกตัวเลือก" },
                    {
                      value: "option",
                      label: "ระดับตัวเลือกสินค้า",
                      hint: hasOptions() ? "ตั้งราคาและจำนวนจำกัดแยกแต่ละตัวเลือก" : "สินค้านี้ไม่มีตัวเลือก",
                      disabled: !hasOptions(),
                    },
                  ]}
                />
              </div>

              <Show
                when={level() === "option"}
                fallback={
                  <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div class="flex flex-col gap-1.5">
                      <span class="text-sm font-medium text-ink">
                        ราคาแฟลชเซล <span class="text-system-red">*</span>
                      </span>
                      <PriceModeInput
                        field="value"
                        label="ราคาแฟลชเซล"
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
                        {(text) => <span class="text-xs text-ink-gray">{text()}{hasOptions() ? " (คิดจากราคาปกติของแต่ละตัวเลือก)" : ""}</span>}
                      </Show>
                    </div>
                    <div class="flex flex-col gap-1.5">
                      <span class="text-sm font-medium text-ink">จำกัดการซื้อทั้งหมด</span>
                      <LimitInput
                        field="totalLimit"
                        label="จำกัดการซื้อทั้งหมด"
                        value={totalLimit()}
                        disabled={saving()}
                        error={errors().totalLimit}
                        onValue={(v) => {
                          setTotalLimit(v);
                          fix("totalLimit");
                        }}
                      />
                      <span class="text-xs text-ink-gray">จำนวนชิ้นที่ขายในราคาแฟลชเซล แถบบนการ์ดนับจากจำนวนนี้</span>
                    </div>
                    <div class="flex flex-col gap-1.5">
                      <span class="text-sm font-medium text-ink">จำกัดต่อลูกค้า</span>
                      <LimitInput
                        field="customerLimit"
                        label="จำกัดต่อลูกค้า"
                        value={customerLimit()}
                        disabled={saving()}
                        error={errors().customerLimit}
                        onValue={(v) => {
                          setCustomerLimit(v);
                          fix("customerLimit");
                        }}
                      />
                      <span class="text-xs text-ink-gray">ชิ้นต่อคำสั่งซื้อ ส่วนที่เกินคิดราคาปกติ</span>
                    </div>
                  </div>
                }
              >
                {/* จัดการแบบเป็นชุด: values typed here go to every ticked row. */}
                <div class="flex flex-col gap-3 rounded-card bg-surface-gray/60 p-3">
                  <p class="text-sm font-medium text-ink">จัดการแบบเป็นชุด</p>
                  <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-start">
                    <PriceModeInput
                      field="bulk-value"
                      label="ราคาแฟลชเซลแบบเป็นชุด"
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
                    <LimitInput field="bulk-total" label="จำกัดการซื้อทั้งหมดแบบเป็นชุด" value={bulk.totalLimit} disabled={saving()} error={errors()["bulk-total"]} onValue={(v) => { setBulk("totalLimit", v); fix("bulk-total"); }} />
                    <LimitInput field="bulk-customer" label="จำกัดต่อลูกค้าแบบเป็นชุด" value={bulk.customerLimit} disabled={saving()} error={errors()["bulk-customer"]} onValue={(v) => { setBulk("customerLimit", v); fix("bulk-customer"); }} />
                    <Button type="button" variant="outline" size="sm" class="h-10" disabled={saving() || tickedCount() === 0} onClick={applyBulk}>
                      ใช้กับที่เลือก ({tickedCount()})
                    </Button>
                  </div>
                  <p class="text-xs text-ink-gray">ช่องที่เว้นว่างจะไม่เปลี่ยนค่าเดิม แถวที่เลือกจะเปิดเข้าร่วมด้วย</p>
                </div>

                <div class="flex flex-col gap-2" data-field="options">
                  <Show when={errors().options}>
                    <p class="text-sm text-system-red">{errors().options}</p>
                  </Show>
                  {/* Header row (desktop only); each row is a card on small screens. */}
                  <div class="hidden grid-cols-[24px_minmax(0,1.4fr)_88px_minmax(0,1.6fr)_64px_minmax(0,1fr)_minmax(0,1fr)_96px] items-center gap-3 px-3 lg:grid">
                    <input
                      type="checkbox"
                      aria-label="เลือกทุกตัวเลือก"
                      checked={allTicked()}
                      onChange={() => {
                        const on = !allTicked();
                        setRows({ from: 0, to: rows.length - 1 }, "ticked", on);
                      }}
                      class="size-4 rounded accent-brand-pink"
                    />
                    <span class={HEAD}>ตัวเลือก</span>
                    <span class={`${HEAD} text-right`}>ราคาเดิม</span>
                    <span class={HEAD}>ราคาลด</span>
                    <span class={`${HEAD} text-right`}>สต๊อก</span>
                    <span class={HEAD}>จำกัดการซื้อทั้งหมด</span>
                    <span class={HEAD}>จำกัดต่อลูกค้า</span>
                    <span class={HEAD}>เข้าร่วม</span>
                  </div>
                  <For each={rows}>
                    {(row, i) => (
                      <div
                        class="grid grid-cols-2 items-start gap-3 rounded-card border border-border p-3 lg:grid-cols-[24px_minmax(0,1.4fr)_88px_minmax(0,1.6fr)_64px_minmax(0,1fr)_minmax(0,1fr)_96px] lg:items-center"
                        classList={{ "bg-surface-gray/40": !row.enabled }}
                      >
                        <div class="col-span-2 flex items-center gap-3 lg:contents">
                          <input
                            type="checkbox"
                            aria-label={`เลือก ${row.label}`}
                            checked={row.ticked}
                            onChange={(e) => setRows(i(), "ticked", e.currentTarget.checked)}
                            class="size-4 shrink-0 rounded accent-brand-pink"
                          />
                          <span class="flex min-w-0 items-center gap-2">
                            <span class="size-4 shrink-0 rounded-full border border-border" style={{ "background-color": row.color }} aria-hidden="true" />
                            <span class="truncate text-sm font-medium text-ink">{row.label}</span>
                          </span>
                        </div>
                        <div class="flex flex-col lg:items-end">
                          <span class="text-xs text-ink-gray lg:hidden">ราคาเดิม</span>
                          <span class="text-sm text-ink">{formatAdminCurrency(row.normal)}</span>
                        </div>
                        <div class="col-span-2 flex flex-col gap-1 sm:col-span-1 lg:col-span-1">
                          <span class="text-xs text-ink-gray lg:hidden">ราคาลด</span>
                          <PriceModeInput
                            field={`opt-${row.variantId}-value`}
                            label={`ราคาลด ${row.label}`}
                            mode={row.mode}
                            value={row.value}
                            disabled={saving() || !row.enabled}
                            error={errors()[`opt-${row.variantId}-value`]}
                            onMode={(m) => {
                              setRows(i(), "mode", m);
                              fix(`opt-${row.variantId}-value`);
                            }}
                            onValue={(v) => {
                              setRows(i(), "value", v);
                              fix(`opt-${row.variantId}-value`);
                            }}
                          />
                          <Show when={row.enabled && previewOf(row.normal, row.mode, row.value)}>
                            {(text) => <span class="text-xs text-ink-gray">{text()}</span>}
                          </Show>
                        </div>
                        <div class="flex flex-col lg:items-end">
                          <span class="text-xs text-ink-gray lg:hidden">สต๊อก</span>
                          <span class="text-sm text-ink">{row.stock.toLocaleString("th-TH")}</span>
                        </div>
                        <div class="flex flex-col gap-1">
                          <span class="text-xs text-ink-gray lg:hidden">จำกัดการซื้อทั้งหมด</span>
                          <LimitInput
                            field={`opt-${row.variantId}-total`}
                            label={`จำกัดการซื้อทั้งหมด ${row.label}`}
                            value={row.totalLimit}
                            disabled={saving() || !row.enabled}
                            error={errors()[`opt-${row.variantId}-total`]}
                            onValue={(v) => {
                              setRows(i(), "totalLimit", v);
                              fix(`opt-${row.variantId}-total`);
                            }}
                          />
                        </div>
                        <div class="flex flex-col gap-1">
                          <span class="text-xs text-ink-gray lg:hidden">จำกัดต่อลูกค้า</span>
                          <LimitInput
                            field={`opt-${row.variantId}-customer`}
                            label={`จำกัดต่อลูกค้า ${row.label}`}
                            value={row.customerLimit}
                            disabled={saving() || !row.enabled}
                            error={errors()[`opt-${row.variantId}-customer`]}
                            onValue={(v) => {
                              setRows(i(), "customerLimit", v);
                              fix(`opt-${row.variantId}-customer`);
                            }}
                          />
                        </div>
                        <div class="col-span-2 lg:col-span-1">
                          <Toggle
                            checked={row.enabled}
                            disabled={saving()}
                            onLabel="เปิด"
                            offLabel="ปิด"
                            onChange={(on) => {
                              setRows(i(), "enabled", on);
                              fix("options", `opt-${row.variantId}-value`, `opt-${row.variantId}-total`, `opt-${row.variantId}-customer`);
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </For>
                  <p class="text-xs text-ink-gray">ตัวเลือกที่ปิดขายราคาปกติ การ์ดสินค้าแสดงราคาแฟลชเซลที่ต่ำที่สุด จำกัดต่อลูกค้าคือชิ้นต่อคำสั่งซื้อ ส่วนที่เกินคิดราคาปกติ</p>
                </div>
              </Show>
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
