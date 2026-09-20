import { createSignal, Show } from "solid-js";
import { TextField } from "~/components/shared/TextField";
import { Button } from "~/components/shared/Button";
import { AdminFloatingBar } from "~/components/admin/AdminFloatingBar";
import { PromotionPageProductPicker } from "./PromotionPageProductPicker";
import type { CollectionStatus, ProductCollection, ProductCollectionFormValues } from "~/lib/adminCollections";

const STATUS_OPTIONS: { value: CollectionStatus; label: string }[] = [
  { value: "active", label: "เปิดใช้งาน" },
  { value: "inactive", label: "ปิดใช้งาน" },
  { value: "draft", label: "แบบร่าง" },
];

/**
 * One Create/Edit form shared by `/new` and `/:id/edit`, same "one form, two
 * routes" shape every other Admin form already uses — but much simpler than
 * `PromotionPageForm`: Collections have no Draft/Published publish-workflow,
 * so there's just ONE save action (and one light validation rule: name must
 * not be empty) regardless of mode.
 */
export function ProductCollectionForm(props: {
  initial?: ProductCollection;
  mode: "create" | "edit";
  onSubmit: (values: ProductCollectionFormValues) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = createSignal(props.initial?.name ?? "");
  const [description, setDescription] = createSignal(props.initial?.description ?? "");
  const [status, setStatus] = createSignal<CollectionStatus>(props.initial?.status ?? "draft");
  const [products, setProducts] = createSignal(props.initial?.products ?? []);

  const [errors, setErrors] = createSignal<Record<string, string>>({});
  const [saving, setSaving] = createSignal(false);
  const [submitError, setSubmitError] = createSignal<string>();

  const validate = (): Record<string, string> => {
    const next: Record<string, string> = {};
    if (!name().trim()) next.name = "กรุณากรอกชื่อ Collection";
    return next;
  };

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const values: ProductCollectionFormValues = {
      name: name().trim(),
      description: description().trim(),
      status: status(),
      products: products(),
    };

    setSaving(true);
    setSubmitError(undefined);
    try {
      await props.onSubmit(values);
    } catch {
      setSubmitError("บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} class="flex flex-col gap-6">
      <Section title="ข้อมูลพื้นฐาน">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            label="ชื่อ Collection"
            required
            placeholder="สินค้าขายดี"
            value={name()}
            onInput={(e) => setName(e.currentTarget.value)}
            error={errors().name}
            disabled={saving()}
            class="sm:col-span-2"
          />
          <label class="flex flex-col gap-1.5 sm:col-span-2">
            <span class="text-sm font-medium text-ink">คำอธิบาย</span>
            <textarea
              value={description()}
              disabled={saving()}
              placeholder="รวมสินค้าขายดีที่ลูกค้าซื้อซ้ำมากที่สุด"
              onInput={(e) => setDescription(e.currentTarget.value)}
              rows={3}
              class="rounded-card border border-surface-gray bg-white px-4 py-3 text-sm text-ink outline-none focus:border-brand-pink disabled:cursor-not-allowed disabled:bg-surface-gray"
            />
          </label>
          <label class="flex flex-col gap-1.5">
            <span class="text-sm font-medium text-ink">สถานะ</span>
            <select
              value={status()}
              disabled={saving()}
              onChange={(e) => setStatus(e.currentTarget.value as CollectionStatus)}
              class="h-11 rounded-card border border-surface-gray bg-white px-4 text-sm text-ink outline-none focus:border-brand-pink disabled:cursor-not-allowed disabled:bg-surface-gray"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>
        </div>
      </Section>

      <Section title="สินค้าใน Collection">
        <PromotionPageProductPicker selected={products()} onChange={setProducts} />
      </Section>

      <Show when={submitError()}>
        <p role="alert" class="rounded-card bg-danger-soft px-4 py-3 text-sm font-medium text-danger-strong">
          {submitError()}
        </p>
      </Show>

      <AdminFloatingBar>
        <div class="flex w-full flex-wrap justify-end gap-3">
          <Button type="button" variant="outline" onClick={props.onCancel} disabled={saving()}>
            ยกเลิก
          </Button>
          <Button type="submit" variant="primary" loading={saving()}>
            {props.mode === "create" ? "สร้าง Collection" : "บันทึกการเปลี่ยนแปลง"}
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
