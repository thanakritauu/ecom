import { createEffect, For, Show } from "solid-js";
import { ChevronIcon } from "~/components/shared/ChevronIcon";
import type { Review } from "~/lib/types";
import { reviewMedia, type ReviewMedia } from "~/lib/productReviews";
import starGold from "~/assets/icons/star-gold-4.svg";

/**
 * The one review UI — shared by the Product Option Modal and the Product
 * Detail Page so both read the same reviews the same way (the modal's
 * compact list is the reference design).
 */
export type ReviewMediaViewerState = { items: ReviewMedia[]; index: number; author: string };

/** Compact review list per Figma 547:7728 — reads the existing `Review` model; photos/videos open the viewer. */
export function ReviewList(props: {
  reviews: Review[];
  /** Set when reviews are per option — enables the "no reviews for this option" state. */
  optionLabel?: string;
  onOpenMedia: (items: ReviewMedia[], index: number, author: string) => void;
}) {
  return (
    <Show
      when={props.reviews.length > 0}
      fallback={
        <div class="flex flex-col items-center gap-2 px-2 py-10 text-center">
          <span class="flex size-12 items-center justify-center rounded-pill bg-surface-gray text-xl text-ink-gray" aria-hidden="true">
            ★
          </span>
          <p class="text-sm font-medium text-ink">{props.optionLabel ? `ยังไม่มีรีวิวสำหรับ “${props.optionLabel}”` : "ยังไม่มีรีวิวสำหรับสินค้านี้"}</p>
        </div>
      }
    >
      <div class="flex flex-col gap-3 pt-1">
        <For each={props.reviews}>
          {(review) => {
            const media = reviewMedia(review);
            return (
              <article class="flex flex-col gap-1 border-b border-border pb-3 last:border-b-0">
                <div class="flex items-center gap-1.5">
                  <span class="flex size-5 shrink-0 items-center justify-center rounded-pill bg-surface-gray text-[10px] text-ink-gray" aria-hidden="true">
                    {review.name.trim().charAt(0)}
                  </span>
                  <span class="text-xs text-ink">{maskName(review.name)}</span>
                </div>
                <div class="flex items-center gap-0.5" aria-label={`ให้คะแนน ${review.rating} จาก 5`}>
                  <For each={[0, 1, 2, 3, 4]}>{(i) => <img src={starGold} alt="" class="size-3" classList={{ "opacity-25 grayscale": i >= review.rating }} />}</For>
                </div>
                <p class="text-xs text-ink-gray">
                  {review.variantLabel ? `ตัวเลือก: ${review.variantLabel} · ` : ""}
                  {review.date}
                </p>
                <p class="text-sm text-ink">{review.text}</p>
                <Show when={media.length > 0}>
                  <div class="mt-1 flex gap-2 overflow-x-auto pb-1">
                    <For each={media}>
                      {(m, i) => (
                        <button
                          type="button"
                          onClick={() => props.onOpenMedia(media, i(), maskName(review.name))}
                          aria-label={m.type === "video" ? `เล่นวิดีโอจากรีวิวของ ${maskName(review.name)}` : `ดูรูปที่ ${i() + 1} จากรีวิวของ ${maskName(review.name)}`}
                          class="group/media relative size-20 shrink-0 overflow-hidden rounded-lg bg-surface-gray focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-pink"
                        >
                          <Show
                            when={m.type === "video"}
                            fallback={<img src={m.src} alt="" loading="lazy" class="size-full object-cover transition-transform duration-200 group-hover/media:scale-105" />}
                          >
                            <Show when={m.poster} fallback={<span class="block size-full bg-ink/80" />}>
                              <img src={m.poster} alt="" loading="lazy" class="size-full object-cover transition-transform duration-200 group-hover/media:scale-105" />
                            </Show>
                            <span class="absolute inset-0 flex items-center justify-center bg-black/25" aria-hidden="true">
                              <span class="flex size-8 items-center justify-center rounded-pill bg-white/90 pl-0.5 text-xs text-ink">▶</span>
                            </span>
                          </Show>
                        </button>
                      )}
                    </For>
                  </div>
                </Show>
              </article>
            );
          }}
        </For>
      </div>
    </Show>
  );
}

/**
 * Full-size photo / video viewer for review media; ←/→ to move. Inside the
 * Product Option Modal it's a layer covering the dialog (`absolute`, the
 * dialog's own Esc handler closes it); on a page (PDP) pass `fixed` and it
 * covers the viewport and handles Esc itself.
 */
export function ReviewMediaViewer(props: { state: ReviewMediaViewerState; onChange: (index: number) => void; onClose: () => void; fixed?: boolean }) {
  let closeRef: HTMLButtonElement | undefined;
  const current = () => props.state.items[props.state.index];
  const count = () => props.state.items.length;
  const go = (delta: number) => props.onChange((props.state.index + delta + count()) % count());
  createEffect(() => closeRef?.focus());

  return (
    <div
      class={`${props.fixed ? "fixed z-[100]" : "absolute z-20"} inset-0 flex flex-col bg-[#111318] text-white`}
      role="dialog"
      aria-modal="true"
      aria-label={`สื่อจากรีวิวของ ${props.state.author}`}
      // In the modal, Esc is handled by the Dialog's onEscapeKeyDown (closes this viewer, keeps the modal open).
      onKeyDown={(e) => {
        if (props.fixed && e.key === "Escape") props.onClose();
        else if (e.key === "ArrowRight" && count() > 1) go(1);
        else if (e.key === "ArrowLeft" && count() > 1) go(-1);
      }}
    >
      <div class="flex shrink-0 items-center justify-between gap-3 px-4 py-3">
        <span class="text-sm">
          {props.state.author} · {props.state.index + 1} / {count()}
        </span>
        <button ref={closeRef} type="button" onClick={props.onClose} class="flex size-11 items-center justify-center rounded-pill text-2xl hover:bg-white/10">
          <span aria-hidden="true">×</span>
          <span class="sr-only">ปิดรูปภาพ</span>
        </button>
      </div>
      <div class="relative flex min-h-0 flex-1 items-center justify-center px-4">
        <Show
          when={current().type === "video"}
          fallback={<img src={current().src} alt={`รูปจากรีวิว ${props.state.index + 1}`} class="max-h-full max-w-full rounded-lg object-contain" />}
        >
          {/* Keyed by src so switching between two videos reloads the player */}
          <Show when={current().src} keyed>
            {(src) => <video src={src} poster={current().poster} controls autoplay playsinline class="max-h-full max-w-full rounded-lg bg-black" />}
          </Show>
        </Show>
        <Show when={count() > 1}>
          <button type="button" onClick={() => go(-1)} aria-label="ก่อนหน้า" class="absolute left-2 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-pill bg-white/50 text-ink backdrop-blur-sm hover:bg-white/80 sm:size-11">
            <ChevronIcon direction="left" class="size-5 sm:size-6" />
          </button>
          <button type="button" onClick={() => go(1)} aria-label="ถัดไป" class="absolute right-2 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-pill bg-white/50 text-ink backdrop-blur-sm hover:bg-white/80 sm:size-11">
            <ChevronIcon direction="right" class="size-5 sm:size-6" />
          </button>
        </Show>
      </div>
      <Show when={count() > 1}>
        <div class="flex shrink-0 justify-center gap-2 overflow-x-auto px-4 py-3">
          <For each={props.state.items}>
            {(m, i) => (
              <button
                type="button"
                onClick={() => props.onChange(i())}
                aria-label={`${m.type === "video" ? "วิดีโอ" : "รูป"} ${i() + 1}`}
                aria-current={i() === props.state.index ? "true" : undefined}
                class="relative size-12 shrink-0 overflow-hidden rounded-md border-2"
                classList={{ "border-white": i() === props.state.index, "border-transparent opacity-60 hover:opacity-100": i() !== props.state.index }}
              >
                <img src={m.type === "video" ? (m.poster ?? "") : m.src} alt="" class="size-full object-cover" />
                <Show when={m.type === "video"}>
                  <span class="absolute inset-0 flex items-center justify-center text-[10px]" aria-hidden="true">
                    ▶
                  </span>
                </Show>
              </button>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}

/** "Nutcha S." → "N**S" — reviewers shown masked, as in the Figma. */
function maskName(name: string): string {
  const letters = name.replace(/[\s.]/g, "");
  if (letters.length <= 2) return `${letters.charAt(0)}*`;
  return `${letters.charAt(0)}**${letters.charAt(letters.length - 1)}`;
}
