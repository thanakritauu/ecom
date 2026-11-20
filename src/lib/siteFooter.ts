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
  /** 2 = the policy pages sit together under ช่วยเหลือ (`migrateFooterLayout`). Unset = saved before that. */
  layoutVersion?: number;
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
          link("help-track", INFO_PAGES.tracking),
          link("help-how-to-order", INFO_PAGES.howToOrder),
          link("help-shipping", INFO_PAGES.shipping),
          link("about-return", INFO_PAGES.returnPolicy),
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
          link("about-careers", INFO_PAGES.careers),
        ],
      },
    ],
    contact: { address: CONTACT.address, phoneLabel: CONTACT.phoneLabel, email: CONTACT.email, hours: CONTACT.hours },
    social: FOOTER_SOCIAL_PLATFORMS.map((platform) => ({ platform, href: SOCIAL_LINKS[platform].href, enabled: true })),
    copyright: "© 2026 Charmiss. All Rights Reserved.",
    legalLinks: [link("legal-terms", INFO_PAGES.terms), link("legal-privacy", INFO_PAGES.privacy)],
    layoutVersion: FOOTER_LAYOUT_VERSION,
  };
}

const FOOTER_LAYOUT_VERSION = 2;

/**
 * A footer saved before layout 2: "การจัดส่ง" becomes "เงื่อนไขการจัดส่ง" (the name Checkout's consent uses) and
 * "นโยบายคืนสินค้า" moves from เกี่ยวกับ Charmiss to ช่วยเหลือ, right after it. Once only: the result carries
 * layout 2, so whatever Admin saves after that is kept as is.
 */
function migrateFooterLayout(columns: FooterColumn[]): FooterColumn[] {
  const help = columns.find((c) => c.id === "help");
  const rename = (l: FooterLink) => (l.id === "help-shipping" && l.label === "การจัดส่ง" ? { ...l, label: INFO_PAGES.shipping.label } : l);
  let moved: FooterLink | undefined;
  const without = columns.map((c) => {
    if (c === help) return c;
    const found = c.links.find((l) => l.id === "about-return");
    if (found) moved = found;
    return found ? { ...c, links: c.links.filter((l) => l !== found) } : c;
  });
  return without.map((c) => {
    if (c !== help) return { ...c, links: c.links.map(rename) };
    const links = c.links.map(rename);
    if (!moved || links.some((l) => l.id === moved!.id)) return { ...c, links };
    const at = links.findIndex((l) => l.id === "help-shipping");
    return { ...c, links: at < 0 ? [...links, moved] : [...links.slice(0, at + 1), moved, ...links.slice(at + 1)] };
  });
}

/** "(+66) 61 172 7257" -> "tel:+66611727257". */
export function footerPhoneHref(phoneLabel: string): string {
  const digits = phoneLabel.replace(/[^\d+]/g, "");
  return digits ? `tel:${digits}` : "";
}

/** Fills anything missing from an older / partial save with the seed. */
/** "ติดตามคำสั่งซื้อ" used to point at /account; a footer saved before its own page existed follows it there. */
const footerHref = (l: FooterLink) => (l.id === "help-track" && l.href === "/account" ? INFO_PAGES.tracking.href : String(l.href ?? ""));

export function normalizeFooterContent(raw: Partial<FooterContent> | undefined): FooterContent {
  const seed = buildDefaultFooterContent();
  if (!raw) return seed;
  const cleanLinks = (links: unknown): FooterLink[] =>
    Array.isArray(links)
      ? links
          .filter((l): l is FooterLink => !!l && typeof l === "object")
          .map((l) => ({ id: l.id || newFooterLinkId(), label: String(l.label ?? ""), href: footerHref(l) }))
      : [];
  const social = FOOTER_SOCIAL_PLATFORMS.map((platform) => {
    const saved = Array.isArray(raw.social) ? raw.social.find((s) => s?.platform === platform) : undefined;
    const base = seed.social.find((s) => s.platform === platform)!;
    return saved ? { platform, href: String(saved.href ?? ""), enabled: saved.enabled !== false } : base;
  });
  return {
    columns: Array.isArray(raw.columns)
      ? ((cols) => (raw.layoutVersion === FOOTER_LAYOUT_VERSION ? cols : migrateFooterLayout(cols)))(
          raw.columns.map((c, i) => ({ id: c?.id || `col-${i}`, title: String(c?.title ?? ""), links: cleanLinks(c?.links) })),
        )
      : seed.columns,
    contact: { ...seed.contact, ...raw.contact },
    social,
    copyright: typeof raw.copyright === "string" ? raw.copyright : seed.copyright,
    legalLinks: Array.isArray(raw.legalLinks) ? cleanLinks(raw.legalLinks) : seed.legalLinks,
    updatedAt: raw.updatedAt,
    layoutVersion: FOOTER_LAYOUT_VERSION,
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
