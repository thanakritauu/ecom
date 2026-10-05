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
  BrandBadgeIcon,
  PromotionTagIcon,
  CouponTicketIcon,
  FlashBoltIcon,
  BundleBoxIcon,
  MemberBadgeIcon,
  PointsCoinIcon,
  MissionFlagIcon,
  RewardGiftIcon,
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
};

export type AdminNavGroup = {
  id: string;
  /** Section label shown above the group's items. Omitted for the standalone Dashboard entry. */
  label?: string;
  icon: Component<{ class?: string }>;
  items: AdminNavItem[];
};

/**
 * Mirrors PART 5/6 of the Admin Shell spec. Groups with more than one real
 * module (Inventory, Marketing, Loyalty, Content, Settings) get one enabled
 * "overview" item today plus disabled preview rows for the sub-pages later
 * phases will build — so every group has exactly one real destination now,
 * and the full future IA is already visible instead of appearing all at once
 * in a later phase.
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
      { label: "แบรนด์", href: "/admin/brands", icon: BrandBadgeIcon },
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
      { label: "ภาพรวมการตลาด", href: "/admin/marketing", end: true },
      { label: "โปรโมชั่น", href: "/admin/marketing/promotions", icon: PromotionTagIcon },
      { label: "คูปอง", href: "/admin/marketing/coupons", icon: CouponTicketIcon },
      { label: "แฟลชเซล", href: "/admin/marketing/flash-sale", icon: FlashBoltIcon },
      { label: "บันเดิล", href: "/admin/marketing/bundles", icon: BundleBoxIcon },
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
      { label: "หน้าโปรโมชั่น", href: "/admin/promotion-pages", icon: PagesPanelIcon },
      { label: "แบนเนอร์", href: "/admin/content/banners", icon: ImageIcon },
      { label: "แคมเปญ", href: "/admin/content/campaigns", icon: CampaignFlagIcon },
      { label: "คอลเลกชันสินค้า", href: "/admin/content/product-collections", icon: FolderIcon },
      // CMS Final Admin UX Refinement §02/§18 — "Notification" is no longer
      // its own top-level sidebar group; it lives here, under "จัดการเนื้อหา",
      // renamed to "โปรโมชั่นแถบ" (internal route/model name unchanged).
      { label: "โปรโมชั่นแถบ", href: "/admin/notifications", icon: BellIcon },
      // Read-only mirror of the storefront Footer (no Footer CMS yet).
      { label: "Footer", href: "/admin/content/footer", icon: LayersIcon },
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
      { label: "จัดการคลังสินค้า", href: "/admin/inventory" },
    ],
  },
  {
    id: "loyalty",
    label: "สะสมคอยน์",
    icon: LoyaltyIcon,
    items: [
      { label: "สะสมคอยน์", href: "/admin/loyalty", end: true, icon: PointsCoinIcon },
      { label: "สมาชิก", href: "/admin/loyalty/members", icon: MemberBadgeIcon },
      { label: "ภารกิจ", href: "/admin/loyalty/missions", icon: MissionFlagIcon },
      { label: "ของรางวัล", href: "/admin/loyalty/rewards", icon: RewardGiftIcon },
    ],
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
