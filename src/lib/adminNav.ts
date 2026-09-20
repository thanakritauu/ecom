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
  SettingsIcon,
} from "~/components/admin/icons";

export type AdminNavItem = {
  label: string;
  /** Absent = not built yet in this phase; rendered as a disabled preview row instead of a link. */
  href?: string;
  /** Only Dashboard needs exact matching — every other href is unique enough that a prefix match never falsely activates it. */
  end?: boolean;
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
    label: "แคตตาล็อก",
    icon: CatalogIcon,
    items: [
      { label: "สินค้า", href: "/admin/products" },
      { label: "หมวดหมู่", href: "/admin/categories" },
      { label: "แบรนด์", href: "/admin/brands" },
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
    id: "inventory",
    label: "คลังสินค้า",
    icon: InventoryIcon,
    items: [
      { label: "ภาพรวมคลังสินค้า", href: "/admin/inventory" },
      { label: "สต๊อกสินค้า" },
      { label: "ปรับปรุงสต๊อก" },
    ],
  },
  {
    id: "marketing",
    label: "การตลาด",
    icon: MarketingIcon,
    items: [
      { label: "ภาพรวมการตลาด", href: "/admin/marketing", end: true },
      { label: "โปรโมชั่น", href: "/admin/marketing/promotions" },
      { label: "คูปอง", href: "/admin/marketing/coupons" },
      { label: "แฟลชเซล", href: "/admin/marketing/flash-sale" },
      { label: "บันเดิล", href: "/admin/marketing/bundles" },
    ],
  },
  {
    id: "loyalty",
    label: "สะสมแต้ม",
    icon: LoyaltyIcon,
    items: [
      { label: "ภาพรวมสะสมแต้ม", href: "/admin/loyalty" },
      { label: "สมาชิก" },
      { label: "แต้มสะสม" },
      { label: "ภารกิจ" },
      { label: "ของรางวัล" },
    ],
  },
  {
    id: "reviews",
    label: "รีวิว",
    icon: ReviewsIcon,
    items: [{ label: "รีวิวสินค้า", href: "/admin/reviews" }],
  },
  {
    id: "content",
    label: "เนื้อหา",
    icon: ContentIcon,
    items: [
      { label: "ภาพรวมเนื้อหา", href: "/admin/content", end: true },
      { label: "หน้าแรก", href: "/admin/content/homepage" },
      { label: "Landing Pages", href: "/admin/content/landing-pages" },
      { label: "แบนเนอร์", href: "/admin/content/banners" },
      { label: "แคมเปญ", href: "/admin/content/campaigns" },
      { label: "คอลเลกชันสินค้า", href: "/admin/content/product-collections" },
    ],
  },
  {
    id: "settings",
    label: "ตั้งค่า",
    icon: SettingsIcon,
    items: [
      { label: "ภาพรวมตั้งค่า", href: "/admin/settings" },
      { label: "ทั่วไป" },
      { label: "ผู้ดูแลระบบ" },
      { label: "สิทธิ์การใช้งาน" },
    ],
  },
];
