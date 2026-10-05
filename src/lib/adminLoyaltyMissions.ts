import type { StatusTone } from "~/components/admin/StatusBadge";

/**
 * Loyalty (Phase 08.3) — "ภารกิจ" as a Charmiss Club CRM Integration view. Same
 * read-only shape as Coin Rules/Members: Charmiss Club CRM owns Mission Logic
 * (name/description/coinReward/participantCount/status/dates), Charmiss only
 * displays the last synced snapshot. No add/edit/delete anywhere.
 */
export type MissionStatus = "active" | "inactive";

export const MISSION_STATUS_META: Record<MissionStatus, { label: string; tone: StatusTone }> = {
  active: { label: "เปิดใช้งาน", tone: "success" },
  inactive: { label: "ปิดใช้งาน", tone: "neutral" },
};

export type AdminMission = {
  id: string;
  name: string;
  description: string;
  coinReward: number;
  participantCount: number;
  status: MissionStatus;
  source: "Charmiss Club CRM";
  syncedAt: string;
  startDate: string;
  endDate: string;
};

export function normalizeMission(m: Partial<AdminMission> & { id: string }): AdminMission {
  return {
    id: m.id,
    name: m.name ?? "",
    description: m.description ?? "",
    coinReward: typeof m.coinReward === "number" ? m.coinReward : 0,
    participantCount: typeof m.participantCount === "number" ? m.participantCount : 0,
    status: m.status ?? "active",
    source: "Charmiss Club CRM",
    syncedAt: m.syncedAt ?? "",
    startDate: m.startDate ?? "",
    endDate: m.endDate ?? "",
  };
}

const MISSION_SEEDS: AdminMission[] = [
  {
    id: "mission-001",
    name: "นักช้อปตัวยงประจำเดือน",
    description: "ซื้อสินค้าให้ครบ 5 ครั้งภายในเดือนนี้ รับคอยน์พิเศษทันที",
    coinReward: 150,
    participantCount: 86,
    status: "active",
    source: "Charmiss Club CRM",
    syncedAt: "18 ก.ย. 2569 08:00 น.",
    startDate: "1 ก.ย. 2569",
    endDate: "30 ก.ย. 2569",
  },
  {
    id: "mission-002",
    name: "รีวิวสินค้า 3 ชิ้น",
    description: "เขียนรีวิวสินค้าที่ซื้อแล้ว 3 ชิ้นขึ้นไป และผ่านการอนุมัติ",
    coinReward: 60,
    participantCount: 42,
    status: "active",
    source: "Charmiss Club CRM",
    syncedAt: "18 ก.ย. 2569 08:00 น.",
    startDate: "1 ก.ย. 2569",
    endDate: "15 ต.ค. 2569",
  },
  {
    id: "mission-003",
    name: "ชวนเพื่อนเข้าร่วม Charmiss",
    description: "แนะนำเพื่อนให้สมัครสมาชิกและสั่งซื้อสำเร็จ 2 คนขึ้นไป",
    coinReward: 300,
    participantCount: 19,
    status: "inactive",
    source: "Charmiss Club CRM",
    syncedAt: "17 ก.ย. 2569 21:45 น.",
    startDate: "1 ส.ค. 2569",
    endDate: "31 ส.ค. 2569",
  },
];

/** Baseline builder — fixed string-literal ids, not an incrementing counter, same rule as every other Admin module's `buildMock*()`. */
export function buildMockMissions(): AdminMission[] {
  return MISSION_SEEDS.map((seed) => ({ ...seed }));
}
