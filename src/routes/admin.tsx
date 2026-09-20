import { Navigate, useLocation } from "@solidjs/router";
import { Show, type JSX } from "solid-js";
import { AdminAuthProvider, useAdminAuth } from "~/lib/adminAuth";
import { AdminProductProvider } from "~/lib/adminProductStore";
import { AdminCategoryProvider } from "~/lib/adminCategoryStore";
import { AdminBrandProvider } from "~/lib/adminBrandStore";
import { AdminOrderProvider } from "~/lib/adminOrderStore";
import { AdminMarketingProvider } from "~/lib/adminMarketingStore";
import { AdminContentProvider } from "~/lib/adminContentStore";
import { AdminBannerProvider } from "~/lib/adminBannerStore";
import { AdminCampaignProvider } from "~/lib/adminCampaignStore";
import { AdminCollectionProvider } from "~/lib/adminCollectionStore";
import { AdminHomepageProvider } from "~/lib/adminHomepageStore";
import { AdminUIProvider } from "~/lib/adminUI";
import { AdminNotificationProvider } from "~/lib/adminNotifications";
import { AdminLayout } from "~/layouts/AdminLayout";

/**
 * Layout + route guard for every `/admin/*` page (file next to the `admin/`
 * folder = SolidStart nested layout, same convention `app.tsx`'s Router
 * `root` already uses at the top level). Mounts the admin-only session
 * (kept entirely separate from the customer `AuthProvider` in lib/auth.tsx)
 * and decides, per PART 11 of the spec:
 *   - not signed in, not already on /admin/login  → redirect to /admin/login
 *   - signed in, on /admin/login                  → redirect to /admin
 *   - otherwise                                    → render inside AdminLayout
 * `/admin/login` itself renders without the sidebar/topbar chrome.
 */
function AdminGate(props: { children: JSX.Element }) {
  const admin = useAdminAuth();
  const location = useLocation();
  const isLoginRoute = () => location.pathname === "/admin/login";

  return (
    <Show when={admin.isReady()} fallback={<AdminBootScreen />}>
      <Show
        when={!isLoginRoute()}
        fallback={<Show when={!admin.isAuthenticated()} fallback={<Navigate href="/admin" />}>{props.children}</Show>}
      >
        <Show when={admin.isAuthenticated()} fallback={<Navigate href="/admin/login" />}>
          <AdminLayout>{props.children}</AdminLayout>
        </Show>
      </Show>
    </Show>
  );
}

/**
 * `isReady()` is false on the server and for one frame on the client (the
 * mock session lives in localStorage, read only after mount — see
 * adminAuth.tsx). Rendering the redirect logic before that would bounce an
 * already-signed-in admin to `/admin/login` on every hard refresh, the same
 * hydration-flash bug already fixed once for Cart/Wishlist/Auth.
 */
function AdminBootScreen() {
  return (
    <div class="flex min-h-screen items-center justify-center bg-surface-gray/60">
      <p class="text-sm text-ink-gray">กำลังโหลด...</p>
    </div>
  );
}

export default function AdminRouteGroup(props: { children: JSX.Element }) {
  return (
    <AdminAuthProvider>
      <AdminUIProvider>
        <AdminNotificationProvider>
          <AdminProductProvider>
            <AdminCategoryProvider>
              <AdminBrandProvider>
                <AdminOrderProvider>
                  <AdminMarketingProvider>
                    <AdminContentProvider>
                      <AdminBannerProvider>
                        <AdminCampaignProvider>
                          <AdminCollectionProvider>
                            <AdminHomepageProvider>
                              <AdminGate>{props.children}</AdminGate>
                            </AdminHomepageProvider>
                          </AdminCollectionProvider>
                        </AdminCampaignProvider>
                      </AdminBannerProvider>
                    </AdminContentProvider>
                  </AdminMarketingProvider>
                </AdminOrderProvider>
              </AdminBrandProvider>
            </AdminCategoryProvider>
          </AdminProductProvider>
        </AdminNotificationProvider>
      </AdminUIProvider>
    </AdminAuthProvider>
  );
}
