import { createMemo, createSignal, Show } from "solid-js";
import { TextField } from "~/components/shared/TextField";
import { Button } from "~/components/shared/Button";
import { AdminFloatingBar } from "~/components/admin/AdminFloatingBar";
import { AdminFormPreviewLayout } from "~/components/admin/AdminFormPreviewLayout";
import { ChevronDownIcon } from "~/components/admin/icons";
import { BannerUploader } from "~/components/admin/content/BannerUploader";
import { PromotionPageProductPicker } from "~/components/admin/content/PromotionPageProductPicker";
import { DestinationSelector } from "~/components/admin/content/DestinationSelector";
import { HomepageSections } from "~/components/home/HomepageSections";
import { isValidDateRange } from "~/lib/adminMarketing";
import { slugify, validateCampaignPublish, type Campaign, type CampaignFormValues, type CampaignStatus } from "~/lib/adminCampaigns";
import type { HomepageDestination, HomepageSection } from "~/lib/adminHomepage";

const CREATE_STATUS_OPTIONS: { value: CampaignStatus; label: string }[] = [
  { value: "draft", label: "แบบร่าง" },
  { value: "scheduled", label: "ตั้งเวลาไว้" },
];

const EDIT_STATUS_OPTIONS: { value: CampaignStatus; label: string }[] = [
  { value: "draft", label: "แบบร่าง" },
  { value: "scheduled", label: "ตั้งเวลาไว้" },
  { value: "published", label: "เผยแพร่แล้ว" },
  { value: "unpublished", label: "ยกเลิกการเผยแพร่" },
];

/**
 * Create/Edit shared form — same shape as `PromotionPageForm`, minus the
 * Frontend Top Navigation section (Campaigns don't have one). Create mode's
 * Floating Bar has two real actions ("บันทึกแบบร่าง"/"เผยแพร่"), so the
 * Status dropdown there only offers Draft/Scheduled — Published is reached
 * solely through the explicit "เผยแพร่" button, which always runs the full
 * publish validation regardless of the dropdown. Edit mode's single
 * "บันทึกการเปลี่ยนแปลง" button instead saves whatever status the dropdown
 * currently shows, running the same full validation only when that's
 * Published.
 */
export function CampaignForm(props: {
  initial?: Campaign;
  mode: "create" | "edit";
  isSlugTaken: (slug: string) => boolean;
  onSubmit: (values: CampaignFormValues) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = createSignal(props.initial?.name ?? "");
  const [slug, setSlugRaw] = createSignal(props.initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = createSignal(!!props.initial);
  const [status, setStatus] = createSignal<CampaignStatus>(props.initial?.status ?? "draft");
  const [bannerDesktop, setBannerDesktop] = createSignal(props.initial?.banners.desktop ?? "");
  const [bannerTablet, setBannerTablet] = createSignal(props.initial?.banners.tablet ?? "");
  const [bannerMobile, setBannerMobile] = createSignal(props.initial?.banners.mobile ?? "");
  const [title, setTitle] = createSignal(props.initial?.title ?? "");
  const [description, setDescription] = createSignal(props.initial?.description ?? "");
  const [products, setProducts] = createSignal(props.initial?.products ?? []);
  const [ctaLabel, setCtaLabel] = createSignal(props.initial?.cta.label ?? "");
  const [ctaDestination, setCtaDestination] = createSignal<HomepageDestination>(props.initial?.cta.destination ?? { type: "none" });
  const [startDate, setStartDate] = createSignal(props.initial?.startDate ?? "");
  const [startTime, setStartTime] = createSignal(props.initial?.startTime ?? "00:00");
  const [endDate, setEndDate] = createSignal(props.initial?.endDate ?? "");
  const [endTime, setEndTime] = createSignal(props.initial?.endTime ?? "23:59");

  const [errors, setErrors] = createSignal<Record<string, string>>({});
  const [publishErrors, setPublishErrors] = createSignal<string[]>([]);
  const [saving, setSaving] = createSignal(false);
  const [submitError, setSubmitError] = createSignal<string>();

  const dateRangeValid = createMemo(() => isValidDateRange(startDate(), startTime(), endDate(), endTime()));

  const handleNameInput = (value: string) => {
    setName(value);
    if (!slugTouched()) setSlugRaw(slugify(value));
  };
  const handleSlugInput = (value: string) => {
    setSlugTouched(true);
    setSlugRaw(value);
  };

  const buildValues = (targetStatus: CampaignStatus): CampaignFormValues => ({
    name: name().trim(),
    slug: slugify(slug()),
    status: targetStatus,
    banners: { desktop: bannerDesktop(), tablet: bannerTablet(), mobile: bannerMobile() },
    title: title().trim(),
    description: description().trim(),
    products: products(),
    cta: { label: ctaLabel().trim(), destination: ctaDestination() },
    startDate: startDate(),
    startTime: startTime(),
    endDate: endDate(),
    endTime: endTime(),
  });

  const validateLight = (): Record<string, string> => {
    const next: Record<string, string> = {};
    if (!name().trim()) next.name = "กรุณากรอกชื่อ Campaign";
    const cleanSlug = slugify(slug());
    if (!cleanSlug) next.slug = "กรุณากรอก Slug";
    else if (props.isSlugTaken(cleanSlug)) next.slug = "Slug นี้ถูกใช้ไปแล้ว กรุณาเลือก Slug อื่น";
    if (startDate() && endDate() && !dateRangeValid()) next.endDate = "วันสิ้นสุดต้องอยู่หลังวันเริ่ม";
    return next;
  };

  const submitWith = async (targetStatus: CampaignStatus, requireFullValidation: boolean) => {
    const lightErrors = validateLight();
    setErrors(lightErrors);
    if (Object.keys(lightErrors).length > 0) return;

    const values = buildValues(targetStatus);
    if (requireFullValidation) {
      const pubErrors = validateCampaignPublish(values);
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

  /**
   * REAL-TIME LIVE PREVIEW SYSTEM §12/§13 — Preview Adapter: reshapes this
   * form's fields into a `campaign`-type `HomepageSection` with `campaignId`
   * left unlinked, so `CampaignSectionBlock` (the real renderer, via the
   * real `HomepageSections`) uses the inline banners/title/description/cta/
   * products fields directly — the exact same shape the real homepage's own
   * "9.9 Beauty Sale" Campaign section already uses today.
   */
  const previewSection = createMemo<HomepageSection>(() => ({
    id: "campaign-preview",
    type: "campaign",
    name: name() || "Campaign",
    enabled: true,
    eyebrow: "",
    title: title(),
    description: description(),
    banners: { desktop: bannerDesktop(), tablet: bannerTablet(), mobile: bannerMobile() },
    assets: [],
    cta: { label: ctaLabel(), destination: ctaDestination() },
    contentLayout: "image-text",
    productSource: "manual",
    products: products(),
    collectionId: "",
    categoryId: "",
    campaignId: "",
    createdAt: "",
    updatedAt: "",
  }));

  const campaignForm = (
    <>
      <div class="flex flex-col gap-6">
          <Section title="01 · Basic Information">
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                label="Campaign Name"
                required
                placeholder="Charmiss Glow Week"
                value={name()}
                onInput={(e) => handleNameInput(e.currentTarget.value)}
                error={errors().name}
                disabled={saving()}
                class="sm:col-span-2"
              />
              <TextField
                label="Slug"
                required
                placeholder="charmiss-glow-week"
                value={slug()}
                onInput={(e) => handleSlugInput(e.currentTarget.value)}
                error={errors().slug}
                disabled={saving()}
                class="sm:col-span-2"
              />
              <label class="flex flex-col gap-1.5">
                <span class="text-sm font-medium text-ink">Status</span>
                <div class="relative">
                  <select
                    value={status()}
                    disabled={saving()}
                    onChange={(e) => setStatus(e.currentTarget.value as CampaignStatus)}
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

          <Section title="03 · Content">
            <div class="flex flex-col gap-4">
              <TextField label="Title" placeholder="Glow Week" value={title()} onInput={(e) => setTitle(e.currentTarget.value)} disabled={saving()} />
              <label class="flex flex-col gap-1.5">
                <span class="text-sm font-medium text-ink">Description</span>
                <textarea
                  value={description()}
                  disabled={saving()}
                  placeholder="รวมไอเทมบำรุงผิวเปล่งประกาย ลดสูงสุด 40%"
                  onInput={(e) => setDescription(e.currentTarget.value)}
                  rows={3}
                  class="rounded-card border border-border bg-surface-card px-4 py-3 text-sm text-ink outline-none focus:border-brand-pink disabled:cursor-not-allowed disabled:bg-surface-gray"
                />
              </label>
            </div>
          </Section>

          <Section title="04 · Products">
            <PromotionPageProductPicker selected={products()} onChange={setProducts} />
          </Section>

          <Section title="05 · Call to Action">
            <div class="flex flex-col gap-4">
              <TextField label="CTA Label" placeholder="ช้อปเลย" value={ctaLabel()} onInput={(e) => setCtaLabel(e.currentTarget.value)} disabled={saving()} />
              <DestinationSelector value={ctaDestination()} onChange={setCtaDestination} />
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

  const campaignPreview = (
    <div class="flex flex-col gap-3 p-4 sm:p-5">
      <p class="text-xs text-ink-gray">Campaign คือชุดเนื้อหา (Banner + ข้อความ + สินค้า) ที่นำไปแสดงบน Homepage ได้ในภายหลัง</p>
      <div class="overflow-hidden rounded-media border border-border">
        <HomepageSections sections={[previewSection()]} />
      </div>
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
      <AdminFormPreviewLayout form={campaignForm} preview={campaignPreview} />

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
