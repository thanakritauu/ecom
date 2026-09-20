import { createMemo, createSignal, For, Show } from "solid-js";
import { TextField } from "~/components/shared/TextField";
import { Button } from "~/components/shared/Button";
import { AdminFloatingBar } from "~/components/admin/AdminFloatingBar";
import { ProductSelector } from "./ProductSelector";
import { useAdminProducts } from "~/lib/adminProductStore";
import { formatAdminCurrency } from "~/lib/adminDashboard";
import { isValidDateRange, formatMarketingDate, type FlashSale, type FlashSaleItem, type MarketingStatus } from "~/lib/adminMarketing";

const STATUS_OPTIONS: { value: MarketingStatus; label: string }[] = [
  { value: "draft", label: "แบบร่าง" },
  { value: "scheduled", label: "ตั้งเวลาไว้" },
  { value: "active", label: "กำลังใช้งาน" },
  { value: "disabled", label: "ปิดใช้งาน" },
];

export type FlashSaleFormValues = Omit<FlashSale, "id" | "createdAt" | "updatedAt">;

/**
 * Phase 07 #22/24 — Campaign fields + Product Selection, then a per-selected-
 * product Sale Price/Limit row (each product needs its own price, not one
 * shared discount) using real prices from the admin Product store.
 */
export function FlashSaleForm(props: {
  initial?: FlashSale;
  submitLabel: string;
  onSubmit: (values: FlashSaleFormValues) => Promise<void>;
  onCancel: () => void;
}) {
  const productStore = useAdminProducts();
  const [name, setName] = createSignal(props.initial?.name ?? "");
  const [status, setStatus] = createSignal<MarketingStatus>(props.initial?.status ?? "draft");
  const [startDate, setStartDate] = createSignal(props.initial?.startDate ?? "");
  const [startTime, setStartTime] = createSignal(props.initial?.startTime ?? "00:00");
  const [endDate, setEndDate] = createSignal(props.initial?.endDate ?? "");
  const [endTime, setEndTime] = createSignal(props.initial?.endTime ?? "23:59");
  const [items, setItems] = createSignal<FlashSaleItem[]>(props.initial?.items ?? []);

  const [errors, setErrors] = createSignal<Record<string, string>>({});
  const [saving, setSaving] = createSignal(false);
  const [submitError, setSubmitError] = createSignal<string>();

  const selectedIds = createMemo(() => items().map((i) => i.productId));
  const dateRangeValid = createMemo(() => isValidDateRange(startDate(), startTime(), endDate(), endTime()));

  const setSelectedIds = (ids: string[]) => {
    setItems((current) => {
      const byId = new Map(current.map((i) => [i.productId, i]));
      return ids.map((id) => byId.get(id) ?? { productId: id, salePrice: productStore.getById(id)?.price ?? 0, soldCount: 0 });
    });
  };

  const updateItem = (productId: string, patch: Partial<FlashSaleItem>) => {
    setItems((current) => current.map((i) => (i.productId === productId ? { ...i, ...patch } : i)));
  };

  const validate = (): Record<string, string> => {
    const next: Record<string, string> = {};
    if (!name().trim()) next.name = "กรุณากรอกชื่อแคมเปญ";
    if (!startDate()) next.startDate = "กรุณาเลือกวันเริ่ม";
    if (!endDate()) next.endDate = "กรุณาเลือกวันสิ้นสุด";
    if (startDate() && endDate() && !dateRangeValid()) next.endDate = "วันสิ้นสุดต้องอยู่หลังวันเริ่ม";
    if (items().length === 0) next.items = "กรุณาเลือกสินค้าอย่างน้อย 1 รายการ";
    return next;
  };

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSaving(true);
    setSubmitError(undefined);
    try {
      await props.onSubmit({
        name: name().trim(),
        status: status(),
        startDate: startDate(),
        startTime: startTime(),
        endDate: endDate(),
        endTime: endTime(),
        items: items(),
      });
    } catch {
      setSubmitError("บันทึกแฟลชเซลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} class="flex flex-col gap-6">
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div class="flex flex-col gap-6 lg:col-span-2">
          <Section title="ข้อมูลแคมเปญ">
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField label="ชื่อแคมเปญ" required value={name()} onInput={(e) => setName(e.currentTarget.value)} error={errors().name} disabled={saving()} class="sm:col-span-2" />
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

          <Section title="วันที่เริ่มต้น - สิ้นสุด">
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField label="วันเริ่ม" required type="date" value={startDate()} onInput={(e) => setStartDate(e.currentTarget.value)} error={errors().startDate} disabled={saving()} />
              <TextField label="เวลาเริ่ม" type="time" value={startTime()} onInput={(e) => setStartTime(e.currentTarget.value)} disabled={saving()} />
              <TextField label="วันสิ้นสุด" required type="date" value={endDate()} onInput={(e) => setEndDate(e.currentTarget.value)} error={errors().endDate} disabled={saving()} />
              <TextField label="เวลาสิ้นสุด" type="time" value={endTime()} onInput={(e) => setEndTime(e.currentTarget.value)} disabled={saving()} />
            </div>
          </Section>

          <Section title="เลือกสินค้า">
            <Show when={errors().items}>
              <p class="text-sm text-system-red">{errors().items}</p>
            </Show>
            <ProductSelector selectedIds={selectedIds()} onChange={setSelectedIds} />
          </Section>

          <Show when={items().length > 0}>
            <Section title="ราคาแฟลชเซลต่อสินค้า">
              <div class="flex flex-col gap-3">
                <For each={items()}>
                  {(item) => {
                    const product = () => productStore.getById(item.productId);
                    return (
                      <div class="grid grid-cols-2 gap-2 rounded-card border border-surface-gray p-3 sm:grid-cols-4 sm:items-end">
                        <div class="col-span-2 flex items-center gap-2 sm:col-span-1">
                          <img src={product()?.image} alt="" class="size-9 shrink-0 rounded-media object-cover" />
                          <p class="min-w-0 truncate text-sm text-ink">{product()?.name}</p>
                        </div>
                        <label class="flex flex-col gap-1 text-xs font-medium text-ink-gray">
                          ราคาปกติ
                          <span class="flex h-10 items-center rounded-card border border-surface-gray bg-surface-gray/40 px-2.5 text-sm text-ink-gray">
                            {formatAdminCurrency(product()?.price ?? 0)}
                          </span>
                        </label>
                        <label class="flex flex-col gap-1 text-xs font-medium text-ink-gray">
                          ราคาแฟลชเซล
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.salePrice}
                            onInput={(e) => updateItem(item.productId, { salePrice: Number(e.currentTarget.value) })}
                            class="h-10 rounded-card border border-surface-gray px-2.5 text-sm text-ink outline-none focus:border-brand-pink"
                          />
                        </label>
                        <label class="flex flex-col gap-1 text-xs font-medium text-ink-gray">
                          จำกัดจำนวน (ไม่บังคับ)
                          <input
                            type="number"
                            min="0"
                            value={item.saleLimit ?? ""}
                            onInput={(e) => updateItem(item.productId, { saleLimit: e.currentTarget.value === "" ? undefined : Number(e.currentTarget.value) })}
                            class="h-10 rounded-card border border-surface-gray px-2.5 text-sm text-ink outline-none focus:border-brand-pink"
                          />
                        </label>
                      </div>
                    );
                  }}
                </For>
              </div>
            </Section>
          </Show>
        </div>

        <div class="flex flex-col gap-6">
          <Section title="ตัวอย่างแคมเปญ">
            <div class="flex flex-col gap-2 text-sm">
              <p class="text-base font-semibold text-ink">{name() || "ชื่อแคมเปญแฟลชเซล"}</p>
              <p class="text-ink-gray">{items().length} สินค้าเข้าร่วม</p>
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
