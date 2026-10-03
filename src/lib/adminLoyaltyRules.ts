import type { StatusTone } from "~/components/admin/StatusBadge";

/**
 * Loyalty (Phase 08.1) — "สะสมคอยน์" as a Cordy CRM Integration view.
 * Cordy CRM is the Loyalty Source of Truth; Charmiss only *displays* the
 * rules it has synced from Cordy — it never creates, edits, or deletes a
 * Cordy business rule (name/condition/coinAmount/status are all Cordy-owned
 * and read-only here; see `adminLoyaltyStore.tsx`'s own doc comment for the
 * one thing Charmiss *is* allowed to touch: `syncedAt`, which is Charmiss's
 * own integration bookkeeping, not a Cordy Loyalty Rule).
 */
export type CoinRuleStatus = "active" | "inactive";

export const COIN_RULE_STATUS_META: Record<CoinRuleStatus, { label: string; tone: StatusTone }> = {
  active: { label: "เปิดใช้งาน", tone: "success" },
  inactive: { label: "ปิดใช้งาน", tone: "neutral" },
};

/** Always "Cordy CRM" — a literal, not a free-text field, so the source is never accidentally displayed as anything else. */
export type CoinRuleSource = "Cordy CRM";

export type AdminCoinRule = {
  id: string;
  name: string;
  coinAmount: number;
  condition: string;
  /** Cordy-owned, read-only — never set via any Charmiss UI. */
  status: CoinRuleStatus;
  source: CoinRuleSource;
  /** "Sync ล่าสุด" — the one field Charmiss itself owns and updates (via `syncOne`/`syncAll`), a display label like `"18 ก.ย. 2569 14:32 น."`. */
  syncedAt: string;
};

/** Root-cause guard, same shape as `normalizeBrand` — every rule is normalized before a component ever reads it. */
export function normalizeCoinRule(r: Partial<AdminCoinRule> & { id: string }): AdminCoinRule {
  return {
    id: r.id,
    name: r.name ?? "",
    coinAmount: typeof r.coinAmount === "number" && Number.isFinite(r.coinAmount) ? r.coinAmount : 0,
    condition: r.condition ?? "",
    status: r.status ?? "active",
    source: "Cordy CRM",
    syncedAt: r.syncedAt ?? "",
  };
}

const COIN_RULE_SEEDS: AdminCoinRule[] = [
  {
    id: "coinrule-001",
    name: "ซื้อสินค้าครบ 100 บาท",
    coinAmount: 10,
    condition: "รับคอยน์ทุกยอดซื้อ 100 บาท (หลังหักส่วนลด)",
    status: "active",
    source: "Cordy CRM",
    syncedAt: "18 ก.ย. 2569 08:00 น.",
  },
  {
    id: "coinrule-002",
    name: "สมัครสมาชิกใหม่",
    coinAmount: 50,
    condition: "รับครั้งเดียวเมื่อสมัครสมาชิกสำเร็จ",
    status: "active",
    source: "Cordy CRM",
    syncedAt: "18 ก.ย. 2569 08:00 น.",
  },
  {
    id: "coinrule-003",
    name: "เขียนรีวิวสินค้า",
    coinAmount: 20,
    condition: "รับเมื่อรีวิวสินค้าที่ซื้อแล้วผ่านการอนุมัติ",
    status: "active",
    source: "Cordy CRM",
    syncedAt: "17 ก.ย. 2569 21:45 น.",
  },
  {
    id: "coinrule-004",
    name: "แนะนำเพื่อน",
    coinAmount: 100,
    condition: "รับเมื่อเพื่อนที่แนะนำสมัครสมาชิกและสั่งซื้อสำเร็จครั้งแรก",
    status: "inactive",
    source: "Cordy CRM",
    syncedAt: "17 ก.ย. 2569 21:45 น.",
  },
];

/** Baseline builder — fixed string-literal ids, not an incrementing counter, same rule as every other Admin module's `buildMock*()`. */
export function buildMockCoinRules(): AdminCoinRule[] {
  return COIN_RULE_SEEDS.map((seed) => ({ ...seed }));
}
