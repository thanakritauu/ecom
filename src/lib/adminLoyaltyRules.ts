import type { StatusTone } from "~/components/admin/StatusBadge";
import { COIN_EARN_RATE, COIN_TO_BAHT_RATE, MAX_COIN_REDEMPTION } from "./cartSelectors";
import { TIERS } from "./membership";
import { TIER_COIN_MULTIPLIER } from "./adminCustomers";

/**
 * Loyalty (Phase 08.1) — "สะสมคอยน์" as a Charmiss Club CRM Integration view.
 * Charmiss Club CRM is the Loyalty Source of Truth; Charmiss only *displays* the
 * rules it has synced from Charmiss Club CRM — it never creates, edits, or deletes a
 * Charmiss Club CRM business rule (name/condition/coinAmount/status are all Charmiss Club CRM-owned
 * and read-only here; see `adminLoyaltyStore.tsx`'s own doc comment for the
 * one thing Charmiss *is* allowed to touch: `syncedAt`, which is Charmiss's
 * own integration bookkeeping, not a Charmiss Club CRM Loyalty Rule).
 */
export type CoinRuleStatus = "active" | "inactive";

export const COIN_RULE_STATUS_META: Record<CoinRuleStatus, { label: string; tone: StatusTone }> = {
  active: { label: "เปิดใช้งาน", tone: "success" },
  inactive: { label: "ปิดใช้งาน", tone: "neutral" },
};

/** Always "Charmiss Club CRM" — a literal, not a free-text field, so the source is never accidentally displayed as anything else. */
export type CoinRuleSource = "Charmiss Club CRM";

export type AdminCoinRule = {
  id: string;
  name: string;
  /** Coins per trigger — also the sort key. A multiplier/redemption rule isn't a flat amount, so it shows `amountLabel` instead. */
  coinAmount: number;
  amountLabel?: string;
  condition: string;
  /** Charmiss Club CRM-owned, read-only — never set via any Charmiss UI. */
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
    amountLabel: r.amountLabel,
    condition: r.condition ?? "",
    status: r.status ?? "active",
    source: "Charmiss Club CRM",
    syncedAt: r.syncedAt ?? "",
  };
}

/** "+1" for a flat rule, the label otherwise — the one display every list/quick view/detail uses. */
export function formatCoinRuleAmount(r: Pick<AdminCoinRule, "coinAmount" | "amountLabel">): string {
  return r.amountLabel ?? `+${r.coinAmount.toLocaleString("th-TH")}`;
}

const SYNCED = "18 ก.ย. 2569 08:00 น.";
const bahtPerCoin = Math.round(1 / COIN_EARN_RATE); // ฿10
const coinsPerBaht = Math.round(1 / COIN_TO_BAHT_RATE); // 10 coins = ฿1

/**
 * The rules exactly as the storefront applies/describes them —
 * `~/lib/cartSelectors` (earn 1 coin per ฿10 paid excl. shipping, rounded
 * down; redeem 10 coins = ฿1, max 800 per order) and `~/lib/membership`
 * (tier multipliers) — derived from those constants, never retyped.
 * The storefront gives no sign-up bonus (a new member starts at 0 coins), so
 * that rule is kept switched off at 0 rather than claiming coins nobody gets.
 */
const COIN_RULE_SEEDS: AdminCoinRule[] = [
  {
    id: "coinrule-001",
    name: "รับคอยน์จากการสั่งซื้อ",
    coinAmount: 1,
    condition: `ทุกยอดชำระ ฿${bahtPerCoin} (ไม่รวมค่าจัดส่ง) ได้รับ 1 คอยน์ ปัดเศษลง — คอยน์เข้าบัญชีเมื่อได้รับสินค้า`,
    status: "active",
    source: "Charmiss Club CRM",
    syncedAt: SYNCED,
  },
  ...TIERS.filter((t) => TIER_COIN_MULTIPLIER[t.id] > 1).map(
    (t): AdminCoinRule => ({
      id: `coinrule-tier-${t.id}`,
      name: `ตัวคูณคอยน์ ${t.name}`,
      coinAmount: TIER_COIN_MULTIPLIER[t.id],
      amountLabel: `×${TIER_COIN_MULTIPLIER[t.id]}`,
      condition: `สมาชิกระดับ ${t.name} (ยอดซื้อปีนี้ ฿${t.minSpend.toLocaleString("th-TH")} ขึ้นไป) รับคอยน์จากการสั่งซื้อ ×${TIER_COIN_MULTIPLIER[t.id]}`,
      status: "active",
      source: "Charmiss Club CRM",
      syncedAt: SYNCED,
    }),
  ),
  {
    id: "coinrule-redeem",
    name: "ใช้คอยน์เป็นส่วนลด",
    coinAmount: 0,
    amountLabel: `${coinsPerBaht} คอยน์ = ฿1`,
    condition: `ใช้ได้สูงสุด ${MAX_COIN_REDEMPTION.toLocaleString("th-TH")} คอยน์ (฿${Math.round(MAX_COIN_REDEMPTION * COIN_TO_BAHT_RATE)}) ต่อคำสั่งซื้อ`,
    status: "active",
    source: "Charmiss Club CRM",
    syncedAt: SYNCED,
  },
  {
    id: "coinrule-002",
    name: "สมัครสมาชิกใหม่",
    coinAmount: 0,
    condition: "ไม่มีโบนัสสมัครสมาชิก — สมาชิกใหม่เริ่มต้นที่ 0 คอยน์ (สมาชิกเดิมจาก CRM ได้คอยน์ที่มีอยู่ยกมาอัตโนมัติ)",
    status: "inactive",
    source: "Charmiss Club CRM",
    syncedAt: SYNCED,
  },
  {
    id: "coinrule-003",
    name: "เขียนรีวิวสินค้า",
    coinAmount: 20,
    condition: "ยังไม่เปิดใช้บนหน้าร้าน — รับเมื่อรีวิวสินค้าที่ซื้อแล้วผ่านการอนุมัติ",
    status: "inactive",
    source: "Charmiss Club CRM",
    syncedAt: "17 ก.ย. 2569 21:45 น.",
  },
  {
    id: "coinrule-004",
    name: "แนะนำเพื่อน",
    coinAmount: 100,
    condition: "ยังไม่เปิดใช้บนหน้าร้าน — รับเมื่อเพื่อนที่แนะนำสมัครสมาชิกและสั่งซื้อสำเร็จครั้งแรก",
    status: "inactive",
    source: "Charmiss Club CRM",
    syncedAt: "17 ก.ย. 2569 21:45 น.",
  },
];

/** Baseline builder — fixed string-literal ids, not an incrementing counter, same rule as every other Admin module's `buildMock*()`. */
export function buildMockCoinRules(): AdminCoinRule[] {
  return COIN_RULE_SEEDS.map((seed) => ({ ...seed }));
}
