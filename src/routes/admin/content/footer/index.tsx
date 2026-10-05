import { For } from "solid-js";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { StatusBadge } from "~/components/admin/StatusBadge";
import { STOREFRONT_CATEGORY_ROUTE_SLUGS } from "~/lib/adminCategories";

/**
 * Storefront sync — read-only mirror of `Footer.tsx`. The footer's columns,
 * contact block, social links and legal row are hardcoded in that component
 * (no Admin data behind them yet), so this page only *shows* them, plus
 * whether each link lands on a real storefront page today, so a stale link
 * is visible here instead of being discovered by a customer. Mock copy —
 * keep in step with `Footer.tsx` by hand until the footer becomes data.
 */
type FooterLink = { label: string; href: string };

const FOOTER_COLUMNS: { title: string; links: FooterLink[] }[] = [
  {
    title: "ช่วยเหลือ",
    links: [
      { label: "ติดตามคำสั่งซื้อ", href: "/account" },
      { label: "วิธีสั่งซื้อ", href: "/help/how-to-order" },
      { label: "การจัดส่ง", href: "/help/shipping" },
      { label: "คำถามที่พบบ่อย", href: "/help/faq" },
    ],
  },
  {
    title: "ช้อปปิ้ง",
    links: [
      { label: "สินค้าทั้งหมด", href: "/products" },
      { label: "กำลังฮิต", href: "/promotion/trending" },
      { label: "มาใหม่", href: "/promotion/new-arrivals" },
      { label: "โปรโมชัน", href: "/promotion/promotions" },
    ],
  },
  {
    title: "เกี่ยวกับ Charmiss",
    links: [
      { label: "ติดต่อเรา", href: "/about/contact" },
      { label: "เกี่ยวกับเรา", href: "/about" },
      { label: "นโยบายคืนสินค้า", href: "/about/return-policy" },
      { label: "ร่วมงานกับเรา", href: "/about/careers" },
    ],
  },
];

const FOOTER_CONTACT = [
  "188/49 โครงการ DRAGON TOWN อาคาร C14 ถนนจรัสเมือง แขวงวังใหม่ เขตปทุมวัน กรุงเทพมหานคร 10330",
  "(+66) 61 172 7257",
  "hello@charmiss.co",
  "จันทร์ - ศุกร์: 09:00 - 18:00 น.",
];

const FOOTER_SOCIAL: FooterLink[] = [
  { label: "Instagram", href: "/social/instagram" },
  { label: "TikTok", href: "/social/tiktok" },
  { label: "Facebook", href: "/social/facebook" },
  { label: "YouTube", href: "/social/youtube" },
];

const FOOTER_LEGAL: FooterLink[] = [
  { label: "เงื่อนไขการใช้งาน", href: "/legal/terms" },
  { label: "นโยบายความเป็นส่วนตัว", href: "/legal/privacy" },
];

/** Static mirror of `src/routes` (storefront side) — anything else falls through to the `[...path]` catch-all screen. */
const LIVE_EXACT = new Set(["/", "/products", "/cart", "/checkout", "/account", "/login", "/register", "/account/address", "/account/cards", "/account/points", "/account/profile", "/account/wishlist"]);
const LIVE_PREFIXES = ["/promotion/", "/product/", "/account/orders/"];

function isLiveHref(href: string): boolean {
  if (LIVE_EXACT.has(href)) return true;
  if (STOREFRONT_CATEGORY_ROUTE_SLUGS.some((slug) => href === `/${slug}`)) return true;
  return LIVE_PREFIXES.some((prefix) => href.startsWith(prefix) && href.length > prefix.length);
}

export default function AdminFooterPage() {
  return (
    <div class="flex flex-col gap-6">
      <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "จัดการเนื้อหา", href: "/admin/promotion-pages" }, { label: "Footer" }]} />
      <PageHeader title="Footer" description="ข้อมูลส่วนท้ายของทุกหน้าบนหน้าร้าน (ดูอย่างเดียว) — ปัจจุบันเป็นเนื้อหาคงที่ในโค้ดของหน้าร้าน ยังแก้ไขจากระบบหลังบ้านไม่ได้" />

      <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <For each={FOOTER_COLUMNS}>
          {(col) => (
            <div class="flex flex-col gap-3 rounded-card bg-surface-card p-4 shadow-card sm:p-5">
              <h2 class="text-base font-semibold text-ink">{col.title}</h2>
              <ul class="flex flex-col divide-y divide-border">
                <For each={col.links}>{(link) => <LinkRow link={link} />}</For>
              </ul>
            </div>
          )}
        </For>
      </div>

      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div class="flex flex-col gap-3 rounded-card bg-surface-card p-4 shadow-card sm:p-5">
          <h2 class="text-base font-semibold text-ink">ข้อมูลติดต่อ</h2>
          <ul class="flex flex-col gap-1.5 text-sm text-ink">
            <For each={FOOTER_CONTACT}>{(line) => <li>{line}</li>}</For>
          </ul>
          <h3 class="pt-2 text-sm font-semibold text-ink">โซเชียลมีเดีย</h3>
          <p class="text-xs text-ink-gray">ยังเป็นลิงก์ชั่วคราว — รอ URL โปรไฟล์จริง</p>
          <ul class="flex flex-col divide-y divide-border">
            <For each={FOOTER_SOCIAL}>{(link) => <LinkRow link={link} />}</For>
          </ul>
        </div>

        <div class="flex flex-col gap-3 rounded-card bg-surface-card p-4 shadow-card sm:p-5">
          <h2 class="text-base font-semibold text-ink">แถบล่างสุด</h2>
          <p class="text-sm text-ink">© 2026 Charmiss. All Rights Reserved.</p>
          <ul class="flex flex-col divide-y divide-border">
            <For each={FOOTER_LEGAL}>{(link) => <LinkRow link={link} />}</For>
          </ul>
          <p class="text-xs text-ink-gray">ฟอร์มรับข่าวสาร (Newsletter) ถูกซ่อนไว้บนหน้าร้านในตอนนี้</p>
        </div>
      </div>
    </div>
  );
}

function LinkRow(props: { link: FooterLink }) {
  const live = () => isLiveHref(props.link.href);
  return (
    <li class="flex items-start justify-between gap-3 py-2">
      <div class="min-w-0">
        <p class="text-sm font-medium text-ink">{props.link.label}</p>
        <p class="truncate text-xs text-ink-gray">{props.link.href}</p>
      </div>
      <StatusBadge tone={live() ? "success" : "warning"}>{live() ? "มีหน้า" : "ยังไม่มีหน้า"}</StatusBadge>
    </li>
  );
}
