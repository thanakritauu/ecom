import type { StatusTone } from "~/components/admin/StatusBadge";
import { CUSTOMERS as ORDER_SEED_CUSTOMERS } from "./adminOrders";

/**
 * Phase 05 — Customer Management. Customer is a real Master Data entity
 * (same "Admin Store + LocalStorage" pattern as Category/Brand), distinct
 * from `OrderCustomer` (`adminOrders.ts`) — that type stays exactly what it
 * always was: a historical snapshot frozen at purchase time, never a live
 * reference into this Customer record (Order = Historical Snapshot).
 *
 * Deliberately NOT stored on this type: `totalOrders`, `totalSpent`,
 * `lastOrderAt`. Storing them would create a second, independently-drifting
 * copy of data the Order Store already owns — the exact mistake this
 * codebase's "Architecture Cleanup & Source of Truth" pass already fixed for
 * Category (`AdminCategory` carries no product count; see
 * `~/lib/masterDataRelations`'s `productsInCategory`) and Product (its own
 * Collection/Navigation/Promotion-Page reference counts are never cached
 * either). These three are always derived live via `~/lib/customerResolvers`
 * from `useAdminOrders().orders()`, the same "never hardcode, always derive"
 * rule §15 of the phase spec itself requires.
 */
export type CustomerStatus = "active" | "inactive" | "blocked";

export const CUSTOMER_STATUS_META: Record<CustomerStatus, { label: string; tone: StatusTone }> = {
  active: { label: "ใช้งานอยู่", tone: "success" },
  inactive: { label: "ไม่ได้ใช้งาน", tone: "neutral" },
  blocked: { label: "ถูกระงับ", tone: "danger" },
};

/** Loyalty tier — display-only in this phase (no Loyalty module manages it here). Phase 08.2's Loyalty > สมาชิก view treats Cordy CRM as the real Membership Source of Truth and keeps its own, separate Member record (`adminLoyaltyMembers.ts`) rather than writing back onto Customer — never a second, competing owner of this same field. */
export type CustomerTier = "member" | "silver" | "gold" | "platinum";

export const CUSTOMER_TIER_META: Record<CustomerTier, { label: string }> = {
  member: { label: "Member" },
  silver: { label: "Silver" },
  gold: { label: "Gold" },
  platinum: { label: "Platinum" },
};

export type Customer = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  avatar?: string;
  status: CustomerStatus;
  /** Display label (e.g. "12 ม.ค. 2568") — same "formatted string, not a Date" convention every other Admin module's dates already use (Order.createdAt, AdminCategory.createdAt, ...). */
  memberSince: string;
  address?: string;
  loyaltyPoints?: number;
  tier?: CustomerTier;
  createdAt: string;
  updatedAt: string;
};

/** Editable via `CustomerForm` — `loyaltyPoints`/`tier`/`avatar` are Loyalty-module/upload concerns with no admin UI in this phase (§03: "ห้ามสร้าง field ที่ไม่มีการใช้งานโดยไม่มีเหตุผล"), so they're never part of the form's own values; the store's `add`/`update` preserve whatever a record already has for them. */
export type CustomerFormValues = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: CustomerStatus;
  address?: string;
};

export function getCustomerFullName(c: Pick<Customer, "firstName" | "lastName">): string {
  return `${c.firstName} ${c.lastName}`.trim();
}

export function getCustomerInitials(c: Pick<Customer, "firstName" | "lastName">): string {
  return `${c.firstName.charAt(0)}${c.lastName.charAt(0)}`.toUpperCase() || "?";
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/** Case-insensitive; `excludeId` lets Edit compare against every *other* customer — same shape as `isCategorySlugTaken`. */
export function isCustomerEmailTaken(customers: Customer[], email: string, excludeId?: string): boolean {
  const target = email.trim().toLowerCase();
  return customers.some((c) => c.id !== excludeId && c.email.trim().toLowerCase() === target);
}

/** Compares digits only, so "089-111-2222" and "0891112222" are recognized as the same phone number. */
export function isCustomerPhoneTaken(customers: Customer[], phone: string, excludeId?: string): boolean {
  const target = phone.replace(/\D/g, "");
  return target !== "" && customers.some((c) => c.id !== excludeId && c.phone.replace(/\D/g, "") === target);
}

/**
 * Root-cause guard, same shape as `normalizeCategory`/`normalizeAdminProduct`
 * — anything read back out of `localStorage` may predate a field the current
 * shape relies on.
 */
export function normalizeCustomer(c: Partial<Customer> & { id: string }): Customer {
  return {
    id: c.id,
    firstName: c.firstName ?? "",
    lastName: c.lastName ?? "",
    email: c.email ?? "",
    phone: c.phone ?? "",
    avatar: c.avatar,
    status: c.status ?? "active",
    memberSince: c.memberSince ?? "",
    address: c.address,
    loyaltyPoints: c.loyaltyPoints,
    tier: c.tier,
    createdAt: c.createdAt ?? "",
    updatedAt: c.updatedAt ?? "",
  };
}

const TODAY_LABEL = "18 ก.ย. 2569";

type CustomerSeed = Omit<Customer, "createdAt" | "updatedAt">;

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  return { firstName: parts[0] ?? fullName, lastName: parts.slice(1).join(" ") };
}

/**
 * CMS-only fields for the 6 customers `ORDER_SEED_CUSTOMERS` already names —
 * id/name/email/phone come from that one shared array (never retyped by
 * hand here, so the two can never disagree); this only adds the fields a
 * Customer Master record needs that an order snapshot never did. Deliberately
 * varied per §05's own acceptance list: `cust-1`/`cust-4` are the
 * multi-order, high-spend, Gold/Platinum members; `cust-5` is inactive;
 * `cust-6` is blocked (and still has order history — exercises "blocked but
 * un-deletable" at the same time as "has orders so un-deletable").
 */
const ORDER_CUSTOMER_EXTRAS: Record<string, { status: CustomerStatus; memberSince: string; tier?: CustomerTier; loyaltyPoints?: number }> = {
  "cust-1": { status: "active", memberSince: "12 ม.ค. 2568", tier: "gold", loyaltyPoints: 1280 },
  "cust-2": { status: "active", memberSince: "3 มี.ค. 2568", tier: "silver", loyaltyPoints: 640 },
  "cust-3": { status: "active", memberSince: "20 เม.ย. 2568", tier: "member", loyaltyPoints: 210 },
  "cust-4": { status: "active", memberSince: "9 พ.ค. 2568", tier: "platinum", loyaltyPoints: 3120 },
  "cust-5": { status: "inactive", memberSince: "14 มิ.ย. 2568" },
  "cust-6": { status: "blocked", memberSince: "2 ก.ค. 2568" },
};

/** Never referenced by any `ORDER_SEEDS` entry in `adminOrders.ts` — the "ลูกค้าที่ยังไม่เคยสั่งซื้อ" case §05 explicitly asks for. */
const NO_ORDER_CUSTOMER_SEEDS: CustomerSeed[] = [
  { id: "cust-7", firstName: "พิม", lastName: "จ.", email: "pim.j@example.com", phone: "085-666-7777", status: "active", memberSince: "18 ส.ค. 2568" },
  { id: "cust-8", firstName: "ต้นข้าว", lastName: "ร.", email: "tonkhao.r@example.com", phone: "086-777-8888", status: "active", memberSince: "1 ก.ย. 2568" },
  { id: "cust-9", firstName: "ใบเตย", lastName: "ม.", email: "baitoey.m@example.com", phone: "087-888-9999", status: "inactive", memberSince: "5 ก.ย. 2568" },
];

/** Baseline builder — fixed string-literal ids ("cust-1".."cust-9"), not an incrementing counter, so this returns byte-identical output on every call within the same process (same rule as every other Admin content module's `buildMock*()`). */
export function buildMockCustomers(): Customer[] {
  const fromOrders: CustomerSeed[] = ORDER_SEED_CUSTOMERS.map((oc) => {
    const { firstName, lastName } = splitName(oc.name);
    const extra = ORDER_CUSTOMER_EXTRAS[oc.id] ?? { status: "active" as CustomerStatus, memberSince: TODAY_LABEL };
    return { id: oc.id, firstName, lastName, email: oc.email, phone: oc.phone, ...extra };
  });
  return [...fromOrders, ...NO_ORDER_CUSTOMER_SEEDS].map((seed) => ({ ...seed, createdAt: TODAY_LABEL, updatedAt: TODAY_LABEL }));
}

/** Thai short month abbreviations, in calendar order — every date label this codebase generates (`"12 ม.ค. 2568"`) uses exactly these. */
const THAI_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

/**
 * Every date in this Admin prototype is a display-only Thai label string,
 * never a real `Date` (same convention `Order.createdAt`/`AdminCategory.
 * createdAt` already use) — so sorting "Member Since"/"Last Order" needs a
 * small parser to get a comparable number, rather than a second stored date
 * field just for sorting. Unparseable input sorts as oldest (0), never throws.
 */
export function parseThaiDateLabel(label: string | undefined): number {
  if (!label) return 0;
  const m = label.trim().match(/^(\d{1,2})\s+([ก-ฮ.]+)\s+(\d{4})$/);
  if (!m) return 0;
  const day = Number(m[1]);
  const month = THAI_MONTHS.indexOf(m[2]);
  const year = Number(m[3]);
  return year * 372 + Math.max(0, month) * 31 + day;
}
