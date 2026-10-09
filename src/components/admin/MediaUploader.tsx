import { createSignal, Show, type JSX } from "solid-js";
import { CloseXIcon, ImageIcon } from "./icons";
import { Toggle } from "./Toggle";
import {
  isVideoMedia,
  mediaAccept,
  mediaSrc,
  prepareMediaFile,
  revokeMedia,
  VIDEO_RULE_HINT,
  type MediaValue,
  type VideoMediaItem,
} from "~/lib/media";

/**
 * Admin preview of a `MediaValue`: an image, or the video playing muted on
 * loop (never with sound in admin). Shared by every media slot so previews
 * look the same everywhere.
 */
export function MediaPreview(props: { value: MediaValue; class?: string; dimmed?: boolean }) {
  return (
    <Show
      when={isVideoMedia(props.value)}
      fallback={<img src={mediaSrc(props.value)} alt="" class={`size-full object-cover ${props.class ?? ""}`} classList={{ "opacity-40": props.dimmed }} />}
    >
      <video
        src={mediaSrc(props.value)}
        poster={(isVideoMedia(props.value) && props.value.poster) || undefined}
        autoplay
        muted
        loop
        playsinline
        preload="metadata"
        class={`size-full object-cover ${props.class ?? ""}`}
        classList={{ "opacity-40": props.dimmed }}
      />
    </Show>
  );
}

/** Small "วิดีโอ" tag for a slot that holds a video. */
export function VideoBadge(props: { class?: string }) {
  return <span class={`rounded-pill bg-ink/70 px-2 py-0.5 text-[10px] font-medium text-white ${props.class ?? ""}`}>วิดีโอ</span>;
}

/**
 * The extra fields a video needs once it's chosen: the required poster
 * (cover) image and the "วิดีโอนี้มีเสียง" toggle. Rendered under the slot by
 * `MediaUploader`, or on its own where the slot is too small to hold it
 * (hero crops, product gallery tiles).
 */
export function VideoOptionsFields(props: {
  value: VideoMediaItem;
  onChange: (value: MediaValue) => void;
  /** Optional heading, e.g. "วิดีโอที่ 2" when several videos share one form. */
  title?: string;
  /** Poster box ratio, default square. */
  posterAspectClass?: string;
  disabled?: boolean;
}) {
  const [pending, setPending] = createSignal(false);
  let posterInputRef: HTMLInputElement | undefined;

  const openPicker = () => {
    if (props.disabled) return;
    posterInputRef!.value = "";
    posterInputRef!.click();
  };

  const onPosterPicked = (e: Event) => {
    const file = (e.currentTarget as HTMLInputElement).files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const old = props.value.poster;
    props.onChange({ ...props.value, poster: URL.createObjectURL(file) });
    setPending(true);
    setTimeout(() => {
      setPending(false);
      if (old?.startsWith("blob:")) URL.revokeObjectURL(old);
    }, 600);
  };

  const clearPoster = () => {
    if (props.value.poster?.startsWith("blob:")) URL.revokeObjectURL(props.value.poster);
    props.onChange({ ...props.value, poster: "" });
  };

  const missing = () => !props.value.poster;

  return (
    <div class="flex flex-col gap-3 rounded-card border border-border bg-surface-gray/40 p-3">
      <Show when={props.title}>
        <p class="text-xs font-medium text-ink">{props.title}</p>
      </Show>
      <input ref={posterInputRef} type="file" accept="image/*" class="hidden" onChange={onPosterPicked} />
      <div class="flex items-start gap-3">
        <div class={`relative w-24 shrink-0 overflow-hidden rounded-media border bg-surface-card ${props.posterAspectClass ?? "aspect-square"}`} classList={{ "border-system-red": missing(), "border-border": !missing() }}>
          <button type="button" onClick={openPicker} aria-label={missing() ? "เลือกภาพปกวิดีโอ" : "เปลี่ยนภาพปกวิดีโอ"} class="flex size-full items-center justify-center text-ink-gray hover:text-brand-pink">
            <Show when={props.value.poster} fallback={<ImageIcon class="size-5" />}>
              <img src={props.value.poster} alt="" class="size-full object-cover" classList={{ "opacity-40": pending() }} />
            </Show>
          </button>
          <Show when={props.value.poster && !props.disabled}>
            <button
              type="button"
              onClick={clearPoster}
              aria-label="ลบภาพปกวิดีโอ"
              class="absolute right-1 top-1 flex size-5 items-center justify-center rounded-pill bg-ink/70 text-white"
            >
              <CloseXIcon class="size-2" />
            </button>
          </Show>
        </div>
        <div class="flex min-w-0 flex-col gap-1">
          <p class="text-sm font-medium text-ink">
            ภาพปกวิดีโอ <span class="text-system-red">*</span>
          </p>
          <p class="text-xs text-ink-gray">แสดงระหว่างโหลดวิดีโอ ในการ์ดสินค้า และแทนวิดีโอเมื่อลูกค้าเปิดโหมดประหยัดดาต้า</p>
          <Show when={missing()}>
            <p class="text-xs text-system-red">ต้องใส่ภาพปกก่อนบันทึก</p>
          </Show>
        </div>
      </div>
      <div class="flex flex-col gap-1">
        <Toggle
          checked={!!props.value.hasAudio}
          onChange={(checked) => props.onChange({ ...props.value, hasAudio: checked })}
          onLabel="วิดีโอนี้มีเสียง"
          offLabel="วิดีโอนี้มีเสียง"
          disabled={props.disabled}
        />
        <p class="text-xs text-ink-gray">
          <Show when={props.value.hasAudio} fallback="ปิดอยู่ หน้าร้านเล่นแบบไม่มีเสียงและไม่มีปุ่มเสียง">
            หน้าร้านเริ่มเล่นแบบปิดเสียง และมีปุ่มลำโพงให้ลูกค้ากดเปิดเสียงเอง
          </Show>
        </p>
      </div>
    </div>
  );
}

/**
 * One upload slot that takes an image OR an MP4 video (reusable: banners,
 * hero, popup). Same native file browser + Object URL convention as the
 * other admin uploaders. Images are stored as a plain string (unchanged data
 * shape); a video becomes `{ type: "video", src, poster, hasAudio }` after
 * passing the video rules (`prepareMediaFile`), and its poster + sound
 * fields appear under the slot. Set `allowVideo={false}` for image-only use.
 */
export function MediaUploader(props: {
  label?: string;
  /** Image size hint (e.g. `bannerSizeHint(device)`). The video rule line is added under it automatically when video is allowed. */
  hint?: string;
  value: MediaValue;
  onChange: (value: MediaValue) => void;
  allowVideo?: boolean;
  /** Preview box ratio, default 3:1. */
  aspectClass?: string;
  /** Preview box width, default full width. */
  boxClass?: string;
  emptyLabel?: string;
  /** Tiny slot (crop thumbnails): icon only, no hints, no hover label, no video fields under it. */
  compact?: boolean;
  /** Show poster + sound fields under the slot when it holds a video. Default: true unless `compact`. */
  showVideoOptions?: boolean;
  /** Hide the slot's own × (when the caller's `overlay` has its own remove control). */
  hideRemove?: boolean;
  /** Extra controls drawn on top of the filled preview (badges, reorder buttons). */
  overlay?: JSX.Element;
  /** Default true: a "วิดีโอ" tag on a filled video slot. Turn off when `overlay` already labels the type. */
  showVideoBadge?: boolean;
  /** Receive upload errors instead of showing them under the slot (compact slots are too narrow for a message). */
  onError?: (message: string | undefined) => void;
  /** Don't print the size hint / video rule above the slot (the caller shows them once for a group of slots). */
  hideHints?: boolean;
  /** Ratio of the poster box in the video fields; default square. Banners pass their crop ratio. */
  posterAspectClass?: string;
  /** Accessible name for the slot in compact mode. */
  ariaLabel?: string;
  disabled?: boolean;
}) {
  const allowVideo = () => props.allowVideo ?? true;
  const showVideoOptions = () => props.showVideoOptions ?? !props.compact;
  const [pending, setPending] = createSignal(false);
  const [error, setErrorSignal] = createSignal<string>();
  const setError = (message: string | undefined) => {
    setErrorSignal(message);
    props.onError?.(message);
  };
  let fileInputRef: HTMLInputElement | undefined;

  const openPicker = () => {
    if (props.disabled) return;
    fileInputRef!.value = "";
    fileInputRef!.click();
  };

  const handleFileSelected = async (e: Event) => {
    const file = (e.currentTarget as HTMLInputElement).files?.[0];
    if (!file) return;
    setError(undefined);
    setPending(true);
    const result = await prepareMediaFile(file, { allowVideo: allowVideo() });
    if (!result.ok) {
      setPending(false);
      setError(result.error);
      return;
    }
    const old = props.value;
    // Replacing one video with another keeps its poster/sound setting; the admin can still change them.
    const next = isVideoMedia(result.value) && isVideoMedia(old) ? { ...result.value, poster: old.poster, hasAudio: old.hasAudio } : result.value;
    props.onChange(next);
    setTimeout(() => {
      setPending(false);
      // Old poster stays alive if we carried it over to the new video.
      if (isVideoMedia(next) && isVideoMedia(old)) {
        if (old.src.startsWith("blob:")) URL.revokeObjectURL(old.src);
      } else {
        revokeMedia(old);
      }
    }, 600);
  };

  const remove = () => {
    revokeMedia(props.value);
    setError(undefined);
    props.onChange("");
  };

  const emptyLabel = () => props.emptyLabel ?? (allowVideo() ? "เลือกรูปหรือวิดีโอ" : "เลือกรูปภาพ");
  const boxClass = () => `${props.aspectClass ?? "aspect-[3/1]"} ${props.boxClass ?? "w-full"}`;
  const video = () => (isVideoMedia(props.value) ? props.value : undefined);

  return (
    <div class="flex flex-col gap-2">
      <Show when={props.label}>
        <p class={props.compact ? "text-[10px] leading-tight text-ink-gray" : "text-sm font-medium text-ink"}>{props.label}</p>
      </Show>
      <Show when={!props.compact && !props.hideHints && props.hint}>
        <p class="text-xs text-ink-gray">{props.hint}</p>
      </Show>
      <Show when={!props.compact && !props.hideHints && allowVideo()}>
        <p class="text-xs text-ink-gray">{VIDEO_RULE_HINT}</p>
      </Show>

      <input ref={fileInputRef} type="file" accept={mediaAccept(allowVideo())} class="hidden" onChange={handleFileSelected} />

      <Show
        when={mediaSrc(props.value)}
        fallback={
          <button
            type="button"
            onClick={openPicker}
            disabled={props.disabled}
            aria-label={props.compact ? props.ariaLabel ?? emptyLabel() : undefined}
            class={`relative flex ${boxClass()} shrink-0 flex-col items-center justify-center gap-2 rounded-card border border-dashed text-ink-gray transition-colors duration-150 hover:border-brand-pink hover:text-brand-pink disabled:cursor-not-allowed disabled:opacity-60`}
            classList={{ "border-system-red": !!error(), "border-border": !error(), "rounded-media": props.compact }}
          >
            <Show when={pending()} fallback={<ImageIcon class={props.compact ? "size-4" : "size-6"} />}>
              <span class="loading loading-spinner loading-sm" aria-hidden="true" />
            </Show>
            <Show when={!props.compact}>
              <span class="text-sm font-medium">{emptyLabel()}</span>
            </Show>
          </button>
        }
      >
        <div class={`group relative ${boxClass()} shrink-0 overflow-hidden border border-border bg-surface-gray/60`} classList={{ "rounded-card": !props.compact, "rounded-media": props.compact }}>
          <button
            type="button"
            onClick={openPicker}
            disabled={props.disabled}
            aria-label={video() ? "เปลี่ยนวิดีโอ" : "เปลี่ยนรูป"}
            class="block size-full disabled:cursor-not-allowed"
          >
            <MediaPreview value={props.value} dimmed={pending()} />
          </button>
          <Show when={pending()}>
            <div class="absolute inset-0 flex items-center justify-center bg-ink/10" aria-hidden="true">
              <span class="loading loading-spinner loading-sm text-white" />
            </div>
          </Show>
          <Show when={!props.compact}>
            <div class="pointer-events-none absolute inset-x-0 bottom-0 bg-ink/60 py-1.5 text-center text-xs font-medium text-white opacity-0 transition-opacity duration-150 lg:group-hover:opacity-100">
              {allowVideo() ? "เปลี่ยนไฟล์" : "เปลี่ยนรูป"}
            </div>
            <Show when={video() && props.showVideoBadge !== false}>
              <VideoBadge class="pointer-events-none absolute left-2 top-2" />
            </Show>
          </Show>
          <Show when={!props.hideRemove && !props.disabled}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                remove();
              }}
              aria-label={video() ? "ลบวิดีโอ" : "ลบรูป"}
              class={`absolute flex items-center justify-center rounded-pill bg-ink/70 text-white ${props.compact ? "right-0.5 top-0.5 size-5" : "right-2 top-2 size-7"}`}
            >
              <CloseXIcon class={props.compact ? "size-2" : "size-3"} />
            </button>
          </Show>
          {props.overlay}
        </div>
      </Show>

      <Show when={error() && !props.onError}>
        <p class="text-xs text-system-red" role="alert">
          {error()}
        </p>
      </Show>

      <Show when={showVideoOptions() && video()}>
        {(v) => <VideoOptionsFields value={v()} onChange={props.onChange} disabled={props.disabled} posterAspectClass={props.posterAspectClass} />}
      </Show>
    </div>
  );
}
