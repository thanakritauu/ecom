import { createSignal, For, Show } from "solid-js";
import { Container } from "./Container";
import { Accordion } from "./Accordion";
import { Button } from "./Button";
import logo from "~/assets/icons/logo-charmiss-footer.svg";
import iconInstagram from "~/assets/icons/social-instagram.svg";
import iconTiktok from "~/assets/icons/social-tiktok.svg";
import iconFacebook from "~/assets/icons/social-facebook.svg";
import iconYoutube from "~/assets/icons/social-youtube.svg";

// `href` on every link so none of them fall back to a dead `href="#"` — items
// that already have a real destination elsewhere in the nav (กำลังฮิต/มาใหม่/
// โปรโมชัน) point at that same URL; everything else routes to the
// catch-all's out-of-scope screen instead of going nowhere.
const footerColumns = [
  {
    id: "help",
    title: "ช่วยเหลือ",
    links: [
      { label: "ติดตามคำสั่งซื้อ", href: "/account/orders" },
      { label: "วิธีสั่งซื้อ", href: "/help/how-to-order" },
      { label: "การจัดส่ง", href: "/help/shipping" },
      { label: "คำถามที่พบบ่อย", href: "/help/faq" },
    ],
  },
  {
    id: "shop",
    title: "ช้อปปิ้ง",
    links: [
      { label: "สินค้าทั้งหมด", href: "/category/all" },
      { label: "กำลังฮิต", href: "/trending" },
      { label: "มาใหม่", href: "/new" },
      { label: "โปรโมชัน", href: "/promotions" },
    ],
  },
  {
    id: "about",
    title: "เกี่ยวกับ Charmiss",
    links: [
      { label: "ติดต่อเรา", href: "/about/contact" },
      { label: "เกี่ยวกับเรา", href: "/about" },
      { label: "นโยบายคืนสินค้า", href: "/about/return-policy" },
      { label: "ร่วมงานกับเรา", href: "/about/careers" },
    ],
  },
];

// Built once, at module scope, and passed as a stable reference — Accordion's
// <For each={props.items}> re-reads the `items` prop getter; an inline
// `.map()` there re-creates JSX on every read and breaks hydration (this bit
// us for real in ReviewsSection's carousel slides — see the note there).
const footerAccordionItems = footerColumns.map((col) => ({
  id: col.id,
  trigger: col.title,
  content: (
    <div class="flex flex-col gap-3">
      <For each={col.links}>
        {(link) => (
          <a href={link.href} class="text-sm text-white/90 hover:underline">
            {link.label}
          </a>
        )}
      </For>
    </div>
  ),
}));

// href is a placeholder route, not the real external profile URL — nobody
// has supplied the actual Instagram/TikTok/Facebook/YouTube links yet, and
// pointing these at a guessed real-looking external URL would be worse than
// routing to the same out-of-scope screen everything else here uses. Swap
// in the real profile URLs (as plain external `<a>`s) once they're provided.
const socialLinks = [
  { icon: iconInstagram, label: "Instagram", href: "/social/instagram" },
  { icon: iconTiktok, label: "TikTok", href: "/social/tiktok" },
  { icon: iconFacebook, label: "Facebook", href: "/social/facebook" },
  { icon: iconYoutube, label: "YouTube", href: "/social/youtube" },
];

export function Footer() {
  return (
    <footer class="flex flex-col gap-6 bg-brand-pink pt-12 text-white">
      <Container width="wide" class="flex flex-col gap-8">
        <div class="flex flex-col gap-8 lg:flex-row lg:flex-wrap lg:items-start lg:justify-between lg:gap-y-10">
          <div class="flex flex-col gap-6 lg:w-[310px]">
            {/* `self-start` stops this flex-col parent's default
                `align-items: stretch` from stretching the image to the
                column's full (310px desktop / full-width mobile) cross-axis
                width while height stays pinned at h-8 — that mismatch was
                distorting the logo's aspect ratio on every breakpoint. */}
            <img src={logo} alt="Charmiss" class="h-8 w-auto self-start" />
            <ContactDetails />
          </div>

          {/* Desktop sitemap: plain columns */}
          <div class="hidden lg:flex lg:gap-16">
            <For each={footerColumns}>
              {(col) => (
                <div class="flex w-40 shrink-0 flex-col gap-4">
                  <p class="font-medium text-white">{col.title}</p>
                  <For each={col.links}>
                    {(link) => (
                      <a href={link.href} class="text-sm text-white/90 hover:underline">
                        {link.label}
                      </a>
                    )}
                  </For>
                </div>
              )}
            </For>
          </div>

          {/* Mobile sitemap: accordion, keeps the footer scannable instead of one long stack */}
          <div class="lg:hidden">
            <Accordion
              items={footerAccordionItems}
              itemClass="!bg-white/10 !border-b-0 !p-4"
              triggerClass="text-white"
              contentClass="text-white/90"
              chevronClass="brightness-0 invert"
            />
          </div>

          {/* Newsletter signup is hidden for now (NewsletterForm below is kept for when it comes back). */}
        </div>

        <div class="flex flex-col items-center gap-2 border-t border-white/30 pb-6 pt-6 text-sm sm:flex-row sm:justify-between">
          <p>© 2026 Charmiss. All Rights Reserved.</p>
          <div class="flex gap-6">
            <a href="/legal/terms" class="hover:underline">
              เงื่อนไขการใช้งาน
            </a>
            <a href="/legal/privacy" class="hover:underline">
              นโยบายความเป็นส่วนตัว
            </a>
          </div>
        </div>
      </Container>

      {/* Global Responsive + Navigation Foundation §4 — reserves the Bottom
          Nav's own height at the true end of the page (every page that
          renders this Footer also renders Header/BottomNav), so the fixed
          bar never overlaps this footer's last row once a visitor scrolls
          all the way down. `lg:hidden` mirrors BottomNav's own Tablet+Mobile-
          only visibility — nothing to reserve on Desktop. */}
      <div class="h-16 shrink-0 lg:hidden" aria-hidden="true" />
    </footer>
  );
}

function ContactDetails() {
  return (
    <div class="flex flex-col gap-4 text-sm text-white/90">
      <p>188/49 โครงการ DRAGON TOWN อาคาร C14 ถนนจรัสเมือง แขวงวังใหม่ เขตปทุมวัน กรุงเทพมหานคร 10330</p>
      <p>(+66) 61 172 7257</p>
      <p>hello@charmiss.co</p>
      <p>จันทร์ - ศุกร์: 09:00 - 18:00 น.</p>
      <div class="flex items-center gap-4">
        <For each={socialLinks}>
          {(social) => (
            <a href={social.href} aria-label={social.label} class="-m-1 flex size-8 items-center justify-center">
              <img src={social.icon} alt="" class="size-6" />
            </a>
          )}
        </For>
      </div>
    </div>
  );
}

export function NewsletterForm() {
  const [status, setStatus] = createSignal<"idle" | "loading" | "success" | "error">("idle");
  const [email, setEmail] = createSignal("");

  const submit = async (e: SubmitEvent) => {
    e.preventDefault();
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email());
    if (!isValid) {
      setStatus("error");
      return;
    }
    setStatus("loading");
    await new Promise((resolve) => setTimeout(resolve, 500));
    setStatus("success");
  };

  return (
    <div class="flex flex-col gap-4 lg:w-[280px]">
      <p class="font-medium text-white">รับข่าวสารเพิ่มเติม</p>
      <p class="text-sm text-white/90">สมัครรับข่าวสารเพื่อรับโค้ดส่วนลดและสิทธิพิเศษสำหรับ CharmissClub</p>

      <Show
        when={status() !== "success"}
        fallback={<p class="text-sm font-medium text-white">สมัครสำเร็จ ขอบคุณที่ติดตาม Charmiss!</p>}
      >
        <form onSubmit={submit} class="flex h-11 items-stretch rounded-pill border border-white bg-transparent">
          <input
            type="email"
            value={email()}
            onInput={(e) => {
              setEmail(e.currentTarget.value);
              if (status() === "error") setStatus("idle");
            }}
            placeholder="กรอกอีเมลของคุณ"
            aria-label="อีเมลของคุณ"
            aria-invalid={status() === "error"}
            class="min-w-0 flex-1 rounded-l-pill bg-transparent px-4 text-sm text-white placeholder:text-white/70 outline-none"
          />
          <Button type="submit" variant="white" size="sm" loading={status() === "loading"} class="!rounded-l-none">
            สมัคร
          </Button>
        </form>
        <Show when={status() === "error"}>
          <p class="text-sm text-yellow-100" role="alert">
            กรุณากรอกอีเมลให้ถูกต้อง
          </p>
        </Show>
      </Show>
    </div>
  );
}
