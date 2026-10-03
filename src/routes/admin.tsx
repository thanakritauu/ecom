import { Navigate, useLocation } from "@solidjs/router";
import { Show, createEffect, onCleanup, type JSX } from "solid-js";
import { isServer } from "solid-js/web";
import { AdminAuthProvider, useAdminAuth } from "~/lib/adminAuth";
import { useAdminUI } from "~/lib/adminUI";
import { AdminProductProvider } from "~/lib/adminProductStore";
import { AdminCategoryProvider } from "~/lib/adminCategoryStore";
import { AdminBrandProvider } from "~/lib/adminBrandStore";
import { AdminOrderProvider } from "~/lib/adminOrderStore";
import { AdminCustomerProvider } from "~/lib/adminCustomerStore";
import { AdminMarketingProvider } from "~/lib/adminMarketingStore";
import { AdminContentProvider } from "~/lib/adminContentStore";
import { AdminBannerProvider } from "~/lib/adminBannerStore";
import { AdminCampaignProvider } from "~/lib/adminCampaignStore";
import { AdminCollectionProvider } from "~/lib/adminCollectionStore";
import { AdminNavigationProvider } from "~/lib/adminNavigationStore";
import { AdminLoyaltyProvider } from "~/lib/adminLoyaltyStore";
import { AdminLoyaltyMemberProvider } from "~/lib/adminLoyaltyMemberStore";
import { AdminMissionProvider } from "~/lib/adminLoyaltyMissionStore";
import { AdminRewardProvider } from "~/lib/adminLoyaltyRewardStore";
import { AdminInventoryStockProvider } from "~/lib/adminInventoryStockStore";
import { AdminNotificationBarProvider } from "~/lib/adminNotificationBarStore";
import { AdminFeaturedReviewProvider } from "~/lib/adminFeaturedReviewStore";
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
  const ui = useAdminUI();
  const location = useLocation();
  const isLoginRoute = () => location.pathname === "/admin/login";
  // CMS Backoffice Polish §03 — a Full Page Preview must render exactly like
  // the real customer page (Header/Footer, no Admin sidebar/topbar chrome),
  // so `/admin/preview/*` is the one other exception to "every /admin/*
  // route gets AdminLayout" — same shape as the /admin/login exception
  // above, still gated on being signed in.
  const isPreviewRoute = () => location.pathname.startsWith("/admin/preview/");

  // CMS + Frontend Final Refinement §9 — the one place Admin's Dark/Light
  // preference actually touches the DOM: a `data-theme` attribute on
  // `<html>`, which every `rgb(var(--color-*) / <alpha-value>)` token
  // (app.css) reads. Scoped to real Admin chrome only, never `/admin/
  // preview/*` (that route renders the real, unthemed Customer Frontend on
  // purpose) — and removed on cleanup, i.e. the moment this whole route
  // group unmounts because the user navigated to a non-`/admin/*` page, so
  // the Customer Frontend can never inherit a dark attribute left behind.
  createEffect(() => {
    if (isServer) return;
    const dark = ui.themeMode() === "dark" && !isPreviewRoute();
    if (dark) {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  });
  onCleanup(() => {
    if (!isServer) document.documentElement.removeAttribute("data-theme");
  });

  return (
    <Show when={admin.isReady()} fallback={<AdminBootScreen />}>
      <Show when={admin.isAuthenticated()} fallback={<Show when={isLoginRoute()} fallback={<Navigate href="/admin/login" />}>{props.children}</Show>}>
        <Show when={!isLoginRoute()} fallback={<Navigate href="/admin" />}>
          <Show when={!isPreviewRoute()} fallback={props.children}>
            <AdminLayout>{props.children}</AdminLayout>
          </Show>
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
            <AdminInventoryStockProvider>
              <AdminCategoryProvider>
                <AdminBrandProvider>
                  <AdminOrderProvider>
                    <AdminCustomerProvider>
                      <AdminMarketingProvider>
                        <AdminContentProvider>
                          <AdminBannerProvider>
                            <AdminCampaignProvider>
                              <AdminCollectionProvider>
                                <AdminNavigationProvider>
                                  <AdminLoyaltyProvider>
                                    <AdminLoyaltyMemberProvider>
                                      <AdminMissionProvider>
                                        <AdminRewardProvider>
                                          <AdminNotificationBarProvider>
                                            <AdminFeaturedReviewProvider>
                                              <AdminGate>{props.children}</AdminGate>
                                            </AdminFeaturedReviewProvider>
                                          </AdminNotificationBarProvider>
                                        </AdminRewardProvider>
                                      </AdminMissionProvider>
                                    </AdminLoyaltyMemberProvider>
                                  </AdminLoyaltyProvider>
                                </AdminNavigationProvider>
                              </AdminCollectionProvider>
                            </AdminCampaignProvider>
                          </AdminBannerProvider>
                        </AdminContentProvider>
                      </AdminMarketingProvider>
                    </AdminCustomerProvider>
                  </AdminOrderProvider>
                </AdminBrandProvider>
              </AdminCategoryProvider>
            </AdminInventoryStockProvider>
          </AdminProductProvider>
        </AdminNotificationProvider>
      </AdminUIProvider>
    </AdminAuthProvider>
  );
}
