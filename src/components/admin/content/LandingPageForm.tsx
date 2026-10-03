import { createMemo, createSignal, For, Show } from "solid-js";
import { TextField } from "~/components/shared/TextField";
import { Button } from "~/components/shared/Button";
import { AdminFloatingBar } from "~/components/admin/AdminFloatingBar";
import { AdminFormPreviewLayout } from "~/components/admin/AdminFormPreviewLayout";
import { ConfirmDialog } from "~/components/admin/ConfirmDialog";
import { EmptyState } from "~/components/admin/EmptyState";
import { ChevronDownIcon, EyeIcon, LayersIcon, PlusIcon } from "~/components/admin/icons";
import { BannerUploader } from "./BannerUploader";
import { PromotionPageProductPicker } from "./PromotionPageProductPicker";
import { HomepageSectionCard } from "./HomepageSectionCard";
import { HomepageSectionsPreview } from "./HomepageSectionsPreview";
import { HOMEPAGE_SECTION_TYPE_META, genHomepageSectionId, type HomepageSection, type HomepageSectionType } from "~/lib/adminHomepage";
import { isValidDateRange } from "~/lib/adminMarketing";
import { slugify, isReservedSlug, validatePublishRequirements, type LandingPage, type LandingPageFormValues, type LandingPageStatus, type PromotionPage } from "~/lib/adminContent";
import { writePreviewDraft } from "~/lib/adminPreviewDraft";
import { pushToast } from "~/lib/toast";

const ADD_SECTION_TYPE_OPTIONS: HomepageSectionType[] = ["hero", "product", "campaign", "content", "cta"];
const TODAY_LABEL = "18 ก.ย. 2569";

function blankLandingSection(type: HomepageSectionType): HomepageSection {
  return {
    id: genHomepageSectionId(),
    type,
    name: `${HOMEPAGE_SECTION_TYPE_META[type].label} ใหม่`,
    enabled: true,
    eyebrow: "",
    title: "",
    description: "",
    banners: { desktop: "", tablet: "", mobile: "" },
    assets: [],
    cta: { label: "", destination: { type: "none" } },
    contentLayout: "image-text",
    productSource: type === "product" ? "best_seller" : "manual",
    products: [],
    collectionId: "",
    categoryId: "",
    campaignId: "",
    createdAt: TODAY_LABEL,
    updatedAt: TODAY_LABEL,
  };
}

const CREATE_STATUS_OPTIONS: { value: LandingPageStatus; label: string }[] = [
  { value: "draft", label: "แบบร่าง" },
  { value: "scheduled", label: "ตั้งเวลาไว้" },
];

const EDIT_STATUS_OPTIONS: { value: LandingPageStatus; label: string }[] = [
  { value: "draft", label: "แบบร่าง" },
  { value: "scheduled", label: "ตั้งเวลาไว้" },
  { value: "published", label: "เผยแพร่แล้ว" },
  { value: "unpublished", label: "ยกเลิกการเผยแพร่" },
];

/**
 * Landing Page Architecture & Promotion Page Migration — was
 * `PromotionPageForm.tsx`. Same component, same `LandingPage` data (an alias
 * of `PromotionPage`, see `adminContent.ts`), same `/admin/content/landing-
 * pages` routes underneath it; only the file/labels moved to the generic
 * "Landing Page" vocabulary so this one form can genuinely host "ปาก",
 * "Skincare", "9.9 Beauty Sale", or any other merchandising page — not just
 * pages that are literally a marketing "promotion". One Create/Edit form
 * shared by `/new` and `/:id/edit`, same "one form, two routes" shape every
 * other Admin form already uses. Create's Floating Bar has two real actions
 * ("บันทึกแบบร่าง"/"เผยแพร่"), so the Status dropdown there only offers
 * Draft/Scheduled — Published is reached solely through the explicit
 * "เผยแพร่" button, which always runs the full publish validation regardless
 * of the dropdown. Edit's single "บันทึกการเปลี่ยนแปลง" button instead saves
 * whatever status the dropdown currently shows, running the same full
 * validation only when that's Published.
 */
export function LandingPageForm(props: {
  initial?: LandingPage;
  mode: "create" | "edit";
  isSlugTaken: (slug: string) => boolean;
  onSubmit: (values: LandingPageFormValues) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = createSignal(props.initial?.name ?? "");
  const [slug, setSlugRaw] = createSignal(props.initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = createSignal(!!props.initial);
  const [status, setStatus] = createSignal<LandingPageStatus>(props.initial?.status ?? "draft");
  const [bannerDesktop, setBannerDesktop] = createSignal(props.initial?.banners.desktop ?? "");
  const [bannerTablet, setBannerTablet] = createSignal(props.initial?.banners.tablet ?? "");
  const [bannerMobile, setBannerMobile] = createSignal(props.initial?.banners.mobile ?? "");
  const [title, setTitle] = createSignal(props.initial?.title ?? "");
  const [description, setDescription] = createSignal(props.initial?.description ?? "");
  const [products, setProducts] = createSignal(props.initial?.products ?? []);
  const [startDate, setStartDate] = createSignal(props.initial?.startDate ?? "");
  const [startTime, setStartTime] = createSignal(props.initial?.startTime ?? "00:00");
  const [endDate, setEndDate] = createSignal(props.initial?.endDate ?? "");
  const [endTime, setEndTime] = createSignal(props.initial?.endTime ?? "23:59");
  const [sections, setSections] = createSignal<HomepageSection[]>(props.initial?.sections ?? []);
  const [expandedSectionId, setExpandedSectionId] = createSignal<string | null>(null);
  const [dragIndex, setDragIndex] = createSignal<number | null>(null);
  const [confirmDeleteSection, setConfirmDeleteSection] = createSignal<HomepageSection | null>(null);

  const [errors, setErrors] = createSignal<Record<string, string>>({});
  const [publishErrors, setPublishErrors] = createSignal<string[]>([]);
  const [saving, setSaving] = createSignal(false);
  const [submitError, setSubmitError] = createSignal<string>();

  const updateSection = (id: string, next: HomepageSection) => setSections((list) => list.map((s) => (s.id === id ? next : s)));
  const toggleSectionEnabled = (id: string) => setSections((list) => list.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)));
  const removeSection = (id: string) => setSections((list) => list.filter((s) => s.id !== id));

  const moveSection = (index: number, dir: -1 | 1) => {
    setSections((list) => {
      const target = index + dir;
      if (target < 0 || target >= list.length) return list;
      const next = [...list];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const reorderSections = (from: number, to: number) => {
    setSections((list) => {
      if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
      const next = [...list];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const addSection = (type: HomepageSectionType) => {
    const created = blankLandingSection(type);
    setSections((list) => [...list, created]);
    setExpandedSectionId(created.id);
  };

  /** §25/§10 — new id, "(สำเนา)" name; Product/Collection/Campaign REFERENCES (`products`/`collectionId`/`campaignId`) are copied as-is, still pointing at the same original entities, never duplicated as new entities. */
  const duplicateSection = (id: string) => {
    setSections((list) => {
      const index = list.findIndex((s) => s.id === id);
      if (index === -1) return list;
      const copy: HomepageSection = { ...list[index], id: genHomepageSectionId(), name: `${list[index].name} (สำเนา)` };
      const next = [...list];
      next.splice(index + 1, 0, copy);
      return next;
    });
  };

  const requestDeleteSection = (s: HomepageSection) => setConfirmDeleteSection(s);
  const confirmDeleteSectionAction = () => {
    const s = confirmDeleteSection();
    if (!s) return;
    removeSection(s.id);
    setConfirmDeleteSection(null);
  };

  const dateRangeValid = createMemo(() => isValidDateRange(startDate(), startTime(), endDate(), endTime()));

  const handleNameInput = (value: string) => {
    setName(value);
    if (!slugTouched()) setSlugRaw(slugify(value));
  };
  const handleSlugInput = (value: string) => {
    setSlugTouched(true);
    setSlugRaw(value);
  };

  const isHomepage = () => props.initial?.isHomepage ?? false;

  const buildValues = (targetStatus: LandingPageStatus): LandingPageFormValues => ({
    name: name().trim(),
    slug: slugify(slug()),
    // §14/§18 — Homepage is assigned only via the seed; this form never exposes a toggle, so the flag just carries through unchanged from whatever page is being edited (always `false` in Create mode).
    isHomepage: isHomepage(),
    status: targetStatus,
    banners: { desktop: bannerDesktop(), tablet: bannerTablet(), mobile: bannerMobile() },
    title: title().trim(),
    description: description().trim(),
    products: products(),
    sections: sections(),
    startDate: startDate(),
    startTime: startTime(),
    endDate: endDate(),
    endTime: endTime(),
  });

  /**
   * REAL-TIME LIVE PREVIEW SYSTEM §10/§12/§18 — Preview Adapter: unifies
   * both page shapes (Section Builder vs. the flat Hero/Title/Description/
   * Product page a brand-new page starts as before any Section is added)
   * into ONE `HomepageSection[]` list, so there is exactly one preview
   * renderer path (`HomepageSectionsPreview`, real `HomepageSections`/
   * `AdminHeroSlide`) instead of a second, hand-rolled look-alike for the
   * flat case. Never touches `sections()` itself — this only ever feeds the
   * preview.
   */
  const effectiveSections = createMemo<HomepageSection[]>(() => {
    if (sections().length > 0) return sections();
    const banners = { desktop: bannerDesktop(), tablet: bannerTablet(), mobile: bannerMobile() };
    const base = {
      enabled: true,
      eyebrow: "",
      banners,
      assets: [],
      cta: { label: "", destination: { type: "none" as const } },
      contentLayout: "image-text" as const,
      productSource: "manual" as const,
      products: [],
      collectionId: "",
      categoryId: "",
      campaignId: "",
      createdAt: TODAY_LABEL,
      updatedAt: TODAY_LABEL,
    };
    return [
      { ...base, id: "flat-hero", type: "hero" as const, name: name() || "Hero", title: title(), description: description() },
      { ...base, id: "flat-products", type: "product" as const, name: name() || "Products", title: "", description: "", products: products() },
    ];
  });

  const openFullPagePreview = () => {
    const values = buildValues(status());
    const draftPage: PromotionPage = { ...values, id: props.initial?.id ?? "draft", createdAt: props.initial?.createdAt ?? TODAY_LABEL, updatedAt: TODAY_LABEL };
    const draftId = writePreviewDraft("promotion-page", draftPage);
    if (!draftId) {
      pushToast("ไม่สามารถเปิดตัวอย่างเต็มหน้าได้ในขณะนี้", "error");
      return;
    }
    window.open(`/admin/preview/promotion-pages/${props.initial?.id ?? "draft"}?draft=${draftId}`, "_blank");
  };

  const validateLight = (): Record<string, string> => {
    const next: Record<string, string> = {};
    if (!name().trim()) next.name = "กรุณากรอกชื่อหน้า";
    const cleanSlug = slugify(slug());
    if (!cleanSlug) next.slug = "กรุณากรอก Slug";
    else if (props.isSlugTaken(cleanSlug)) next.slug = "Slug นี้ถูกใช้ไปแล้ว กรุณาเลือก Slug อื่น";
    // §35 — reserved-route check doesn't apply to the Homepage's own record (it never routes through `/promotion/:slug`).
    else if (!isHomepage() && isReservedSlug(cleanSlug)) next.slug = "Slug นี้ตรงกับ Route ที่ระบบใช้งานอยู่แล้ว กรุณาเลือก Slug อื่น";
    if (startDate() && endDate() && !dateRangeValid()) next.endDate = "วันสิ้นสุดต้องอยู่หลังวันเริ่ม";
    return next;
  };

  const submitWith = async (targetStatus: LandingPageStatus, requireFullValidation: boolean) => {
    const lightErrors = validateLight();
    setErrors(lightErrors);
    if (Object.keys(lightErrors).length > 0) return;

    const values = buildValues(targetStatus);
    if (requireFullValidation) {
      const pubErrors = validatePublishRequirements(values);
      setPublishErrors(pubErrors);
      if (pubErrors.length > 0) return;
    } else {
      setPublishErrors([]);
    }

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

  const handleSaveDraft = (e: Event) => {
    e.preventDefault();
    submitWith(status(), false);
  };
  const handlePublish = (e: Event) => {
    e.preventDefault();
    submitWith("published", true);
  };
  const handleSaveChanges = (e: SubmitEvent) => {
    e.preventDefault();
    submitWith(status(), status() === "published");
  };

  const statusOptions = props.mode === "create" ? CREATE_STATUS_OPTIONS : EDIT_STATUS_OPTIONS;

  const landingPageForm = (
    <>
      <div class="flex flex-col gap-6">
          <Section title="ข้อมูลพื้นฐาน">
            <Show when={isHomepage()}>
              <p class="inline-flex w-fit items-center gap-1.5 rounded-pill bg-surface-pink px-3 py-1 text-sm font-medium text-brand-pink">★ หน้าแรก</p>
            </Show>
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                label="ชื่อหน้า"
                required
                placeholder="9.9 Beauty Sale"
                value={name()}
                onInput={(e) => handleNameInput(e.currentTarget.value)}
                error={errors().name}
                disabled={saving()}
                class="sm:col-span-2"
              />
              <TextField
                label="Slug"
                required
                placeholder="9-9-beauty-sale"
                value={slug()}
                onInput={(e) => handleSlugInput(e.currentTarget.value)}
                error={errors().slug}
                disabled={saving()}
                class="sm:col-span-2"
              />
              <Show when={isHomepage()}>
                <p class="text-xs text-ink-gray sm:col-span-2">
                  หน้านี้คือหน้าแรก — ลูกค้าเข้าถึงผ่าน <span class="font-medium text-ink">/</span> เสมอ ไม่ผ่าน /promotion/{"{slug}"} เหมือนหน้าอื่น (Slug ด้านบนใช้เพื่อความสมบูรณ์ของข้อมูลภายในเท่านั้น)
                </p>
              </Show>
              <label class="flex flex-col gap-1.5">
                <span class="text-sm font-medium text-ink">สถานะ</span>
                <div class="relative">
                  <select
                    value={status()}
                    disabled={saving()}
                    onChange={(e) => setStatus(e.currentTarget.value as LandingPageStatus)}
                    class="h-11 w-full appearance-none rounded-card border border-border bg-surface-card pl-4 pr-9 text-sm text-ink outline-none focus:border-brand-pink disabled:cursor-not-allowed disabled:bg-surface-gray"
                  >
                    {statusOptions.map((opt) => (
                      <option value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <ChevronDownIcon class="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-gray" />
                </div>
              </label>
            </div>
          </Section>

          <Section title="กำหนดเวลาเผยแพร่">
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField label="วันที่เริ่มต้น" type="date" value={startDate()} onInput={(e) => setStartDate(e.currentTarget.value)} disabled={saving()} />
              <TextField label="เวลาเริ่มต้น" type="time" value={startTime()} onInput={(e) => setStartTime(e.currentTarget.value)} disabled={saving()} />
              <TextField label="วันที่สิ้นสุด" type="date" value={endDate()} onInput={(e) => setEndDate(e.currentTarget.value)} error={errors().endDate} disabled={saving()} />
              <TextField label="เวลาสิ้นสุด" type="time" value={endTime()} onInput={(e) => setEndTime(e.currentTarget.value)} disabled={saving()} />
            </div>
          </Section>

          <Section title="แบนเนอร์หลัก">
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <BannerUploader label="แบนเนอร์เดสก์ท็อป" hint="แนะนำ 1920×840px" value={bannerDesktop()} onChange={setBannerDesktop} />
              <BannerUploader label="แบนเนอร์แท็บเล็ต" hint="แนะนำ 1024×600px" value={bannerTablet()} onChange={setBannerTablet} />
              <BannerUploader label="แบนเนอร์มือถือ" hint="แนะนำ 750×960px" value={bannerMobile()} onChange={setBannerMobile} />
            </div>
          </Section>

          <Section title="เนื้อหาหน้า">
            <div class="flex flex-col gap-4">
              <TextField label="หัวข้อ" placeholder="Beauty Sale" value={title()} onInput={(e) => setTitle(e.currentTarget.value)} disabled={saving()} />
              <label class="flex flex-col gap-1.5">
                <span class="text-sm font-medium text-ink">คำอธิบาย</span>
                <textarea
                  value={description()}
                  disabled={saving()}
                  placeholder="รวมไอเทมดูแลผิวและสุขภาพในราคาพิเศษ"
                  onInput={(e) => setDescription(e.currentTarget.value)}
                  rows={3}
                  class="rounded-card border border-border bg-surface-card px-4 py-3 text-sm text-ink outline-none focus:border-brand-pink disabled:cursor-not-allowed disabled:bg-surface-gray"
                />
              </label>
            </div>
          </Section>

          <Section title="เลือกสินค้า">
            <PromotionPageProductPicker selected={products()} onChange={setProducts} />
            <p class="text-xs text-ink-gray">รายการสินค้านี้ใช้เมื่อยังไม่มีส่วนเนื้อหาด้านล่าง — เมื่อเพิ่มส่วนเนื้อหาแล้ว หน้าเว็บจะแสดงผลตามส่วนเนื้อหาแทน</p>
          </Section>

          <Section title="ส่วนประกอบของหน้า">
            <div class="flex flex-col gap-4">
              <p class="text-sm text-ink-gray">ประกอบหน้าด้วยส่วนเนื้อหาสำเร็จรูปจาก Design System เดียวกับหน้าแรก — ไม่ใช่ Freeform Builder</p>
              <div class="flex flex-wrap gap-2">
                <For each={ADD_SECTION_TYPE_OPTIONS}>
                  {(type) => (
                    <Button type="button" variant="outline" size="sm" onClick={() => addSection(type)}>
                      <PlusIcon class="size-3.5" /> {HOMEPAGE_SECTION_TYPE_META[type].label}
                    </Button>
                  )}
                </For>
              </div>

              <Show
                when={sections().length > 0}
                fallback={<EmptyState icon={<LayersIcon />} title="ยังไม่มี Section" description="เพิ่ม Section เพื่อประกอบเนื้อหาของหน้านี้ (ไม่บังคับ)" class="bg-surface-gray/40" />}
              >
                <div class="flex flex-col gap-3">
                  <For each={sections()}>
                    {(section, index) => (
                      <HomepageSectionCard
                        section={section}
                        index={index()}
                        total={sections().length}
                        expanded={expandedSectionId() === section.id}
                        onToggleExpand={() => setExpandedSectionId((id) => (id === section.id ? null : section.id))}
                        onChange={(next) => updateSection(section.id, next)}
                        onToggleEnabled={() => toggleSectionEnabled(section.id)}
                        onDelete={() => requestDeleteSection(section)}
                        onDuplicate={() => duplicateSection(section.id)}
                        onMove={(dir) => moveSection(index(), dir)}
                        onDragStart={() => setDragIndex(index())}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          const from = dragIndex();
                          if (from !== null) reorderSections(from, index());
                          setDragIndex(null);
                        }}
                      />
                    )}
                  </For>
                </div>
              </Show>
            </div>
          </Section>

        </div>

      <Show when={publishErrors().length > 0}>
        <div role="alert" class="rounded-card bg-danger-soft px-4 py-3 text-sm font-medium text-danger-strong">
          <p class="mb-1">ไม่สามารถเผยแพร่ได้ กรุณาแก้ไขก่อน:</p>
          <ul class="list-inside list-disc">
            {publishErrors().map((msg) => (
              <li>{msg}</li>
            ))}
          </ul>
        </div>
      </Show>

      <Show when={submitError()}>
        <p role="alert" class="rounded-card bg-danger-soft px-4 py-3 text-sm font-medium text-danger-strong">
          {submitError()}
        </p>
      </Show>
    </>
  );

  const landingPagePreview = (
    <div class="flex flex-col gap-3 p-4 sm:p-5">
      <Button type="button" variant="outline" onClick={openFullPagePreview}>
        <EyeIcon class="size-4" /> เปิดดูตัวอย่างเต็มหน้า (แท็บใหม่)
      </Button>
      <HomepageSectionsPreview sections={effectiveSections()} />
      <Show when={startDate() && endDate()}>
        <p class="text-xs text-ink-gray">
          {startDate()} {startTime()} — {endDate()} {endTime()}
        </p>
      </Show>
      <Show when={startDate() && endDate() && !dateRangeValid()}>
        <p class="text-xs text-system-red">ช่วงวันที่ไม่ถูกต้อง</p>
      </Show>
    </div>
  );

  return (
    <form onSubmit={handleSaveChanges} class="flex flex-col gap-6">
      <AdminFormPreviewLayout form={landingPageForm} preview={landingPagePreview} />

      <AdminFloatingBar>
        <div class="flex w-full flex-wrap justify-end gap-3">
          <Button type="button" variant="outline" onClick={props.onCancel} disabled={saving()}>
            ยกเลิก
          </Button>
          <Show when={props.mode === "create"}>
            <Button type="button" variant="outline" onClick={handleSaveDraft} loading={saving()}>
              บันทึกแบบร่าง
            </Button>
            <Button type="button" variant="primary" onClick={handlePublish} loading={saving()}>
              เผยแพร่
            </Button>
          </Show>
          <Show when={props.mode === "edit"}>
            <Button type="submit" variant="primary" loading={saving()}>
              {saving() ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
            </Button>
          </Show>
        </div>
      </AdminFloatingBar>
      <div class="h-16" aria-hidden="true" />

      <ConfirmDialog
        open={confirmDeleteSection() !== null}
        onOpenChange={(open) => !open && setConfirmDeleteSection(null)}
        title="ลบ Section นี้หรือไม่?"
        description={`ข้อมูลของ Section "${confirmDeleteSection()?.name ?? ""}" จะถูกนำออกจากหน้านี้`}
        confirmLabel="ลบ"
        tone="danger"
        onConfirm={confirmDeleteSectionAction}
      />
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
