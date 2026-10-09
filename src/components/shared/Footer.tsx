import { createMemo, createSignal, For, Show } from "solid-js";
import { Container } from "./Container";
import { Accordion } from "./Accordion";
import { Button } from "./Button";
import logo from "~/assets/icons/logo-charmiss-footer.svg";
import iconLine from "~/assets/icons/social-line-white.svg";
import iconInstagram from "~/assets/icons/social-instagram.svg";
import iconTiktok from "~/assets/icons/social-tiktok.svg";
import iconFacebook from "~/assets/icons/social-facebook.svg";
import iconYoutube from "~/assets/icons/social-youtube.svg";
import { CONTACT } from "~/lib/siteInfo";
import { footerPhoneHref, useStorefrontFooter, type FooterContent, type FooterLink, type FooterSocialPlatform } from "~/lib/siteFooter";

// Content comes from `~/lib/siteFooter` (Admin: /admin/content/footer), seed =
// the original hardcoded footer. External links (http) open in a new tab.

const SOCIAL_ICONS: Record<FooterSocialPlatform, { icon: string; label: string }> = {
  line: { icon: iconLine, label: `LINE Official Account ${CONTACT.lineId}` },
  instagram: { icon: iconInstagram, label: "Instagram" },
  tiktok: { icon: iconTiktok, label: "TikTok" },
  facebook: { icon: iconFacebook, label: "Facebook" },
  youtube: { icon: iconYoutube, label: "YouTube" },
};

const isExternal = (href: string) => /^https?:\/\//.test(href);

function FooterLinkItem(props: { link: FooterLink; class: string }) {
  return (
    <a
      href={props.link.href || undefined}
      target={isExternal(props.link.href) ? "_blank" : undefined}
      rel={isExternal(props.link.href) ? "noopener noreferrer" : undefined}
      class={props.class}
    >
      {props.link.label}
    </a>
  );
}

export function Footer() {
  const footer = useStorefrontFooter();
  // Rebuilt only when the saved footer changes. `content` is a getter so the
  // link list is created when the panel actually renders (after a tap), never
  // eagerly during hydration, where stray JSX would shift hydration keys.
  const accordionItems = createMemo(() =>
    footer().columns.map((col) => ({
      id: col.id,
      trigger: col.title,
      get content() {
        return (
          <div class="flex flex-col gap-3">
            <For each={col.links}>{(link) => <FooterLinkItem link={link} class="text-sm text-white/90 hover:underline" />}</For>
          </div>
        );
      },
    })),
  );

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
            <ContactDetails footer={footer()} />
          </div>

          {/* Desktop sitemap: plain columns */}
          <div class="hidden lg:flex lg:gap-16">
            <For each={footer().columns}>
              {(col) => (
                <div class="flex w-40 shrink-0 flex-col gap-4">
                  <p class="font-medium text-white">{col.title}</p>
                  <For each={col.links}>{(link) => <FooterLinkItem link={link} class="text-sm text-white/90 hover:underline" />}</For>
                </div>
              )}
            </For>
          </div>

          {/* Mobile sitemap: accordion, keeps the footer scannable instead of one long stack */}
          <div class="lg:hidden">
            <Accordion
              items={accordionItems()}
              itemClass="!bg-white/10 !border-b-0 !p-4"
              triggerClass="text-white"
              contentClass="text-white/90"
              chevronClass="brightness-0 invert"
            />
          </div>

          {/* Newsletter signup is hidden for now (NewsletterForm below is kept for when it comes back). */}
        </div>

        <div class="flex flex-col items-center gap-2 border-t border-white/30 pb-6 pt-6 text-sm sm:flex-row sm:justify-between">
          <p>{footer().copyright}</p>
          <div class="flex gap-6">
            <For each={footer().legalLinks}>{(link) => <FooterLinkItem link={link} class="hover:underline" />}</For>
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

function ContactDetails(props: { footer: FooterContent }) {
  const contact = () => props.footer.contact;
  const social = () => props.footer.social.filter((s) => s.enabled && s.href.trim());
  return (
    <div class="flex flex-col gap-4 text-sm text-white/90">
      <Show when={contact().address}>
        <p class="whitespace-pre-line">{contact().address}</p>
      </Show>
      <Show when={contact().phoneLabel}>
        <a href={footerPhoneHref(contact().phoneLabel)} class="self-start hover:underline">
          {contact().phoneLabel}
        </a>
      </Show>
      <Show when={contact().email}>
        <a href={`mailto:${contact().email}`} class="self-start hover:underline">
          {contact().email}
        </a>
      </Show>
      <Show when={contact().hours}>
        <p>{contact().hours}</p>
      </Show>
      <Show when={social().length > 0}>
        <div class="flex items-center gap-4">
          <For each={social()}>
            {(s) => (
              <a href={s.href} target="_blank" rel="noopener noreferrer" aria-label={SOCIAL_ICONS[s.platform].label} class="-m-1 flex size-8 items-center justify-center">
                <img src={SOCIAL_ICONS[s.platform].icon} alt="" class="size-6" />
              </a>
            )}
          </For>
        </div>
      </Show>
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
      <p class="text-sm text-white/90">สมัครรับข่าวสารเพื่อรับโค้ดส่วนลดและสิทธิพิเศษสำหรับ Charmiss Club</p>

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
