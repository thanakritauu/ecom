import { Show } from "solid-js";
import { A } from "@solidjs/router";
import { HomeIcon, TagIcon, CartIcon, UserIcon } from "./icons";
import { useCart } from "~/lib/cart";
import { useNavigationContent } from "~/lib/navigationContent";

/**
 * Global Responsive + Navigation Foundation §4 — one shared Bottom Nav,
 * mounted once from `Header.tsx` (gated by the same `!minimal` flag that
 * already hides PromoStrip/SearchBar/MobileMenu there for Checkout), so
 * every page that renders `<Header />` gets it "for free" instead of each
 * route wiring it in by hand. Tablet + Mobile only (`lg:hidden` — this
 * project's Desktop cutoff everywhere else); Desktop never mounts it at all
 * rather than hiding it, so it can't affect Desktop layout.
 *
 * "โปรโมชั่น" resolves through the *same* Navigation config Header's own
 * category row reads (`useNavigationContent`) — the Flash Sale item — and
 * falls back to `/promotion/flash-sale` if that item is ever hidden.
 */
export function BottomNav() {
  const cart = useCart();
  const navigation = useNavigationContent();
  // "โปรโมชั่น" opens the Flash Sale page — the nav's Flash Sale item (same Navigation config), so an Admin change to it follows.
  const promotionHref = () => navigation.visibleTree().find((item) => item.id === "nav-102")?.href ?? "/promotion/flash-sale";

  const itemClass =
    "flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-ink-gray transition-colors duration-150 [&.active]:text-brand-pink";

  return (
    <nav
      aria-label="เมนูหลัก"
      class="fixed inset-x-0 bottom-0 z-40 flex min-h-16 items-stretch border-t border-surface-gray bg-white lg:hidden"
      style={{ "padding-bottom": "env(safe-area-inset-bottom)" }}
    >
      <A href="/" end class={itemClass}>
        <HomeIcon class="size-6" />
        <span class="text-xs font-medium">หน้าแรก</span>
      </A>
      <A href={promotionHref()} class={itemClass}>
        <TagIcon class="size-6" />
        <span class="text-xs font-medium">โปรโมชั่น</span>
      </A>
      <A href="/cart" class={itemClass}>
        {/* Fly-to-cart target on tablet / mobile (see ~/lib/flyToCart). */}
        <span class="relative" data-cart-target="bottom-nav">
          <CartIcon class="size-6" />
          <Show when={cart.badgeCount() > 0}>
            <span
              data-cart-badge
              class="absolute -right-2 -top-1.5 flex size-4 animate-badge-pop items-center justify-center rounded-pill bg-system-red text-[10px] font-medium text-white"
              aria-hidden="true"
            >
              {cart.badgeCount()}
            </span>
          </Show>
        </span>
        <span class="text-xs font-medium">ตะกร้า</span>
      </A>
      <A href="/account" class={itemClass}>
        <UserIcon class="size-6" />
        <span class="text-xs font-medium">โปรไฟล์</span>
      </A>
    </nav>
  );
}
