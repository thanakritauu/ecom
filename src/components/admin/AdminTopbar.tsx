import { HamburgerIcon } from "~/components/shared/icons";
import { pushToast } from "~/lib/toast";
import { AdminUserMenu } from "./AdminUserMenu";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { AdminNotificationPanel } from "./AdminNotificationPanel";
import { SearchIcon } from "./icons";

/**
 * PART 9 of the spec, as corrected by Global UI Correction — Final Overrides
 * #10/11 below: [Menu][Page/Brand] on the left, [Admin User][Language]
 * [Notification] on the right, in that order, on both mobile and desktop
 * (the sidebar already carries the brand + page context there, so the
 * topbar doesn't repeat it). Search is a mock interaction only — no real
 * search backend exists in this prototype; Notification is real mock state
 * (see adminNotifications.tsx), not a placeholder toast.
 */
export function AdminTopbar(props: { onMenuClick: () => void }) {
  return (
    <header class="sticky top-0 z-20 flex min-h-16 shrink-0 items-center gap-3 border-b border-surface-gray bg-white px-4 lg:px-6">
      <button
        type="button"
        onClick={props.onMenuClick}
        aria-label="เปิดเมนู"
        class="flex size-11 shrink-0 items-center justify-center rounded-pill text-ink hover:bg-surface-pink lg:hidden"
      >
        <HamburgerIcon class="size-6" />
      </button>

      <p class="text-lg font-bold text-brand-pink lg:hidden">Charmiss Admin</p>

      <button
        type="button"
        onClick={() => pushToast("ค้นหาในระบบหลังบ้าน (เร็วๆ นี้)", "info")}
        class="hidden h-11 flex-1 max-w-sm items-center gap-2 rounded-pill bg-surface-gray px-4 text-sm text-ink-gray transition-colors duration-150 hover:bg-surface-gray/70 lg:flex"
      >
        <SearchIcon class="size-4 shrink-0" />
        ค้นหาสินค้า คำสั่งซื้อ ลูกค้า...
      </button>

      {/* Global UI Correction — Final Overrides #10/11 (this is the final
          order, replacing the previous Admin User → Notification →
          Language): Admin User → Language → Notification, left to right.
          All three share the same Surface-style pill container (height/
          radius/background) so none of them reads as a bare floating icon
          next to two "real" buttons. */}
      <div class="ml-auto flex items-center gap-2 lg:gap-3">
        <AdminUserMenu />
        <LanguageSwitcher class="hidden sm:flex" />
        <AdminNotificationPanel />
      </div>
    </header>
  );
}
