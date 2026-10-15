import type { Component } from "solid-js";
import {
  DashboardIcon,
  CatalogIcon,
  OrdersIcon,
  CustomersIcon,
  InventoryIcon,
  MarketingIcon,
  LoyaltyIcon,
  ReviewsIcon,
  ContentIcon,
  NavigationIcon,
  SettingsIcon,
  ProductBoxIcon,
  CategoryGridIcon,
  PromotionTagIcon,
  PointsCoinIcon,
  PagesPanelIcon,
  ImageIcon,
  CampaignFlagIcon,
  FolderIcon,
  ShieldUserIcon,
  KeyIcon,
  BellIcon,
  LayersIcon,
  StarIcon,
} from "~/components/admin/icons";

export type AdminNavItem = {
  label: string;
  /** Absent = not built yet in this phase; rendered as a disabled preview row instead of a link. */
  href?: string;
  /** Exact matching — needed by any item whose own href is a prefix of a sibling item's href in the same group (Dashboard's `/admin`, Settings Overview's `/admin/settings`, Loyalty's `/admin/loyalty`), otherwise both light up "active" at once. Every other href is unique enough that a prefix match never falsely activates it. */
  end?: boolean;
  /** CMS Backoffice Polish §18 — every item's own icon; falls back to the group's icon only when omitted (the group's "overview"/single item). No two items in the whole sidebar share an icon. */
  icon?: Component<{ class?: string }>;
  /** Extra paths that also light this item up (any route under them), e.g. the marketing hub for coupon and flash-sale pages. */
  activePrefixes?: string[];
};

/** Whether `pathname` is this item's page (its own href, by `end` rules, or one of its `activePrefixes`). */
export function isNavItemActive(item: AdminNavItem, pathname: string): boolean {
  if (!item.href) return false;
  if (item.end ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`)) return true;
  return (item.activePrefixes ?? []).some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export type AdminNavGroup = {
  id: string;
  /** Section label shown above the group's items. Omitted for the standalone Dashboard entry. */
  label?: string;
  icon: Component<{ class?: string }>;
  items: AdminNavItem[];
};

/**
 * Single source for the desktop sidebar, collapsed rail and mobile drawer.
 * Only menus whose data the storefront actually uses are listed; cut
 * features (bundles, loyalty missions/rewards/members, banners) have no entry.
 */
export const adminNavGroups: AdminNavGroup[] = [
  {
    id: "dashboard",
    icon: DashboardIcon,
    items: [{ label: "แดชบอร์ด", href: "/admin", end: true }],
  },
  {
    id: "catalog",
    label: "สินค้า",
    icon: CatalogIcon,
    items: [
      { label: "สินค้า", href: "/admin/products", icon: ProductBoxIcon },
      { label: "หมวดหมู่", href: "/admin/categories", icon: CategoryGridIcon },
      // Product Collections, renamed and moved here from Content: a hand-picked product list reused by Campaign pages, menus and Home.
      { label: "กลุ่มสินค้าพิเศษ", href: "/admin/content/product-collections", icon: FolderIcon },
    ],
  },
  {
    id: "sales",
    label: "การขาย",
    icon: OrdersIcon,
    items: [{ label: "คำสั่งซื้อ", href: "/admin/orders" }],
  },
  {
    id: "customers",
    label: "ลูกค้า",
    icon: CustomersIcon,
    items: [{ label: "ลูกค้า", href: "/admin/customers" }],
  },
  {
    id: "marketing",
    label: "การตลาด",
    icon: MarketingIcon,
    items: [
      // One hub (เครื่องมือโปรโมชั่น + จัดการโปรโมชั่น); coupons and flash sale open from it, so it stays lit on every /admin/marketing page.
      { label: "โปรโมชั่น", href: "/admin/marketing/promotions", icon: PromotionTagIcon, activePrefixes: ["/admin/marketing"] },
    ],
  },
  {
    id: "content",
    // CMS Backoffice Polish §21 — "ภาพรวมเนื้อหา" (the /admin/content overview
    // route) is removed outright, not hidden: no menu item points at it and
    // the route file itself is deleted, so it can't become an orphaned page.
    // The group's first real destination is now Promotion Pages.
    label: "จัดการเนื้อหา",
    icon: ContentIcon,
    items: [
      // Promotion Pages, shown as "หน้าแคมเปญ" since the old Campaign module was folded into them. Route/model names unchanged.
      { label: "หน้าแคมเปญ", href: "/admin/promotion-pages", icon: PagesPanelIcon },
      // The storefront's top bars (PromoStrip + UtilityBar). Internal route/model name unchanged.
      { label: "แถบประกาศด้านบน", href: "/admin/notifications", icon: BellIcon },
      { label: "ส่วนท้ายเว็บไซต์", href: "/admin/content/footer", icon: LayersIcon },
      { label: "Popup", href: "/admin/content/popup", icon: CampaignFlagIcon },
    ],
  },
  {
    id: "navigation",
    label: "เมนูนำทาง",
    icon: NavigationIcon,
    items: [{ label: "จัดการเมนู", href: "/admin/navigation", end: true }],
  },
  {
    id: "reviews",
    label: "รีวิว",
    icon: ReviewsIcon,
    items: [
      { label: "รีวิวสินค้า", href: "/admin/reviews", end: true, icon: StarIcon },
      { label: "คลิปรีวิว TikTok", href: "/admin/reviews/tiktok", icon: ImageIcon },
    ],
  },
  // CMS Dashboard & Admin UX Refinement §23-24 — "คลังสินค้า"/"สะสมแต้ม" moved
  // here, directly before "ตั้งค่า", from their previous spot between
  // "ลูกค้า" and "การตลาด". Single source of truth (this array) drives
  // Desktop Sidebar, Collapsed Sidebar, and the Mobile/Tablet Drawer alike —
  // reordering here is reordering everywhere, never a per-device list.
  // "รีวิว" moved directly above so it sits right before "คลังสินค้า".
  {
    id: "inventory",
    label: "คลังสินค้า",
    icon: InventoryIcon,
    items: [
      { label: "สต๊อกสินค้า", href: "/admin/inventory" },
    ],
  },
  {
    // Missions, rewards and the separate members list were cut (the
    // storefront has none of them). One page shows the tiers + coin rules;
    // members live in Customers.
    id: "loyalty",
    label: "สมาชิก",
    icon: LoyaltyIcon,
    items: [{ label: "Charmiss Club", href: "/admin/loyalty", icon: PointsCoinIcon }],
  },
  {
    id: "settings",
    label: "ตั้งค่า",
    icon: SettingsIcon,
    items: [
      { label: "ภาพรวมตั้งค่า", href: "/admin/settings", end: true },
      { label: "ผู้ดูแลระบบ", href: "/admin/settings/admins", icon: ShieldUserIcon },
      { label: "สิทธิ์การใช้งาน", href: "/admin/settings/permissions", icon: KeyIcon },
    ],
  },
];
