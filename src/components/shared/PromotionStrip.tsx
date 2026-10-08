import { createSignal, onCleanup, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { DropdownMenu } from "@kobalte/core/dropdown-menu";
import { useAuth } from "~/lib/auth";
import { UserIcon, CloseIcon } from "./icons";
import { ChevronIcon } from "./ChevronIcon";
import { pushToast } from "~/lib/toast";
import deliveryIcon from "~/assets/icons/delivery.svg";
import coinMark from "~/assets/icons/charmiss-coin.png";
import { LanguageSwitcher } from "./LanguageSwitcher";
import promoBadge99 from "~/assets/images/promo/promo-strip-badge-99.png";

/**
 * CHARMISS CMS — ADMIN ONLY §3/§5 — the real purple "Promo strip" and pink
 * "Utility bar" from Header.tsx, extracted verbatim (same markup/classes/
 * assets/behavior) so Admin's Promotion Strip preview and Global Component
 * Preview can render the exact customer-facing component instead of a
 * look-alike. Header.tsx now imports these unchanged; both are self-
 * contained (own their own state/hooks) so they need zero props and behave
 * identically wherever mounted.
 */
export function PromoStrip() {
  // In-memory only, on purpose — must reappear on every fresh page load/
  // refresh (never persisted). See original comment history in Header.tsx.
  const [promoDismissed, setPromoDismissed] = createSignal(false);
  const dismissPromo = () => setPromoDismissed(true);

  return (
    <Show when={!promoDismissed()}>
      <div class="relative flex min-h-[40px] items-center justify-center bg-brand-purple px-4 py-2 text-white lg:h-10 lg:min-h-0 lg:py-0">
        <div class="flex min-w-0 max-w-full items-center gap-2 px-[60px] lg:px-10">
          <img src={promoBadge99} alt="" class="h-6 w-auto shrink-0" />
          <p class="min-w-0 truncate text-xs sm:text-sm">
            Charmiss MEGA SALE ลดสูงสุด 70% รับคูปองลดเพิ่ม 25%{" "}
            <a href="/promotion/promotions" class="font-bold underline">
              ช็อปเลย!
            </a>
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

export function UtilityBar() {
  const auth = useAuth();
  return (
    <div class="hidden bg-surface-pink px-[150px] py-2 lg:flex lg:items-center lg:justify-between">
      <div class="flex items-center gap-2">
        <img src={deliveryIcon} alt="" class="size-6" />
        <p class="text-sm text-ink">จัดส่งฟรีทั่วประเทศ เมื่อซื้อครบ 990.- ของแท้จากเว็บไซต์อย่างเป็นทางการของ Charmiss</p>
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
 * Signed-in badge: Charmiss Coin mark + name | coin balance + "v", on a plain
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
    pushToast("ออกจากระบบสำเร็จ", "success", "แล้วพบกันใหม่นะ 👋");
  };

  return (
    <DropdownMenu open={open()} onOpenChange={onOpenChange} modal={false} placement="bottom-end" gutter={6}>
      <DropdownMenu.Trigger
        aria-label={`บัญชีของฉัน — ${auth.user()?.name ?? ""} · ${coins()}`}
        onPointerEnter={hoverIn}
        onPointerLeave={hoverOut}
        onPointerDown={(e: PointerEvent) => (keepOpen = e.pointerType === "mouse" && open() && hoverOpened)}
        class="group flex shrink-0 items-center gap-2 whitespace-nowrap rounded-pill border border-surface-gray bg-white py-0.5 pl-1 pr-1.5 text-sm font-medium text-ink shadow-card outline-none focus-visible:ring-2 focus-visible:ring-brand-pink"
      >
        <img src={coinMark} alt="" class="size-6 shrink-0" />
        <span class="max-w-[160px] truncate">{auth.user()?.name}</span>
        <span aria-hidden="true" class="text-ink-placeholder">|</span>
        <span class="shrink-0">{coins()}</span>
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
