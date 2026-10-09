import { createEffect, createSignal, onCleanup, onMount, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { DropdownMenu } from "@kobalte/core/dropdown-menu";
import { useAuth } from "~/lib/auth";
import { UserIcon, CloseIcon } from "./icons";
import { ChevronIcon } from "./ChevronIcon";
import { pushToast } from "~/lib/toast";
import coinMark from "~/assets/icons/charmiss-coin.png";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useStorefrontPromotionStrip } from "~/lib/storefrontPromotionStrip";
import type { PromotionStripContent, PromotionStripState } from "~/lib/adminNotificationBar";

/**
 * The purple "Promo strip" and pink "Utility bar" at the top of every
 * storefront page. Their copy comes from Admin (/admin/notifications) via
 * `useStorefrontPromotionStrip`; Admin's own preview passes `state` directly.
 */
function StripText(props: { content: PromotionStripContent; linkClass: string }) {
  return (
    <>
      {props.content.text}
      <Show when={props.content.linkLabel && props.content.linkUrl}>
        {" "}
        <a href={props.content.linkUrl} class={props.linkClass}>
          {props.content.linkLabel}
        </a>
      </Show>
    </>
  );
}

/**
 * Same rule as the Popup: closing the purple strip with × hides it for the
 * rest of the day; the next day's visit shows it again. Keyed by its content
 * too, so a new message from Admin shows even if today's old one was closed.
 * The head script in entry-server.tsx reads the same key before first paint
 * (adds `promo-strip-closed` to <html>) so a closed strip never flashes in.
 */
const STRIP_CLOSED_KEY = "charmiss:promo-strip-closed";
const STRIP_CLOSED_CLASS = "promo-strip-closed";
const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};
const stripFingerprint = (c: PromotionStripContent) => JSON.stringify([c.text, c.linkLabel ?? "", c.linkUrl ?? "", c.icon ?? ""]);

function readStripClosed(): string | null {
  try {
    return localStorage.getItem(STRIP_CLOSED_KEY);
  } catch {
    return null;
  }
}

export function PromoStrip(props: { state?: PromotionStripState }) {
  const stored = useStorefrontPromotionStrip();
  const purple = () => (props.state ?? stored()).purple;
  // Admin's preview (`state` passed in) always shows the strip.
  const live = () => !props.state;
  const [mounted, setMounted] = createSignal(false);
  const [closedRecord, setClosedRecord] = createSignal<string | null>(null);
  onMount(() => {
    setClosedRecord(readStripClosed());
    setMounted(true);
  });
  const closedToday = () => live() && mounted() && closedRecord() === `${todayKey()}|${stripFingerprint(purple())}`;
  // Admin changed the message since it was closed: drop the pre-paint hide.
  createEffect(() => {
    if (live() && mounted() && !closedToday()) document.documentElement.classList.remove(STRIP_CLOSED_CLASS);
  });

  const dismissPromo = () => {
    const record = `${todayKey()}|${stripFingerprint(purple())}`;
    try {
      localStorage.setItem(STRIP_CLOSED_KEY, record);
    } catch {
      // storage unavailable (private mode): hidden for this page only.
    }
    setClosedRecord(record);
  };

  return (
    <Show when={purple().enabled && !closedToday()}>
      <div
        data-promo-strip={live() ? "" : undefined}
        class="relative flex min-h-[40px] items-center justify-center bg-brand-purple px-4 py-2 text-white lg:h-10 lg:min-h-0 lg:py-0">
        <div class="flex min-w-0 max-w-full items-center gap-2 px-[60px] lg:px-10">
          <Show when={purple().icon}>
            <img src={purple().icon} alt="" class="h-6 w-auto shrink-0" />
          </Show>
          <p class="min-w-0 truncate text-xs sm:text-sm">
            <StripText content={purple()} linkClass="font-bold underline" />
          </p>
        </div>
        <button
          type="button"
          onClick={dismissPromo}
          aria-label="ปิดแบนเนอร์โปรโมชั่น"
          class="absolute right-4 top-1/2 flex min-h-11 min-w-11 shrink-0 -translate-y-1/2 items-center justify-center lg:min-h-0 lg:min-w-0 lg:size-6"
        >
          <CloseIcon />
        </button>
      </div>
    </Show>
  );
}

export function UtilityBar(props: { state?: PromotionStripState }) {
  const auth = useAuth();
  const stored = useStorefrontPromotionStrip();
  const pink = () => (props.state ?? stored()).pink;
  return (
    <div class="hidden bg-surface-pink px-[150px] py-2 lg:flex lg:items-center lg:justify-between">
      <div class="flex items-center gap-2">
        <Show when={pink().icon}>
          <img src={pink().icon} alt="" class="size-6" />
        </Show>
        <p class="text-sm text-ink">
          <StripText content={pink()} linkClass="font-medium text-brand-pink underline" />
        </p>
      </div>
      <div class="flex items-center gap-6">
        <Show
          when={auth.isAuthenticated()}
          fallback={
            <button
              type="button"
              onClick={() => auth.openAuthModal()}
              class="flex items-center gap-1.5 whitespace-nowrap text-sm text-ink transition-colors duration-150 hover:text-brand-pink"
            >
              <UserIcon class="size-[18px] shrink-0" />
              เข้าสู่ระบบ / สมัครสมาชิก
            </button>
          }
        >
          <MemberBadge />
        </Show>
        <LanguageSwitcher />
      </div>
    </div>
  );
}

/**
 * Signed-in badge: name | Charmiss Coin mark + coin balance + "v", on a plain
 * white pill (tier medals live only on the Charmiss Club page). Opens a small
 * account menu (ดูโปรไฟล์ / ออกจากระบบ) on hover — with a short close delay so
 * the pointer can cross the gap — and on click / Enter / Space / ArrowDown
 * like any Kobalte menu. Kobalte parks focus on the (ring-less) menu while
 * it's open and, in DropdownMenu, unpreventably focuses the trigger on close —
 * for a hover-opened menu that close focus is handed straight back to
 * whatever had it before (or dropped), so a mouse user never sees the
 * trigger's keyboard focus ring. Keyboard/click-opened menus keep Kobalte's
 * own focus handling (ring included).
 */
function MemberBadge() {
  const auth = useAuth();
  const navigate = useNavigate();
  const coins = () => `${(auth.user()?.coinBalance ?? 0).toLocaleString("th-TH")} คอยน์`;

  const [open, setOpen] = createSignal(false);
  let hoverOpened = false; // opened by hover → don't steal focus into the menu / back to the trigger
  let keepOpen = false; // a mouse press on the trigger while hover-opened shouldn't toggle it shut
  let closeTimer: ReturnType<typeof setTimeout> | undefined;
  let returnFocus: Element | null = null; // what had focus before the hover-open (e.g. the search box)
  onCleanup(() => clearTimeout(closeTimer));

  const restoreFocus = () => {
    const el = returnFocus;
    if (el instanceof HTMLElement && el !== document.body && el.isConnected) el.focus({ preventScroll: true });
    else (document.activeElement as HTMLElement | null)?.blur();
  };

  const hoverIn = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    clearTimeout(closeTimer);
    if (!open()) {
      hoverOpened = true;
      returnFocus = document.activeElement;
      setOpen(true);
    }
  };
  const hoverOut = (e: PointerEvent) => {
    if (e.pointerType !== "mouse" || !hoverOpened) return;
    closeTimer = setTimeout(() => setOpen(false), 200);
  };
  const onOpenChange = (next: boolean) => {
    if (!next && keepOpen) return void (keepOpen = false);
    if (next) hoverOpened = false; // click / keyboard open → normal menu focus handling
    setOpen(next);
  };

  const logout = () => {
    auth.logout();
    pushToast("ออกจากระบบสำเร็จ", "success", "แล้วพบกันใหม่นะ");
  };

  return (
    <DropdownMenu open={open()} onOpenChange={onOpenChange} modal={false} placement="bottom-end" gutter={6}>
      <DropdownMenu.Trigger
        aria-label={`บัญชีของฉัน ${auth.user()?.name ?? ""} มี ${coins()}`}
        onPointerEnter={hoverIn}
        onPointerLeave={hoverOut}
        onPointerDown={(e: PointerEvent) => (keepOpen = e.pointerType === "mouse" && open() && hoverOpened)}
        class="group flex shrink-0 items-center gap-2 whitespace-nowrap rounded-pill border border-surface-gray bg-white py-0.5 pl-3 pr-1.5 text-sm font-medium text-ink shadow-card outline-none focus-visible:ring-2 focus-visible:ring-brand-pink"
      >
        <span class="max-w-[160px] truncate">{auth.user()?.name}</span>
        <span aria-hidden="true" class="text-ink-placeholder">|</span>
        {/* Coin mark sits with the balance it belongs to: "name | [C] 3,500 คอยน์". */}
        <span class="flex shrink-0 items-center gap-1">
          <img src={coinMark} alt="" class="size-4 shrink-0" />
          {coins()}
        </span>
        <ChevronIcon direction="down" class="size-5 text-ink-gray transition-transform duration-150 group-data-[expanded]:rotate-180" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          onPointerEnter={hoverIn}
          onPointerLeave={hoverOut}
          onFocusOutside={(e: Event) => hoverOpened && e.preventDefault()}
          // Runs just before DropdownMenu focuses the trigger — undo it in the same task, before the ring can paint.
          onCloseAutoFocus={() => hoverOpened && queueMicrotask(restoreFocus)}
          class="z-50 flex min-w-[180px] flex-col rounded-2xl bg-white p-1.5 shadow-card outline-none"
        >
        <DropdownMenu.Item onSelect={() => navigate("/account")} class={`${MENU_ITEM} text-ink`}>
            ดูโปรไฟล์
          </DropdownMenu.Item>
          <DropdownMenu.Item onSelect={logout} class={`${MENU_ITEM} text-danger-strong`}>
            ออกจากระบบ
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu>
  );
}

const MENU_ITEM =
  "flex min-h-[44px] cursor-pointer items-center rounded-xl px-3 text-sm font-medium outline-none transition-colors duration-150 data-[highlighted]:bg-surface-pink lg:hover:bg-surface-pink";
