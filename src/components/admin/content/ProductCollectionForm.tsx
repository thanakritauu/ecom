import { createMemo, createSignal, Show } from "solid-js";
import { TextField } from "~/components/shared/TextField";
import { Button } from "~/components/shared/Button";
import { AdminFloatingBar } from "~/components/admin/AdminFloatingBar";
import { AdminFormPreviewLayout } from "~/components/admin/AdminFormPreviewLayout";
import { Toggle } from "~/components/admin/Toggle";
import { PromotionPageProductPicker } from "./PromotionPageProductPicker";
import { HomepageSections } from "~/components/home/HomepageSections";
import { emptyBanners, emptyCta, type HomepageSection } from "~/lib/adminHomepage";
import type { CollectionStatus, ProductCollection, ProductCollectionFormValues } from "~/lib/adminCollections";

/**
 * One Create/Edit form shared by `/new` and `/:id/edit`, same "one form, two
 * routes" shape every other Admin form already uses — but much simpler than
 * `PromotionPageForm`: Collections have no Draft/Published publish-workflow,
 * so there's just ONE save action (and one light validation rule: name must
 * not be empty) regardless of mode.
 */
export function ProductCollectionForm(props: {
  initial?: ProductCollection;
  submitLabel: string;
  onSubmit: (values: ProductCollectionFormValues) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = createSignal(props.initial?.name ?? "");
  const [status, setStatus] = createSignal<CollectionStatus>(props.initial?.status ?? "active");
  const [products, setProducts] = createSignal(props.initial?.products ?? []);

  const [errors, setErrors] = createSignal<Record<string, string>>({});
  const [saving, setSaving] = createSignal(false);
  const [submitError, setSubmitError] = createSignal<string>();

  const validate = (): Record<string, string> => {
    const next: Record<string, string> = {};
    if (!name().trim()) next.name = "กรุณากรอกชื่อกลุ่มสินค้าพิเศษ";
    return next;
  };

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const values: ProductCollectionFormValues = {
      name: name().trim(),
      status: status(),
      products: products(),
    };

    setSaving(true);
    setSubmitError(undefined);
    try {
      await props.onSubmit(values);
    } catch {
      setSubmitError("บันทึกกลุ่มสินค้าพิเศษไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setSaving(false);
    }
  };

  /**
   * REAL-TIME LIVE PREVIEW SYSTEM §12/§13 — Preview Adapter: a Collection
   * has no page of its own on the real Frontend — it only ever appears as a
   * Product Section whose source is this collection (see
   * `ProductSectionBlock`'s `productSource === "collection"` path). This
   * previews the manually-picked product list directly (`productSource:
   * "manual"`) instead of by `collectionId`, since an unsaved/new Collection
   * has no id yet for that lookup to resolve — same real `ProductCard`
   * grid either way.
   */
  const previewSection = createMemo<HomepageSection>(() => ({
    id: "collection-preview",
    type: "product",
    name: name() || "กลุ่มสินค้าพิเศษ",
    enabled: true,
    eyebrow: "",
    title: name(),
    description: "",
    banners: emptyBanners(),
    assets: [],
    cta: emptyCta(),
    contentLayout: "image-text",
    productSource: "manual",
    products: products(),
    collectionId: "",
    categoryId: "",
    createdAt: "",
    updatedAt: "",
  }));

  const collectionForm = (
    <>
      <Section title="ข้อมูลกลุ่มสินค้าพิเศษ">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            label="ชื่อกลุ่มสินค้าพิเศษ"
            required
            placeholder="เช่น สินค้าขายดี"
            value={name()}
            onInput={(e) => setName(e.currentTarget.value)}
            error={errors().name}
            disabled={saving()}
            class="sm:col-span-2"
          />
          <p class="-mt-2 text-xs text-ink-gray sm:col-span-2">ชื่อนี้เห็นเฉพาะทีมงาน ใช้เลือกกลุ่มสินค้าพิเศษในส่วนรายการสินค้าและเมนู</p>
          <label class="flex flex-col gap-1.5">
            <span class="text-sm font-medium text-ink">สถานะการใช้งาน</span>
            <Toggle checked={status() === "active"} onChange={(on) => setStatus(on ? "active" : "inactive")} disabled={saving()} />
            <span class="text-xs text-ink-gray">ปิดแล้วส่วนที่ใช้กลุ่มสินค้าพิเศษนี้จะไม่แสดงสินค้าบนหน้าร้าน</span>
          </label>
        </div>
      </Section>

      <Section title="สินค้าในกลุ่มสินค้าพิเศษ">
        <PromotionPageProductPicker selected={products()} onChange={setProducts} />
      </Section>

      <Show when={submitError()}>
        <p role="alert" class="rounded-card bg-danger-soft px-4 py-3 text-sm font-medium text-danger-strong">
          {submitError()}
        </p>
      </Show>
    </>
  );

  const collectionPreview = (
    <div class="overflow-hidden p-4 sm:p-5">
      <div class="overflow-hidden rounded-media border border-border">
        <HomepageSections sections={[previewSection()]} />
      </div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} class="flex flex-col gap-6">
      <AdminFormPreviewLayout form={collectionForm} preview={collectionPreview} />

      <AdminFloatingBar>
        <div class="flex w-full flex-wrap justify-end gap-3">
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
