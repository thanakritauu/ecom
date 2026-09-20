/**
 * Architecture Cleanup & Source of Truth §18/§21/§22 — this file used to
 * hardcode a "Primary Nav" (9.9 / มาใหม่ / กำลังฮิต / โปรโมชั่น) with its own
 * image icons and dead-end routes (`/promotions/9-9`, `/new`, `/trending`,
 * `/promotions` never existed as real pages — every one of those four links
 * 404'd before this cleanup). Navigation must not own content, and a
 * hardcoded link is exactly that: content baked into code instead of
 * Admin-managed configuration. All four are now real, Admin-editable Landing
 * Pages (`promo-page-001` "9.9 Beauty Sale", already existed; `promo-page-
 * 006/007/008` "สินค้ามาใหม่"/"กำลังฮิต"/"โปรโมชั่น", added as seeds to
 * preserve the same four-item storefront nav row) — see `adminContent.ts`.
 * `Header.tsx`/`MobileMenu.tsx` render the nav row purely from
 * `useLandingPages().navItems()` (Landing Pages) and
 * `useCategoryContent().navCategories()` (Categories) now; nothing left to
 * hardcode here for that row.
 *
 * The per-category links this file once hardcoded too (`/category/face`,
 * `/category/eye`, ...) were removed in an earlier phase for the same
 * reason (dead routes) — see the Global Frontend Navigation Architecture
 * phase.
 */
export const catalogNavLinks = [{ href: "/products", label: "ดูสินค้าทั้งหมด" }] as const;
