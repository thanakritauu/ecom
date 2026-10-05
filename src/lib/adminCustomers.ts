import type { StatusTone } from "~/components/admin/StatusBadge";
import { CUSTOMERS as ORDER_SEED_CUSTOMERS, customerOrderCoinNet } from "./adminOrders";
import { TIERS, type Tier, type TierId } from "./membership";
import { MOCK_ADDRESSES, type Address } from "./checkoutData";
import { SAMPLE_SAVED_CARDS, type SavedCard } from "./savedCards";
import type { CardBrand } from "./payment";
import type { User } from "./types";

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

/**
 * Member tier — the storefront's own Charmiss Glow → Radiance → Icon ladder
 * (`~/lib/membership`'s `TIERS`, climbed by this year's paid spend), reused
 * by import rather than a second admin-only tier list. Stored on the record
 * (display-only, like before) because part of a CRM-migrated member's yearly
 * spend happened in the old Charmiss Club channels this Admin has no orders
 * for — `normalizeTier` maps the retired member/silver/gold/platinum values.
 */
export type CustomerTier = TierId;

export const CUSTOMER_TIER_META: Record<CustomerTier, Tier> = Object.fromEntries(TIERS.map((t) => [t.id, t])) as Record<CustomerTier, Tier>;

const LEGACY_TIER: Record<string, CustomerTier> = { member: "glow", silver: "radiance", gold: "radiance", platinum: "icon" };

export function normalizeTier(value: unknown): CustomerTier {
  if (value === "glow" || value === "radiance" || value === "icon") return value;
  return typeof value === "string" ? (LEGACY_TIER[value] ?? "glow") : "glow";
}

/** Coin multiplier per tier — `membership.ts`'s own `coinMultiplier` (the "รับคอยน์ x1.5" / "x2" perks; Glow earns the base rate). */
export const TIER_COIN_MULTIPLIER: Record<CustomerTier, number> = Object.fromEntries(TIERS.map((t) => [t.id, t.coinMultiplier])) as Record<CustomerTier, number>;

/** How a member account came to exist — moved over from the old Charmiss Club CRM, a brand-new sign-up on the website, or added by staff here in Admin. */
export type CustomerSource = "crm_migrated" | "new_signup" | "admin_created";

export const CUSTOMER_SOURCE_META: Record<CustomerSource, { label: string; tone: StatusTone }> = {
  crm_migrated: { label: "ย้ายจาก CRM", tone: "info" },
  new_signup: { label: "สมาชิกใหม่", tone: "success" },
  admin_created: { label: "สร้างโดยแอดมิน", tone: "neutral" },
};

export type SignupMethod = "phone" | "email" | "line" | "google";

export const SIGNUP_METHOD_LABEL: Record<SignupMethod, string> = { phone: "เบอร์โทรศัพท์", email: "อีเมล", line: "LINE", google: "Google" };

/** Same values as the storefront profile (`User["gender"]`); labels copied from `/account/profile`'s own radio group. */
export type CustomerGender = NonNullable<User["gender"]>;

export const GENDER_LABEL: Record<CustomerGender, string> = { female: "หญิง", male: "ชาย", unspecified: "ไม่ระบุ" };

/** The storefront address-book entry as-is (`~/lib/checkoutData`'s `Address`) — `kind: "billing"` = ที่อยู่ออกใบเสร็จ, whose `recipientName` may be a company. */
export type CustomerAddress = Address;

/** Only what the storefront's mock card vault keeps (`~/lib/savedCards`) — never a full number or CVV; the token isn't shown in Admin so it isn't kept here. */
export type CustomerSavedCard = Pick<SavedCard, "id" | "brand" | "last4" | "expiry" | "holder">;

export const CARD_BRAND_LABEL: Record<CardBrand, string> = { visa: "Visa", mastercard: "Mastercard", jcb: "JCB", amex: "American Express", unknown: "บัตร" };

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
  /** ISO date (YYYY-MM-DD) — same format the storefront profile saves. */
  birthDate?: string;
  gender?: CustomerGender;
  addresses: CustomerAddress[];
  /** Product ids, same as the storefront wishlist (`charmiss:wishlist`) — mock, read-only in Admin. */
  wishlistProductIds: string[];
  savedCards: CustomerSavedCard[];
  loyaltyPoints?: number;
  tier?: CustomerTier;
  source: CustomerSource;
  signupMethod?: SignupMethod;
  /** Set for `crm_migrated` — the old CRM member id and how many coins were carried over on the first web sign-in. */
  crmMemberId?: string;
  crmCoinsTransferred?: number;
  createdAt: string;
  updatedAt: string;
};

/** Editable via `CustomerForm` — `loyaltyPoints`/`tier`/`avatar`/wishlist/saved cards are Loyalty-module/storefront concerns with no admin edit UI, so they're never part of the form's own values; the store's `add`/`update` preserve whatever a record already has for them. */
export type CustomerFormValues = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: CustomerStatus;
  birthDate?: string;
  gender?: CustomerGender;
  addresses: CustomerAddress[];
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

/** Pre-address-book records kept one free-text `address` — carried over as a single default shipping address so nothing typed is lost. */
type LegacyCustomer = Partial<Customer> & { id: string; address?: string };

function normalizeAddresses(c: LegacyCustomer): CustomerAddress[] {
  if (Array.isArray(c.addresses)) return c.addresses.filter((a) => a && a.id);
  if (!c.address?.trim()) return [];
  const recipientName = `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim();
  return [{ id: `${c.id}-addr-1`, label: "ที่อยู่", recipientName, phone: c.phone ?? "", addressLine: c.address.trim(), province: "", district: "", subDistrict: "", postalCode: "", isDefault: true }];
}

/**
 * Root-cause guard, same shape as `normalizeCategory`/`normalizeAdminProduct`
 * — anything read back out of `localStorage` (including records the
 * storefront's `memberRegistry.ts` writes on sign-in) may predate a field the
 * current shape relies on.
 */
export function normalizeCustomer(c: LegacyCustomer): Customer {
  return {
    id: c.id,
    firstName: c.firstName ?? "",
    lastName: c.lastName ?? "",
    email: c.email ?? "",
    phone: c.phone ?? "",
    avatar: c.avatar,
    status: c.status ?? "active",
    memberSince: c.memberSince ?? "",
    birthDate: c.birthDate || undefined,
    gender: c.gender === "female" || c.gender === "male" || c.gender === "unspecified" ? c.gender : undefined,
    addresses: normalizeAddresses(c),
    wishlistProductIds: Array.isArray(c.wishlistProductIds) ? c.wishlistProductIds : [],
    savedCards: Array.isArray(c.savedCards) ? c.savedCards.filter((card) => card && card.id && card.last4) : [],
    loyaltyPoints: c.loyaltyPoints,
    // Everyone on the storefront starts at Glow (spend ฿0).
    tier: normalizeTier(c.tier),
    source: c.source === "crm_migrated" || c.source === "admin_created" ? c.source : "new_signup",
    signupMethod: c.signupMethod,
    crmMemberId: c.crmMemberId,
    crmCoinsTransferred: c.crmCoinsTransferred,
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

/** The storefront's own sample address book / saved card (what `/account/address` and `/account/cards` show the mock persona) — copied, never shared by reference. */
const storefrontAddresses = (): CustomerAddress[] => MOCK_ADDRESSES.map((a) => ({ ...a }));
const storefrontCards = (): CustomerSavedCard[] => SAMPLE_SAVED_CARDS.map(({ id, brand, last4, expiry, holder }) => ({ id, brand, last4, expiry, holder }));

/**
 * CMS-only fields for the 6 customers `ORDER_SEED_CUSTOMERS` already names —
 * id/name/email/phone come from that one shared array (never retyped by
 * hand here, so the two can never disagree); this only adds the fields a
 * Customer Master record needs that an order snapshot never did. Deliberately
 * varied per §05's own acceptance list: `cust-5` is inactive; `cust-6` is
 * blocked (and still has order history — exercises "blocked but un-deletable"
 * at the same time as "has orders so un-deletable"). `cust-2` is the
 * storefront's mock persona (`MOCK_USER` "Nutcha S.", `~/lib/crm`'s
 * CRM-000071) — coins/tier/address book/card are what her `/account` pages
 * show: 3,500 coins, Radiance (฿4,108 paid this year in `accountData.ts`'s
 * orders). Tiers for the CRM members include their spend in the old Charmiss
 * Club channels. `loyaltyPoints` isn't typed here: it's the CRM carry-over
 * plus what the customer's seed orders earned/redeemed (`buildMockCustomers`).
 */
type CustomerExtras = Pick<
  Customer,
  "status" | "memberSince" | "tier" | "source" | "signupMethod" | "crmMemberId" | "crmCoinsTransferred" | "birthDate" | "gender" | "addresses" | "wishlistProductIds" | "savedCards"
>;

const ORDER_CUSTOMER_EXTRAS: Record<string, CustomerExtras> = {
  "cust-1": {
    status: "active",
    memberSince: "12 ม.ค. 2568",
    tier: "radiance",
    source: "crm_migrated",
    signupMethod: "line",
    crmMemberId: "CRM-000034",
    crmCoinsTransferred: 1280,
    birthDate: "1994-03-12",
    gender: "male",
    addresses: [
      { id: "cust-1-addr-1", label: "บ้าน", recipientName: "Thanakrit P.", phone: "089-111-2222", addressLine: "129/45 หมู่บ้านพฤกษาวิลล์ ซอยลาดพร้าว 101", province: "กรุงเทพมหานคร", district: "เขตบางกะปิ", subDistrict: "คลองจั่น", postalCode: "10240", isDefault: true },
    ],
    wishlistProductIds: ["best-1", "trend-3", "new-5"],
    savedCards: [{ id: "cust-1-card-1", brand: "mastercard", last4: "5454", expiry: "09/27", holder: "THANAKRIT P" }],
  },
  "cust-2": {
    status: "active",
    memberSince: "3 มี.ค. 2568",
    tier: "radiance",
    source: "crm_migrated",
    signupMethod: "phone",
    crmMemberId: "CRM-000071",
    crmCoinsTransferred: 3500,
    addresses: storefrontAddresses(),
    wishlistProductIds: ["flash-2", "new-1"],
    savedCards: storefrontCards(),
  },
  "cust-3": {
    status: "active",
    memberSince: "20 เม.ย. 2568",
    tier: "glow",
    source: "new_signup",
    signupMethod: "google",
    birthDate: "1999-11-02",
    gender: "female",
    addresses: [
      { id: "cust-3-addr-1", label: "คอนโด", recipientName: "ปาล์มมี่ กิตติวงศ์", phone: "081-222-3333", addressLine: "99/321 ลุมพินี วิลล์ ถนนรัตนาธิเบศร์", province: "นนทบุรี", district: "อำเภอเมืองนนทบุรี", subDistrict: "บางกระสอ", postalCode: "11000", isDefault: true },
    ],
    wishlistProductIds: ["trend-1", "flash-5", "best-8"],
    savedCards: [],
  },
  "cust-4": {
    status: "active",
    memberSince: "9 พ.ค. 2568",
    tier: "radiance",
    source: "crm_migrated",
    signupMethod: "phone",
    crmMemberId: "CRM-000105",
    crmCoinsTransferred: 3120,
    birthDate: "1990-07-21",
    gender: "female",
    addresses: [
      { id: "cust-4-addr-1", label: "บ้าน", recipientName: "ฝ้าย ธนพร", phone: "082-333-4444", addressLine: "45/7 ถนนนิมมานเหมินท์ ซอย 9", province: "เชียงใหม่", district: "อำเภอเมืองเชียงใหม่", subDistrict: "สุเทพ", postalCode: "50200", isDefault: true },
      { id: "cust-4-addr-2", label: "ที่อยู่ออกใบเสร็จรับเงิน", recipientName: "บริษัท ฝ้าย บิวตี้ จำกัด", phone: "053-221-456", addressLine: "88 ถนนห้วยแก้ว", province: "เชียงใหม่", district: "อำเภอเมืองเชียงใหม่", subDistrict: "ช้างเผือก", postalCode: "50300", kind: "billing" },
    ],
    wishlistProductIds: ["feature-2", "best-4"],
    savedCards: [{ id: "cust-4-card-1", brand: "jcb", last4: "3530", expiry: "03/29", holder: "FAI T" }],
  },
  "cust-5": {
    status: "inactive",
    memberSince: "14 มิ.ย. 2568",
    tier: "glow",
    source: "new_signup",
    signupMethod: "email",
    birthDate: "2001-01-15",
    gender: "unspecified",
    addresses: [
      { id: "cust-5-addr-1", label: "บ้าน", recipientName: "มะปราง วงศ์ใหญ่", phone: "083-444-5555", addressLine: "212 ถนนมิตรภาพ", province: "ขอนแก่น", district: "อำเภอเมืองขอนแก่น", subDistrict: "ในเมือง", postalCode: "40000", isDefault: true },
    ],
    wishlistProductIds: [],
    savedCards: [],
  },
  "cust-6": {
    status: "blocked",
    memberSince: "2 ก.ค. 2568",
    tier: "glow",
    source: "new_signup",
    signupMethod: "phone",
    gender: "female",
    addresses: [
      { id: "cust-6-addr-1", label: "บ้าน", recipientName: "ก้อย อรุณศรี", phone: "084-555-6666", addressLine: "17 ถนนถลาง", province: "ภูเก็ต", district: "อำเภอเมืองภูเก็ต", subDistrict: "ตลาดใหญ่", postalCode: "83000", isDefault: true },
    ],
    wishlistProductIds: ["flash-7"],
    savedCards: [],
  },
};

const NO_EXTRAS: CustomerExtras = { status: "active", memberSince: TODAY_LABEL, tier: "glow", source: "new_signup", addresses: [], wishlistProductIds: [], savedCards: [] };

/**
 * Never referenced by any `ORDER_SEEDS` entry in `adminOrders.ts` — the
 * "ลูกค้าที่ยังไม่เคยสั่งซื้อ" case §05 explicitly asks for. `cust-10` is the
 * Charmiss Club CRM member `~/lib/crm` knows as CRM-000182 (the storefront's
 * LINE / 081-234-5678 QA account), already moved over to the website — a
 * fresh storefront sign-in matches this record instead of adding a second one.
 * CRM-000245 deliberately has no Customer yet: she's only in the CRM until she
 * signs in on the website (see `adminLoyaltyMembers.ts`).
 */
const NO_ORDER_CUSTOMER_SEEDS: CustomerSeed[] = [
  { id: "cust-7", firstName: "พิม", lastName: "จ.", email: "pim.j@example.com", phone: "085-666-7777", ...NO_EXTRAS, memberSince: "18 ส.ค. 2568", loyaltyPoints: 0, signupMethod: "phone", wishlistProductIds: ["new-3"] },
  { id: "cust-8", firstName: "ต้นข้าว", lastName: "ร.", email: "tonkhao.r@example.com", phone: "086-777-8888", ...NO_EXTRAS, memberSince: "1 ก.ย. 2568", loyaltyPoints: 0, signupMethod: "phone" },
  { id: "cust-9", firstName: "ใบเตย", lastName: "ม.", email: "baitoey.m@example.com", phone: "087-888-9999", ...NO_EXTRAS, status: "inactive", memberSince: "5 ก.ย. 2568", loyaltyPoints: 0, source: "admin_created" },
  {
    id: "cust-10",
    firstName: "กมลชนก",
    lastName: "ใจดี",
    email: "kamolchanok@example.com",
    phone: "081-234-5678",
    status: "active",
    memberSince: "15 ก.ย. 2569",
    tier: "icon",
    loyaltyPoints: 3500,
    source: "crm_migrated",
    signupMethod: "line",
    crmMemberId: "CRM-000182",
    crmCoinsTransferred: 3500,
    birthDate: "1996-05-08",
    gender: "female",
    addresses: [
      { id: "cust-10-addr-1", label: "คอนโด", recipientName: "กมลชนก ใจดี", phone: "081-234-5678", addressLine: "55/8 ซอยอารีย์ 4 ถนนพหลโยธิน", province: "กรุงเทพมหานคร", district: "เขตพญาไท", subDistrict: "สามเสนใน", postalCode: "10400", isDefault: true },
    ],
    wishlistProductIds: ["best-2", "trend-6", "flash-1", "new-8"],
    savedCards: [{ id: "cust-10-card-1", brand: "visa", last4: "8210", expiry: "07/29", holder: "KAMOLCHANOK JAIDEE" }],
  },
];

/** Baseline builder — fixed string-literal ids ("cust-1".."cust-10"), not an incrementing counter, so this returns byte-identical output on every call within the same process (same rule as every other Admin content module's `buildMock*()`). */
export function buildMockCustomers(): Customer[] {
  const fromOrders: CustomerSeed[] = ORDER_SEED_CUSTOMERS.map((oc) => {
    const { firstName, lastName } = splitName(oc.name);
    const extra = ORDER_CUSTOMER_EXTRAS[oc.id] ?? NO_EXTRAS;
    const loyaltyPoints = (extra.crmCoinsTransferred ?? 0) + customerOrderCoinNet(oc.id, extra.tier ?? "glow");
    return { id: oc.id, firstName, lastName, email: oc.email, phone: oc.phone, ...extra, loyaltyPoints };
  });
  return [...fromOrders, ...NO_ORDER_CUSTOMER_SEEDS].map((seed) => ({ ...seed, createdAt: TODAY_LABEL, updatedAt: TODAY_LABEL }));
}

/** "8 พ.ค. 2539" from the ISO `birthDate` — same Thai label format as every other Admin date. */
export function formatBirthDate(iso: string | undefined): string {
  const m = iso?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return "-";
  return `${Number(m[3])} ${THAI_MONTHS[Number(m[2]) - 1] ?? ""} ${Number(m[1]) + 543}`;
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
