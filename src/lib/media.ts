/**
 * One media value for every upload slot that may hold an image OR a video
 * (Home hero, promotion page banners, product gallery, later the home popup).
 *
 * Backward compatible by design: a plain string is an image URL, exactly what
 * every one of these fields stored before video existed, so old localStorage
 * data needs no migration. A video is always stored as a `MediaItem` with
 * `type: "video"` plus its required poster image. Uploaders still write images
 * as plain strings, so image data keeps the shape it always had.
 */
export type MediaType = "image" | "video";

export type MediaItem = {
  type: MediaType;
  src: string;
  /** Video only: the cover image shown while loading, in product cards, and alone for Save-Data / reduced-motion visitors. Required to save. */
  poster?: string;
  /** Video only: admin toggle "วิดีโอนี้มีเสียง". Playback always starts muted; when true the storefront shows a mute/unmute button. */
  hasAudio?: boolean;
};

export type MediaValue = string | MediaItem;

/** Desktop / tablet / mobile crops, each independently an image or a video. */
export type ResponsiveMediaSet = { desktop: MediaValue; tablet: MediaValue; mobile: MediaValue };

export type VideoMediaItem = MediaItem & { type: "video" };

/** Reads anything that came out of localStorage (string, object, junk) back into a valid `MediaValue`. Images collapse back to plain strings. */
export function normalizeMedia(raw: unknown): MediaValue {
  if (typeof raw === "string") return raw;
  if (!raw || typeof raw !== "object") return "";
  const o = raw as Partial<MediaItem>;
  const src = typeof o.src === "string" ? o.src : "";
  if (o.type !== "video") return src;
  return { type: "video", src, poster: typeof o.poster === "string" ? o.poster : "", hasAudio: !!o.hasAudio };
}

export function normalizeMediaSet(raw: Partial<Record<keyof ResponsiveMediaSet, unknown>> | undefined): ResponsiveMediaSet {
  return { desktop: normalizeMedia(raw?.desktop), tablet: normalizeMedia(raw?.tablet), mobile: normalizeMedia(raw?.mobile) };
}

export function isVideoMedia(v: MediaValue | undefined | null): v is VideoMediaItem {
  return !!v && typeof v === "object" && v.type === "video";
}

/** The value as a video item, or undefined (handy for `<Show when={asVideo(v)}>`). */
export function asVideo(v: MediaValue | undefined | null): VideoMediaItem | undefined {
  return isVideoMedia(v) ? v : undefined;
}

/** The file URL itself (image URL or video URL). */
export function mediaSrc(v: MediaValue | undefined | null): string {
  if (!v) return "";
  return typeof v === "string" ? v : v.src;
}

/** The still image that represents this media: the image itself, or a video's poster. Use this anywhere only a picture fits (cards, thumbnails, lists, cart). */
export function mediaImage(v: MediaValue | undefined | null): string {
  if (!v) return "";
  if (typeof v === "string") return v;
  return v.type === "video" ? v.poster ?? "" : v.src;
}

export function hasMedia(v: MediaValue | undefined | null): boolean {
  return !!mediaSrc(v);
}

/** Frees the blob URLs an upload created (video file + poster), same convention as the image uploaders. */
export function revokeMedia(v: MediaValue | undefined | null) {
  for (const url of [mediaSrc(v), isVideoMedia(v) ? v.poster : undefined]) {
    if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
  }
}

/** Save-time check: every video must have a poster. `label` names the slot in the message, e.g. "แบนเนอร์เดสก์ท็อป". */
export function mediaErrors(v: MediaValue | undefined | null, label: string): string[] {
  return isVideoMedia(v) && v.src && !v.poster ? [`${label} เป็นวิดีโอ กรุณาใส่ภาพปกวิดีโอ`] : [];
}

/* ------------------------------------------------------------------ */
/* Upload rules                                                        */
/* ------------------------------------------------------------------ */

export const VIDEO_RULES = { mime: "video/mp4", maxBytes: 5 * 1024 * 1024, maxSeconds: 15, maxWidth: 1920 } as const;

/** `accept` for a file input: images as today, plus MP4 when video is allowed. */
export function mediaAccept(allowVideo: boolean): string {
  return allowVideo ? `image/*,${VIDEO_RULES.mime}` : "image/*";
}

/** Helper text shown next to every slot that accepts video, in the same spot as the image size hint. */
export const VIDEO_RULE_HINT = "วิดีโอ: MP4 (H.264) ไม่เกิน 5MB ยาวไม่เกิน 15 วินาที กว้างไม่เกิน 1920px และต้องมีภาพปก";

const VIDEO_ERROR = {
  format: "รองรับวิดีโอเฉพาะไฟล์ MP4 (H.264) เท่านั้น",
  codec: "วิดีโอนี้ไม่ได้เข้ารหัสแบบ H.264 กรุณาแปลงไฟล์ก่อนอัปโหลด",
  size: "ไฟล์วิดีโอใหญ่เกิน 5MB กรุณาลดขนาดไฟล์",
  duration: "วิดีโอยาวเกิน 15 วินาที กรุณาตัดให้สั้นลง",
  width: "วิดีโอกว้างเกิน 1920px กรุณาลดขนาดภาพ",
  unreadable: "เปิดไฟล์วิดีโอนี้ไม่ได้ กรุณาลองแปลงเป็น MP4 (H.264) อีกครั้ง",
  notMedia: "รองรับเฉพาะไฟล์รูปภาพหรือวิดีโอ MP4",
  notImage: "รองรับเฉพาะไฟล์รูปภาพ",
} as const;

function readVideoMetadata(url: string): Promise<{ duration: number; width: number } | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    const done = (result: { duration: number; width: number } | null) => {
      video.removeAttribute("src");
      video.load();
      resolve(result);
    };
    video.onloadedmetadata = () => done({ duration: video.duration, width: video.videoWidth });
    video.onerror = () => done(null);
    video.src = url;
  });
}

/** MP4 sample entries: `avc1`/`avc3` = H.264. HEVC/AV1/VP9 files are also `.mp4` but many phones can't play them. */
async function detectVideoCodec(file: File): Promise<"h264" | "other" | "unknown"> {
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const has = (tag: string) => {
      const [a, b, c, d] = [...tag].map((ch) => ch.charCodeAt(0));
      for (let i = 0; i < bytes.length - 3; i++) {
        if (bytes[i] === a && bytes[i + 1] === b && bytes[i + 2] === c && bytes[i + 3] === d) return true;
      }
      return false;
    };
    if (has("avc1") || has("avc3")) return "h264";
    if (has("hvc1") || has("hev1") || has("av01") || has("vp09")) return "other";
    return "unknown";
  } catch {
    return "unknown";
  }
}

export type PreparedMedia = { ok: true; value: MediaValue } | { ok: false; error: string };

/**
 * Turns one picked file into a `MediaValue` (Object URL, no server in this
 * mock app), enforcing the video spec. Images become a plain string; a video
 * becomes `{ type: "video", src, poster: "", hasAudio: false }` and still
 * needs its poster before the form can save.
 */
export async function prepareMediaFile(file: File, opts: { allowVideo: boolean }): Promise<PreparedMedia> {
  if (file.type.startsWith("image/")) return { ok: true, value: URL.createObjectURL(file) };
  if (!opts.allowVideo) return { ok: false, error: VIDEO_ERROR.notImage };
  if (!file.type.startsWith("video/")) return { ok: false, error: VIDEO_ERROR.notMedia };
  if (file.type !== VIDEO_RULES.mime) return { ok: false, error: VIDEO_ERROR.format };
  if (file.size > VIDEO_RULES.maxBytes) return { ok: false, error: VIDEO_ERROR.size };
  if ((await detectVideoCodec(file)) === "other") return { ok: false, error: VIDEO_ERROR.codec };

  const url = URL.createObjectURL(file);
  const meta = await readVideoMetadata(url);
  const fail = (error: string): PreparedMedia => {
    URL.revokeObjectURL(url);
    return { ok: false, error };
  };
  if (!meta) return fail(VIDEO_ERROR.unreadable);
  // Small tolerance: encoders often round a 15s clip to 15.02s.
  if (meta.duration > VIDEO_RULES.maxSeconds + 0.1) return fail(VIDEO_ERROR.duration);
  if (meta.width > VIDEO_RULES.maxWidth) return fail(VIDEO_ERROR.width);
  return { ok: true, value: { type: "video", src: url, poster: "", hasAudio: false } };
}
