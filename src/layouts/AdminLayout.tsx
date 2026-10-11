import { clientOnly } from "@solidjs/start";
import type { JSX } from "solid-js";
import { createDialogOpenState } from "~/lib/focusRestore";
import { useAdminDocumentTitle } from "~/lib/adminDocumentTitle";
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
  useAdminDocumentTitle();

  return (
    // §17 — `admin-shell` scopes the Breadcrumb-alignment fix (app.css) to
    // Admin only. `shared/Breadcrumb.tsx` itself stays byte-for-byte
    // unchanged (its `scroll-rail` padding is load-bearing for the Customer
    // Frontend's own Breadcrumb usage, e.g. the PDP) — fixing this at the
    // shared-component level would have silently shifted that customer
    // breadcrumb out of alignment with its own page content.
    // Order + Receipt Phase §22 — Print Receipt must show only the receipt
    // document, never the Sidebar/Topbar/Drawer chrome every other /admin/*
    // page needs. `print:hidden` (on `contents` wrappers, so normal on-screen
    // flex layout is completely untouched) is scoped here, once, at the
    // layout every admin page already shares — never a per-page print
    // stylesheet that could drift from this.
    <div class="admin-shell flex min-h-screen w-full bg-surface-gray/60 print:block print:min-h-0 print:bg-white">
      <div class="contents print:hidden">
        <AdminSidebar />
      </div>
      <div class="flex min-w-0 flex-1 flex-col print:block">
        <div class="contents print:hidden">
          <AdminTopbar onMenuClick={() => setDrawerOpen(true)} />
        </div>
        {/* `overflow-x-clip`, not `-hidden`: hidden makes <main> a scroll container, which breaks every
            `sticky` inside it (form preview columns, side columns). Clip trims the same overflow without that. */}
        <main class="flex-1 overflow-x-clip p-4 lg:p-6 print:p-0">{props.children}</main>
      </div>
      <div class="contents print:hidden">
        <AdminMobileDrawer open={drawerOpen()} onOpenChange={setDrawerOpen} />
      </div>
    </div>
  );
}
