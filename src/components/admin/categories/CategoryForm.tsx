import { createSignal, Show } from "solid-js";
import { TextField } from "~/components/shared/TextField";
import { Button } from "~/components/shared/Button";
import { AdminFloatingBar } from "~/components/admin/AdminFloatingBar";
import { SingleImageUploader } from "~/components/admin/SingleImageUploader";
import { slugifyCategory, type AdminCategory, type CategoryFormValues, type CategoryStatus } from "~/lib/adminCategories";

const STATUS_OPTIONS: { value: CategoryStatus; label: string }[] = [
  { value: "active", label: "เปิดใช้งาน" },
  { value: "inactive", label: "ปิดใช้งาน" },
];

/**
 * One Create/Edit form shared by `/new` and `/:id/edit` — same "one form,
 * two routes" shape every other Admin form uses. Modeled directly on
 * `ProductCollectionForm` (single save action, no publish workflow) plus the
 * taxonomy fields a Category needs: Slug (auto-derived from Name until the
 * admin edits it directly, same UX as `CampaignForm`'s slug field), a square
 * thumbnail image, and a numeric Sort Order used as the list's default sort
 * and (eventually) the storefront menu order.
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
  const [image, setImage] = createSignal(props.initial?.image ?? "");
  const [status, setStatus] = createSignal<CategoryStatus>(props.initial?.status ?? "active");
  const [sortOrder, setSortOrder] = createSignal(props.initial?.sortOrder ?? 0);

  const [errors, setErrors] = createSignal<Record<string, string>>({});
  const [saving, setSaving] = createSignal(false);
  const [submitError, setSubmitError] = createSignal<string>();

  const handleNameInput = (value: string) => {
    setName(value);
    if (!slugTouched()) setSlugRaw(slugifyCategory(value));
  };

  const handleSlugInput = (value: string) => {
    setSlugTouched(true);
    setSlugRaw(value);
  };

  const validate = (): Record<string, string> => {
    const next: Record<string, string> = {};
    if (!name().trim()) next.name = "กรุณากรอกชื่อหมวดหมู่";
    const cleanSlug = slugifyCategory(slug());
    if (!cleanSlug) next.slug = "กรุณากรอก Slug";
    else if (props.isSlugTaken(cleanSlug)) next.slug = "Slug นี้ถูกใช้ไปแล้ว กรุณาเลือก Slug อื่น";
    return next;
  };

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const values: CategoryFormValues = {
      name: name().trim(),
      slug: slugifyCategory(slug()),
      description: description().trim(),
      image: image(),
      status: status(),
      sortOrder: sortOrder(),
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
            label="ชื่อหมวดหมู่"
            required
            placeholder="ปาก"
            value={name()}
            onInput={(e) => handleNameInput(e.currentTarget.value)}
            error={errors().name}
            disabled={saving()}
          />
          <TextField
            label="Slug"
            required
            placeholder="lip"
            value={slug()}
            onInput={(e) => handleSlugInput(e.currentTarget.value)}
            error={errors().slug}
            disabled={saving()}
          />
          <label class="flex flex-col gap-1.5 sm:col-span-2">
            <span class="text-sm font-medium text-ink">คำอธิบาย</span>
            <textarea
              value={description()}
              disabled={saving()}
              placeholder="ลิปสติก ลิปทินท์ ลิปกลอส และผลิตภัณฑ์ดูแลริมฝีปาก"
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
              onChange={(e) => setStatus(e.currentTarget.value as CategoryStatus)}
              class="h-11 rounded-card border border-surface-gray bg-white px-4 text-sm text-ink outline-none focus:border-brand-pink disabled:cursor-not-allowed disabled:bg-surface-gray"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>
          <TextField
            label="ลำดับการแสดงผล"
            type="number"
            value={String(sortOrder())}
            onInput={(e) => setSortOrder(Number(e.currentTarget.value) || 0)}
            disabled={saving()}
          />
        </div>
      </Section>

      <Section title="รูปภาพ">
        <SingleImageUploader label="รูปหมวดหมู่" hint="แนะนำสัดส่วน 1:1" value={image()} onChange={setImage} />
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
            {props.mode === "create" ? "สร้างหมวดหมู่" : "บันทึกการเปลี่ยนแปลง"}
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
