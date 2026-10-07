import { createEffect, createSignal, For, on, onCleanup, onMount, Show } from "solid-js";
import { A } from "@solidjs/router";
import { clientOnly } from "@solidjs/start";
import { SearchBar } from "./SearchBar";
import { DocumentIcon, CartIcon, HamburgerIcon } from "./icons";
import { PromoStrip, UtilityBar } from "./PromotionStrip";
import { BottomNav } from "./BottomNav";

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
import { useCart } from "~/lib/cart";
import { createDialogOpenState } from "~/lib/focusRestore";
import { useNavigationContent } from "~/lib/navigationContent";
import { NavIcon } from "./NavIcon";
import logo from "~/assets/icons/logo-charmiss.svg";

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
/**
 * Every page renders its own <Header />, so the category row remounts on each navigation. Its sideways scroll
 * position is kept here (module scope survives client-side navigation) so tapping a menu far along the row
 * doesn't snap the row back to the first items.
 */
let navScrollLeft = 0;

export function Header(props: { minimal?: boolean }) {
  const cart = useCart();
  const navigation = useNavigationContent();
  let navRail: HTMLElement | undefined;
  // Restore the row where the shopper left it; if the current page's menu is out of view, bring it to the middle.
  const syncNavScroll = () => {
    if (!navRail) return;
    navRail.scrollLeft = navScrollLeft;
    const active = navRail.querySelector<HTMLElement>("a[aria-current='page']");
    if (!active) return;
    const item = active.getBoundingClientRect();
    const rail = navRail.getBoundingClientRect();
    if (item.left < rail.left || item.right > rail.right) {
      navRail.scrollLeft += item.left - rail.left - (rail.width - item.width) / 2;
      navScrollLeft = navRail.scrollLeft;
    }
  };
  createEffect(on(() => navigation.visibleTree().length, () => requestAnimationFrame(syncNavScroll)));
  const [menuOpen, setMenuOpen] = createDialogOpenState();
  const [mobileSearchOpen, setMobileSearchOpen] = createDialogOpenState();
  const [headerHidden, setHeaderHidden] = createSignal(false);

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
    <>
    <header
      class="sticky top-0 z-30 w-full transition-transform duration-250 ease-out will-change-transform"
      classList={{ "-translate-y-full": headerHidden() }}
    >
      {/* Promo strip + Utility bar — real components, shared verbatim with
          Admin's Promotion Strip preview (see ~/components/shared/PromotionStrip.tsx) */}
      <Show when={!props.minimal}>
        <PromoStrip />
      </Show>
      <UtilityBar />

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

              {/* Global Top Navigation §5 — was "รายการโปรด"/`/wishlist` (a route that was never actually built); now points at the existing Order History page (`/account`, see `routes/account.tsx`'s own doc comment confirming it IS the Order History view). */}
              <A href="/account" class="hidden items-center gap-1 text-white lg:flex">
                <DocumentIcon class="size-6" />
                <span class="text-sm font-medium">ประวัติการซื้อ</span>
              </A>
            </Show>

            <button
              type="button"
              onClick={() => cart.openDrawer()}
              data-cart-target="header"
              aria-label={`ตะกร้าสินค้า มี ${cart.count()} ชิ้น`}
              class="relative flex min-h-[44px] items-center gap-1 rounded-pill px-2 text-white lg:bg-white lg:px-4 lg:py-2 lg:text-brand-pink"
            >
              <CartIcon class="size-6" />
              <span class="hidden text-sm font-medium lg:inline">ตะกร้า</span>
              <Show when={cart.badgeCount() > 0}>
                <span
                  data-cart-badge
                  class="absolute -right-1 -top-1 flex size-5 animate-badge-pop items-center justify-center rounded-pill bg-system-red text-[11px] font-medium text-white lg:static lg:ml-1 lg:size-6 lg:text-sm"
                  aria-hidden="true"
                >
                  {cart.badgeCount()}
                </span>
              </Show>
            </button>
          </div>
        </div>
      </div>

      {/* Category quick-nav — matches Figma node 132:2352: pink bar,
          centered row, 48px gap, 120px side padding from 1680px (all 12 menus need
          ~1650px at that spacing); below it 24px gaps (32px from 1440) + 40px padding
          so the row fits from ~1280px. 16px vertical padding; icon items are 32px
          artwork + SemiBold label, text-only items Medium.
          Kept horizontally scrollable (not `overflow-visible`) even at
          desktop widths as a safety net — at exactly-Figma spacing this row
          only fits comfortably from ~1440px up (Figma's own canvas width);
          narrower desktop (1024–1439) falls back to an internal scroll
          instead of wrapping, spilling outside the bar, or shrinking type. */}
      <Show when={!props.minimal}>
        <nav
          ref={navRail}
          onScroll={(e) => (navScrollLeft = e.currentTarget.scrollLeft)}
          aria-label="หมวดหมู่สินค้า"
          class="scroll-rail !mx-0 !px-4 bg-brand-pink py-3 lg:justify-center lg:gap-6 lg:!px-10 lg:py-4 2xl:gap-8 min-[1680px]:gap-12 min-[1680px]:!px-[120px]"
        >
          {/* Navigation Architecture (Blueprint v1 FINAL) — a single resolved,
              already-filtered (visible + target-available) list from the
              standalone Navigation module (`~/lib/navigationContent`), never
              a hardcoded array and never derived from a target entity's own
              fields (Promotion Page/Category own no navigation data). Only
              top-level items render here, same as this row's pre-existing
              behavior — nested items (`item.children`) are supported by the
              data model and rendered in MobileMenu, not as a desktop
              mega-menu (no such design exists yet). */}
          <For each={navigation.visibleTree()}>
            {(item) => (
              <A
                href={item.href}
                end
                // An in-page link ("/#flash-sale") would otherwise read as active on every visit to its page.
                activeClass={item.href.includes("#") ? "" : "underline underline-offset-4"}
                class="flex min-h-[44px] shrink-0 items-center gap-1 whitespace-nowrap px-2 text-sm text-white transition-opacity duration-200 lg:min-h-0 lg:px-0 lg:text-base lg:hover:opacity-80"
                classList={{ "font-semibold": !!item.icon, "font-medium": !item.icon }}
              >
                <NavIcon icon={item.icon} class="size-6 shrink-0 lg:size-8" />
                {item.label}
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
    {/* Rendered as a sibling, not nested inside <header> — that element gets
        a `transform` (hide-on-scroll) whenever `headerHidden()` is true, and
        `position: fixed` resolves against the nearest transformed ancestor,
        not the viewport, once one exists. Nesting Bottom Nav inside would
        make it slide away with the header instead of staying put. */}
    <Show when={!props.minimal}>
      <BottomNav />
    </Show>
    </>
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
