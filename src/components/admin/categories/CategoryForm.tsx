import { createSignal, Show } from "solid-js";
import { TextField } from "~/components/shared/TextField";
import { Toggle } from "~/components/admin/Toggle";
import { AdminFloatingBar } from "~/components/admin/AdminFloatingBar";
import { DraftPublishActions } from "~/components/admin/DraftPublishActions";
import { FormErrorSummary } from "~/components/admin/FormErrorSummary";
import { clearFieldError, reportFormErrors, type FormErrors } from "~/lib/adminFormValidation";
import { slugifyCategory, categorySlugRouteWarning, categoryStorefrontHref, STOREFRONT_CATEGORY_ROUTE_SLUGS, type AdminCategory, type CategoryFormValues, type CategoryStatus } from "~/lib/adminCategories";

const LABELS: Record<string, string> = { name: "ชื่อหมวดหมู่", slug: "Slug" };

/**
 * One Create/Edit form shared by `/new` and `/:id/edit` — same "one form,
 * two routes" shape every other Admin form uses. Modeled directly on
 * `ProductCollectionForm` plus the taxonomy fields a Category needs: Slug
 * (auto-derived from Name until the admin edits it directly, same UX as the
 * หน้าแคมเปญ form's slug field). Draft-first: a new category (or one still
 * แบบร่าง) saves as a draft or publishes; once published, the Toggle decides
 * whether it's on the storefront.
 */
export function CategoryForm(props: {
  initial?: AdminCategory;
  mode: "create" | "edit";
  isSlugTaken: (slug: string) => boolean;
  onSubmit: (values: CategoryFormValues) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = createSignal(props.initial?.name ?? "");
  const [slug, setSlugRaw] = createSignal(props.initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = createSignal(!!props.initial);
  const [description, setDescription] = createSignal(props.initial?.description ?? "");
  const [status, setStatus] = createSignal<CategoryStatus>(props.initial && props.initial.status !== "draft" ? props.initial.status : "active");
  /** Creating, or the category is still แบบร่าง: บันทึกแบบร่าง / บันทึกและเผยแพร่ instead of one save + on/off Toggle. */
  const draftFlow = !props.initial || props.initial.status === "draft";

  const [errors, setErrors] = createSignal<FormErrors>({});
  const clearError = (key: string) => setErrors((prev) => clearFieldError(prev, key));
  const [saving, setSaving] = createSignal(false);
  const [submitError, setSubmitError] = createSignal<string>();

  const handleNameInput = (value: string) => {
    setName(value);
    if (value.trim()) clearError("name");
    if (!slugTouched()) {
      setSlugRaw(slugifyCategory(value));
      if (slugifyCategory(value)) clearError("slug");
    }
  };

  const handleSlugInput = (value: string) => {
    setSlugTouched(true);
    setSlugRaw(value);
    clearError("slug");
  };

  const validate = (): Record<string, string> => {
    const next: Record<string, string> = {};
    if (!name().trim()) next.name = "กรุณากรอกชื่อหมวดหมู่";
    const cleanSlug = slugifyCategory(slug());
    if (!cleanSlug) next.slug = "กรุณากรอก Slug";
    else if (props.isSlugTaken(cleanSlug)) next.slug = "Slug นี้ถูกใช้ไปแล้ว กรุณาเลือก Slug อื่น";
    else if (categorySlugRouteWarning(cleanSlug)?.tone === "error") next.slug = categorySlugRouteWarning(cleanSlug)!.message;
    return next;
  };

  /** บันทึกแบบร่าง: only the name; a slug that's been typed must still be usable (not taken, not a system page). */
  const validateDraft = (): Record<string, string> => {
    const full = validate();
    const next: Record<string, string> = {};
    if (full.name) next.name = full.name;
    if (slugifyCategory(slug()) && full.slug) next.slug = full.slug;
    return next;
  };

  const handleSubmit = (e: SubmitEvent) => {
    e.preventDefault();
    void save(draftFlow ? "active" : status());
  };

  const save = async (nextStatus: CategoryStatus) => {
    const nextErrors = nextStatus === "draft" ? validateDraft() : validate();
    setErrors(nextErrors);
    if (reportFormErrors(nextErrors, LABELS)) return;

    const values: CategoryFormValues = {
      name: name().trim(),
      slug: slugifyCategory(slug()),
      description: description().trim(),
      status: nextStatus,
    };

    setSaving(true);
    setSubmitError(undefined);
    try {
      await props.onSubmit(values);
    } catch {
      setSubmitError("บันทึกหมวดหมู่ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate class="flex flex-col gap-6">
      <FormErrorSummary errors={errors()} labels={LABELS} />
      <Section title="ข้อมูลพื้นฐาน">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            label="ชื่อหมวดหมู่"
            required
            placeholder="ลิป"
            value={name()}
            onInput={(e) => handleNameInput(e.currentTarget.value)}
            data-field="name"
            error={errors().name}
            disabled={saving()}
          />
          <TextField
            label="Slug"
            required
            placeholder="lip"
            value={slug()}
            onInput={(e) => handleSlugInput(e.currentTarget.value)}
            data-field="slug"
            error={errors().slug}
            disabled={saving()}
          />
          {/* Storefront sync — category pages live at the site root, one static route file per slug. */}
          <div class="flex flex-col gap-1 text-xs sm:col-span-2">
            <p class="text-ink-gray">
              ลิงก์หน้าร้าน <span class="font-medium text-ink">{categoryStorefrontHref(slugifyCategory(slug()) || "slug")}</span>
            </p>
            <p class="text-ink-gray">หน้าร้านมีหน้าหมวดหมู่สำหรับ Slug เหล่านี้เท่านั้น: {STOREFRONT_CATEGORY_ROUTE_SLUGS.join(", ")}</p>
            <Show when={!errors().slug && categorySlugRouteWarning(slugifyCategory(slug()))}>
              {(w) => <p class={w().tone === "error" ? "font-medium text-system-red" : "font-medium text-system-yellow"}>{w().message}</p>}
            </Show>
          </div>
          <label class="flex flex-col gap-1.5 sm:col-span-2">
            <span class="text-sm font-medium text-ink">คำอธิบาย</span>
            <textarea
              value={description()}
              disabled={saving()}
              placeholder="ลิปสติก ลิปทินท์ ลิปกลอส และผลิตภัณฑ์ดูแลริมฝีปาก"
              onInput={(e) => setDescription(e.currentTarget.value)}
              rows={3}
              class="rounded-card border border-border bg-surface-card px-4 py-3 text-sm text-ink outline-none focus:border-brand-pink disabled:cursor-not-allowed disabled:bg-surface-gray"
            />
          </label>
          {/* Draft-first: no on/off at creation or while แบบร่าง; the Toggle only appears once the category has been published. */}
          <Show
            when={!draftFlow}
            fallback={
              <p class="text-xs text-ink-gray sm:col-span-2">
                {props.initial ? "หมวดหมู่นี้ยังเป็นแบบร่าง ไม่แสดงบนหน้าร้าน" : "บันทึกแบบร่างไว้ก่อนได้ แล้วกด บันทึกและเผยแพร่ เมื่อข้อมูลครบ"}
              </p>
            }
          >
            <label class="flex flex-col gap-1.5">
              <span class="text-sm font-medium text-ink">สถานะการใช้งาน</span>
              <Toggle checked={status() === "active"} onChange={(checked) => setStatus(checked ? "active" : "inactive")} disabled={saving()} />
              <span class="text-xs text-ink-gray">ถ้าปิด หมวดหมู่นี้จะไม่แสดงในเมนู การค้นหา และตัวกรองบนหน้าร้าน</span>
            </label>
          </Show>
        </div>
      </Section>

      <Show when={submitError()}>
        <p role="alert" class="rounded-card bg-danger-soft px-4 py-3 text-sm font-medium text-danger-strong">
          {submitError()}
        </p>
      </Show>

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

function Section(props: { title: string; children: import("solid-js").JSX.Element }) {
  return (
    <div class="flex flex-col gap-4 rounded-card bg-surface-card p-4 shadow-card sm:p-5">
      <h2 class="text-base font-semibold text-ink">{props.title}</h2>
      {props.children}
    </div>
  );
}
