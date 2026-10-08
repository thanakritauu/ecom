import { createEffect, createSignal, For, on, onCleanup, Show } from "solid-js";
import type { Order } from "~/lib/types";
import { getOrderReviews, orderItemKey, reviewableItems, reviewMediaPreviews, saveOrderReviews, type ReviewMedia } from "~/lib/orderHistory";
import { pushToast } from "~/lib/toast";
import starGold from "~/assets/icons/star-gold-4.svg";
import { Button } from "../shared/Button";
import { SheetModal } from "../shared/SheetModal";
import { CloseMark } from "../shared/icons";

const MAX_REVIEW_CHARS = 500;
const RATING_LABELS = ["แย่มาก", "ไม่ค่อยดี", "พอใช้", "ดี", "ดีมาก"];
const MAX_MEDIA = 5;
const MAX_IMAGE_MB = 10;
const MAX_VIDEO_MB = 50;
const MB = 1024 * 1024;

/** Keeps the files that fit (type, size, count) and says in Thai why the rest were skipped. */
function acceptFiles(files: File[], current: number): { accepted: ReviewMedia[]; error?: string } {
  const accepted: ReviewMedia[] = [];
  const errors = new Set<string>();
  for (const file of files) {
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) errors.add("รองรับเฉพาะไฟล์รูปภาพหรือวิดีโอเท่านั้น");
    else if (isImage && file.size > MAX_IMAGE_MB * MB) errors.add(`รูปภาพต้องมีขนาดไม่เกิน ${MAX_IMAGE_MB} MB`);
    else if (isVideo && file.size > MAX_VIDEO_MB * MB) errors.add(`วิดีโอต้องมีขนาดไม่เกิน ${MAX_VIDEO_MB} MB`);
    else if (current + accepted.length >= MAX_MEDIA) errors.add(`เพิ่มรูป/วิดีโอได้สูงสุด ${MAX_MEDIA} ไฟล์ต่อสินค้า`);
    else accepted.push({ name: file.name, type: file.type, url: URL.createObjectURL(file) });
  }
  return { accepted, error: errors.size ? [...errors].join(" · ") : undefined };
}

/**
 * "รีวิว" on a delivered order — one block per item (free gift skipped):
 * a required 1–5 star rating, an optional comment and up to 5 photos/videos
 * ("ถ่ายรูป" opens the camera on a phone). Mock save via `saveOrderReviews`
 * (file names/types only — previews stay as this session's object URLs);
 * the order card then shows "รีวิวแล้ว" with the stars.
 */
export function OrderReviewDialog(props: { order: Order; open: boolean; onOpenChange: (open: boolean) => void }) {
  const items = () => reviewableItems(props.order);
  const [ratings, setRatings] = createSignal<Record<string, number>>({});
  const [texts, setTexts] = createSignal<Record<string, string>>({});
  const [media, setMedia] = createSignal<Record<string, ReviewMedia[]>>({});
  const [mediaErrors, setMediaErrors] = createSignal<Record<string, string | undefined>>({});
  const [saving, setSaving] = createSignal(false);

  // Object URLs made in this form that weren't saved — freed when the form resets or unmounts.
  const savedUrls = () => new Set(Object.values(reviewMediaPreviews.get(props.order.id) ?? {}).flatMap((list) => list.map((m) => m.url)));
  const releaseDraftUrls = () => {
    const keep = savedUrls();
    for (const list of Object.values(media())) for (const m of list) if (m.url && !keep.has(m.url)) URL.revokeObjectURL(m.url);
  };
  onCleanup(releaseDraftUrls);

  const addFiles = (key: string, input: HTMLInputElement) => {
    const files = Array.from(input.files ?? []);
    input.value = ""; // same file can be picked again after removing it
    if (!files.length) return;
    const { accepted, error } = acceptFiles(files, (media()[key] ?? []).length);
    setMedia((m) => ({ ...m, [key]: [...(m[key] ?? []), ...accepted] }));
    setMediaErrors((e) => ({ ...e, [key]: error }));
  };
  const removeFile = (key: string, index: number) => {
    const item = media()[key]?.[index];
    if (item?.url && !savedUrls().has(item.url)) URL.revokeObjectURL(item.url);
    setMedia((m) => ({ ...m, [key]: (m[key] ?? []).filter((_, i) => i !== index) }));
    setMediaErrors((e) => ({ ...e, [key]: undefined }));
  };

  // Fresh form each time it opens, prefilled with anything already saved.
  createEffect(
    on(
      () => props.open,
      (open) => {
        if (!open) return;
        releaseDraftUrls();
        const saved = getOrderReviews(props.order.id);
        const previews = reviewMediaPreviews.get(props.order.id) ?? {};
        setRatings(Object.fromEntries(Object.entries(saved).map(([k, r]) => [k, r.rating])));
        setTexts(Object.fromEntries(Object.entries(saved).map(([k, r]) => [k, r.text])));
        // This session's previews if we have them, else just the saved names (after a reload).
        setMedia(Object.fromEntries(Object.entries(saved).map(([k, r]) => [k, previews[k] ?? r.media ?? []])));
        setMediaErrors({});
      },
    ),
  );

  const missing = () => items().filter((item) => !ratings()[orderItemKey(item)]).length;

  const submit = async () => {
    if (missing() > 0 || saving()) return;
    setSaving(true);
    try {
      await saveOrderReviews(
        props.order.id,
        Object.fromEntries(
          items().map((item) => {
            const key = orderItemKey(item);
            return [key, { rating: ratings()[key], text: (texts()[key] ?? "").trim(), media: (media()[key] ?? []).map(({ name, type }) => ({ name, type })) }];
          }),
        ),
      );
      // Previews replaced by this save are no longer shown anywhere — free them, then keep the new set for this session.
      const next = new Set(Object.values(media()).flatMap((list) => list.map((m) => m.url)));
      for (const url of savedUrls()) if (url && !next.has(url)) URL.revokeObjectURL(url);
      reviewMediaPreviews.set(props.order.id, { ...media() });
      pushToast("ส่งรีวิวเรียบร้อย", "success", "ขอบคุณที่แบ่งปันความคิดเห็นกับเรา");
      props.onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SheetModal
      open={props.open}
      onOpenChange={(open) => !saving() && props.onOpenChange(open)}
      height="auto"
      title="รีวิวสินค้า"
      description={`คำสั่งซื้อ ${props.order.id}`}
      footer={
        <>
          <Button type="button" variant="primary" size="lg" class="w-full" loading={saving()} disabled={missing() > 0} onClick={submit}>
            {saving() ? "กำลังส่งรีวิว..." : "ส่งรีวิว"}
          </Button>
          <Show when={missing() > 0}>
            <p class="text-center text-xs text-ink-gray">ให้คะแนนสินค้าให้ครบทุกรายการก่อนส่งรีวิว</p>
          </Show>
        </>
      }
    >
      <For each={items()}>
        {(item, i) => {
          const key = orderItemKey(item);
          const rating = () => ratings()[key] ?? 0;
          const text = () => texts()[key] ?? "";
          return (
            <section class="flex flex-col gap-3" classList={{ "border-t border-surface-gray pt-5": i() > 0 }} aria-label={`รีวิว ${item.name}`}>
              <div class="flex items-center gap-3">
                <img src={item.image} alt="" loading="lazy" class="size-[60px] shrink-0 rounded-2xl border border-surface-gray object-cover" />
                <div class="min-w-0 flex-1">
                  <p class="line-clamp-2 text-sm font-medium leading-[1.75] text-ink">{item.name}</p>
                  <p class="text-xs text-ink-gray">{item.variantLabel}</p>
                </div>
              </div>

              <div class="flex flex-col gap-1">
                <p class="text-sm font-medium text-ink">
                  ให้คะแนนสินค้า <span class="text-system-red">*</span>
                </p>
                <div class="flex items-center gap-2">
                  <div role="radiogroup" aria-label={`คะแนน ${item.name}`} class="-ml-1.5 flex">
                    <For each={[1, 2, 3, 4, 5]}>
                      {(star) => (
                        <button
                          type="button"
                          role="radio"
                          aria-checked={rating() === star}
                          aria-label={`${star} ดาว`}
                          disabled={saving()}
                          onClick={() => setRatings((r) => ({ ...r, [key]: star }))}
                          class="flex size-11 items-center justify-center rounded-pill transition-transform duration-150 active:scale-90"
                        >
                          <img src={starGold} alt="" class="size-7" classList={{ "opacity-25 grayscale": star > rating() }} />
                        </button>
                      )}
                    </For>
                  </div>
                  <Show when={rating() > 0}>
                    <span class="text-sm text-ink-gray">{RATING_LABELS[rating() - 1]}</span>
                  </Show>
                </div>
              </div>

              <label class="flex flex-col gap-1.5">
                <span class="text-sm font-medium text-ink">
                  ความคิดเห็น <span class="text-ink-gray">(ไม่บังคับ)</span>
                </span>
                <textarea
                  rows={3}
                  maxlength={MAX_REVIEW_CHARS}
                  value={text()}
                  disabled={saving()}
                  onInput={(e) => setTexts((t) => ({ ...t, [key]: e.currentTarget.value }))}
                  placeholder="เล่าให้เพื่อน ๆ ฟังหน่อย เนื้อสัมผัส สี กลิ่น ใช้แล้วเป็นอย่างไร"
                  class="rounded-card border border-border bg-surface-card px-4 py-3 text-base leading-[1.75] text-ink outline-none placeholder:text-ink-placeholder focus:border-brand-pink"
                />
                <span class="self-end text-xs text-ink-gray">
                  {text().length}/{MAX_REVIEW_CHARS}
                </span>
              </label>

              <ReviewMediaField
                itemName={item.name}
                media={media()[key] ?? []}
                error={mediaErrors()[key]}
                disabled={saving()}
                onAdd={(input) => addFiles(key, input)}
                onRemove={(i) => removeFile(key, i)}
              />
            </section>
          );
        }}
      </For>
    </SheetModal>
  );
}

const MEDIA_BUTTON =
  "flex min-h-[44px] flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-pill border border-brand-pink bg-white px-4 text-sm font-medium text-brand-pink transition-colors duration-150 lg:hover:bg-surface-pink has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50";

/** Photos/videos for one item: camera + gallery pickers, then thumbnails (video = play badge) each with a × to remove. */
function ReviewMediaField(props: {
  itemName: string;
  media: ReviewMedia[];
  error?: string;
  disabled: boolean;
  onAdd: (input: HTMLInputElement) => void;
  onRemove: (index: number) => void;
}) {
  const full = () => props.media.length >= MAX_MEDIA;
  return (
    <div class="flex flex-col gap-2">
      <p class="flex items-baseline justify-between gap-2 text-sm font-medium text-ink">
        <span>
          รูปภาพ / วิดีโอ <span class="text-ink-gray">(ไม่บังคับ)</span>
        </span>
        <span class="text-xs font-normal text-ink-gray">
          {props.media.length}/{MAX_MEDIA}
        </span>
      </p>
      <Show when={props.media.length > 0}>
        <ul class="flex flex-wrap gap-2 pt-1">
          <For each={props.media}>
            {(m, i) => (
              <li class="relative size-20 shrink-0">
                <div class="size-full overflow-hidden rounded-2xl border border-surface-gray bg-surface-gray">
                  <Show
                    when={m.url}
                    fallback={
                      <span class="flex size-full items-center justify-center p-1.5 text-center text-[10px] leading-[1.75] text-ink-gray">
                        <span class="line-clamp-2 break-all">{m.name}</span>
                      </span>
                    }
                  >
                    {(url) => (
                      <Show when={m.type.startsWith("video/")} fallback={<img src={url()} alt={m.name} class="size-full object-cover" />}>
                        <video src={url()} muted playsinline preload="metadata" class="size-full object-cover" aria-label={m.name} />
                      </Show>
                    )}
                  </Show>
                </div>
                <Show when={m.type.startsWith("video/")}>
                  <span class="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
                    <span class="flex size-7 items-center justify-center rounded-pill bg-ink/60 text-white">
                      <svg viewBox="0 0 24 24" class="ml-0.5 size-3.5" fill="currentColor">
                        <path d="M8 5.5v13l10.5-6.5z" />
                      </svg>
                    </span>
                  </span>
                </Show>
                <button
                  type="button"
                  disabled={props.disabled}
                  onClick={() => props.onRemove(i())}
                  class="group absolute -right-3 -top-3 flex size-11 items-center justify-center"
                  aria-label={`ลบ ${m.name}`}
                >
                  <CloseMark class="!size-6" />
                </button>
              </li>
            )}
          </For>
        </ul>
      </Show>
      <Show when={!full()}>
        <div class="flex gap-2">
          <label class={MEDIA_BUTTON}>
            <CameraIcon class="size-4" /> ถ่ายรูป
            <input
              type="file"
              accept="image/*"
              capture="environment"
              class="sr-only"
              disabled={props.disabled}
              aria-label={`ถ่ายรูป ${props.itemName}`}
              onChange={(e) => props.onAdd(e.currentTarget)}
            />
          </label>
          <label class={MEDIA_BUTTON}>
            <GalleryIcon class="size-4" /> เพิ่มรูป/วิดีโอ
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              class="sr-only"
              disabled={props.disabled}
              aria-label={`เพิ่มรูปหรือวิดีโอ ${props.itemName}`}
              onChange={(e) => props.onAdd(e.currentTarget)}
            />
          </label>
        </div>
      </Show>
      <Show when={props.error}>
        <p class="text-xs text-system-red" role="alert">
          {props.error}
        </p>
      </Show>
      <p class="text-xs text-ink-gray">
        สูงสุด {MAX_MEDIA} ไฟล์ · รูปไม่เกิน {MAX_IMAGE_MB} MB · วิดีโอไม่เกิน {MAX_VIDEO_MB} MB
      </p>
    </div>
  );
}

function CameraIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class} fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M4 8h3l1.5-2.5h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

function GalleryIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class} fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="m21 16-5-5-8 8" />
    </svg>
  );
}
