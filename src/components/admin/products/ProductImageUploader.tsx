import { createSignal, For, Index, Show } from "solid-js";
import { ChevronIcon } from "~/components/shared/ChevronIcon";
import { CloseXIcon, ImageIcon, StarIcon } from "~/components/admin/icons";
import { MediaPreview, VideoOptionsFields } from "~/components/admin/MediaUploader";
import { asVideo, isVideoMedia, mediaAccept, mediaImage, mediaSrc, prepareMediaFile, revokeMedia, VIDEO_RULE_HINT, type MediaValue } from "~/lib/media";

/**
 * Final UI & Regression Overrides #1 — every "add/upload/replace image"
 * action in Admin opens the User's real OS file browser, never a mock
 * library/modal. There is no upload backend in this prototype, so a
 * selected file becomes an Object URL (`URL.createObjectURL`) instead of a
 * server response. One component, reused for both Product Gallery and every
 * Variant's own images, so both surfaces behave identically by construction.
 *
 * CMS + Frontend Final Refinement §8 — `maxImages` and `mainImage`/
 * `onSetMain` are both optional and additive: Variant Images (no `maxImages`,
 * no `mainImage`) keeps behaving exactly as before (uncapped, no pin
 * affordance); only the Product Gallery call site opts into a 10-item cap
 * and the "ตั้งเป็นรูปหลัก" (Set as Main Photo) pin.
 *
 * Video: with `allowVideo` (Product Gallery only) an item may be an MP4
 * video (`MediaValue`, see `~/lib/media`). Each video gets its poster + sound
 * fields under the tiles; the poster is what cards, lists and the "รูปหลัก"
 * pin use (`mediaImage`), so a video never reaches a product card.
 */
export function ProductImageUploader(props: {
  images: MediaValue[];
  onChange: (images: MediaValue[]) => void;
  /** Caps how many items a single "Add" action may bring in at once — replace (single-slot) is never capped by this. */
  maxImages?: number;
  /** The current Main Photo's URL (an image URL or a video's poster URL). */
  mainImage?: string;
  onSetMain?: (url: string) => void;
  /** Let items be MP4 videos too. Default: images only. */
  allowVideo?: boolean;
}) {
  const [pendingUrls, setPendingUrls] = createSignal<Set<string>>(new Set());
  const [replaceIndex, setReplaceIndex] = createSignal<number | null>(null);
  const [errors, setErrors] = createSignal<string[]>([]);
  let fileInputRef: HTMLInputElement | undefined;

  const allowVideo = () => !!props.allowVideo;
  const unit = () => (allowVideo() ? "ไฟล์" : "รูป");
  const atLimit = () => props.maxImages !== undefined && props.images.length >= props.maxImages;

  const openAddPicker = () => {
    if (atLimit()) return;
    setReplaceIndex(null);
    fileInputRef!.value = "";
    fileInputRef!.click();
  };

  const openReplacePicker = (index: number) => {
    setReplaceIndex(index);
    fileInputRef!.value = "";
    fileInputRef!.click();
  };

  const settle = (url: string) => {
    // Brief "uploading" beat so this reads like a real upload completing,
    // not an instant local-only swap.
    setTimeout(() => {
      setPendingUrls((set) => {
        const next = new Set(set);
        next.delete(url);
        return next;
      });
    }, 600);
  };

  const markPending = (values: MediaValue[]) => {
    const urls = values.map(mediaSrc);
    setPendingUrls((set) => new Set([...set, ...urls]));
    urls.forEach(settle);
  };

  const handleFilesSelected = async (e: Event) => {
    const files = Array.from((e.currentTarget as HTMLInputElement).files ?? []);
    if (files.length === 0) return;
    setErrors([]);
    const index = replaceIndex();

    if (index !== null) {
      const result = await prepareMediaFile(files[0], { allowVideo: allowVideo() });
      if (!result.ok) {
        setErrors([result.error]);
        return;
      }
      const old = props.images[index];
      // Video replaced by another video keeps its poster/sound settings.
      const value = isVideoMedia(result.value) && isVideoMedia(old) ? { ...result.value, poster: old.poster, hasAudio: old.hasAudio } : result.value;
      const next = [...props.images];
      next[index] = value;
      props.onChange(next);
      if (isVideoMedia(value) && isVideoMedia(old)) {
        if (old.src.startsWith("blob:")) URL.revokeObjectURL(old.src);
      } else {
        revokeMedia(old);
      }
      markPending([value]);
      return;
    }

    // §8 — a single Add action never brings in more than the room left under `maxImages` (when set).
    const room = props.maxImages !== undefined ? Math.max(0, props.maxImages - props.images.length) : files.length;
    const accepted: MediaValue[] = [];
    const nextErrors: string[] = [];
    for (const file of files.slice(0, room)) {
      const result = await prepareMediaFile(file, { allowVideo: allowVideo() });
      if (result.ok) accepted.push(result.value);
      else nextErrors.push(`${file.name}: ${result.error}`);
    }
    setErrors(nextErrors);
    if (accepted.length === 0) return;
    props.onChange([...props.images, ...accepted]);
    markPending(accepted);
  };

  const removeAt = (index: number) => {
    const value = props.images[index];
    props.onChange(props.images.filter((_, i) => i !== index));
    revokeMedia(value);
  };

  const move = (index: number, dir: -1 | 1) => {
    const next = [...props.images];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    props.onChange(next);
  };

  const updateAt = (index: number, value: MediaValue) => {
    const next = [...props.images];
    const old = next[index];
    next[index] = value;
    props.onChange(next);
    // Keep the "รูปหลัก" pin on this item when its poster changes.
    if (props.onSetMain && props.mainImage && props.mainImage === mediaImage(old) && mediaImage(value)) props.onSetMain(mediaImage(value));
  };

  const videos = () => props.images.map((value, index) => ({ video: asVideo(value), index })).filter((x) => x.video);

  return (
    <div class="flex flex-col gap-3">
      {/* Hidden native file input — every Browse/Add/Replace action below just calls `.click()` on this one. */}
      <input ref={fileInputRef} type="file" accept={mediaAccept(allowVideo())} multiple={replaceIndex() === null} class="hidden" onChange={handleFilesSelected} />

      <div class="flex flex-wrap gap-3">
        <For each={props.images}>
          {(item, i) => {
            const still = () => mediaImage(item);
            const isMain = () => props.mainImage !== undefined && !!still() && props.mainImage === still();
            const posterMissing = () => isVideoMedia(item) && !item.poster;
            return (
              <div
                class="group relative size-20 shrink-0 overflow-hidden rounded-media border sm:size-24"
                classList={{ "border-brand-pink": isMain(), "border-system-red": !isMain() && posterMissing(), "border-border": !isMain() && !posterMissing() }}
              >
                <button type="button" onClick={() => openReplacePicker(i())} aria-label={isVideoMedia(item) ? "เปลี่ยนวิดีโอ" : "เปลี่ยนรูปภาพ"} class="block size-full">
                  <MediaPreview value={item} dimmed={pendingUrls().has(mediaSrc(item))} />
                </button>
                <Show when={pendingUrls().has(mediaSrc(item))}>
                  <div class="absolute inset-0 flex items-center justify-center bg-ink/10" aria-hidden="true">
                    <span class="loading loading-spinner loading-sm text-white" />
                  </div>
                </Show>
                <div class="pointer-events-none absolute inset-x-0 bottom-0 bg-ink/60 py-1 text-center text-[10px] font-medium text-white opacity-0 transition-opacity duration-150 lg:group-hover:opacity-100">
                  {isVideoMedia(item) ? "เปลี่ยนวิดีโอ" : "เปลี่ยนรูป"}
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeAt(i());
                  }}
                  aria-label={isVideoMedia(item) ? "ลบวิดีโอ" : "ลบรูปภาพ"}
                  class="absolute right-1 top-1 flex size-6 items-center justify-center rounded-pill bg-ink/70 text-white"
                >
                  <CloseXIcon class="size-2.5" />
                </button>

                {/* §8 — Main Photo pin, only when the caller opted in via `mainImage`/`onSetMain` (Product Gallery). A video can be main once it has a poster. */}
                <Show when={props.onSetMain}>
                  {(onSetMain) => (
                    <Show
                      when={isMain()}
                      fallback={
                        <Show when={still()}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSetMain()(still());
                            }}
                            aria-label="ตั้งเป็นรูปหลัก"
                            class="absolute left-1 top-1 flex size-6 items-center justify-center rounded-pill bg-ink/70 text-white opacity-0 transition-opacity duration-150 lg:group-hover:opacity-100"
                          >
                            <StarIcon class="size-3" />
                          </button>
                        </Show>
                      }
                    >
                      <span class="absolute left-1 top-1 flex items-center gap-1 rounded-pill bg-brand-pink px-2 py-0.5 text-[10px] font-semibold text-white">
                        <StarIcon class="size-3" filled /> รูปหลัก
                      </span>
                    </Show>
                  )}
                </Show>

                <div class="absolute bottom-1 left-1 flex gap-1">
                  <Show when={i() > 0}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        move(i(), -1);
                      }}
                      aria-label="ย้ายไปทางซ้าย"
                      class="flex size-6 items-center justify-center rounded-pill bg-ink/70 text-xs text-white"
                    >
                      <ChevronIcon direction="left" class="size-4" />
                    </button>
                  </Show>
                  <Show when={i() < props.images.length - 1}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        move(i(), 1);
                      }}
                      aria-label="ย้ายไปทางขวา"
                      class="flex size-6 items-center justify-center rounded-pill bg-ink/70 text-xs text-white"
                    >
                      <ChevronIcon direction="right" class="size-4" />
                    </button>
                  </Show>
                </div>
              </div>
            );
          }}
        </For>

        <button
          type="button"
          onClick={openAddPicker}
          disabled={atLimit()}
          class="flex size-20 shrink-0 flex-col items-center justify-center gap-1 rounded-media border border-dashed border-border text-ink-gray transition-colors duration-150 hover:border-brand-pink hover:text-brand-pink disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border disabled:hover:text-ink-gray sm:size-24"
        >
          <ImageIcon class="size-5" />
          <span class="text-xs">{allowVideo() ? "เพิ่มรูปหรือวิดีโอ" : "เพิ่มรูป"}</span>
        </button>
      </div>

      <For each={errors()}>
        {(message) => (
          <p class="text-xs text-system-red" role="alert">
            {message}
          </p>
        )}
      </For>

      <Show when={props.maxImages !== undefined}>
        <p class="text-xs text-ink-gray">
          {props.images.length}/{props.maxImages} {unit()} เพิ่มได้ครั้งละไม่เกิน {props.maxImages} {unit()}
        </p>
      </Show>
      <Show when={allowVideo()}>
        <p class="text-xs text-ink-gray">{VIDEO_RULE_HINT}</p>
      </Show>

      <Show when={videos().length > 0}>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Index each={videos()}>
            {(entry) => (
              <VideoOptionsFields title={`วิดีโอลำดับที่ ${entry().index + 1}`} value={entry().video!} onChange={(value) => updateAt(entry().index, value)} />
            )}
          </Index>
        </div>
      </Show>
    </div>
  );
}
