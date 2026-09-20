import { createMemo, createSignal, For, Show } from "solid-js";
import { TextField } from "~/components/shared/TextField";
import { Button } from "~/components/shared/Button";
import { AdminFloatingBar } from "~/components/admin/AdminFloatingBar";
import { ConfirmDialog } from "~/components/admin/ConfirmDialog";
import { EmptyState } from "~/components/admin/EmptyState";
import { EyeIcon, LayersIcon, PlusIcon } from "~/components/admin/icons";
import { BannerUploader } from "./BannerUploader";
import { PromotionPageProductPicker } from "./PromotionPageProductPicker";
import { LandingPagePreviewDialog } from "./LandingPagePreview";
import { LandingPageNavPreview } from "./LandingPageNavPreview";
import { HomepageSectionCard } from "./HomepageSectionCard";
import { HomepagePreviewDialog } from "./HomepagePreviewDialog";
import { HOMEPAGE_SECTION_TYPE_META, genHomepageSectionId, type HomepageSection, type HomepageSectionType } from "~/lib/adminHomepage";
import { isValidDateRange } from "~/lib/adminMarketing";
import { slugify, validatePublishRequirements, type LandingPage, type LandingPageFormValues, type LandingPageStatus } from "~/lib/adminContent";
import { PROMOTION_NAV_ICON_OPTIONS } from "~/lib/promotionNavIcons";

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
    cta: { label: "", destination: { type: "none" } },
    contentLayout: "image-text",
    productSource: "manual",
    products: [],
    collectionId: "",
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
  const [navEnabled, setNavEnabled] = createSignal(props.initial?.navigation.enabled ?? false);
  const [navLabel, setNavLabel] = createSignal(props.initial?.navigation.label ?? "");
  const [navIcon, setNavIcon] = createSignal(props.initial?.navigation.icon ?? PROMOTION_NAV_ICON_OPTIONS[0].key);
  const [navOrder, setNavOrder] = createSignal(props.initial?.navigation.order !== undefined ? String(props.initial.navigation.order) : "0");
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
  const [previewOpen, setPreviewOpen] = createSignal(false);

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

  const buildValues = (targetStatus: LandingPageStatus): LandingPageFormValues => ({
    name: name().trim(),
    slug: slugify(slug()),
    status: targetStatus,
    banners: { desktop: bannerDesktop(), tablet: bannerTablet(), mobile: bannerMobile() },
    navigation: { enabled: navEnabled(), label: navLabel().trim(), icon: navIcon(), order: Number(navOrder()) || 0 },
    title: title().trim(),
    description: description().trim(),
    products: products(),
    sections: sections(),
    startDate: startDate(),
    startTime: startTime(),
    endDate: endDate(),
    endTime: endTime(),
  });

  const validateLight = (): Record<string, string> => {
    const next: Record<string, string> = {};
    if (!name().trim()) next.name = "กรุณากรอกชื่อหน้า";
    const cleanSlug = slugify(slug());
    if (!cleanSlug) next.slug = "กรุณากรอก Slug";
    else if (props.isSlugTaken(cleanSlug)) next.slug = "Slug นี้ถูกใช้ไปแล้ว กรุณาเลือก Slug อื่น";
    if (navEnabled() && !navLabel().trim()) next.navLabel = "กรุณากรอก Menu Label";
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

  return (
    <form onSubmit={handleSaveChanges} class="flex flex-col gap-6">
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div class="flex flex-col gap-6 lg:col-span-2">
          <Section title="01 · Basic Information">
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                label="Page Title"
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
              <label class="flex flex-col gap-1.5">
                <span class="text-sm font-medium text-ink">Status</span>
                <select
                  value={status()}
                  disabled={saving()}
                  onChange={(e) => setStatus(e.currentTarget.value as LandingPageStatus)}
                  class="h-11 rounded-card border border-surface-gray bg-white px-4 text-sm text-ink outline-none focus:border-brand-pink disabled:cursor-not-allowed disabled:bg-surface-gray"
                >
                  {statusOptions.map((opt) => (
                    <option value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </label>
            </div>
          </Section>

          <Section title="Schedule">
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField label="Start Date" type="date" value={startDate()} onInput={(e) => setStartDate(e.currentTarget.value)} disabled={saving()} />
              <TextField label="Start Time" type="time" value={startTime()} onInput={(e) => setStartTime(e.currentTarget.value)} disabled={saving()} />
              <TextField label="End Date" type="date" value={endDate()} onInput={(e) => setEndDate(e.currentTarget.value)} error={errors().endDate} disabled={saving()} />
              <TextField label="End Time" type="time" value={endTime()} onInput={(e) => setEndTime(e.currentTarget.value)} disabled={saving()} />
            </div>
          </Section>

          <Section title="02 · Hero Banner">
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <BannerUploader label="Desktop Banner" hint="แนะนำ 1920×840px" value={bannerDesktop()} onChange={setBannerDesktop} />
              <BannerUploader label="Tablet Banner" hint="แนะนำ 1024×600px" value={bannerTablet()} onChange={setBannerTablet} />
              <BannerUploader label="Mobile Banner" hint="แนะนำ 750×960px" value={bannerMobile()} onChange={setBannerMobile} />
            </div>
          </Section>

          <Section title="03 · Page Content">
            <div class="flex flex-col gap-4">
              <TextField label="Title" placeholder="Beauty Sale" value={title()} onInput={(e) => setTitle(e.currentTarget.value)} disabled={saving()} />
              <label class="flex flex-col gap-1.5">
                <span class="text-sm font-medium text-ink">Description</span>
                <textarea
                  value={description()}
                  disabled={saving()}
                  placeholder="รวมไอเทมดูแลผิวและสุขภาพในราคาพิเศษ"
                  onInput={(e) => setDescription(e.currentTarget.value)}
                  rows={3}
                  class="rounded-card border border-surface-gray bg-white px-4 py-3 text-sm text-ink outline-none focus:border-brand-pink disabled:cursor-not-allowed disabled:bg-surface-gray"
                />
              </label>
            </div>
          </Section>

          <Section title="04 · Products">
            <PromotionPageProductPicker selected={products()} onChange={setProducts} />
            <p class="text-xs text-ink-gray">รายการสินค้านี้ใช้เมื่อยังไม่มี Page Section ด้านล่าง — เมื่อเพิ่ม Section แล้ว หน้าเว็บจะแสดงผลตาม Section แทน</p>
          </Section>

          <Section title="05 · Page Sections">
            <div class="flex flex-col gap-4">
              <p class="text-sm text-ink-gray">ประกอบหน้าด้วย Section สำเร็จรูปจาก Design System เดียวกับ Homepage — ไม่ใช่ Freeform Builder</p>
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

          <Section title="06 · Frontend Navigation">
            <div class="flex flex-col gap-4">
              <label class="flex items-center gap-2 text-sm text-ink">
                <input type="checkbox" checked={navEnabled()} onChange={(e) => setNavEnabled(e.currentTarget.checked)} disabled={saving()} class="size-4 rounded accent-brand-pink" />
                แสดงบน Top Navigation
              </label>

              <Show when={navEnabled()}>
                <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <TextField
                    label="Menu Label"
                    required
                    placeholder="9.9"
                    value={navLabel()}
                    onInput={(e) => setNavLabel(e.currentTarget.value)}
                    error={errors().navLabel}
                    disabled={saving()}
                  />
                  <TextField
                    label="Navigation Order"
                    type="number"
                    min="0"
                    value={navOrder()}
                    onInput={(e) => setNavOrder(e.currentTarget.value)}
                    disabled={saving()}
                  />
                  <div class="flex flex-col gap-1.5 sm:col-span-2">
                    <span class="text-sm font-medium text-ink">Navigation Icon</span>
                    <div class="flex flex-wrap gap-2">
                      <For each={PROMOTION_NAV_ICON_OPTIONS}>
                        {(opt) => {
                          const selected = () => navIcon() === opt.key;
                          return (
                            <button
                              type="button"
                              aria-pressed={selected()}
                              onClick={() => setNavIcon(opt.key)}
                              disabled={saving()}
                              class="flex flex-col items-center gap-1 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <span
                                class="flex size-11 items-center justify-center rounded-media border-2 bg-surface-gray/60 text-ink transition-colors duration-150"
                                classList={{ "border-brand-pink text-brand-pink": selected(), "border-surface-gray": !selected() }}
                              >
                                <opt.Icon class="size-5" />
                              </span>
                              <span class="text-[10px] text-ink-gray">{opt.label}</span>
                            </button>
                          );
                        }}
                      </For>
                    </div>
                  </div>
                </div>

                <div class="flex flex-col gap-2">
                  <span class="text-xs font-semibold uppercase tracking-wide text-ink-placeholder">Frontend Navigation Preview</span>
                  <LandingPageNavPreview label={navLabel()} iconKey={navIcon()} />
                </div>
              </Show>
            </div>
          </Section>
        </div>

        <div class="flex flex-col gap-6">
          <Section title="Preview">
            <div class="flex flex-col gap-3 text-sm">
              <p class="text-ink-gray">ดูตัวอย่างหน้า Landing Page ก่อนบันทึกหรือเผยแพร่</p>
              <Button type="button" variant="outline" onClick={() => setPreviewOpen(true)}>
                <EyeIcon class="size-4" /> Preview หน้า
              </Button>
              <Show when={startDate() && endDate()}>
                <p class="text-ink-gray">
                  {startDate()} {startTime()} — {endDate()} {endTime()}
                </p>
              </Show>
              <Show when={startDate() && endDate() && !dateRangeValid()}>
                <p class="text-system-red">ช่วงวันที่ไม่ถูกต้อง</p>
              </Show>
            </div>
          </Section>
        </div>
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

      <Show
        when={sections().length > 0}
        fallback={
          <LandingPagePreviewDialog
            open={previewOpen()}
            onOpenChange={setPreviewOpen}
            banners={{ desktop: bannerDesktop(), tablet: bannerTablet(), mobile: bannerMobile() }}
            title={title()}
            description={description()}
            products={products()}
          />
        }
      >
        {/* §18 — once a page adopts the Section Builder, its preview switches to the exact same renderer the real Landing Page/Homepage route uses ("Admin Preview ≈ Frontend Render"), instead of the flat Hero/Title/Description/Product-grid preview above. */}
        <HomepagePreviewDialog open={previewOpen()} onOpenChange={setPreviewOpen} sections={sections()} />
      </Show>

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
    <div class="flex flex-col gap-4 rounded-card bg-white p-4 shadow-card sm:p-5">
      <h2 class="text-base font-semibold text-ink">{props.title}</h2>
      {props.children}
    </div>
  );
}
