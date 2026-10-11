import { createMemo, createSignal, Show } from "solid-js";
import { TextField } from "~/components/shared/TextField";
import { AdminFloatingBar } from "~/components/admin/AdminFloatingBar";
import { DraftPublishActions } from "~/components/admin/DraftPublishActions";
import { AdminFormPreviewLayout } from "~/components/admin/AdminFormPreviewLayout";
import { Toggle } from "~/components/admin/Toggle";
import { FormErrorSummary } from "~/components/admin/FormErrorSummary";
import { clearFieldError, reportFormErrors, type FormErrors } from "~/lib/adminFormValidation";
import { PromotionPageProductPicker } from "./PromotionPageProductPicker";
import { HomepageSections } from "~/components/home/HomepageSections";
import { emptyBanners, emptyCta, type HomepageSection } from "~/lib/adminHomepage";
import type { CollectionStatus, ProductCollection, ProductCollectionFormValues } from "~/lib/adminCollections";

const LABELS: Record<string, string> = { name: "ชื่อกลุ่มสินค้าพิเศษ", products: "สินค้าในกลุ่มสินค้าพิเศษ" };

/**
 * One Create/Edit form shared by `/new` and `/:id/edit`, same "one form, two
 * routes" shape every other Admin form already uses. Draft-first: a new
 * collection (or one still แบบร่าง) gets บันทึกแบบร่าง (name only) and
 * บันทึกและเผยแพร่ (name + at least one product); once published, one
 * บันทึกการเปลี่ยนแปลง plus the on/off Toggle.
 */
export function ProductCollectionForm(props: {
  initial?: ProductCollection;
  /** Unused since the draft-first buttons (kept so older callers still compile). */
  submitLabel?: string;
  onSubmit: (values: ProductCollectionFormValues) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = createSignal(props.initial?.name ?? "");
  const [status, setStatus] = createSignal<CollectionStatus>(props.initial && props.initial.status !== "draft" ? props.initial.status : "active");
  /** Creating, or the collection is still แบบร่าง. */
  const draftFlow = !props.initial || props.initial.status === "draft";
  const [products, setProducts] = createSignal(props.initial?.products ?? []);

  const [errors, setErrors] = createSignal<FormErrors>({});
  const clearError = (key: string) => setErrors((prev) => clearFieldError(prev, key));
  const [saving, setSaving] = createSignal(false);
  const [submitError, setSubmitError] = createSignal<string>();

  const validate = (): Record<string, string> => {
    const next: Record<string, string> = {};
    if (!name().trim()) next.name = "กรุณากรอกชื่อกลุ่มสินค้าพิเศษ";
    // A collection with no products renders an empty Product Section on the storefront.
    if (products().length === 0) next.products = "กรุณาเลือกสินค้าอย่างน้อย 1 รายการ";
    return next;
  };

  /** บันทึกแบบร่าง: only the name. */
  const validateDraft = (): Record<string, string> => {
    const full = validate();
    return full.name ? { name: full.name } : {};
  };

  const handleSubmit = (e: SubmitEvent) => {
    e.preventDefault();
    void save(draftFlow ? "active" : status());
  };

  const save = async (nextStatus: CollectionStatus) => {
    const nextErrors = nextStatus === "draft" ? validateDraft() : validate();
    setErrors(nextErrors);
    if (reportFormErrors(nextErrors, LABELS)) return;

    const values: ProductCollectionFormValues = {
      name: name().trim(),
      status: nextStatus,
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
      <FormErrorSummary errors={errors()} labels={LABELS} />
      <Section title="ข้อมูลกลุ่มสินค้าพิเศษ">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            label="ชื่อกลุ่มสินค้าพิเศษ"
            required
            placeholder="เช่น สินค้าขายดี"
            value={name()}
            onInput={(e) => {
              setName(e.currentTarget.value);
              if (e.currentTarget.value.trim()) clearError("name");
            }}
            data-field="name"
            error={errors().name}
            disabled={saving()}
            class="sm:col-span-2"
          />
          <p class="-mt-2 text-xs text-ink-gray sm:col-span-2">ชื่อนี้เห็นเฉพาะทีมงาน ใช้เลือกกลุ่มสินค้าพิเศษในส่วนรายการสินค้าและเมนู</p>
          {/* Draft-first: the on/off Toggle only appears once the collection has been published. */}
          <Show
            when={!draftFlow}
            fallback={
              <p class="text-xs text-ink-gray sm:col-span-2">
                {props.initial ? "กลุ่มสินค้าพิเศษนี้ยังเป็นแบบร่าง ไม่แสดงบนหน้าร้าน" : "บันทึกแบบร่างไว้ก่อนได้ แล้วกด บันทึกและเผยแพร่ เมื่อข้อมูลครบ"}
              </p>
            }
          >
            <label class="flex flex-col gap-1.5">
              <span class="text-sm font-medium text-ink">สถานะการใช้งาน</span>
              <Toggle checked={status() === "active"} onChange={(on) => setStatus(on ? "active" : "inactive")} disabled={saving()} />
              <span class="text-xs text-ink-gray">ปิดแล้วส่วนที่ใช้กลุ่มสินค้าพิเศษนี้จะไม่แสดงสินค้าบนหน้าร้าน</span>
            </label>
          </Show>
        </div>
      </Section>

      <Section title="สินค้าในกลุ่มสินค้าพิเศษ" required>
        <div data-field="products" class="flex flex-col gap-2">
          <PromotionPageProductPicker
            selected={products()}
            onChange={(next) => {
              setProducts(next);
              if (next.length > 0) clearError("products");
            }}
          />
          <Show when={errors().products}>
            <p role="alert" class="text-sm text-system-red">{errors().products}</p>
          </Show>
        </div>
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
    <form onSubmit={handleSubmit} noValidate class="flex flex-col gap-6">
      <AdminFormPreviewLayout form={collectionForm} preview={collectionPreview} />

      <AdminFloatingBar>
        <DraftPublishActions
          draft={draftFlow}
          saving={saving()}
          onCancel={props.onCancel}
          onSaveDraft={() => void save("draft")}
          onPublish={() => void save("active")}
          onSave={() => void save(status())}
        />
      </AdminFloatingBar>
      <div class="h-16" aria-hidden="true" />
    </form>
  );
}

function Section(props: { title: string; required?: boolean; children: import("solid-js").JSX.Element }) {
  return (
    <div class="flex flex-col gap-4 rounded-card bg-surface-card p-4 shadow-card sm:p-5">
      <h2 class="text-base font-semibold text-ink">
        {props.title}
        <Show when={props.required}>
          <span class="text-system-red" aria-hidden="true">
            {" "}
            *
          </span>
        </Show>
      </h2>
      {props.children}
    </div>
  );
}
