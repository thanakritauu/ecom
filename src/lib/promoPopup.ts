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

/**
 * One popup in Admin's list. `key` never changes (routes, ordering); `id` is
 * the customer-facing campaign id and changes when the content does. The list
 * order is the priority: on a page several popups match, only the first one
 * that may show opens.
 */
export type PromoPopupRecord = PromoPopupContent & {
  key: string;
  /** Staff-facing name in the Admin list. */
  name: string;
  /** แบบร่าง: never shown on the storefront (draft-first rule). */
  draft?: boolean;
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

/** The single popup saved before Admin could hold several; migrated into the list once. */
const LEGACY_POPUP_STORAGE_KEY = "charmiss:admin:promo-popup";
export const PROMO_POPUP_STORAGE_KEY = "charmiss:admin:promo-popups";
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

export const newPromoPopupKey = () => `popup-key-${Date.now().toString(36)}`;

export function buildDefaultPromoPopups(): PromoPopupRecord[] {
  return [{ ...buildDefaultPromoPopup(), key: "popup-main", name: "สมาชิกใหม่รับส่วนลด" }];
}

export function normalizePromoPopupRecord(raw: Partial<PromoPopupRecord>): PromoPopupRecord {
  const content = normalizePromoPopup(raw);
  return { ...content, key: raw.key || newPromoPopupKey(), name: (raw.name ?? content.title ?? "").trim() || "Popup", draft: !!raw.draft || undefined };
}

export function readStoredPromoPopups(): PromoPopupRecord[] {
  if (typeof localStorage === "undefined") return buildDefaultPromoPopups();
  try {
    const raw = localStorage.getItem(PROMO_POPUP_STORAGE_KEY);
    if (raw) return (JSON.parse(raw) as Partial<PromoPopupRecord>[]).map(normalizePromoPopupRecord);
    const legacy = localStorage.getItem(LEGACY_POPUP_STORAGE_KEY);
    if (legacy) {
      const old = JSON.parse(legacy) as PromoPopupContent;
      return [normalizePromoPopupRecord({ ...old, key: "popup-main", name: old.title })];
    }
    return buildDefaultPromoPopups();
  } catch {
    return buildDefaultPromoPopups();
  }
}

export function saveStoredPromoPopups(list: PromoPopupRecord[]) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(PROMO_POPUP_STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event(PROMO_POPUP_CHANGED_EVENT));
  } catch {
    // storage full / unavailable: the storefront keeps the previous popups.
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
 * The popups as Admin last saved them, in priority order. SSR / first paint
 * use the seed (the popup is always closed then anyway); the saved list is
 * read on mount and again whenever Admin saves.
 */
export function useStorefrontPromoPopups(): Accessor<PromoPopupRecord[]> {
  const [state, setState] = createSignal<PromoPopupRecord[]>(buildDefaultPromoPopups());
  onMount(() => {
    const refresh = () => setState(readStoredPromoPopups());
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

/** Per-popup records (popup id -> day shown); the old single-value format reads as one entry. */
function readShown(): Record<string, string> {
  try {
    const raw = localStorage.getItem(SHOWN_KEY);
    if (!raw) return {};
    if (raw.startsWith("{")) return JSON.parse(raw) as Record<string, string>;
    const [id, day] = raw.split("|");
    return id && day ? { [id]: day } : {};
  } catch {
    return {};
  }
}

/** Once a day per popup: the first matching visit of the day opens it; closing it waits for the next day's visit. */
export function wasPromoShownToday(id: string): boolean {
  return readShown()[id] === todayKey();
}

export function markPromoShownToday(id: string) {
  try {
    localStorage.setItem(SHOWN_KEY, JSON.stringify({ ...readShown(), [id]: todayKey() }));
  } catch {
    // storage unavailable (private mode): falls back to once per page load.
  }
}

/** "ไม่ต้องแสดงอีก" ids; the old single-value format reads as one id. */
function readHidden(): string[] {
  try {
    const raw = localStorage.getItem(HIDDEN_KEY);
    if (!raw) return [];
    return raw.startsWith("[") ? (JSON.parse(raw) as string[]) : [raw];
  } catch {
    return [];
  }
}

export function isPromoHidden(id: string): boolean {
  return readHidden().includes(id);
}

export function hidePromoForever(id: string) {
  try {
    localStorage.setItem(HIDDEN_KEY, JSON.stringify([...new Set([...readHidden(), id])]));
  } catch {
    // storage unavailable (private mode): it just shows again next load.
  }
}
