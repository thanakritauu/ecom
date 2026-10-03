import type { StatusTone } from "~/components/admin/StatusBadge";
import type { CustomerTier } from "./adminCustomers";

/**
 * Loyalty (Phase 08.2) — "สมาชิก" as a Cordy CRM Integration view. Cordy is
 * the Membership Source of Truth; a Member here is its own Cordy-synced
 * record (memberId/tier/coins/status/source/syncedAt all owned by Cordy),
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

export type CoinHistoryEntry = { id: string; label: string; amount: number; date: string };

export type AdminLoyaltyMember = {
  id: string;
  customerId: string;
  /** Cordy's own Member ID — distinct from `customerId`/`id`, e.g. `"CRM-MBR-1001"`. */
  memberId: string;
  tier: CustomerTier;
  coinsRemaining: number;
  coinsEarned: number;
  coinsUsed: number;
  status: LoyaltyMemberStatus;
  source: "Cordy CRM";
  syncedAt: string;
  /** "วันที่เข้าร่วม" — Loyalty enrollment date, Cordy-owned (not necessarily the same as the Customer's own `memberSince`). */
  joinedAt: string;
  /** "ประวัติคอยน์แบบ Mock" — a short illustrative log, never computed from `coinsEarned`/`coinsUsed`. */
  coinHistory: CoinHistoryEntry[];
};

export function normalizeLoyaltyMember(m: Partial<AdminLoyaltyMember> & { id: string }): AdminLoyaltyMember {
  return {
    id: m.id,
    customerId: m.customerId ?? "",
    memberId: m.memberId ?? "",
    tier: m.tier ?? "member",
    coinsRemaining: typeof m.coinsRemaining === "number" ? m.coinsRemaining : 0,
    coinsEarned: typeof m.coinsEarned === "number" ? m.coinsEarned : 0,
    coinsUsed: typeof m.coinsUsed === "number" ? m.coinsUsed : 0,
    status: m.status ?? "active",
    source: "Cordy CRM",
    syncedAt: m.syncedAt ?? "",
    joinedAt: m.joinedAt ?? "",
    coinHistory: m.coinHistory ?? [],
  };
}

const MEMBER_SEEDS: AdminLoyaltyMember[] = [
  {
    id: "member-001",
    customerId: "cust-1",
    memberId: "CRM-MBR-1001",
    tier: "gold",
    coinsRemaining: 1280,
    coinsEarned: 1800,
    coinsUsed: 520,
    status: "active",
    source: "Cordy CRM",
    syncedAt: "18 ก.ย. 2569 08:00 น.",
    joinedAt: "12 ม.ค. 2568",
    coinHistory: [
      { id: "h1", label: "ซื้อสินค้าครบ 100 บาท", amount: 10, date: "16 ก.ย. 2569" },
      { id: "h2", label: "แลกของรางวัล: ส่วนลด 50 บาท", amount: -50, date: "10 ก.ย. 2569" },
      { id: "h3", label: "เขียนรีวิวสินค้า", amount: 20, date: "2 ก.ย. 2569" },
    ],
  },
  {
    id: "member-002",
    customerId: "cust-2",
    memberId: "CRM-MBR-1002",
    tier: "silver",
    coinsRemaining: 640,
    coinsEarned: 900,
    coinsUsed: 260,
    status: "active",
    source: "Cordy CRM",
    syncedAt: "18 ก.ย. 2569 08:00 น.",
    joinedAt: "3 มี.ค. 2568",
    coinHistory: [
      { id: "h1", label: "ซื้อสินค้าครบ 100 บาท", amount: 10, date: "14 ก.ย. 2569" },
      { id: "h2", label: "แลกของรางวัล: กระเป๋าผ้า Charmiss", amount: -100, date: "1 ก.ย. 2569" },
    ],
  },
  {
    id: "member-003",
    customerId: "cust-3",
    memberId: "CRM-MBR-1003",
    tier: "member",
    coinsRemaining: 210,
    coinsEarned: 350,
    coinsUsed: 140,
    status: "active",
    source: "Cordy CRM",
    syncedAt: "17 ก.ย. 2569 21:45 น.",
    joinedAt: "20 เม.ย. 2568",
    coinHistory: [{ id: "h1", label: "สมัครสมาชิกใหม่", amount: 50, date: "20 เม.ย. 2568" }],
  },
  {
    id: "member-004",
    customerId: "cust-4",
    memberId: "CRM-MBR-1004",
    tier: "platinum",
    coinsRemaining: 3120,
    coinsEarned: 4200,
    coinsUsed: 1080,
    status: "active",
    source: "Cordy CRM",
    syncedAt: "18 ก.ย. 2569 08:00 น.",
    joinedAt: "9 พ.ค. 2568",
    coinHistory: [
      { id: "h1", label: "ซื้อสินค้าครบ 100 บาท", amount: 30, date: "17 ก.ย. 2569" },
      { id: "h2", label: "แลกของรางวัล: ผลิตภัณฑ์ทดลองไซส์", amount: -200, date: "5 ก.ย. 2569" },
    ],
  },
  {
    id: "member-005",
    customerId: "cust-5",
    memberId: "CRM-MBR-1005",
    tier: "member",
    coinsRemaining: 0,
    coinsEarned: 40,
    coinsUsed: 40,
    status: "inactive",
    source: "Cordy CRM",
    syncedAt: "10 ก.ย. 2569 10:00 น.",
    joinedAt: "14 มิ.ย. 2568",
    coinHistory: [{ id: "h1", label: "แลกของรางวัล: ส่วนลด 20 บาท", amount: -40, date: "20 มิ.ย. 2568" }],
  },
];

/** Baseline builder — fixed string-literal ids, not an incrementing counter, same rule as every other Admin module's `buildMock*()`. */
export function buildMockLoyaltyMembers(): AdminLoyaltyMember[] {
  return MEMBER_SEEDS.map((seed) => ({ ...seed }));
}
