import { Index, onMount, Show } from "solid-js";
import { TextField } from "~/components/shared/TextField";
import { MediaUploader } from "~/components/admin/MediaUploader";
import { SingleImageUploader } from "~/components/admin/SingleImageUploader";
import { ProductSkuPicker } from "~/components/admin/ProductSkuPicker";
import { SelectField } from "~/components/admin/SelectField";
import { Toggle } from "~/components/admin/Toggle";
import { ChoiceRadio } from "~/components/admin/marketing/ChoiceRadio";
import { ChevronDownIcon, PlusIcon, TrashIcon, WarningTriangleIcon } from "~/components/admin/icons";
import { DestinationSelector, destinationError } from "./DestinationSelector";
import { isVideoMedia, mediaErrors, mediaSrc, hasMedia, type MediaValue } from "~/lib/media";
import type { FormErrors } from "~/lib/adminFormValidation";
import {
  COUNTDOWN_ENDED_TEXT_DEFAULT,
  MAX_SLIDER_SLIDES,
  PRODUCT_GRID_MAX_ROWS,
  SLIDER_INTERVAL_RANGE,
  countdownEndsAtMs,
  countdownSettings,
  dividerSettings,
  emptySectionMediaItem,
  gridSettings,
  productGridSettings,
  sameAspect,
  sliderSettings,
  type BannerGridColumns,
  type BannerGridSettings,
  type BannerSliderSettings,
  type CountdownAfterEnd,
  type CountdownBackground,
  type CountdownBannerSettings,
  type DividerSettings,
  type DividerSize,
  type HomepageSection,
  type ProductGridColumns,
  type ProductGridLayout,
  type ProductGridSettings,
  type SectionMediaItem,
} from "~/lib/pageSections";

/**
 * Admin settings for the page-builder section types. Mounted by
 * `HomepageSectionForm` for those types; each block edits only its own
 * settings object (plus `products` / `title` / `cta` where the type reuses
 * the shared fields).
 */

type Patch = (next: Partial<HomepageSection>) => void;

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

/**
 * Field errors of the page-builder types, keyed `slides`, `slideInterval`,
 * `tiles`, `countdownImage`, `countdownEndsAt`, `products`, `viewAll`.
 * `requireFutureEnd` (default true): a countdown whose end time already
 * passed can't be published.
 */
export function blockSectionFieldErrors(section: HomepageSection, opts: { requireFutureEnd?: boolean; now?: number } = {}): FormErrors {
  const e: FormErrors = {};
  switch (section.type) {
    case "banner_slider": {
      const s = sliderSettings(section);
      const messages: string[] = [];
      if (!s.slides.some((slide) => hasMedia(slide.media))) messages.push("กรุณาเพิ่มสไลด์ที่มีรูปหรือวิดีโออย่างน้อย 1 สไลด์");
      s.slides.forEach((slide, i) => {
        const label = `สไลด์ที่ ${i + 1}`;
        if (!hasMedia(slide.media)) {
          if (s.slides.length > 1) messages.push(`${label} ยังไม่มีรูปหรือวิดีโอ`);
          return;
        }
        messages.push(...mediaErrors(slide.media, label));
        const dest = destinationError(slide.destination);
        if (dest) messages.push(`${label} ${dest}`);
      });
      if (messages.length > 0) e.slides = messages.join(", ");
      if (s.autoplay && (s.intervalSeconds < SLIDER_INTERVAL_RANGE.min || s.intervalSeconds > SLIDER_INTERVAL_RANGE.max)) {
        e.slideInterval = `ตั้งเวลาได้ ${SLIDER_INTERVAL_RANGE.min}-${SLIDER_INTERVAL_RANGE.max} วินาที`;
      }
      break;
    }
    case "banner_grid": {
      const g = gridSettings(section);
      const messages: string[] = [];
      g.tiles.slice(0, g.columns).forEach((tile, i) => {
        const label = `รูปที่ ${i + 1}`;
        if (!hasMedia(tile.media)) messages.push(`${label} ยังไม่มีรูป`);
        const dest = destinationError(tile.destination);
        if (dest) messages.push(`${label} ${dest}`);
      });
      if (messages.length > 0) e.tiles = messages.join(", ");
      break;
    }
    case "countdown_banner": {
      const c = countdownSettings(section);
      if (c.background === "image" && !c.image) e.countdownImage = "กรุณาอัปโหลดรูปพื้นหลัง หรือเลือกพื้นสีแบรนด์";
      const ends = countdownEndsAtMs(c.endsAt);
      if (!c.endsAt || !Number.isFinite(ends)) e.countdownEndsAt = "กรุณาเลือกวันและเวลาสิ้นสุด";
      else if ((opts.requireFutureEnd ?? true) && ends <= (opts.now ?? Date.now())) e.countdownEndsAt = "เวลาสิ้นสุดผ่านไปแล้ว กรุณาเลือกเวลาในอนาคต";
      break;
    }
    case "product_grid": {
      if (section.products.length === 0) e.products = "กรุณาเลือกสินค้าอย่างน้อย 1 รายการ";
      const dest = destinationError(section.cta.destination);
      if (dest) e.viewAll = dest;
      break;
    }
  }
  return e;
}

/* ------------------------------------------------------------------ */
/* Shared bits                                                          */
/* ------------------------------------------------------------------ */

/** Width / height of an image or video file (0 when it can't be read). Browser only. */
export function measureMediaAspect(media: MediaValue): Promise<number> {
  const src = mediaSrc(media);
  if (!src || typeof window === "undefined") return Promise.resolve(0);
  return new Promise((resolve) => {
    if (isVideoMedia(media)) {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.muted = true;
      video.onloadedmetadata = () => resolve(video.videoWidth && video.videoHeight ? video.videoWidth / video.videoHeight : 0);
      video.onerror = () => resolve(0);
      video.src = src;
    } else {
      const img = new Image();
      img.onload = () => resolve(img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 0);
      img.onerror = () => resolve(0);
      img.src = src;
    }
  });
}

function FieldMessage(props: { message?: string }) {
  return (
    <Show when={props.message}>
      <p role="alert" class="text-sm text-system-red">
        {props.message}
      </p>
    </Show>
  );
}

function SettingToggle(props: { title: string; hint?: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <div class="flex items-center justify-between gap-4">
      <div class="min-w-0">
        <p class="text-sm font-medium text-ink">{props.title}</p>
        <Show when={props.hint}>
          <p class="text-xs text-ink-gray">{props.hint}</p>
        </Show>
      </div>
      <Toggle checked={props.checked} onChange={props.onChange} onLabel="" offLabel="" ariaLabel={props.title} />
    </div>
  );
}

const ratioLabel = (aspect: number) => (aspect ? `${Math.round(aspect * 100) / 100}:1` : "-");

/**
 * Picture/video + alt + link items (slides, grid tiles). Each file's aspect
 * ratio is measured as soon as it's chosen and stored on the item, so the
 * storefront can reserve the first item's height up front. `fixed`: the
 * item count can't change (grid tiles), only their order.
 */
function MediaItemsEditor(props: {
  items: SectionMediaItem[];
  onChange: (items: SectionMediaItem[]) => void;
  noun: string;
  allowVideo: boolean;
  hint: string;
  fixed?: boolean;
  max?: number;
}) {
  const updateItem = (id: string, next: Partial<SectionMediaItem>) => props.onChange(props.items.map((it) => (it.id === id ? { ...it, ...next } : it)));

  const measure = (id: string, media: MediaValue) => {
    void measureMediaAspect(media).then((aspect) => {
      // The admin may have swapped the file again meanwhile: only apply to the same file.
      const current = props.items.find((it) => it.id === id);
      if (aspect && current && mediaSrc(current.media) === mediaSrc(media)) updateItem(id, { aspect });
    });
  };

  const setMedia = (item: SectionMediaItem, media: MediaValue) => {
    const sameFile = mediaSrc(media) === mediaSrc(item.media);
    updateItem(item.id, { media, aspect: sameFile ? item.aspect : 0 });
    if (!sameFile && hasMedia(media)) measure(item.id, media);
  };

  // Items saved without a ratio (older data): fill it in once.
  onMount(() => {
    for (const it of props.items) if (hasMedia(it.media) && !it.aspect) measure(it.id, it.media);
  });

  const move = (index: number, dir: -1 | 1) => {
    const next = [...props.items];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    props.onChange(next);
  };

  const mismatched = () => {
    const filled = props.items.map((it, i) => ({ it, n: i + 1 })).filter(({ it }) => hasMedia(it.media) && it.aspect);
    const first = filled[0];
    if (!first) return [];
    return filled.slice(1).filter(({ it }) => !sameAspect(first.it.aspect, it.aspect));
  };

  return (
    <div class="flex flex-col gap-3">
      <p class="text-xs text-ink-gray">{props.hint}</p>
      <Show when={mismatched().length > 0}>
        <div class="flex items-start gap-2 rounded-card bg-warning-soft px-3 py-2 text-sm text-ink">
          <WarningTriangleIcon class="mt-0.5 size-4 shrink-0" />
          <p>
            {props.noun}ที่ {mismatched().map((m) => m.n).join(", ")} มีสัดส่วนไม่เท่ากับ{props.noun}แรก หน้าร้านจะใช้ความสูงตาม{props.noun}แรก และย่อ{props.noun}อื่นให้พอดีโดยมีพื้นสีเทาเติมด้านข้าง
          </p>
        </div>
      </Show>
      <Index each={props.items}>
        {(item, i) => (
          <div class="flex flex-col gap-3 rounded-card border border-border bg-surface-card p-3">
            <div class="flex items-center gap-2">
              <p class="text-sm font-medium text-ink">
                {props.noun}ที่ {i + 1}
              </p>
              <Show when={hasMedia(item().media) && item().aspect}>
                <span class="text-xs text-ink-gray">สัดส่วน {ratioLabel(item().aspect)}</span>
              </Show>
              <div class="ml-auto flex items-center gap-1">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`ย้าย${props.noun}ที่ ${i + 1} ขึ้น`} class="flex size-9 items-center justify-center rounded-pill text-ink-gray hover:bg-surface-pink disabled:cursor-not-allowed disabled:opacity-30">
                  <ChevronDownIcon class="size-4 rotate-180" />
                </button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === props.items.length - 1} aria-label={`ย้าย${props.noun}ที่ ${i + 1} ลง`} class="flex size-9 items-center justify-center rounded-pill text-ink-gray hover:bg-surface-pink disabled:cursor-not-allowed disabled:opacity-30">
                  <ChevronDownIcon class="size-4" />
                </button>
                <Show when={!props.fixed}>
                  <button
                    type="button"
                    onClick={() => props.onChange(props.items.filter((it) => it.id !== item().id))}
                    disabled={props.items.length <= 1}
                    aria-label={`ลบ${props.noun}ที่ ${i + 1}`}
                    class="flex size-9 items-center justify-center rounded-pill text-ink-gray hover:bg-danger-soft hover:text-danger-strong disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <TrashIcon class="size-4" />
                  </button>
                </Show>
              </div>
            </div>
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,240px)_minmax(0,1fr)]">
              <MediaUploader
                value={item().media}
                onChange={(media) => setMedia(item(), media)}
                allowVideo={props.allowVideo}
                hideHints
                aspectClass="aspect-[4/3]"
                emptyLabel={props.allowVideo ? "เลือกรูปหรือวิดีโอ" : "เลือกรูปภาพ"}
              />
              <div class="flex min-w-0 flex-col gap-3">
                <TextField label="ข้อความแทนรูป (alt)" placeholder="อธิบายสิ่งที่อยู่ในรูป" value={item().alt} onInput={(e) => updateItem(item().id, { alt: e.currentTarget.value })} />
                <DestinationSelector value={item().destination} onChange={(destination) => updateItem(item().id, { destination })} error={hasMedia(item().media) ? destinationError(item().destination) : undefined} />
              </div>
            </div>
          </div>
        )}
      </Index>
      <Show when={!props.fixed && props.items.length < (props.max ?? Infinity)}>
        <button
          type="button"
          onClick={() => props.onChange([...props.items, emptySectionMediaItem()])}
          class="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-pill border border-dashed border-border px-4 text-sm font-medium text-ink hover:border-brand-pink hover:text-brand-pink"
        >
          <PlusIcon class="size-4" /> เพิ่ม{props.noun}
        </button>
      </Show>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Per-type settings                                                    */
/* ------------------------------------------------------------------ */

export function BannerSliderFields(props: { section: HomepageSection; patch: Patch; errors?: FormErrors }) {
  const s = () => sliderSettings(props.section);
  const set = (next: Partial<BannerSliderSettings>) => props.patch({ slider: { ...s(), ...next } });
  return (
    <div class="flex flex-col gap-4">
      <div class="flex flex-col gap-2">
        <p class="text-sm font-semibold text-ink">
          สไลด์ <span class="text-system-red" aria-hidden="true">*</span>
        </p>
        <MediaItemsEditor
          noun="สไลด์"
          allowVideo
          max={MAX_SLIDER_SLIDES}
          items={s().slides}
          onChange={(slides) => set({ slides })}
          hint={`อัปโหลดไฟล์เดียวใช้ทุกหน้าจอ รูปแสดงเต็มความกว้างและไม่ถูกตัด ความสูงของแบนเนอร์ตามสัดส่วนของสไลด์แรก แนะนำกว้าง 1920px และใช้ขนาดเดียวกันทุกสไลด์ ใส่ได้สูงสุด ${MAX_SLIDER_SLIDES} สไลด์`}
        />
        <FieldMessage message={props.errors?.slides} />
      </div>
      <div class="flex flex-col gap-3 rounded-card bg-surface-gray/60 p-3">
        <p class="text-sm font-semibold text-ink">การแสดงผล</p>
        <SettingToggle title="เลื่อนอัตโนมัติ" hint="ไม่เลื่อนเองสำหรับลูกค้าที่ตั้งเครื่องให้ลดการเคลื่อนไหว" checked={s().autoplay} onChange={(autoplay) => set({ autoplay })} />
        <Show when={s().autoplay}>
          <TextField
            label="เปลี่ยนสไลด์ทุก (วินาที)"
            type="number"
            inputmode="numeric"
            min={SLIDER_INTERVAL_RANGE.min}
            max={SLIDER_INTERVAL_RANGE.max}
            value={s().intervalSeconds}
            onInput={(e) => set({ intervalSeconds: Number(e.currentTarget.value) || 0 })}
            error={props.errors?.slideInterval}
            class="sm:max-w-[160px]"
          />
        </Show>
        <SettingToggle title="แสดงจุดบอกตำแหน่ง" checked={s().showDots} onChange={(showDots) => set({ showDots })} />
        <SettingToggle title="แสดงปุ่มลูกศร" hint="บนมือถือปัดเลื่อนได้เสมอ" checked={s().showArrows} onChange={(showArrows) => set({ showArrows })} />
      </div>
    </div>
  );
}

export function BannerGridFields(props: { section: HomepageSection; patch: Patch; errors?: FormErrors }) {
  const g = () => gridSettings(props.section);
  const set = (next: Partial<BannerGridSettings>) => props.patch({ grid: { ...g(), ...next } });
  // Only the visible tiles are edited; the hidden third tile is kept for switching back to 3 columns.
  const setVisible = (visible: SectionMediaItem[]) => set({ tiles: [...visible, ...g().tiles.slice(g().columns)] });
  return (
    <div class="flex flex-col gap-4">
      <div class="flex flex-col gap-2">
        <p class="text-sm font-medium text-ink">จำนวนรูปต่อแถว</p>
        <ChoiceRadio<"2" | "3">
          name={`grid-columns-${props.section.id}`}
          value={String(g().columns) as "2" | "3"}
          onChange={(v) => set({ columns: Number(v) as BannerGridColumns })}
          options={[
            { value: "2", label: "2 รูป", hint: "มือถือยังเรียง 2 รูปในแถวเดียว" },
            { value: "3", label: "3 รูป", hint: "มือถือเปลี่ยนเป็นแถวปัดเลื่อนด้านข้าง" },
          ]}
        />
      </div>
      <div class="flex flex-col gap-2">
        <p class="text-sm font-semibold text-ink">
          รูป <span class="text-system-red" aria-hidden="true">*</span>
        </p>
        <MediaItemsEditor
          noun="รูป"
          allowVideo={false}
          fixed
          items={g().tiles.slice(0, g().columns)}
          onChange={setVisible}
          hint="ทุกรูปแสดงขนาดเท่ากันตามสัดส่วนของรูปแรกและไม่ถูกตัด แนะนำให้ใช้ขนาดเดียวกัน กว้างอย่างน้อย 800px"
        />
        <FieldMessage message={props.errors?.tiles} />
      </div>
    </div>
  );
}

/** `datetime-local` value for "now + days", local time. */
function localDateTimeIn(days: number): string {
  const d = new Date(Date.now() + days * 86_400_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Background, end time and after-end behaviour. Title / subtitle / button use the shared fields above and below it. */
export function CountdownFields(props: { section: HomepageSection; patch: Patch; errors?: FormErrors }) {
  const c = () => countdownSettings(props.section);
  const set = (next: Partial<CountdownBannerSettings>) => props.patch({ countdown: { ...c(), ...next } });
  return (
    <div class="flex flex-col gap-4">
      <div class="flex flex-col gap-2">
        <p class="text-sm font-medium text-ink">พื้นหลัง</p>
        <ChoiceRadio<CountdownBackground>
          name={`countdown-bg-${props.section.id}`}
          value={c().background}
          onChange={(background) => set({ background })}
          options={[
            { value: "brand", label: "สีแบรนด์", hint: "พื้นชมพู Charmiss" },
            { value: "image", label: "รูปภาพ", hint: "รูปเต็มกรอบ หน้าร้านเพิ่มเงาเข้มให้อ่านตัวหนังสือง่าย" },
          ]}
        />
      </div>
      <Show when={c().background === "image"}>
        <div class="flex flex-col gap-1.5 sm:max-w-md">
          <SingleImageUploader label="รูปพื้นหลัง" hint="แนะนำ 1920 x 640px จุดสำคัญควรอยู่กลางรูป" value={c().image} onChange={(image) => set({ image })} />
          <FieldMessage message={props.errors?.countdownImage} />
        </div>
      </Show>
      <label class="flex flex-col gap-1.5 sm:max-w-sm">
        <span class="text-sm font-medium text-ink">
          นับถอยหลังถึง <span class="text-system-red" aria-hidden="true">*</span>
        </span>
        <input
          type="datetime-local"
          value={c().endsAt}
          min={localDateTimeIn(0)}
          aria-invalid={props.errors?.countdownEndsAt ? true : undefined}
          onInput={(e) => set({ endsAt: e.currentTarget.value })}
          class="h-11 min-w-0 rounded-card border bg-surface-card px-4 text-sm text-ink outline-none focus:border-brand-pink"
          classList={{ "border-system-red": !!props.errors?.countdownEndsAt, "border-border": !props.errors?.countdownEndsAt }}
        />
        <FieldMessage message={props.errors?.countdownEndsAt} />
      </label>
      <div class="flex flex-col gap-2">
        <p class="text-sm font-medium text-ink">เมื่อหมดเวลา</p>
        <ChoiceRadio<CountdownAfterEnd>
          name={`countdown-after-${props.section.id}`}
          value={c().afterEnd}
          onChange={(afterEnd) => set({ afterEnd })}
          options={[
            { value: "hide", label: "ซ่อนส่วนนี้" },
            { value: "message", label: "แสดงข้อความแทนนาฬิกา" },
          ]}
        />
        <Show when={c().afterEnd === "message"}>
          <TextField label="ข้อความเมื่อหมดเวลา" placeholder={COUNTDOWN_ENDED_TEXT_DEFAULT} value={c().endedText} onInput={(e) => set({ endedText: e.currentTarget.value })} class="sm:max-w-xs" />
        </Show>
      </div>
    </div>
  );
}

const GRID_COLUMN_OPTIONS = [2, 3, 4, 5].map((n) => ({ value: String(n), label: `${n} คอลัมน์` }));
const MAX_ROW_OPTIONS = [
  { value: "0", label: "แสดงทั้งหมด" },
  ...Array.from({ length: PRODUCT_GRID_MAX_ROWS }, (_, i) => ({ value: String(i + 1), label: `${i + 1} แถว` })),
];

/** Products (product or SKU level, in order), layout, and the "ดูทั้งหมด" link. Heading is the shared `title` field. */
export function ProductGridFields(props: { section: HomepageSection; patch: Patch; errors?: FormErrors }) {
  const g = () => productGridSettings(props.section);
  const set = (next: Partial<ProductGridSettings>) => props.patch({ productGrid: { ...g(), ...next } });
  return (
    <div class="flex flex-col gap-4">
      <div class="flex flex-col gap-2">
        <p class="text-sm font-semibold text-ink">
          สินค้า <span class="text-system-red" aria-hidden="true">*</span>
        </p>
        <ProductSkuPicker
          reorderable
          value={props.section.products}
          onChange={(products) => props.patch({ products })}
          levelNote={{ option: "เลือกตัวเลือกไว้ การ์ดสินค้าจะเปิดมาที่ตัวเลือกแรกที่เลือก" }}
        />
        <FieldMessage message={props.errors?.products} />
      </div>
      <div class="flex flex-col gap-3 rounded-card bg-surface-gray/60 p-3">
        <p class="text-sm font-semibold text-ink">การจัดวาง</p>
        <ChoiceRadio<ProductGridLayout>
          name={`product-grid-layout-${props.section.id}`}
          value={g().layout}
          onChange={(layout) => set({ layout })}
          options={[
            { value: "grid", label: "ตาราง", hint: "มือถือ 2 คอลัมน์" },
            { value: "rail", label: "แถวเลื่อนแนวนอน", hint: "ปัดดูสินค้าด้านข้างได้ทุกหน้าจอ" },
          ]}
        />
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SelectField
            label={g().layout === "grid" ? "คอลัมน์บนเดสก์ท็อป" : "การ์ดที่เห็นพร้อมกันบนเดสก์ท็อป"}
            value={String(g().columns)}
            options={GRID_COLUMN_OPTIONS}
            onChange={(v) => set({ columns: Number(v) as ProductGridColumns })}
          />
          <Show when={g().layout === "grid"}>
            <SelectField label="จำนวนแถวสูงสุด" value={String(g().maxRows)} options={MAX_ROW_OPTIONS} onChange={(v) => set({ maxRows: Number(v) })} />
          </Show>
        </div>
      </div>
      <div class="flex flex-col gap-3 rounded-card bg-surface-gray/60 p-3">
        <p class="text-sm font-semibold text-ink">ลิงก์ "ดูทั้งหมด"</p>
        <p class="text-xs text-ink-gray">ไม่บังคับ แสดงมุมขวาของหัวข้อ</p>
        <TextField
          label="ข้อความลิงก์"
          placeholder="ดูทั้งหมด"
          value={props.section.cta.label}
          onInput={(e) => props.patch({ cta: { ...props.section.cta, label: e.currentTarget.value } })}
          class="sm:max-w-xs"
        />
        <DestinationSelector value={props.section.cta.destination} onChange={(destination) => props.patch({ cta: { ...props.section.cta, destination } })} error={props.errors?.viewAll} />
      </div>
    </div>
  );
}

export function DividerFields(props: { section: HomepageSection; patch: Patch }) {
  const d = () => dividerSettings(props.section);
  const set = (next: Partial<DividerSettings>) => props.patch({ divider: { ...d(), ...next } });
  return (
    <div class="flex flex-col gap-4">
      <div class="flex flex-col gap-2">
        <p class="text-sm font-medium text-ink">ระยะห่าง</p>
        <ChoiceRadio<DividerSize>
          name={`divider-size-${props.section.id}`}
          value={d().size}
          onChange={(size) => set({ size })}
          options={[
            { value: "s", label: "เล็ก", hint: "16-24px" },
            { value: "m", label: "กลาง", hint: "32-48px" },
            { value: "l", label: "ใหญ่", hint: "64-96px" },
          ]}
        />
      </div>
      <SettingToggle title="แสดงเส้นคั่น" hint="เส้นบางสีเทากลางระยะห่าง" checked={d().line} onChange={(line) => set({ line })} />
    </div>
  );
}
