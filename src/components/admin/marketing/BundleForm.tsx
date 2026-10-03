import { createMemo, createSignal, For, Show } from "solid-js";
import { TextField } from "~/components/shared/TextField";
import { Button } from "~/components/shared/Button";
import { AdminFloatingBar } from "~/components/admin/AdminFloatingBar";
import { ChevronDownIcon } from "~/components/admin/icons";
import { ProductSelector } from "./ProductSelector";
import { useAdminProducts } from "~/lib/adminProductStore";
import { formatAdminCurrency } from "~/lib/adminDashboard";
import { isValidDateRange, formatMarketingDate, type Bundle, type BundleItem, type MarketingStatus } from "~/lib/adminMarketing";

const STATUS_OPTIONS: { value: MarketingStatus; label: string }[] = [
  { value: "draft", label: "แบบร่าง" },
  { value: "scheduled", label: "ตั้งเวลาไว้" },
  { value: "active", label: "กำลังใช้งาน" },
  { value: "disabled", label: "ปิดใช้งาน" },
];

export type BundleFormValues = Omit<Bundle, "id" | "createdAt" | "updatedAt">;

/** Phase 07 #27 — Product Selection + per-product quantity, with Regular Total/Savings computed live (mock only, per #41 — no real pricing engine). */
export function BundleForm(props: {
  initial?: Bundle;
  submitLabel: string;
  onSubmit: (values: BundleFormValues) => Promise<void>;
  onCancel: () => void;
}) {
  const productStore = useAdminProducts();
  const [name, setName] = createSignal(props.initial?.name ?? "");
  const [description, setDescription] = createSignal(props.initial?.description ?? "");
  const [status, setStatus] = createSignal<MarketingStatus>(props.initial?.status ?? "draft");
  const [bundlePrice, setBundlePrice] = createSignal(props.initial ? String(props.initial.bundlePrice) : "");
  const [startDate, setStartDate] = createSignal(props.initial?.startDate ?? "");
  const [startTime, setStartTime] = createSignal(props.initial?.startTime ?? "00:00");
  const [endDate, setEndDate] = createSignal(props.initial?.endDate ?? "");
  const [endTime, setEndTime] = createSignal(props.initial?.endTime ?? "23:59");
  const [items, setItems] = createSignal<BundleItem[]>(props.initial?.items ?? []);

  const [errors, setErrors] = createSignal<Record<string, string>>({});
  const [saving, setSaving] = createSignal(false);
  const [submitError, setSubmitError] = createSignal<string>();

  const selectedIds = createMemo(() => items().map((i) => i.productId));
  const dateRangeValid = createMemo(() => isValidDateRange(startDate(), startTime(), endDate(), endTime()));
  const regularTotal = createMemo(() => items().reduce((sum, item) => sum + (productStore.getById(item.productId)?.price ?? 0) * item.qty, 0));
  const savings = createMemo(() => Math.max(0, regularTotal() - (Number(bundlePrice()) || 0)));

  const setSelectedIds = (ids: string[]) => {
    setItems((current) => {
      const byId = new Map(current.map((i) => [i.productId, i]));
      return ids.map((id) => byId.get(id) ?? { productId: id, qty: 1 });
    });
  };

  const updateQty = (productId: string, qty: number) => {
    setItems((current) => current.map((i) => (i.productId === productId ? { ...i, qty: Math.max(1, qty) } : i)));
  };

  const validate = (): Record<string, string> => {
    const next: Record<string, string> = {};
    if (!name().trim()) next.name = "กรุณากรอกชื่อเซ็ต";
    const price = Number(bundlePrice());
    if (!bundlePrice().trim() || Number.isNaN(price) || price <= 0) next.bundlePrice = "กรุณากรอกราคาเซ็ตที่ถูกต้อง";
    if (!startDate()) next.startDate = "กรุณาเลือกวันเริ่ม";
    if (!endDate()) next.endDate = "กรุณาเลือกวันสิ้นสุด";
    if (startDate() && endDate() && !dateRangeValid()) next.endDate = "วันสิ้นสุดต้องอยู่หลังวันเริ่ม";
    if (items().length < 2) next.items = "กรุณาเลือกสินค้าอย่างน้อย 2 รายการสำหรับเซ็ต";
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
        description: description().trim() || undefined,
        status: status(),
        bundlePrice: Number(bundlePrice()),
        startDate: startDate(),
        startTime: startTime(),
        endDate: endDate(),
        endTime: endTime(),
        items: items(),
      });
    } catch {
      setSubmitError("บันทึกเซ็ตสินค้าไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} class="flex flex-col gap-6">
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div class="flex flex-col gap-6 lg:col-span-2">
          <Section title="ข้อมูลเซ็ตสินค้า">
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField label="ชื่อเซ็ต" required value={name()} onInput={(e) => setName(e.currentTarget.value)} error={errors().name} disabled={saving()} class="sm:col-span-2" />
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
              <TextField label="ราคาเซ็ต (฿)" required type="number" min="0" step="0.01" value={bundlePrice()} onInput={(e) => setBundlePrice(e.currentTarget.value)} error={errors().bundlePrice} disabled={saving()} />
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

          <Section title="เลือกสินค้าในเซ็ต">
            <Show when={errors().items}>
              <p class="text-sm text-system-red">{errors().items}</p>
            </Show>
            <ProductSelector selectedIds={selectedIds()} onChange={setSelectedIds} />
          </Section>

          <Show when={items().length > 0}>
            <Section title="จำนวนต่อสินค้า">
              <div class="flex flex-col gap-3">
                <For each={items()}>
                  {(item) => {
                    const product = () => productStore.getById(item.productId);
                    return (
                      <div class="flex items-center gap-3 rounded-card border border-border p-3">
                        <img src={product()?.image} alt="" class="size-10 shrink-0 rounded-media object-cover" />
                        <p class="min-w-0 flex-1 truncate text-sm text-ink">{product()?.name}</p>
                        <label class="flex items-center gap-2 text-xs font-medium text-ink-gray">
                          จำนวน
                          <input
                            type="number"
                            min="1"
                            value={item.qty}
                            onInput={(e) => updateQty(item.productId, Number(e.currentTarget.value))}
                            class="h-9 w-16 rounded-card border border-border px-2 text-center text-sm text-ink outline-none focus:border-brand-pink"
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
          <Section title="สรุปราคาเซ็ต (ตัวอย่าง)">
            <div class="flex flex-col gap-2 text-sm">
              <div class="flex items-center justify-between">
                <span class="text-ink-gray">ราคารวมปกติ</span>
                <span class="text-ink line-through">{formatAdminCurrency(regularTotal())}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-ink-gray">ราคาเซ็ต</span>
                <span class="font-semibold text-ink">{formatAdminCurrency(Number(bundlePrice()) || 0)}</span>
              </div>
              <div class="flex items-center justify-between border-t border-border pt-2 text-base font-bold text-ink">
                <span>ประหยัด</span>
                <span>{formatAdminCurrency(savings())}</span>
              </div>
              <Show when={startDate() && endDate()}>
                <p class="mt-2 text-ink-gray">
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
    <div class="flex flex-col gap-4 rounded-card bg-surface-card p-4 shadow-card sm:p-5">
      <h2 class="text-base font-semibold text-ink">{props.title}</h2>
      {props.children}
    </div>
  );
}
