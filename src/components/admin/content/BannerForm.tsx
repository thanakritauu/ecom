import { createMemo, createSignal, Show } from "solid-js";
import { TextField } from "~/components/shared/TextField";
import { Button } from "~/components/shared/Button";
import { AdminFloatingBar } from "~/components/admin/AdminFloatingBar";
import { AdminFormPreviewLayout } from "~/components/admin/AdminFormPreviewLayout";
import { ChevronDownIcon } from "~/components/admin/icons";
import { BannerUploader } from "./BannerUploader";
import { DestinationSelector } from "./DestinationSelector";
import { isValidDateRange } from "~/lib/adminMarketing";
import { validateBannerPublish, BANNER_PLACEMENT_META, type Banner, type BannerFormValues, type BannerPlacement, type BannerStatus } from "~/lib/adminBanners";
import { emptyBanners, type HomepageDestination, type HomepageSection } from "~/lib/adminHomepage";
import { HomepageSections } from "~/components/home/HomepageSections";
import { AdminHeroSlide } from "~/components/home/HeroBanner";

const PREVIEW_DEVICES: { value: "desktop" | "tablet" | "mobile"; label: string }[] = [
  { value: "desktop", label: "Desktop" },
  { value: "tablet", label: "Tablet" },
  { value: "mobile", label: "Mobile" },
];

const PLACEMENT_OPTIONS: { value: BannerPlacement; label: string }[] = (
  Object.keys(BANNER_PLACEMENT_META) as BannerPlacement[]
).map((value) => ({ value, label: BANNER_PLACEMENT_META[value].label }));

const CREATE_STATUS_OPTIONS: { value: BannerStatus; label: string }[] = [
  { value: "draft", label: "แบบร่าง" },
  { value: "scheduled", label: "ตั้งเวลาไว้" },
];

const EDIT_STATUS_OPTIONS: { value: BannerStatus; label: string }[] = [
  { value: "draft", label: "แบบร่าง" },
  { value: "scheduled", label: "ตั้งเวลาไว้" },
  { value: "published", label: "เผยแพร่แล้ว" },
  { value: "unpublished", label: "ยกเลิกการเผยแพร่" },
  { value: "expired", label: "หมดอายุ" },
];

/**
 * One Create/Edit form shared by `/new` and `/:id/edit`, same "one form, two
 * routes" shape `PromotionPageForm` already established. Create's Floating
 * Bar has two real actions (Save Draft / Publish), so the Status dropdown
 * there only offers Draft/Scheduled — Published is reached solely through
 * the explicit "เผยแพร่" button, which always runs the full publish
 * validation regardless of the dropdown. Edit's single
 * "บันทึกการเปลี่ยนแปลง" button instead saves whatever status the dropdown
 * currently shows, running the same full validation only when that's
 * Published. No product picker / navigation section here — a Banner has
 * neither.
 */
export function BannerForm(props: {
  initial?: Banner;
  mode: "create" | "edit";
  onSubmit: (values: BannerFormValues) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = createSignal(props.initial?.name ?? "");
  const [placement, setPlacement] = createSignal<BannerPlacement>(props.initial?.placement ?? "homepage_hero");
  const [status, setStatus] = createSignal<BannerStatus>(props.initial?.status ?? "draft");
  const [bannerDesktop, setBannerDesktop] = createSignal(props.initial?.banners.desktop ?? "");
  const [bannerTablet, setBannerTablet] = createSignal(props.initial?.banners.tablet ?? "");
  const [bannerMobile, setBannerMobile] = createSignal(props.initial?.banners.mobile ?? "");
  const [destination, setDestination] = createSignal<HomepageDestination>(props.initial?.destination ?? { type: "none" });
  const [startDate, setStartDate] = createSignal(props.initial?.startDate ?? "");
  const [startTime, setStartTime] = createSignal(props.initial?.startTime ?? "00:00");
  const [endDate, setEndDate] = createSignal(props.initial?.endDate ?? "");
  const [endTime, setEndTime] = createSignal(props.initial?.endTime ?? "23:59");

  const [errors, setErrors] = createSignal<Record<string, string>>({});
  const [publishErrors, setPublishErrors] = createSignal<string[]>([]);
  const [saving, setSaving] = createSignal(false);
  const [submitError, setSubmitError] = createSignal<string>();
  const [previewDevice, setPreviewDevice] = createSignal<"desktop" | "tablet" | "mobile">("desktop");

  const dateRangeValid = createMemo(() => isValidDateRange(startDate(), startTime(), endDate(), endTime()));

  /**
   * REAL-TIME LIVE PREVIEW SYSTEM §9/§12/§13 — Preview Adapter: reshapes
   * this form's fields into a `HomepageSection` so the REAL renderer for
   * this Banner's placement can render it — `AdminHeroSlide` (the real
   * Hero Banner component) for `homepage_hero`, otherwise the real
   * `HomepageSections`'s Promotion Banner block, the same one every other
   * `promotion_banner` section on the real homepage renders through. The
   * device selector works by feeding the chosen device's own uploaded image
   * into every slot — `BannerPicture`'s own `<source media>` responsive
   * logic is untouched, this only chooses which real image reaches it.
   */
  const previewDeviceUrl = createMemo(() => {
    if (previewDevice() === "tablet") return bannerTablet();
    if (previewDevice() === "mobile") return bannerMobile();
    return bannerDesktop();
  });
  const previewSection = createMemo<HomepageSection>(() => {
    const url = previewDeviceUrl();
    return {
      id: "banner-preview",
      type: placement() === "homepage_hero" ? "hero" : "promotion_banner",
      name: name() || "Banner",
      enabled: true,
      eyebrow: "",
      title: "",
      description: "",
      banners: url ? { desktop: url, tablet: url, mobile: url } : emptyBanners(),
      assets: [],
      cta: { label: "", destination: destination() },
      contentLayout: "image-text",
      productSource: "manual",
      products: [],
      collectionId: "",
      categoryId: "",
      campaignId: "",
      createdAt: "",
      updatedAt: "",
    };
  });

  const buildValues = (targetStatus: BannerStatus): BannerFormValues => ({
    name: name().trim(),
    placement: placement(),
    status: targetStatus,
    banners: { desktop: bannerDesktop(), tablet: bannerTablet(), mobile: bannerMobile() },
    destination: destination(),
    startDate: startDate(),
    startTime: startTime(),
    endDate: endDate(),
    endTime: endTime(),
  });

  const validateLight = (): Record<string, string> => {
    const next: Record<string, string> = {};
    if (!name().trim()) next.name = "กรุณากรอกชื่อ Banner";
    if (startDate() && endDate() && !dateRangeValid()) next.endDate = "วันสิ้นสุดต้องอยู่หลังวันเริ่ม";
    return next;
  };

  const submitWith = async (targetStatus: BannerStatus, requireFullValidation: boolean) => {
    const lightErrors = validateLight();
    setErrors(lightErrors);
    if (Object.keys(lightErrors).length > 0) return;

    const values = buildValues(targetStatus);
    if (requireFullValidation) {
      const pubErrors = validateBannerPublish(values);
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

  const bannerFieldsForm = (
    <>
      <div class="flex flex-col gap-6">
        <Section title="01 · Basic Information">
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                label="Banner Name"
                required
                placeholder="Hero Banner หน้าแรก"
                value={name()}
                onInput={(e) => setName(e.currentTarget.value)}
                error={errors().name}
                disabled={saving()}
                class="sm:col-span-2"
              />
              <label class="flex flex-col gap-1.5">
                <span class="text-sm font-medium text-ink">Placement</span>
                <div class="relative">
                  <select
                    value={placement()}
                    disabled={saving()}
                    onChange={(e) => setPlacement(e.currentTarget.value as BannerPlacement)}
                    class="h-11 w-full appearance-none rounded-card border border-border bg-surface-card pl-4 pr-9 text-sm text-ink outline-none focus:border-brand-pink disabled:cursor-not-allowed disabled:bg-surface-gray"
                  >
                    {PLACEMENT_OPTIONS.map((opt) => (
                      <option value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <ChevronDownIcon class="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-gray" />
                </div>
              </label>
              <label class="flex flex-col gap-1.5">
                <span class="text-sm font-medium text-ink">Status</span>
                <div class="relative">
                  <select
                    value={status()}
                    disabled={saving()}
                    onChange={(e) => setStatus(e.currentTarget.value as BannerStatus)}
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

          <Section title="02 · Device Images">
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <BannerUploader label="Desktop Banner" hint="แนะนำ 1920×840px" value={bannerDesktop()} onChange={setBannerDesktop} />
              <BannerUploader label="Tablet Banner" hint="แนะนำ 1024×600px" value={bannerTablet()} onChange={setBannerTablet} />
              <BannerUploader label="Mobile Banner" hint="แนะนำ 750×960px" value={bannerMobile()} onChange={setBannerMobile} />
            </div>
          </Section>

          <Section title="03 · Banner Link">
            <DestinationSelector value={destination()} onChange={setDestination} />
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

  const bannerPreview = (
    <div class="flex flex-col gap-3 p-4 sm:p-5">
      <div class="flex items-center gap-1.5 rounded-pill bg-surface-gray/60 p-1 text-xs font-medium">
        {PREVIEW_DEVICES.map((d) => (
          <button
            type="button"
            onClick={() => setPreviewDevice(d.value)}
            class="flex-1 rounded-pill px-2 py-1.5 transition-colors duration-150"
            classList={{ "bg-surface-card text-ink shadow-card": previewDevice() === d.value, "text-ink-gray": previewDevice() !== d.value }}
          >
            {d.label}
          </button>
        ))}
      </div>

      <Show
        when={previewDeviceUrl()}
        fallback={<p class="py-6 text-center text-sm text-ink-gray">ยังไม่ได้อัปโหลดรูปสำหรับ {PREVIEW_DEVICES.find((d) => d.value === previewDevice())?.label}</p>}
      >
        <div class="overflow-hidden rounded-media border border-border">
          <Show when={placement() === "homepage_hero"} fallback={<HomepageSections sections={[previewSection()]} />}>
            <AdminHeroSlide section={previewSection()} />
          </Show>
        </div>
      </Show>

      <Show when={destination().type === "none"}>
        <p class="text-xs text-ink-gray">ยังไม่ได้กำหนดปลายทางของ Banner นี้</p>
      </Show>

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
      <AdminFormPreviewLayout form={bannerFieldsForm} preview={bannerPreview} />

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
