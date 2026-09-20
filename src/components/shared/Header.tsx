import { createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { A } from "@solidjs/router";
import { clientOnly } from "@solidjs/start";
import { SearchBar } from "./SearchBar";
import { HeartIcon, CartIcon, HamburgerIcon, UserIcon } from "./icons";

/**
 * Kobalte's Dialog (Portal-based) doesn't SSR/hydrate cleanly in this stack —
 * rendering it during SSR throws a hydration-mismatch error on load. These
 * are closed-by-default overlays anyway, so mounting them client-only (no
 * SSR, no hydration pass) costs nothing visually and avoids the crash.
 */
const CartDrawer = clientOnly(() => import("./CartDrawer").then((m) => ({ default: m.CartDrawer })));
const MobileMenu = clientOnly(() => import("./MobileMenu").then((m) => ({ default: m.MobileMenu })));
const MobileSearchOverlay = clientOnly(() =>
  import("./MobileSearchOverlay").then((m) => ({ default: m.MobileSearchOverlay })),
);
const AuthModal = clientOnly(() => import("./AuthModal").then((m) => ({ default: m.AuthModal })));
import { useAuth } from "~/lib/auth";
import { useCart } from "~/lib/cart";
import { createDialogOpenState } from "~/lib/focusRestore";
import { catalogNavLinks } from "~/lib/nav";
import { useLandingPages } from "~/lib/promotionPages";
import { useCategoryContent } from "~/lib/categoryContent";
import { getPromotionNavIcon } from "~/lib/promotionNavIcons";
import { categoryListHref } from "~/lib/adminHomepage";
import logo from "~/assets/icons/logo-charmiss.svg";
import deliveryIcon from "~/assets/icons/delivery.svg";
import chevronDown from "~/assets/icons/chevron-down.svg";
import flagTh from "~/assets/images/footer/flag-th.png";
import navBadgeFlourish from "~/assets/images/footer/nav-badge-flourish.png";
import promoBadge99 from "~/assets/images/promo/promo-strip-badge-99.png";

/**
 * `minimal` matches the Checkout frame (node 146:8484), which drops the
 * Promo Strip, search, wishlist, hamburger, and Category Menu entirely —
 * a deliberate "no shopping distractions mid-checkout" header, not a
 * responsive collapse. Still the same Header component/file (no second
 * header built) — everything below just skips rendering the sections this
 * page doesn't want. Figma's own Utility Bar there shows a signed-in name
 * ("Nutcha S.") instead of the guest "เข้าสู่ระบบ" link; kept as the guest
 * link anyway since this prototype has no real auth and every other page
 * already shows the same guest state — swapping only here would be a
 * one-off fake login state rather than a real feature.
 */
export function Header(props: { minimal?: boolean }) {
  const cart = useCart();
  const auth = useAuth();
  const landingPages = useLandingPages();
  const categories = useCategoryContent();
  // In-memory only, on purpose — the promo strip must reappear on every
  // fresh page load/refresh (never persisted across sessions via
  // localStorage/sessionStorage/cookie). Dismissing it just hides it for
  // the current in-memory session; a reload re-runs this module and resets
  // the signal back to `false`, which is exactly the desired behavior.
  const [promoDismissed, setPromoDismissed] = createSignal(false);
  const [menuOpen, setMenuOpen] = createDialogOpenState();
  const [mobileSearchOpen, setMobileSearchOpen] = createDialogOpenState();
  const [headerHidden, setHeaderHidden] = createSignal(false);

  const dismissPromo = () => setPromoDismissed(true);

  /**
   * Hide-on-scroll-down / show-on-scroll-up, always visible again at the
   * top. Pure `transform` (not height/display) so this never reflows the
   * page under it — the header is `sticky`, so it already reserves its own
   * space; translating it off-screen is purely a paint-time change.
   */
  onMount(() => {
    const HIDE_AFTER_Y = 96; // roughly one header's worth of scroll before we start hiding it
    const DIRECTION_THRESHOLD = 4; // ignores sub-pixel/trackpad jitter
    let lastY = window.scrollY;
    let ticking = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const delta = y - lastY;
        if (y <= HIDE_AFTER_Y) {
          setHeaderHidden(false);
        } else if (delta > DIRECTION_THRESHOLD) {
          setHeaderHidden(true);
        } else if (delta < -DIRECTION_THRESHOLD) {
          setHeaderHidden(false);
        }
        lastY = y;
        ticking = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onCleanup(() => window.removeEventListener("scroll", onScroll));
  });

  return (
    <header
      class="sticky top-0 z-30 w-full transition-transform duration-250 ease-out will-change-transform"
      classList={{ "-translate-y-full": headerHidden() }}
    >
      {/* Promo strip */}
      <Show when={!props.minimal && !promoDismissed()}>
        <div class="relative flex min-h-[40px] items-center justify-center bg-brand-purple px-4 py-2 text-white lg:h-10 lg:min-h-0 lg:py-0">
          {/* Centered on the full strip width (not just the space left of the
              X button) — the button is taken out of flow via `absolute` so it
              can stay pinned at its existing right-4 spot without skewing the
              centering math. Horizontal padding here reserves room equal to
              the button's own footprint (its size + right-4) on both sides,
              so long copy truncates before ever reaching under the button. */}
          <div class="flex min-w-0 max-w-full items-center gap-2 px-[60px] lg:px-10">
            <img src={promoBadge99} alt="" class="h-6 w-auto shrink-0" />
            <p class="min-w-0 truncate text-xs sm:text-sm">
              Charmiss MEGA SALE ลดสูงสุด 70% รับคูปองลดเพิ่ม 25%{" "}
              <a href="/promotions" class="font-bold underline">
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
            <span aria-hidden="true">×</span>
          </button>
        </div>
      </Show>

      {/* Utility bar — desktop only, matches STEP 3 of the audit (hidden on mobile to save vertical space) */}
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
            <A href="/account" class="flex items-center gap-1.5 whitespace-nowrap text-sm text-ink transition-colors duration-150 hover:text-brand-pink">
              <UserIcon class="size-[18px] shrink-0" />
              {auth.user()?.name}
            </A>
          </Show>
          <div class="flex items-center gap-1 text-sm text-ink">
            <img src={flagTh} alt="" class="size-4 rounded-full object-cover" />
            ไทย
            <img src={chevronDown} alt="" class="size-3.5" />
          </div>
        </div>
      </div>

      {/* Main bar */}
      <div class="bg-brand-pink px-4 py-3 lg:px-[150px] lg:py-4">
        <div class="flex items-center gap-3">
          <Show when={!props.minimal}>
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="เปิดเมนู"
              class="flex size-11 shrink-0 items-center justify-center text-white lg:hidden"
            >
              <HamburgerIcon />
            </button>
          </Show>

          <A href="/" class="shrink-0">
            <img src={logo} alt="Charmiss" class="h-6 lg:h-8" />
          </A>

          <Show when={!props.minimal}>
            <div class="hidden flex-1 lg:block">
              <SearchBar tone="onDark" />
            </div>
          </Show>

          <div class="ml-auto flex items-center gap-1 lg:gap-6" classList={{ "lg:ml-0": !props.minimal }}>
            <Show when={!props.minimal}>
              <button
                type="button"
                onClick={() => setMobileSearchOpen(true)}
                aria-label="ค้นหา"
                class="flex size-11 items-center justify-center text-white lg:hidden"
              >
                <SearchGlyph />
              </button>

              <A href="/wishlist" class="hidden items-center gap-1 text-white lg:flex">
                <HeartIcon class="size-6" />
                <span class="text-sm font-medium">รายการโปรด</span>
              </A>
            </Show>

            <button
              type="button"
              onClick={() => cart.openDrawer()}
              aria-label={`ตะกร้าสินค้า มี ${cart.count()} ชิ้น`}
              class="relative flex min-h-[44px] items-center gap-1 rounded-pill px-2 text-white lg:bg-white lg:px-4 lg:py-2 lg:text-brand-pink"
            >
              <CartIcon class="size-6" />
              <span class="hidden text-sm font-medium lg:inline">ตะกร้า</span>
              <Show when={cart.count() > 0}>
                <span
                  class="absolute -right-1 -top-1 flex size-5 animate-badge-pop items-center justify-center rounded-pill bg-system-red text-[11px] font-medium text-white lg:static lg:ml-1 lg:size-6 lg:text-sm"
                  aria-hidden="true"
                >
                  {cart.count()}
                </span>
              </Show>
            </button>
          </div>
        </div>
      </div>

      {/* Category quick-nav — matches Figma node 132:2352: pink bar,
          centered row, 48px gap, 150px side padding, 16px vertical padding.
          Kept horizontally scrollable (not `overflow-visible`) even at
          desktop widths as a safety net — at exactly-Figma spacing this row
          only fits comfortably from ~1440px up (Figma's own canvas width);
          narrower desktop (1024–1439) falls back to an internal scroll
          instead of wrapping, spilling outside the bar, or shrinking type. */}
      <Show when={!props.minimal}>
        <nav
          aria-label="หมวดหมู่สินค้า"
          class="scroll-rail !mx-0 !px-4 bg-brand-pink py-3 lg:justify-center lg:gap-12 lg:px-[150px] lg:py-4"
        >
          <img src={navBadgeFlourish} alt="" class="hidden h-6 shrink-0 lg:block" aria-hidden="true" />
          {/* Frontend Navigation add-on — derived live from Admin's nav-enabled,
              currently-visible Landing Pages (never hardcoded here); see
              `useLandingPages().navItems()`. Landing Page is a reference *into*
              this nav row, never its owner — deleting a nav-enabled Landing
              Page just removes it from `navItems()` next render, no dangling
              `/promotion/undefined` link ever gets rendered. */}
          <For each={landingPages.navItems()}>
            {(item) => {
              const Icon = getPromotionNavIcon(item.icon);
              return (
                <A
                  href={item.href}
                  class="flex min-h-[44px] shrink-0 items-center gap-1 whitespace-nowrap px-2 text-sm font-semibold text-white transition-opacity duration-200 hover:opacity-80 lg:min-h-0 lg:px-0 lg:text-base [&.active]:underline [&.active]:underline-offset-4"
                >
                  {Icon && <Icon class="size-5 shrink-0 lg:size-6" />}
                  {item.label}
                </A>
              );
            }}
          </For>
          {/* Global Frontend Navigation Architecture — derived live from
              Admin's Category Management (active, ordered by sortOrder),
              never a hardcoded list; each resolves to the existing
              `/products` listing page via `categoryListHref`, not a
              dedicated Category page. */}
          <For each={categories.navCategories()}>
            {(category) => (
              <A
                href={categoryListHref(category.slug)}
                class="flex min-h-[44px] shrink-0 items-center whitespace-nowrap px-2 text-sm font-medium text-white transition-opacity duration-200 hover:opacity-80 lg:min-h-0 lg:px-0 lg:text-base [&.active]:underline [&.active]:underline-offset-4"
              >
                {category.name}
              </A>
            )}
          </For>
          <For each={catalogNavLinks}>
            {(link) => (
              <A
                href={link.href}
                class="flex min-h-[44px] shrink-0 items-center whitespace-nowrap px-2 text-sm font-medium text-white transition-opacity duration-200 hover:opacity-80 lg:min-h-0 lg:px-0 lg:text-base [&.active]:underline [&.active]:underline-offset-4"
              >
                {link.label}
              </A>
            )}
          </For>
        </nav>
      </Show>

      <Show when={!props.minimal}>
        <MobileMenu open={menuOpen()} onOpenChange={setMenuOpen} />
        <MobileSearchOverlay open={mobileSearchOpen()} onOpenChange={setMobileSearchOpen} />
      </Show>
      <CartDrawer />
      <AuthModal />
    </header>
  );
}

function SearchGlyph() {
  return (
    <svg viewBox="0 0 24 24" class="size-6" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" stroke-linecap="round" />
    </svg>
  );
}
