import type { StatusTone } from "~/components/admin/StatusBadge";
import { buildMockCustomers, getCustomerFullName, normalizeTier, type Customer, type CustomerTier } from "./adminCustomers";
import { MOCK_ORDERS, orderCoinMovements } from "./adminOrders";
import { todayThaiLabel } from "./crm";

/**
 * Loyalty (Phase 08.2) — "สมาชิก" as a Charmiss Club CRM Integration view. Charmiss Club CRM is
 * the Membership Source of Truth; a Member here is its own Charmiss Club CRM-synced
 * record (memberId/tier/coins/status/source/syncedAt all owned by Charmiss Club CRM),
 * only *referencing* a Customer by `customerId` for name/email/phone —
 * never duplicating or writing back onto the Customer record itself (see
 * `adminCustomers.ts`'s own doc comment on why `tier`/`loyaltyPoints` there
 * stay a separate, unrelated concept). No add/edit/delete anywhere; the only
 * mutation is a mock re-sync (`adminLoyaltyMemberStore.tsx`).
 */
export type LoyaltyMemberStatus = "active" | "inactive";

export const LOYALTY_MEMBER_STATUS_META: Record<LoyaltyMemberStatus, { label: string; tone: StatusTone }> = {
  active: { label: "เป็นสมาชิก", tone: "success" },
  inactive: { label: "ปิดสมาชิกภาพ", tone: "neutral" },
};

/**
 * One coin movement, described the way the storefront's `/account/points`
 * history does: ได้รับ (credited), รอดำเนินการ (earned on an order not yet
 * delivered — "รอรับเมื่อได้รับสินค้า") or ใช้ไป (redeemed as a discount).
 */
export type CoinEntryState = "earned" | "pending" | "used";

export const COIN_ENTRY_STATE_META: Record<CoinEntryState, { label: string; tone: StatusTone }> = {
  earned: { label: "ได้รับ", tone: "success" },
  pending: { label: "รอดำเนินการ", tone: "warning" },
  used: { label: "ใช้ไป", tone: "neutral" },
};

export type CoinHistoryEntry = { id: string; label: string; amount: number; date: string; state: CoinEntryState; orderId?: string };

/** Name/phone/email as the CRM holds them — only shown for a member who hasn't signed in on the website yet (no Customer record to look up). */
export type CrmProfile = { name: string; phone: string; email: string };

export type AdminLoyaltyMember = {
  id: string;
  /** "" = still only in the Charmiss Club CRM — linked once `memberRegistry.ts` creates their Customer on a storefront sign-in (matched by `memberId` ↔ `Customer.crmMemberId`). */
  customerId: string;
  /** Charmiss Club CRM member id, same `CRM-000xxx` format as `~/lib/crm` and `Customer.crmMemberId`; "" for a new website sign-up the CRM hasn't issued an id for. */
  memberId: string;
  tier: CustomerTier;
  coinsRemaining: number;
  coinsEarned: number;
  coinsUsed: number;
  status: LoyaltyMemberStatus;
  source: "Charmiss Club CRM";
  syncedAt: string;
  /** "วันที่เข้าร่วม" — Loyalty enrollment date, CRM-owned (not necessarily the same as the Customer's own `memberSince`). */
  joinedAt: string;
  crmProfile?: CrmProfile;
  /** "ประวัติคอยน์แบบ Mock" — a short illustrative log, never computed from `coinsEarned`/`coinsUsed`. */
  coinHistory: CoinHistoryEntry[];
};

function normalizeEntry(e: Partial<CoinHistoryEntry> & { id: string }): CoinHistoryEntry {
  const amount = typeof e.amount === "number" ? e.amount : 0;
  const state: CoinEntryState = e.state === "earned" || e.state === "pending" || e.state === "used" ? e.state : amount < 0 ? "used" : "earned";
  return { id: e.id, label: e.label ?? "", amount, date: e.date ?? "", state, orderId: e.orderId };
}

export function normalizeLoyaltyMember(m: Partial<AdminLoyaltyMember> & { id: string }): AdminLoyaltyMember {
  return {
    id: m.id,
    customerId: m.customerId ?? "",
    memberId: m.memberId ?? "",
    tier: normalizeTier(m.tier),
    coinsRemaining: typeof m.coinsRemaining === "number" ? m.coinsRemaining : 0,
    coinsEarned: typeof m.coinsEarned === "number" ? m.coinsEarned : 0,
    coinsUsed: typeof m.coinsUsed === "number" ? m.coinsUsed : 0,
    status: m.status ?? "active",
    source: "Charmiss Club CRM",
    syncedAt: m.syncedAt ?? "",
    joinedAt: m.joinedAt ?? "",
    crmProfile: m.crmProfile,
    coinHistory: (m.coinHistory ?? []).map(normalizeEntry),
  };
}

/**
 * Order-linked history for the members who are also seed Customers, built
 * from their actual seed orders (`adminOrders.ts`) with the storefront's own
 * rules (`orderCoinMovements` = `/account/points`): earn on the amount paid
 * excl. shipping × their tier multiplier, credited once delivered; redeemed
 * coins from each order. A CRM member's carry-over is its own entry, so the
 * entries always sum to the Customer's balance (`loyaltyPoints`, derived the
 * same way in `adminCustomers.ts`). Nutcha S. (`cust-2`) is the storefront's
 * mock persona — her orders are exactly the ones `/account/points` shows, so
 * this is the same history she sees there.
 */
const SEED_CUSTOMERS = buildMockCustomers();

function orderHistoryEntries(customerId: string, tier: CustomerTier): CoinHistoryEntry[] {
  return MOCK_ORDERS.filter((o) => o.customerId === customerId).flatMap((o) => {
    const date = todayThaiLabel(new Date(o.placedAt));
    const m = orderCoinMovements(o, tier);
    const list: CoinHistoryEntry[] = [];
    if (m.used > 0) list.push({ id: `${o.id}-used`, label: "ใช้เป็นส่วนลด", amount: -m.used, date, state: "used", orderId: o.id });
    if (m.state && m.earned > 0)
      list.push({
        id: `${o.id}-earn`,
        label: m.state === "earned" ? "ได้รับจากคำสั่งซื้อ" : "รอรับเมื่อได้รับสินค้า",
        amount: m.earned,
        date,
        state: m.state,
        orderId: o.id,
      });
    return list;
  });
}

const SYNCED = "18 ก.ย. 2569 08:00 น.";

/** A seed Customer's member row: tier/balance from the Customer, history from their orders (+ the CRM carry-over). */
function seedMember(id: string, customerId: string, opts: Pick<AdminLoyaltyMember, "status" | "syncedAt">): AdminLoyaltyMember {
  const c = SEED_CUSTOMERS.find((x) => x.id === customerId)!;
  const tier = c.tier ?? "glow";
  const history = orderHistoryEntries(customerId, tier);
  if (c.crmCoinsTransferred) history.push({ id: "carry-over", label: "ย้ายคอยน์จาก Charmiss Club CRM", amount: c.crmCoinsTransferred, date: c.memberSince, state: "earned" });
  const credited = history.filter((e) => e.state === "earned").reduce((sum, e) => sum + e.amount, 0);
  const used = history.filter((e) => e.state === "used").reduce((sum, e) => sum - e.amount, 0);
  return {
    id,
    customerId,
    memberId: c.crmMemberId ?? "",
    tier,
    coinsRemaining: c.loyaltyPoints ?? credited - used,
    coinsEarned: credited,
    coinsUsed: used,
    status: opts.status,
    source: "Charmiss Club CRM",
    syncedAt: opts.syncedAt,
    joinedAt: c.memberSince,
    coinHistory: history,
  };
}

const MEMBER_SEEDS: AdminLoyaltyMember[] = [
  seedMember("member-001", "cust-1", { status: "active", syncedAt: SYNCED }),
  seedMember("member-002", "cust-2", { status: "active", syncedAt: SYNCED }),
  // New website sign-ups start at 0 coins — no sign-up bonus on the storefront.
  seedMember("member-003", "cust-3", { status: "active", syncedAt: "17 ก.ย. 2569 21:45 น." }),
  seedMember("member-004", "cust-4", { status: "active", syncedAt: SYNCED }),
  seedMember("member-005", "cust-5", { status: "inactive", syncedAt: "10 ก.ย. 2569 10:00 น." }),
  {
    // `~/lib/crm`'s CRM-000182 — already moved to the website as `cust-10`.
    id: "member-182",
    customerId: "cust-10",
    memberId: "CRM-000182",
    tier: "icon",
    coinsRemaining: 3500,
    coinsEarned: 3500,
    coinsUsed: 0,
    status: "active",
    source: "Charmiss Club CRM",
    syncedAt: SYNCED,
    joinedAt: "4 ก.พ. 2566",
    coinHistory: [{ id: "h1", label: "ย้ายคอยน์จาก Charmiss Club CRM", amount: 3500, date: "15 ก.ย. 2569", state: "earned" }],
  },
  {
    // `~/lib/crm`'s CRM-000245 — only in the CRM so far; her Customer appears (and links here) once she signs in on the storefront.
    id: "member-245",
    customerId: "",
    memberId: "CRM-000245",
    tier: "glow",
    coinsRemaining: 1280,
    coinsEarned: 1280,
    coinsUsed: 0,
    status: "active",
    source: "Charmiss Club CRM",
    syncedAt: SYNCED,
    joinedAt: "21 ส.ค. 2567",
    crmProfile: { name: "พิมพ์ชนก ส.", phone: "089-876-5432", email: "pimchanok@example.com" },
    coinHistory: [],
  },
];

/** Baseline builder — fixed string-literal ids, not an incrementing counter, same rule as every other Admin module's `buildMock*()`. */
export function buildMockLoyaltyMembers(): AdminLoyaltyMember[] {
  return MEMBER_SEEDS.map((seed) => ({ ...seed, coinHistory: seed.coinHistory.map((e) => ({ ...e })) }));
}

/** The member's Customer: by `customerId`, or — for a CRM member who has since signed in on the storefront — by CRM id. */
export function findMemberCustomer(m: AdminLoyaltyMember, customers: Customer[]): Customer | undefined {
  if (m.customerId) return customers.find((c) => c.id === m.customerId);
  return m.memberId ? customers.find((c) => c.crmMemberId === m.memberId) : undefined;
}

/**
 * Every storefront member is a Charmiss Club member, so a Customer with no
 * synced Member record yet (a fresh web sign-up, a CRM carry-over written by
 * `memberRegistry.ts`, or one added in Admin) still gets a row — built from
 * the Customer's own tier/coins, with the CRM carry-over as its one history
 * entry. Never persisted: it's re-derived from the Customer store each time.
 */
export function memberFromCustomer(c: Customer): AdminLoyaltyMember {
  const coins = c.loyaltyPoints ?? 0;
  return {
    id: `member-${c.id}`,
    customerId: c.id,
    memberId: c.crmMemberId ?? "",
    tier: c.tier ?? "glow",
    coinsRemaining: coins,
    coinsEarned: coins,
    coinsUsed: 0,
    status: c.status === "active" ? "active" : "inactive",
    source: "Charmiss Club CRM",
    syncedAt: c.updatedAt,
    joinedAt: c.memberSince,
    coinHistory: c.crmCoinsTransferred
      ? [{ id: "carry-over", label: "ย้ายคอยน์จาก Charmiss Club CRM", amount: c.crmCoinsTransferred, date: c.memberSince, state: "earned" }]
      : [],
  };
}

/** Display helpers shared by List/Quick View/Detail — Customer data first, the CRM's own profile for a member not on the website yet. */
export function memberName(m: AdminLoyaltyMember, c: Customer | undefined): string {
  return c ? getCustomerFullName(c) : (m.crmProfile?.name ?? "(ไม่พบข้อมูลลูกค้า)");
}

export function memberIdLabel(m: AdminLoyaltyMember): string {
  return m.memberId || "ยังไม่มีรหัส CRM";
}
