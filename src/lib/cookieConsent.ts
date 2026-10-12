import { createSignal } from "solid-js";

/**
 * Cookie consent (PDPA): strictly necessary cookies are always on; analytics
 * and marketing need an opt-in. The choice is stored in this browser with the
 * policy version and time, and can be changed any time from the Footer's
 * "ตั้งค่าคุกกี้". Scripts that set non-necessary cookies must check
 * `hasCookieConsent(...)` before loading.
 */
export type CookieCategory = "necessary" | "analytics" | "marketing";

export type CookieConsent = {
  version: number;
  analytics: boolean;
  marketing: boolean;
  /** ISO time of the visitor's last choice. */
  decidedAt: string;
};

/** Bump when the categories or policy change so everyone is asked again. */
export const COOKIE_CONSENT_VERSION = 1;
const STORAGE_KEY = "charmiss:cookie-consent";

export const COOKIE_CATEGORIES: { id: CookieCategory; title: string; description: string }[] = [
  {
    id: "necessary",
    title: "คุกกี้ที่จำเป็น",
    description: "ช่วยให้เว็บไซต์ทำงานได้ เช่น การเข้าสู่ระบบ ตะกร้าสินค้า และการชำระเงิน ปิดไม่ได้",
  },
  {
    id: "analytics",
    title: "คุกกี้เพื่อการวิเคราะห์",
    description: "ช่วยให้เราเข้าใจว่าลูกค้าใช้งานเว็บไซต์อย่างไร เพื่อนำไปปรับปรุงให้ดีขึ้น",
  },
  {
    id: "marketing",
    title: "คุกกี้เพื่อการตลาด",
    description: "ใช้แสดงโปรโมชั่นและโฆษณาที่ตรงกับความสนใจของคุณ ทั้งบนเว็บไซต์นี้และช่องทางอื่น",
  },
];

export function readCookieConsent(): CookieConsent | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as Partial<CookieConsent>;
    if (c.version !== COOKIE_CONSENT_VERSION) return null;
    return { version: c.version, analytics: !!c.analytics, marketing: !!c.marketing, decidedAt: c.decidedAt ?? "" };
  } catch {
    return null;
  }
}

export function saveCookieConsent(choice: { analytics: boolean; marketing: boolean }): CookieConsent {
  const consent: CookieConsent = { version: COOKIE_CONSENT_VERSION, ...choice, decidedAt: new Date().toISOString() };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
  } catch {
    // storage unavailable (private mode): the bar simply asks again next visit.
  }
  return consent;
}

export function hasCookieConsent(category: CookieCategory): boolean {
  if (category === "necessary") return true;
  return readCookieConsent()?.[category] ?? false;
}

/** Lets the Footer's "ตั้งค่าคุกกี้" open the settings sheet owned by `CookieConsent.tsx`. */
const [settingsOpen, setSettingsOpen] = createSignal(false);
export const cookieSettingsOpen = settingsOpen;
export const openCookieSettings = () => setSettingsOpen(true);
export const setCookieSettingsOpen = setSettingsOpen;

/**
 * `true` once the visitor has made a cookie choice (stored from an earlier
 * visit, or just now). The promo popup waits for it, so the cookie bar always
 * comes first and the two never show at the same time.
 */
const [consentSettled, setConsentSettled] = createSignal(false);
export const cookieConsentSettled = consentSettled;
export const markCookieConsentSettled = () => setConsentSettled(true);
