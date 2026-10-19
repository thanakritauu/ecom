import { Dialog } from "@kobalte/core/dialog";
import { useLocation, useNavigate } from "@solidjs/router";
import { createEffect, createSignal, on, onCleanup, onMount, Show, type JSX } from "solid-js";
import { useAuth } from "~/lib/auth";
import { matchesAudience } from "~/lib/marketingAudience";
import { useProductCatalog } from "~/lib/productCatalog";
import { cookieBarAllowed, cookieConsentSettled, releaseCookieBar } from "~/lib/cookieConsent";
import {
  hidePromoForever,
  isPopupOnPage,
  isPromoHidden,
  isPromoPopupInSchedule,
  markPromoShownToday,
  promoPopupMediaValue,
  useStorefrontPromoPopups,
  buildDefaultPromoPopup,
  type PromoPopupRecord,
  wasPromoShownToday,
  type PromoPopupContent,
} from "~/lib/promoPopup";
import { MediaView } from "../shared/MediaView";
import { Button } from "../shared/Button";
import { CheckIcon, CloseMark } from "../shared/icons";

/** Pause between page load and the popup. */
const POPUP_DELAY_MS = 1200;

/**
 * Storefront promo popup, mounted once in app.tsx and opened on the pages
 * Admin picked (`content.pages`), at most once a day per browser: the first
 * matching page of the day opens it, and after it's closed it waits for the
 * next day's visit. "ไม่ต้องแสดงอีก" hides this popup (this id) for good. Same overlay and card language as `SheetModal`, but
 * a compact centered card (image on top, copy below, full-width CTA) rather
 * than the 668px sheet: it's a one-glance announcement, not a task. Opened
 * client-side after mount (SSR always renders it closed, so no hydration
 * mismatch), and skipped when another dialog is already up on first paint.
 * Content comes from Admin (/admin/content/popup, a list in priority order) via
 * `useStorefrontPromoPopups`: on each page the first popup that may show
 * opens, one at a time.
 */
export function PromoPopup(props: { content?: PromoPopupContent }) {
  // Must run before this component's own onMount so the stored list is read first.
  const stored = useStorefrontPromoPopups();
  // The popup picked for the current page (the list's first one that may show there).
  const [picked, setPicked] = createSignal<PromoPopupContent>(buildDefaultPromoPopup());
  const content = () => props.content ?? picked();
  const auth = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = createSignal(false);
  // "ไม่ต้องแสดงอีก" is a checkbox under the card: ticked, any way of closing (×, overlay, CTA) hides it for good.
  const [neverAgain, setNeverAgain] = createSignal(false);

  const location = useLocation();
  const [mounted, setMounted] = createSignal(false);
  onMount(() => setMounted(true));

  // Who is shopping (guest / new / returning, tier): same กลุ่มลูกค้า check as promotions and coupons.
  const catalog = useProductCatalog();
  // No button link = a sign-up offer: the button opens sign-in / sign-up, so signed-in members never see it.
  const signUpOffer = (p: PromoPopupContent) => !p.ctaUrl;
  const forThisShopper = (p: PromoPopupContent) => matchesAudience(p.audience, catalog.shopper()) && !(signUpOffer(p) && auth.isAuthenticated());
  const mayShow = (p: PromoPopupRecord, pathname: string) =>
    !p.draft &&
    p.enabled &&
    isPromoPopupInSchedule(p) &&
    isPopupOnPage(p.pages, pathname) &&
    !isPromoHidden(p.id) &&
    !wasPromoShownToday(p.id) &&
    forThisShopper(p);
  const pickFor = (pathname: string) => stored().find((p) => mayShow(p, pathname));

  // Client-only (after mount), re-checked on every page change: a popup can
  // be set to a page the visitor only reaches later in the visit.
  // Popup first, cookie bar second: the bar waits until the popup is closed, or until this page turns out to
  // have no popup for this visitor. Once the bar is up, a popup that becomes due later waits for the cookie choice.
  let openTimer: ReturnType<typeof setTimeout> | undefined;
  onCleanup(() => clearTimeout(openTimer));
  const canOpenOn = (pathname: string) =>
    !open() && !pathname.startsWith("/admin") && !!pickFor(pathname) && !auth.isAuthModalOpen() && !document.querySelector('[role="dialog"]');
  createEffect(
    // The shopper is a dependency too: a member's orders load after mount, which can turn them from "new" into "returning".
    on([mounted, cookieConsentSettled, cookieBarAllowed, () => location.pathname, stored, catalog.shopper], ([isMounted, settled, barAllowed, pathname]) => {
      clearTimeout(openTimer);
      if (!isMounted || open()) return;
      if (barAllowed && !settled) return; // the cookie bar is up: it goes first now
      if (!canOpenOn(pathname)) return releaseCookieBar();
      openTimer = setTimeout(() => {
        // Re-check: the visitor may have moved on, signed in or opened another dialog meanwhile.
        if (!canOpenOn(location.pathname)) return releaseCookieBar();
        const next = pickFor(location.pathname)!;
        setNeverAgain(false);
        setPicked(next);
        markPromoShownToday(next.id);
        setOpen(true);
      }, POPUP_DELAY_MS);
    }),
  );
  // However it closes (×, overlay, button, "ไม่ต้องแสดงอีก", or signing in), the cookie bar comes next.
  createEffect(on(open, (isOpen, wasOpen) => wasOpen && !isOpen && releaseCookieBar(), { defer: true }));
  // Re-checked while open: covers the session restoring just after mount, or signing in from the popup's own button.
  createEffect(() => {
    if (!open() || props.content) return;
    if (!forThisShopper(content())) setOpen(false);
  });

  const close = () => {
    if (neverAgain()) hidePromoForever(content().id);
    setOpen(false);
  };

  const onCta = () => {
    close();
    if (signUpOffer(content())) auth.openAuthModal();
    else {
      const url = content().ctaUrl!;
      if (/^https?:\/\//.test(url)) window.open(url, "_blank", "noopener,noreferrer");
      else navigate(url);
    }
  };

  return (
    <Dialog open={open()} onOpenChange={(next) => !next && close()}>
      <Dialog.Portal>
        <Dialog.Overlay class="fixed inset-0 z-40 bg-ink/60 data-[expanded]:animate-toast-in" />
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Content = the card + the checkbox below it (still inside, so clicking it doesn't count as "outside"). */}
          {/* On open, focus the popup itself (not the × — the first focusable), so no focus ring sits on the × until
              someone actually tabs to it. Esc / Tab still work from here. */}
          <Dialog.Content
            tabIndex={-1}
            onOpenAutoFocus={(e) => {
              e.preventDefault();
              (e.currentTarget as HTMLElement | null)?.focus({ preventScroll: true });
            }}
            class="flex max-h-[90dvh] w-full max-w-[400px] flex-col items-center gap-3 sm:max-w-[540px] outline-none focus-visible:outline-none data-[expanded]:animate-toast-in"
          >
            <PromoPopupCard
              content={content()}
              onCta={onCta}
              closeButton={
                <Dialog.CloseButton class="group absolute right-1 top-1 flex size-11 items-center justify-center">
                  <CloseMark />
                  <span class="sr-only">ปิด</span>
                </Dialog.CloseButton>
              }
              title={(cls, text) => <Dialog.Title class={cls}>{text}</Dialog.Title>}
              description={(cls, text) => <Dialog.Description class={cls}>{text}</Dialog.Description>}
            />
            <NeverAgainCheckbox checked={neverAgain()} onChange={setNeverAgain} />
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog>
  );
}

/**
 * The popup card itself, shared by the storefront dialog and the Admin live
 * preview (which passes plain elements instead of the Kobalte dialog parts).
 */
export function PromoPopupCard(props: {
  content: PromoPopupContent;
  onCta?: () => void;
  closeButton?: JSX.Element;
  title?: (cls: string, text: string) => JSX.Element;
  description?: (cls: string, text: string) => JSX.Element;
  /** Admin preview: lays out at the mobile size (no `sm:` steps, which follow the window, not the preview column). */
  compact?: boolean;
}) {
  const titleClass = () => `text-2xl font-bold leading-[1.4] text-ink ${props.compact ? "" : "sm:text-[30px]"}`;
  const descClass = () => `whitespace-pre-line text-[15px] leading-[1.75] text-ink-gray ${props.compact ? "" : "sm:text-lg"}`;
  return (
    <div class="relative flex min-h-0 w-full flex-col overflow-hidden rounded-card bg-white shadow-card">
      <div class="relative aspect-[16/10] w-full shrink-0 overflow-hidden bg-surface-pink">
        <Show when={props.content.media.src}>
          {/* Image or video (MediaView: autoplay muted loop, poster for Save-Data / reduced motion, speaker button when the video has sound). */}
          <MediaView
            media={promoPopupMediaValue(props.content.media)}
            alt={props.content.media.alt}
            objectFit="cover"
            objectPosition="center"
            loading="eager"
            audioButtonClass="bottom-1 right-1"
          />
        </Show>
        {/* Small 32px circle, but the button itself keeps a 44px tap area around it. */}
        {props.closeButton ?? (
          <span class="group absolute right-1 top-1 flex size-11 items-center justify-center" aria-hidden="true">
            <CloseMark />
          </span>
        )}
      </div>

      <div class={`flex min-h-0 flex-col items-center gap-4 overflow-y-auto px-5 pb-6 pt-6 text-center ${props.compact ? "" : "sm:gap-5 sm:px-8 sm:pb-8"}`}>
        <div class="flex flex-col gap-1.5">
          {props.title ? props.title(titleClass(), props.content.title) : <h2 class={titleClass()}>{props.content.title}</h2>}
          {props.description ? props.description(descClass(), props.content.description) : <p class={descClass()}>{props.content.description}</p>}
        </div>
        <Show when={props.content.condition}>
          <p class={`whitespace-nowrap rounded-pill bg-surface-pink px-4 py-2 text-xs font-medium text-brand-pink ${props.compact ? "" : "sm:text-sm"}`}>
            {props.content.condition}
          </p>
        </Show>

        <Button size="lg" class="w-full" onClick={() => props.onCta?.()}>
          {props.content.ctaLabel}
        </Button>
      </div>
    </div>
  );
}

export function NeverAgainCheckbox(props: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label class="flex min-h-[44px] cursor-pointer items-center gap-2 px-2 text-base font-medium text-white">
      <input type="checkbox" class="peer sr-only" checked={props.checked} onChange={(e) => props.onChange(e.currentTarget.checked)} />
      <span
        class="flex size-5 shrink-0 items-center justify-center rounded-[6px] border-2 border-white transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-white"
        classList={{ "bg-white text-brand-pink": props.checked, "bg-transparent text-transparent": !props.checked }}
        aria-hidden="true"
      >
        <CheckIcon class="size-3.5" />
      </span>
      ไม่ต้องแสดงอีก
    </label>
  );
}
