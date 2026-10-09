import { createSignal, onCleanup, onMount, type Accessor } from "solid-js";
import membershipBg from "~/assets/images/membership/membership-bg.png";
import { isVideoMedia, mediaSrc, type MediaValue } from "./media";

/**
 * Storefront promo popup content. Admin edits it at /admin/content/popup; the
 * storefront `PromoPopup.tsx` (mounted once in app.tsx) reads the same
 * localStorage key live and opens on the pages listed in `pages`. `id` keys
 * the "ไม่ต้องแสดงอีก" flag and the once-a-day counter, and Admin gives the
 * popup a new id whenever its content changes, so a new campaign shows again
 * even to someone who hid the previous one.
 */
export type PromoPopupAudience = "guests" | "everyone";

/**
 * Image or MP4 video (`~/lib/media` rules). Old saved popups have no `type`
 * and read as an image. A video needs `poster`; `hasAudio` shows the
 * storefront speaker button.
 */
export type PromoPopupMedia = { src: string; alt: string; type?: "image" | "video"; poster?: string; hasAudio?: boolean };

/** One fixed box for the popup media: always cropped to fill it, centered. */
export const PROMO_POPUP_MEDIA_SIZE = { width: 1080, height: 675, ratio: "16:10" };

/** The popup media as a shared `MediaValue` (for `MediaUploader` / `MediaView`). */
export function promoPopupMediaValue(m: PromoPopupMedia): MediaValue {
  return m.type === "video" ? { type: "video", src: m.src, poster: m.poster ?? "", hasAudio: !!m.hasAudio } : m.src;
}

/** Writes a `MediaValue` back into the popup media, keeping alt. */
export function withPromoPopupMediaValue(m: PromoPopupMedia, v: MediaValue): PromoPopupMedia {
  if (isVideoMedia(v)) return { ...m, type: "video", src: v.src, poster: v.poster ?? "", hasAudio: !!v.hasAudio };
  return { src: mediaSrc(v), alt: m.alt };
}

export type PromoPopupContent = {
  id: string;
  enabled: boolean;
  media: PromoPopupMedia;
  title: string;
  /** `\n` starts a new line. */
  description: string;
  /** Code / condition line, e.g. "ใช้โค้ด SAVE100 ขั้นต่ำ ฿2,000". */
  condition?: string;
  ctaLabel: string;
  /**
   * `guests`: new-member offer, signed-in members never see it and the CTA
   * opens the sign-in / sign-up modal. `everyone`: shown to all, the CTA goes
   * to `ctaUrl`.
   */
  audience: PromoPopupAudience;
  ctaUrl?: string;
  /**
   * Storefront paths the popup opens on, e.g. "/", "/promotion/9-9-beauty-sale".
   * A trailing "*" matches every page under it ("/promotion/*"). Full URLs are
   * stored as their path.
   */
  pages: string[];
  /** Local `YYYY-MM-DDTHH:mm` (datetime-local value). Empty = no limit. */
  startsAt?: string;
  endsAt?: string;
  updatedAt?: string;
};

export const PROMO_POPUP_AUDIENCE_META: Record<PromoPopupAudience, { label: string; hint: string }> = {
  guests: { label: "ผู้ที่ยังไม่ได้เป็นสมาชิก", hint: "สมาชิกที่เข้าสู่ระบบแล้วจะไม่เห็น ปุ่มจะเปิดหน้าต่างสมัครสมาชิก / เข้าสู่ระบบ" },
  everyone: { label: "ทุกคน", hint: "แสดงทั้งลูกค้าทั่วไปและสมาชิก ปุ่มจะพาไปยังลิงก์ที่กำหนด" },
};

export const HOME_PROMO_POPUP: PromoPopupContent = {
  id: "new-member-100",
  enabled: true,
  media: { src: membershipBg, alt: "Charmiss Club" },
  title: "สมาชิกใหม่รับส่วนลด ฿100",
  description: "สมัคร Charmiss Club วันนี้ รับคูปองส่วนลดทันที\nพร้อมสะสมคอยน์ทุกการช้อป",
  ctaLabel: "สมัครสมาชิกเลย",
  audience: "guests",
  pages: ["/"],
};

export const buildDefaultPromoPopup = (): PromoPopupContent => ({ ...HOME_PROMO_POPUP, media: { ...HOME_PROMO_POPUP.media }, pages: [...HOME_PROMO_POPUP.pages] });

/** "https://charmiss.co/promotion/x?a=1#b" / "promotion/x/" -> "/promotion/x". Keeps a trailing "*". */
export function normalizePopupPath(input: string): string {
  let path = input.trim();
  if (!path) return "";
  path = path.replace(/^https?:\/\/[^/]+/i, "");
  path = path.split(/[?#]/)[0];
  if (!path.startsWith("/")) path = `/${path}`;
  const wildcard = path.endsWith("*");
  if (wildcard) path = path.slice(0, -1);
  path = path.replace(/\/+$/, "") || "/";
  return wildcard ? `${path === "/" ? "" : path}/*` : path;
}

/** Whether `pathname` is one of the popup's pages. */
export function isPopupOnPage(pages: string[], pathname: string): boolean {
  const current = normalizePopupPath(pathname);
  return pages.some((p) => {
    if (p.endsWith("/*")) {
      const base = p.slice(0, -2);
      return current === (base || "/") || current.startsWith(`${base}/`);
    }
    return p === current;
  });
}

export const PROMO_POPUP_STORAGE_KEY = "charmiss:admin:promo-popup";
export const PROMO_POPUP_CHANGED_EVENT = "charmiss:promo-popup-changed";

/** The fields a customer sees: any change here means a new campaign (new id). */
export function promoPopupFingerprint(c: PromoPopupContent): string {
  return JSON.stringify([c.media.src, c.media.type ?? "image", c.media.poster ?? "", !!c.media.hasAudio, c.media.alt, c.title, c.description, c.condition ?? "", c.ctaLabel, c.audience, c.ctaUrl ?? ""]);
}

export const newPromoPopupId = () => `popup-${Date.now().toString(36)}`;

export function normalizePromoPopup(raw: Partial<PromoPopupContent> | undefined): PromoPopupContent {
  const seed = buildDefaultPromoPopup();
  if (!raw) return seed;
  return {
    ...seed,
    ...raw,
    media: normalizeMediaFields({ ...seed.media, ...raw.media }),
    enabled: raw.enabled !== false,
    audience: raw.audience === "everyone" ? "everyone" : "guests",
    // Saved before page targeting existed: it was a Home-only popup.
    pages: Array.isArray(raw.pages) ? [...new Set(raw.pages.map(normalizePopupPath).filter(Boolean))] : [...seed.pages],
  };
}

function normalizeMediaFields(m: PromoPopupMedia): PromoPopupMedia {
  const { objectPosition: _dropped, ...rest } = m as PromoPopupMedia & { objectPosition?: string };
  if (rest.type !== "video") return { src: rest.src ?? "", alt: rest.alt ?? "" };
  return { ...rest, poster: typeof rest.poster === "string" ? rest.poster : "", hasAudio: !!rest.hasAudio };
}

export function readStoredPromoPopup(): PromoPopupContent {
  if (typeof localStorage === "undefined") return buildDefaultPromoPopup();
  try {
    const raw = localStorage.getItem(PROMO_POPUP_STORAGE_KEY);
    return raw ? normalizePromoPopup(JSON.parse(raw) as PromoPopupContent) : buildDefaultPromoPopup();
  } catch {
    return buildDefaultPromoPopup();
  }
}

export function saveStoredPromoPopup(content: PromoPopupContent) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(PROMO_POPUP_STORAGE_KEY, JSON.stringify(content));
    window.dispatchEvent(new Event(PROMO_POPUP_CHANGED_EVENT));
  } catch {
    // storage full / unavailable: the storefront keeps the previous popup.
  }
}

/** Inside the optional start / end window (`now` defaults to the current time). */
export function isPromoPopupInSchedule(c: PromoPopupContent, now = Date.now()): boolean {
  const start = c.startsAt ? new Date(c.startsAt).getTime() : NaN;
  const end = c.endsAt ? new Date(c.endsAt).getTime() : NaN;
  if (!Number.isNaN(start) && now < start) return false;
  if (!Number.isNaN(end) && now > end) return false;
  return true;
}

/**
 * The popup as Admin last saved it. SSR / first paint use the seed (the
 * popup is always closed then anyway); the saved copy is read on mount and
 * again whenever Admin saves. Call it before the component's own `onMount`
 * so the stored copy is in place when the open decision runs.
 */
export function useStorefrontPromoPopup(): Accessor<PromoPopupContent> {
  const [state, setState] = createSignal<PromoPopupContent>(buildDefaultPromoPopup());
  onMount(() => {
    const refresh = () => setState(readStoredPromoPopup());
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === PROMO_POPUP_STORAGE_KEY) refresh();
    };
    refresh();
    window.addEventListener("storage", onStorage);
    window.addEventListener(PROMO_POPUP_CHANGED_EVENT, refresh);
    onCleanup(() => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(PROMO_POPUP_CHANGED_EVENT, refresh);
    });
  });
  return state;
}

const HIDDEN_KEY = "charmiss:promo-popup-hidden";
const SHOWN_KEY = "charmiss:promo-popup-shown";

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

/** Once a day: the first storefront visit of the day opens it; closing it waits for the next day's visit. */
export function wasPromoShownToday(id: string): boolean {
  try {
    return localStorage.getItem(SHOWN_KEY) === `${id}|${todayKey()}`;
  } catch {
    return false;
  }
}

export function markPromoShownToday(id: string) {
  try {
    localStorage.setItem(SHOWN_KEY, `${id}|${todayKey()}`);
  } catch {
    // storage unavailable (private mode): falls back to once per page load.
  }
}

export function isPromoHidden(id: string): boolean {
  try {
    return localStorage.getItem(HIDDEN_KEY) === id;
  } catch {
    return false;
  }
}

export function hidePromoForever(id: string) {
  try {
    localStorage.setItem(HIDDEN_KEY, id);
  } catch {
    // storage unavailable (private mode): it just shows again next load.
  }
}
