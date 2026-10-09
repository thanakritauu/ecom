import { HamburgerIcon } from "~/components/shared/icons";
import { AdminUserMenu } from "./AdminUserMenu";
import { AdminNotificationPanel } from "./AdminNotificationPanel";
import logo from "~/assets/icons/logo-charmiss-pink.svg";

/**
 * [Menu][Logo] on the left (mobile only), [Admin User][Notification] on the
 * right. The global search box and the TH/EN switch were removed: neither
 * did anything (no search backend, no translations), and staff-facing UI
 * keeps only controls that work.
 */
export function AdminTopbar(props: { onMenuClick: () => void }) {
  return (
    <header class="sticky top-0 z-20 flex min-h-16 shrink-0 items-center gap-3 border-b border-border bg-surface-card px-4 lg:px-6">
      <button
        type="button"
        onClick={props.onMenuClick}
        aria-label="เปิดเมนู"
        class="flex size-11 shrink-0 items-center justify-center rounded-pill text-ink hover:bg-surface-pink lg:hidden"
      >
        <HamburgerIcon class="size-6" />
      </button>

      {/* §25 — Charmiss Pink Logo everywhere, on every device; "Charmiss CMS"
          text never substitutes for it (it lives as this image's alt text /
          the browser tab title instead). */}
      <img src={logo} alt="Charmiss CMS" class="h-6 w-auto lg:hidden" />

      <div class="ml-auto flex items-center gap-2 lg:gap-3">
        <AdminUserMenu />
        <AdminNotificationPanel />
      </div>
    </header>
  );
}
