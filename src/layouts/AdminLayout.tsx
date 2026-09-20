import { clientOnly } from "@solidjs/start";
import type { JSX } from "solid-js";
import { createDialogOpenState } from "~/lib/focusRestore";
import { AdminSidebar } from "~/components/admin/AdminSidebar";
import { AdminTopbar } from "~/components/admin/AdminTopbar";

// Same reason as Header.tsx's CartDrawer/MobileMenu: Kobalte's Portal-based
// Dialog doesn't SSR/hydrate cleanly, and this is a closed-by-default
// overlay anyway, so mounting it client-only costs nothing visually.
const AdminMobileDrawer = clientOnly(() =>
  import("~/components/admin/AdminMobileDrawer").then((m) => ({ default: m.AdminMobileDrawer })),
);

/**
 * Container for every `/admin/*` page (PART 4 of the spec). Desktop: a
 * persistent sidebar beside a topbar + content column. Mobile: topbar only,
 * with the sidebar's nav available through the Drawer the topbar's menu
 * button opens — not a squeezed-down copy of the desktop sidebar.
 */
export function AdminLayout(props: { children: JSX.Element }) {
  const [drawerOpen, setDrawerOpen] = createDialogOpenState();

  return (
    <div class="flex min-h-screen w-full bg-surface-gray/60">
      <AdminSidebar />
      <div class="flex min-w-0 flex-1 flex-col">
        <AdminTopbar onMenuClick={() => setDrawerOpen(true)} />
        <main class="flex-1 overflow-x-hidden p-4 lg:p-6">{props.children}</main>
      </div>
      <AdminMobileDrawer open={drawerOpen()} onOpenChange={setDrawerOpen} />
    </div>
  );
}
