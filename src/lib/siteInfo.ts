/**
 * Company contact details + the help/about/legal page list — one source for
 * the Footer (contact block, sitemap columns) and the info pages' own
 * sidebar/contact cards, so the address or a page title is never typed twice.
 */
export const CONTACT = {
  address: "188/49 โครงการ DRAGON TOWN อาคาร C14 ถนนจรัสเมือง แขวงวังใหม่ เขตปทุมวัน กรุงเทพมหานคร 10330",
  phoneLabel: "(+66) 61 172 7257",
  phoneHref: "tel:+66611727257",
  email: "hello@charmiss.co",
  hours: "จันทร์ - ศุกร์: 09:00 - 18:00 น.",
  lineId: "@charmiss",
} as const;

/** Official profiles — LINE first (Footer order). External links: open in a new tab. */
export const SOCIAL_LINKS = {
  line: { label: "LINE", href: "https://page.line.me/charmiss?openQrModal=true" },
  instagram: { label: "Instagram", href: "https://www.instagram.com/charmiss.cosmetics/" },
  tiktok: { label: "TikTok", href: "https://www.tiktok.com/@charmiss_official" },
  facebook: { label: "Facebook", href: "https://www.facebook.com/Charmiss" },
  youtube: { label: "YouTube", href: "https://www.youtube.com/@charmisscosmetics" },
} as const;

export type InfoPageLink = { label: string; href: string };

export const INFO_PAGES = {
  howToOrder: { label: "วิธีสั่งซื้อ", href: "/help/how-to-order" },
  shipping: { label: "การจัดส่ง", href: "/help/shipping" },
  faq: { label: "คำถามที่พบบ่อย", href: "/help/faq" },
  contact: { label: "ติดต่อเรา", href: "/about/contact" },
  about: { label: "เกี่ยวกับเรา", href: "/about" },
  returnPolicy: { label: "นโยบายคืนสินค้า", href: "/about/return-policy" },
  careers: { label: "ร่วมงานกับเรา", href: "/about/careers" },
  terms: { label: "เงื่อนไขการใช้งาน", href: "/legal/terms" },
  privacy: { label: "นโยบายความเป็นส่วนตัว", href: "/legal/privacy" },
} satisfies Record<string, InfoPageLink>;

/** Sidebar groups on the info pages — same grouping as the Footer's columns, plus the legal pair from the Footer's bottom row. */
export const INFO_PAGE_GROUPS: { title: string; links: InfoPageLink[] }[] = [
  { title: "ช่วยเหลือ", links: [INFO_PAGES.howToOrder, INFO_PAGES.shipping, INFO_PAGES.faq] },
  { title: "เกี่ยวกับ Charmiss", links: [INFO_PAGES.about, INFO_PAGES.contact, INFO_PAGES.returnPolicy, INFO_PAGES.careers] },
  { title: "ข้อกำหนด", links: [INFO_PAGES.terms, INFO_PAGES.privacy] },
];
