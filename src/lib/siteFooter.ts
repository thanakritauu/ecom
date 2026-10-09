import { createSignal, onCleanup, onMount, type Accessor } from "solid-js";
import { CONTACT, INFO_PAGES, SOCIAL_LINKS } from "./siteInfo";

/**
 * Storefront footer content (`~/components/shared/Footer.tsx`) as data.
 * Admin edits it at /admin/content/footer; the storefront reads the same
 * localStorage key live. Seed = exactly what the footer shipped with (built
 * from `siteInfo.ts`, which the info pages keep reading on their own).
 */
export type FooterLink = { id: string; label: string; href: string };
export type FooterColumn = { id: string; title: string; links: FooterLink[] };

export type FooterSocialPlatform = "line" | "instagram" | "tiktok" | "facebook" | "youtube";
export type FooterSocialLink = { platform: FooterSocialPlatform; href: string; enabled: boolean };

export type FooterContact = { address: string; phoneLabel: string; email: string; hours: string };

export type FooterContent = {
  columns: FooterColumn[];
  contact: FooterContact;
  social: FooterSocialLink[];
  copyright: string;
  legalLinks: FooterLink[];
  updatedAt?: string;
};

/** Fixed icon order on the storefront (LINE first). */
export const FOOTER_SOCIAL_PLATFORMS: FooterSocialPlatform[] = ["line", "instagram", "tiktok", "facebook", "youtube"];

export const FOOTER_SOCIAL_LABELS: Record<FooterSocialPlatform, string> = {
  line: SOCIAL_LINKS.line.label,
  instagram: SOCIAL_LINKS.instagram.label,
  tiktok: SOCIAL_LINKS.tiktok.label,
  facebook: SOCIAL_LINKS.facebook.label,
  youtube: SOCIAL_LINKS.youtube.label,
};

export const FOOTER_STORAGE_KEY = "charmiss:admin:footer";
/** Same-tab signal after Admin saves (the `storage` event only reaches other tabs). */
export const FOOTER_CHANGED_EVENT = "charmiss:footer-changed";

let linkSeq = 0;
export const newFooterLinkId = () => `fl-${Date.now().toString(36)}-${(linkSeq++).toString(36)}`;

const link = (id: string, l: { label: string; href: string }): FooterLink => ({ id, label: l.label, href: l.href });

export function buildDefaultFooterContent(): FooterContent {
  return {
    columns: [
      {
        id: "help",
        title: "ช่วยเหลือ",
        links: [
          link("help-track", { label: "ติดตามคำสั่งซื้อ", href: "/account" }),
          link("help-how-to-order", INFO_PAGES.howToOrder),
          link("help-shipping", INFO_PAGES.shipping),
          link("help-faq", INFO_PAGES.faq),
        ],
      },
      {
        id: "shop",
        title: "ช้อปปิ้ง",
        links: [
          link("shop-all", { label: "สินค้าทั้งหมด", href: "/products" }),
          link("shop-trending", { label: "กำลังฮิต", href: "/promotion/trending" }),
          link("shop-new", { label: "มาใหม่", href: "/promotion/new-arrivals" }),
          link("shop-promotions", { label: "โปรโมชัน", href: "/promotion/promotions" }),
        ],
      },
      {
        id: "about",
        title: "เกี่ยวกับ Charmiss",
        links: [
          link("about-contact", INFO_PAGES.contact),
          link("about-about", INFO_PAGES.about),
          link("about-return", INFO_PAGES.returnPolicy),
          link("about-careers", INFO_PAGES.careers),
        ],
      },
    ],
    contact: { address: CONTACT.address, phoneLabel: CONTACT.phoneLabel, email: CONTACT.email, hours: CONTACT.hours },
    social: FOOTER_SOCIAL_PLATFORMS.map((platform) => ({ platform, href: SOCIAL_LINKS[platform].href, enabled: true })),
    copyright: "© 2026 Charmiss. All Rights Reserved.",
    legalLinks: [link("legal-terms", INFO_PAGES.terms), link("legal-privacy", INFO_PAGES.privacy)],
  };
}

/** "(+66) 61 172 7257" -> "tel:+66611727257". */
export function footerPhoneHref(phoneLabel: string): string {
  const digits = phoneLabel.replace(/[^\d+]/g, "");
  return digits ? `tel:${digits}` : "";
}

/** Fills anything missing from an older / partial save with the seed. */
export function normalizeFooterContent(raw: Partial<FooterContent> | undefined): FooterContent {
  const seed = buildDefaultFooterContent();
  if (!raw) return seed;
  const cleanLinks = (links: unknown): FooterLink[] =>
    Array.isArray(links)
      ? links
          .filter((l): l is FooterLink => !!l && typeof l === "object")
          .map((l) => ({ id: l.id || newFooterLinkId(), label: String(l.label ?? ""), href: String(l.href ?? "") }))
      : [];
  const social = FOOTER_SOCIAL_PLATFORMS.map((platform) => {
    const saved = Array.isArray(raw.social) ? raw.social.find((s) => s?.platform === platform) : undefined;
    const base = seed.social.find((s) => s.platform === platform)!;
    return saved ? { platform, href: String(saved.href ?? ""), enabled: saved.enabled !== false } : base;
  });
  return {
    columns: Array.isArray(raw.columns)
      ? raw.columns.map((c, i) => ({ id: c?.id || `col-${i}`, title: String(c?.title ?? ""), links: cleanLinks(c?.links) }))
      : seed.columns,
    contact: { ...seed.contact, ...raw.contact },
    social,
    copyright: typeof raw.copyright === "string" ? raw.copyright : seed.copyright,
    legalLinks: Array.isArray(raw.legalLinks) ? cleanLinks(raw.legalLinks) : seed.legalLinks,
    updatedAt: raw.updatedAt,
  };
}

/** Saved footer (or the seed). Safe on the server. */
export function readStoredFooter(): FooterContent {
  if (typeof localStorage === "undefined") return buildDefaultFooterContent();
  try {
    const raw = localStorage.getItem(FOOTER_STORAGE_KEY);
    return raw ? normalizeFooterContent(JSON.parse(raw) as FooterContent) : buildDefaultFooterContent();
  } catch {
    return buildDefaultFooterContent();
  }
}

export function saveStoredFooter(content: FooterContent) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(FOOTER_STORAGE_KEY, JSON.stringify(content));
    window.dispatchEvent(new Event(FOOTER_CHANGED_EVENT));
  } catch {
    // storage full / unavailable: the storefront keeps the previous copy.
  }
}

/**
 * The footer as Admin last saved it. SSR and the first client paint use the
 * seed (no hydration mismatch); the saved copy is read on mount and again
 * whenever Admin saves.
 */
export function useStorefrontFooter(): Accessor<FooterContent> {
  const [state, setState] = createSignal<FooterContent>(buildDefaultFooterContent());
  onMount(() => {
    const refresh = () => setState(readStoredFooter());
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === FOOTER_STORAGE_KEY) refresh();
    };
    refresh();
    window.addEventListener("storage", onStorage);
    window.addEventListener(FOOTER_CHANGED_EVENT, refresh);
    onCleanup(() => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(FOOTER_CHANGED_EVENT, refresh);
    });
  });
  return state;
}
