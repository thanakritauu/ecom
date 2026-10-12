import { createMemo, createSignal, For, Show } from "solid-js";
import { TextField } from "~/components/shared/TextField";
import { Button } from "~/components/shared/Button";
import { AdminFloatingBar } from "~/components/admin/AdminFloatingBar";
import { DraftPublishActions } from "~/components/admin/DraftPublishActions";
import { AdminFormPreviewLayout } from "~/components/admin/AdminFormPreviewLayout";
import { ConfirmDialog } from "~/components/admin/ConfirmDialog";
import { EmptyState } from "~/components/admin/EmptyState";
import { ChevronDownIcon, EyeIcon, LayersIcon, PlusIcon } from "~/components/admin/icons";
import { BannerUploader } from "./BannerUploader";
import { ProductSkuPicker } from "~/components/admin/ProductSkuPicker";
import { HomepageSectionCard } from "./HomepageSectionCard";
import { sectionFieldErrors } from "./HomepageSectionForm";
import { FormErrorSummary } from "~/components/admin/FormErrorSummary";
import { clearFieldError, reportFormErrors, type FormErrors } from "~/lib/adminFormValidation";
import { mediaErrors } from "~/lib/media";
import { HomepageSectionsPreview } from "./HomepageSectionsPreview";
import { PromotionPagePreviewBody, isListingModePage } from "./PromotionPagePreviewBody";
import { BUILTIN_SECTION_TYPES, HOMEPAGE_SECTION_TYPE_META, genHomepageSectionId, isBuiltinSectionType, isValidYoutubeUrl, type HomepageSection, type HomepageSectionType } from "~/lib/adminHomepage";
import { formatMarketingDateTime, isValidDateRange } from "~/lib/adminMarketing";
import { StatusBadge } from "~/components/admin/StatusBadge";
import { slugify, isReservedSlug, promotionPageHref, PROMOTION_PAGE_STATUS_META, type LandingPage, type LandingPageFormValues, type LandingPageStatus, type PromotionPage } from "~/lib/adminContent";
import { writePreviewDraft } from "~/lib/adminPreviewDraft";
import { pushToast } from "~/lib/toast";

const ADD_SECTION_TYPE_OPTIONS: HomepageSectionType[] = ["hero", "promotion_banner", "product", "content", "cta"];
/** Ready-made storefront blocks (their own data and design); only heading + on/off are set here. */
const ADD_BUILTIN_TYPE_OPTIONS: HomepageSectionType[] = [...BUILTIN_SECTION_TYPES];
const TODAY_LABEL = "18 ก.ย. 2569";

function blankLandingSection(type: HomepageSectionType): HomepageSection {
  return {
    id: genHomepageSectionId(),
    type,
    name: isBuiltinSectionType(type) ? HOMEPAGE_SECTION_TYPE_META[type].label : `${HOMEPAGE_SECTION_TYPE_META[type].label} ใหม่`,
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
    createdAt: TODAY_LABEL,
    updatedAt: TODAY_LABEL,
  };
}

const BASE_LABELS: Record<string, string> = {
  name: "ชื่อหน้า",
  slug: "Slug",
  startDate: "วันที่เริ่มต้น",
  endDate: "วันที่สิ้นสุด",
  banner: "แบนเนอร์หลัก",
  videoUrl: "วิดีโอ YouTube",
  title: "หัวข้อ",
  products: "เลือกสินค้า",
  sections: "ส่วนเนื้อหาของหน้า",
};
const sectionKey = (id: string) => `section:${id}`;

const statusOption = (value: LandingPageStatus) => ({ value, label: PROMOTION_PAGE_STATUS_META[value].label });
/** Once a page has been published it's on, scheduled or off; "แบบร่าง" is only the state before its first publish. */
const LIVE_STATUS_OPTIONS = (["published", "scheduled", "unpublished"] as LandingPageStatus[]).map(statusOption);

/**
 * Landing Page Architecture & Promotion Page Migration — was
 * `PromotionPageForm.tsx`. Same component, same `LandingPage` data (an alias
 * of `PromotionPage`, see `adminContent.ts`), same `/admin/content/landing-
 * pages` routes underneath it; only the file/labels moved to the generic
 * "Landing Page" vocabulary so this one form can genuinely host "ปาก",
 * "Skincare", "9.9 Beauty Sale", or any other merchandising page — not just
 * pages that are literally a marketing "promotion". One Create/Edit form
 * shared by `/new` and `/:id/edit`, same "one form, two routes" shape every
 * other Admin form already uses. Draft-first rule (`DraftPublishActions`):
 * a new page, or one still in แบบร่าง, has no Status dropdown, only
 * "บันทึกแบบร่าง" (name + slug) and "บันทึกและเผยแพร่" (full check; a start
 * date/time in the future makes it "ตั้งเวลาไว้" so it goes live by itself).
 * After the first publish the single "บันทึกการเปลี่ยนแปลง" button runs the
 * full check and saves whatever the dropdown (เผยแพร่แล้ว / ตั้งเวลาไว้ /
 * ยกเลิกการเผยแพร่) shows.
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
  const [videoUrl, setVideoUrl] = createSignal(props.initial?.videoUrl ?? "");
  const [products, setProducts] = createSignal(props.initial?.products ?? []);
  const [startDate, setStartDate] = createSignal(props.initial?.startDate ?? "");
  const [startTime, setStartTime] = createSignal(props.initial?.startTime ?? "00:00");
  const [endDate, setEndDate] = createSignal(props.initial?.endDate ?? "");
  const [endTime, setEndTime] = createSignal(props.initial?.endTime ?? "23:59");
  const [sections, setSections] = createSignal<HomepageSection[]>(props.initial?.sections ?? []);
  const [expandedSectionId, setExpandedSectionId] = createSignal<string | null>(null);
  const [dragIndex, setDragIndex] = createSignal<number | null>(null);
  const [confirmDeleteSection, setConfirmDeleteSection] = createSignal<HomepageSection | null>(null);
  /** Where "+ add section" puts the new section: after this section id, or at the end ("" ). */
  const [insertAfterId, setInsertAfterId] = createSignal("");

  const [errors, setErrors] = createSignal<FormErrors>({});
  /** Per-section field errors (only for sections that still need something), shown inside each section card. */
  const [sectionErrors, setSectionErrors] = createSignal<Record<string, FormErrors>>({});
  /** Whether the last save attempt needed the full "goes live" check, so fixes re-check against the same rules. */
  const [fullCheck, setFullCheck] = createSignal(false);
  const clearError = (key: string) => setErrors((prev) => clearFieldError(prev, key));
  const labels = createMemo(() => {
    const out: Record<string, string> = { ...BASE_LABELS };
    for (const sec of sections()) out[sectionKey(sec.id)] = `ส่วนเนื้อหา: ${sec.name || "ไม่มีชื่อ"}`;
    return out;
  });
  const [saving, setSaving] = createSignal(false);
  const [submitError, setSubmitError] = createSignal<string>();

  /** Re-checks one section that's already flagged, so its errors disappear as soon as it's fixed. */
  const recheckSection = (section: HomepageSection | undefined, id: string) => {
    if (!sectionErrors()[id]) return;
    const next = section && section.enabled ? sectionFieldErrors(section) : {};
    if (Object.keys(next).length > 0) setSectionErrors((prev) => ({ ...prev, [id]: next }));
    else {
      setSectionErrors(({ [id]: _fixed, ...rest }) => rest);
      clearError(sectionKey(id));
    }
  };
  const updateSection = (id: string, next: HomepageSection) => {
    setSections((list) => list.map((s) => (s.id === id ? next : s)));
    recheckSection(next, id);
  };
  const toggleSectionEnabled = (id: string) => {
    setSections((list) => list.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)));
    recheckSection(sections().find((s) => s.id === id), id);
    if (sections().some((s) => s.enabled)) clearError("sections");
  };
  const removeSection = (id: string) => {
    setSections((list) => list.filter((s) => s.id !== id));
    recheckSection(undefined, id);
    if (insertAfterId() === id) setInsertAfterId("");
  };

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
    setSections((list) => {
      const at = list.findIndex((s) => s.id === insertAfterId());
      if (at === -1) return [...list, created];
      const next = [...list];
      next.splice(at + 1, 0, created);
      return next;
    });
    // Built-in blocks only have a heading and on/off, so there's nothing to open.
    if (!isBuiltinSectionType(type)) setExpandedSectionId(created.id);
    // Sections replace the flat banner/title/products layout, so those requirements no longer apply.
    setErrors((prev) => ["banner", "title", "products", "sections"].reduce((acc, key) => clearFieldError(acc, key), prev));
  };

  /** §25/§10 — new id, "(สำเนา)" name; Product/Collection REFERENCES (`products`/`collectionId`) are copied as-is, still pointing at the same original entities, never duplicated as new entities. */
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
    if (value.trim()) clearError("name");
    if (!slugTouched()) {
      setSlugRaw(slugify(value));
      if (slugify(value)) clearError("slug");
    }
  };
  const handleSlugInput = (value: string) => {
    setSlugTouched(true);
    setSlugRaw(value);
    clearError("slug");
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
    videoUrl: videoUrl().trim(),
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
      pushToast("เปิดตัวอย่างเต็มหน้าไม่สำเร็จ กรุณาลองใหม่อีกครั้ง", "error");
      return;
    }
    window.open(`/admin/preview/promotion-pages/${props.initial?.id ?? "draft"}?draft=${draftId}`, "_blank");
  };

  /**
   * Always-on rules (also for drafts): name, slug, dates, video link. When
   * the page goes live (published, or scheduled to go live by itself), also
   * everything the storefront page needs to not show up empty: a banner or
   * video, a heading and products for a flat page; at least one shown
   * section, and every shown section complete, for a section-built page.
   */
  const validate = (targetStatus: LandingPageStatus, full: boolean): { fields: FormErrors; perSection: Record<string, FormErrors> } => {
    const next: FormErrors = {};
    const perSection: Record<string, FormErrors> = {};
    if (!name().trim()) next.name = "กรุณากรอกชื่อหน้า";
    if (!isHomepage()) {
      const cleanSlug = slugify(slug());
      if (!cleanSlug) next.slug = "กรุณากรอก Slug";
      else if (props.isSlugTaken(cleanSlug)) next.slug = "Slug นี้ถูกใช้ไปแล้ว กรุณาเลือก Slug อื่น";
      // §35 — reserved-route check doesn't apply to the Homepage's own record (it never routes through `/promotion/:slug`).
      else if (isReservedSlug(cleanSlug)) next.slug = "Slug นี้ซ้ำกับหน้าอื่นของเว็บไซต์ กรุณาเลือก Slug อื่น";
    }
    // A scheduled page only goes live on its start date (`isPromotionPageVisible`), so it needs one.
    if (targetStatus === "scheduled" && !startDate()) next.startDate = "กรุณาระบุวันที่เริ่มต้นสำหรับหน้าที่ตั้งเวลาไว้";
    if (startDate() && endDate() && !dateRangeValid()) next.endDate = "วันสิ้นสุดต้องอยู่หลังวันเริ่ม";
    if (videoUrl().trim() && !isValidYoutubeUrl(videoUrl())) next.videoUrl = "ลิงก์ YouTube ไม่ถูกต้อง";
    if (!full) return { fields: next, perSection };

    if (sections().length === 0 && !isHomepage()) {
      const banners = { desktop: bannerDesktop(), tablet: bannerTablet(), mobile: bannerMobile() };
      // A YouTube video takes the banner's place on the storefront (`PromotionPageView`), so it satisfies the banner requirement on its own.
      if (!banners.desktop && !videoUrl().trim()) next.banner = "กรุณาอัปโหลดแบนเนอร์เดสก์ท็อป หรือใส่ลิงก์วิดีโอ YouTube";
      const media = [...mediaErrors(banners.desktop, "แบนเนอร์เดสก์ท็อป"), ...mediaErrors(banners.tablet, "แบนเนอร์แท็บเล็ต"), ...mediaErrors(banners.mobile, "แบนเนอร์มือถือ")];
      if (media.length > 0) next.banner = media.join(", ");
      if (!title().trim()) next.title = "กรุณากรอกหัวข้อ";
      if (products().length === 0) next.products = "กรุณาเลือกสินค้าอย่างน้อย 1 รายการ";
    }
    if (sections().length > 0 && !isHomepage() && !sections().some((sec) => sec.enabled)) next.sections = "กรุณาเปิดแสดงส่วนเนื้อหาอย่างน้อย 1 ส่วน";
    for (const sec of sections()) {
      if (!sec.enabled) continue;
      const secErrors = sectionFieldErrors(sec);
      if (Object.keys(secErrors).length > 0) {
        perSection[sec.id] = secErrors;
        next[sectionKey(sec.id)] = Object.values(secErrors).join(", ");
      }
    }
    return { fields: next, perSection };
  };

  // After a failed save, re-check the flat-page fields as they change so each error clears once fixed.
  const recheckField = (key: string) => {
    if (!(key in errors())) return;
    const { fields } = validate(status(), fullCheck());
    if (!(key in fields)) clearError(key);
    else setErrors((prev) => ({ ...prev, [key]: fields[key] }));
  };

  const submitWith = async (targetStatus: LandingPageStatus, requireFullValidation: boolean) => {
    setFullCheck(requireFullValidation);
    const { fields, perSection } = validate(targetStatus, requireFullValidation);
    setErrors(fields);
    setSectionErrors(perSection);
    if (Object.keys(fields).length > 0) {
      // Open the first broken section so its fields (and messages) are on screen when the page scrolls to it.
      const firstBroken = sections().find((sec) => perSection[sec.id]);
      const flatBroken = Object.keys(fields).some((k) => !k.startsWith("section:"));
      if (firstBroken && !flatBroken) setExpandedSectionId(firstBroken.id);
      reportFormErrors(fields, labels());
      return;
    }

    const values = buildValues(targetStatus);
    setSaving(true);
    setSubmitError(undefined);
    try {
      await props.onSubmit(values);
    } catch {
      setSubmitError("บันทึกหน้าแคมเปญไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setSaving(false);
    }
  };

  /** New pages and pages still in แบบร่าง get บันทึกแบบร่าง / บันทึกและเผยแพร่ instead of the Status dropdown. */
  const draftFlow = props.mode === "create" || props.initial?.status === "draft";

  /** Publishing with a start date/time still ahead schedules the page; otherwise it goes live now. */
  const publishStatus = (): LandingPageStatus => {
    if (!startDate()) return "published";
    const start = new Date(`${startDate()}T${startTime() || "00:00"}`).getTime();
    return Number.isFinite(start) && start > Date.now() ? "scheduled" : "published";
  };

  const handleSaveDraft = () => submitWith("draft", false);
  const handlePublish = () => submitWith(publishStatus(), true);
  const handleSaveChanges = (e?: Event) => {
    e?.preventDefault();
    if (draftFlow) return handlePublish();
    submitWith(status(), true);
  };

  const landingPageForm = (
    <>
      <FormErrorSummary errors={errors()} labels={labels()} />
      <div class="flex flex-col gap-6">
          <Section title="ข้อมูลพื้นฐาน">
            <Show when={isHomepage()}>
              <StatusBadge tone="info" class="w-fit">หน้าแรก</StatusBadge>
            </Show>
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                label="ชื่อหน้า"
                required
                placeholder="9.9 Beauty Sale"
                value={name()}
                onInput={(e) => handleNameInput(e.currentTarget.value)}
                data-field="name"
                error={errors().name}
                disabled={saving()}
                class="sm:col-span-2"
              />
              <Show when={!isHomepage()}>
              <TextField
                label="Slug"
                required
                placeholder="9-9-beauty-sale"
                value={slug()}
                onInput={(e) => handleSlugInput(e.currentTarget.value)}
                data-field="slug"
                error={errors().slug}
                disabled={saving()}
                class="sm:col-span-2"
              />
                <p class="-mt-2 text-xs text-ink-gray sm:col-span-2">
                  ลิงก์หน้าร้าน <span class="font-medium text-ink">{promotionPageHref({ isHomepage: false, slug: slugify(slug()) || "{slug}" })}</span>
                </p>
              </Show>
              <Show when={isHomepage()}>
                <p class="text-xs text-ink-gray sm:col-span-2">
                  หน้านี้คือหน้าแรกของเว็บไซต์ ลิงก์หน้าร้าน <span class="font-medium text-ink">/</span>
                </p>
              </Show>
              <Show
                when={!draftFlow}
                fallback={
                  <p class="text-xs text-ink-gray sm:col-span-2">
                    {props.initial ? "หน้านี้ยังเป็นแบบร่าง ไม่แสดงบนหน้าร้าน" : "บันทึกแบบร่างไว้ก่อนได้ แล้วกด บันทึกและเผยแพร่ เมื่อข้อมูลครบ ถ้าวันเริ่มยังมาไม่ถึง หน้าจะแสดงเองเมื่อถึงเวลา"}
                  </p>
                }
              >
              <label class="flex flex-col gap-1.5">
                <span class="text-sm font-medium text-ink">สถานะ</span>
                <div class="relative">
                  <select
                    value={status()}
                    disabled={saving()}
                    onChange={(e) => {
                      setStatus(e.currentTarget.value as LandingPageStatus);
                      recheckField("startDate");
                    }}
                    class="h-11 w-full appearance-none rounded-card border border-border bg-surface-card pl-4 pr-9 text-sm text-ink outline-none focus:border-brand-pink disabled:cursor-not-allowed disabled:bg-surface-gray"
                  >
                    {LIVE_STATUS_OPTIONS.map((opt) => (
                      <option value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <ChevronDownIcon class="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-gray" />
                </div>
              </label>
              </Show>
            </div>
          </Section>

          <Section title="กำหนดเวลาเผยแพร่">
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                label="วันที่เริ่มต้น"
                type="date"
                required={!draftFlow && status() === "scheduled"}
                value={startDate()}
                onInput={(e) => {
                  setStartDate(e.currentTarget.value);
                  recheckField("startDate");
                  recheckField("endDate");
                }}
                data-field="startDate"
                error={errors().startDate}
                disabled={saving()}
              />
              <TextField label="เวลาเริ่มต้น" type="time" value={startTime()} onInput={(e) => { setStartTime(e.currentTarget.value); recheckField("endDate"); }} disabled={saving()} />
              <TextField
                label="วันที่สิ้นสุด"
                type="date"
                value={endDate()}
                onInput={(e) => {
                  setEndDate(e.currentTarget.value);
                  recheckField("endDate");
                }}
                data-field="endDate"
                error={errors().endDate}
                disabled={saving()}
              />
              <TextField label="เวลาสิ้นสุด" type="time" value={endTime()} onInput={(e) => { setEndTime(e.currentTarget.value); recheckField("endDate"); }} disabled={saving()} />
            </div>
          </Section>

          <Show when={!isHomepage()}>
          <Section title="แบนเนอร์หลัก" required={sections().length === 0}>
            <div data-field="banner" class="flex flex-col gap-2">
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <BannerUploader allowVideo label="แบนเนอร์เดสก์ท็อป" device="desktop" value={bannerDesktop()} onChange={(v) => { setBannerDesktop(() => v); recheckField("banner"); }} />
                <BannerUploader allowVideo label="แบนเนอร์แท็บเล็ต" device="tablet" value={bannerTablet()} onChange={(v) => { setBannerTablet(() => v); recheckField("banner"); }} />
                <BannerUploader allowVideo label="แบนเนอร์มือถือ" device="mobile" value={bannerMobile()} onChange={(v) => { setBannerMobile(() => v); recheckField("banner"); }} />
              </div>
              <FieldMessage message={errors().banner} />
            </div>
            <TextField
              label="วิดีโอ YouTube (แสดงแทนแบนเนอร์)"
              placeholder="https://www.youtube.com/watch?v=..."
              value={videoUrl()}
              onInput={(e) => {
                setVideoUrl(e.currentTarget.value);
                recheckField("videoUrl");
                recheckField("banner");
              }}
              data-field="videoUrl"
              error={errors().videoUrl ?? (videoUrl().trim() && !isValidYoutubeUrl(videoUrl()) ? "ลิงก์ YouTube ไม่ถูกต้อง" : undefined)}
              disabled={saving()}
            />
            <p class="text-xs text-ink-gray">ถ้าใส่ลิงก์ หน้าเว็บจะแสดงวิดีโอแทนแบนเนอร์ ใช้ได้เฉพาะหน้าที่ยังไม่มีส่วนเนื้อหา</p>
          </Section>

          <Section title="เนื้อหาหน้า">
            <div class="flex flex-col gap-4">
              <TextField
                label="หัวข้อ"
                required={sections().length === 0}
                placeholder="Beauty Sale"
                value={title()}
                onInput={(e) => {
                  setTitle(e.currentTarget.value);
                  recheckField("title");
                }}
                data-field="title"
                error={errors().title}
                disabled={saving()}
              />
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

          <Section title="เลือกสินค้า" required={sections().length === 0}>
            <div data-field="products" class="flex flex-col gap-2">
              <ProductSkuPicker
                reorderable
                value={products()}
                onChange={(next) => {
                  setProducts(next);
                  recheckField("products");
                }}
              />
              <FieldMessage message={errors().products} />
            </div>
            <p class="text-xs text-ink-gray">รายการสินค้านี้ใช้เมื่อยังไม่มีส่วนเนื้อหาด้านล่าง เมื่อเพิ่มส่วนเนื้อหาแล้ว หน้าเว็บจะแสดงผลตามส่วนเนื้อหาแทน</p>
          </Section>
          </Show>

          <Section title="ส่วนเนื้อหาของหน้า">
            <div class="flex flex-col gap-4">
              <p class="text-sm text-ink-gray">
                ทุกส่วนของหน้าอยู่ในรายการนี้ หน้าเว็บแสดงจากบนลงล่างตามลำดับนี้ จัดลำดับด้วยปุ่มขึ้นลงหรือลากวาง ปิดส่วนที่ไม่ต้องการแสดงได้ และแทรกส่วนใหม่ (เช่น แบนเนอร์โปรโมชั่น) ไว้ระหว่างส่วนไหนก็ได้
              </p>
              <div data-field="sections">
                <FieldMessage message={errors().sections} />
              </div>
              <Show when={sections().length > 0}>
                <label class="flex flex-col gap-1.5 sm:max-w-md">
                  <span class="text-sm font-medium text-ink">ตำแหน่งของส่วนที่เพิ่มใหม่</span>
                  <div class="relative">
                    <select
                      value={insertAfterId()}
                      onChange={(e) => setInsertAfterId(e.currentTarget.value)}
                      class="h-11 w-full appearance-none rounded-card border border-border bg-surface-card pl-4 pr-9 text-sm text-ink outline-none focus:border-brand-pink"
                    >
                      <option value="">ต่อท้ายสุดของหน้า</option>
                      <For each={sections()}>
                        {(sec, i) => <option value={sec.id}>ต่อจากส่วนที่ {i() + 1} {sec.name || HOMEPAGE_SECTION_TYPE_META[sec.type].label}</option>}
                      </For>
                    </select>
                    <ChevronDownIcon class="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-gray" />
                  </div>
                </label>
              </Show>
              <div class="flex flex-col gap-2">
                <p class="text-xs font-medium text-ink-gray">ส่วนที่ปรับแต่งเอง</p>
                <div class="flex flex-wrap gap-2">
                  <For each={ADD_SECTION_TYPE_OPTIONS}>
                    {(type) => (
                      <Button type="button" variant="outline" size="sm" onClick={() => addSection(type)}>
                        <PlusIcon class="size-3.5" /> {HOMEPAGE_SECTION_TYPE_META[type].label}
                      </Button>
                    )}
                  </For>
                </div>
              </div>
              <div class="flex flex-col gap-2">
                <p class="text-xs font-medium text-ink-gray">ส่วนสำเร็จรูป (ดึงข้อมูลจากหน้าร้านอัตโนมัติ)</p>
                <div class="flex flex-wrap gap-2">
                  <For each={ADD_BUILTIN_TYPE_OPTIONS}>
                    {(type) => (
                      <Button type="button" variant="outline" size="sm" onClick={() => addSection(type)}>
                        <PlusIcon class="size-3.5" /> {HOMEPAGE_SECTION_TYPE_META[type].label}
                      </Button>
                    )}
                  </For>
                </div>
              </div>

              <Show
                when={sections().length > 0}
                fallback={<EmptyState icon={<LayersIcon />} title="ยังไม่มีส่วนเนื้อหา" description="เพิ่มส่วนเนื้อหาด้วยปุ่มด้านบน" class="bg-surface-gray/60" />}
              >
                <div class="flex flex-col gap-3">
                  <For each={sections()}>
                    {(section, index) => (
                      <div data-field={sectionKey(section.id)}>
                      <HomepageSectionCard
                        section={section}
                        errors={sectionErrors()[section.id]}
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
                      </div>
                    )}
                  </For>
                </div>
              </Show>
            </div>
          </Section>

        </div>

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
        <EyeIcon class="size-4" /> ดูตัวอย่างเต็มหน้า
      </Button>
      {/* Storefront sync — a page `PromotionPageView` shows as a listing (flat, or one product section) previews as that listing, YouTube video included; everything else through the section renderer. */}
      <HomepageSectionsPreview
        sections={effectiveSections()}
        homepage={isHomepage()}
        content={
          !isHomepage() && isListingModePage(sections()) ? (
            <PromotionPagePreviewBody
              name={name()}
              title={title()}
              description={description()}
              banners={{ desktop: bannerDesktop(), tablet: bannerTablet(), mobile: bannerMobile() }}
              videoUrl={videoUrl()}
              products={products()}
              sections={sections()}
            />
          ) : undefined
        }
      />
      <Show when={startDate() && endDate()}>
        <p class="text-xs text-ink-gray">
          ช่วงเวลาแสดง {formatMarketingDateTime(startDate(), startTime())} - {formatMarketingDateTime(endDate(), endTime())}
        </p>
      </Show>
      <Show when={startDate() && endDate() && !dateRangeValid()}>
        <p class="text-xs text-system-red">วันสิ้นสุดต้องอยู่หลังวันเริ่ม</p>
      </Show>
    </div>
  );

  return (
    <form onSubmit={handleSaveChanges} noValidate class="flex flex-col gap-6">
      <AdminFormPreviewLayout form={landingPageForm} preview={landingPagePreview} />

      <AdminFloatingBar>
        <DraftPublishActions
          draft={draftFlow}
          saving={saving()}
          onCancel={props.onCancel}
          onSaveDraft={handleSaveDraft}
          onPublish={handlePublish}
          onSave={() => handleSaveChanges()}
        />
      </AdminFloatingBar>
      <div class="h-16" aria-hidden="true" />

      <ConfirmDialog
        open={confirmDeleteSection() !== null}
        onOpenChange={(open) => !open && setConfirmDeleteSection(null)}
        title="ลบส่วนเนื้อหา?"
        description={`คุณต้องการลบ "${confirmDeleteSection()?.name ?? ""}" ออกจากหน้านี้หรือไม่? มีผลเมื่อกดบันทึก`}
        confirmLabel="ลบส่วนเนื้อหา"
        tone="danger"
        onConfirm={confirmDeleteSectionAction}
      />
    </form>
  );
}

function FieldMessage(props: { message?: string }) {
  return (
    <Show when={props.message}>
      <p role="alert" class="text-sm text-system-red">{props.message}</p>
    </Show>
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
