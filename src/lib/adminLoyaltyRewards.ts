import type { StatusTone } from "~/components/admin/StatusBadge";

/**
 * Loyalty (Phase 08.4) — "ของรางวัล" as a Cordy CRM + Charmiss Ecommerce
 * integration view. Split ownership, unlike Coin Rules/Members/Missions
 * (which are *entirely* Cordy-owned): Cordy owns the Coin/Redemption Logic
 * (`name`/`rewardType`/`coinCost`/`stockRemaining`/`status`/dates — refreshed
 * only by Sync, never editable here), while Charmiss owns the
 * Presentation/Ecommerce layer (`displayName`/`displayDescription`/`image`/
 * `visible`/`linkedProductId`/`linkedCouponId` — editable via
 * `RewardPresentationForm`, updated through `updatePresentation` alone).
 */
export type RewardStatus = "active" | "inactive";

export const REWARD_STATUS_META: Record<RewardStatus, { label: string; tone: StatusTone }> = {
  active: { label: "เปิดใช้งาน", tone: "success" },
  inactive: { label: "ปิดใช้งาน", tone: "neutral" },
};

export type RewardType = "discount_coupon" | "product" | "free_shipping" | "gift";

export const REWARD_TYPE_META: Record<RewardType, { label: string }> = {
  discount_coupon: { label: "คูปองส่วนลด" },
  product: { label: "สินค้าแลกรับ" },
  free_shipping: { label: "ส่งฟรี" },
  gift: { label: "ของแถม/ของกำนัล" },
};

export type AdminReward = {
  id: string;
  // Cordy-owned — read-only, refreshed only via Sync.
  name: string;
  rewardType: RewardType;
  coinCost: number;
  stockRemaining: number;
  status: RewardStatus;
  startDate: string;
  endDate: string;
  source: "Cordy CRM";
  syncedAt: string;
  // Charmiss-owned — the Presentation/Ecommerce layer, editable via `updatePresentation`.
  displayName: string;
  displayDescription: string;
  image: string;
  visible: boolean;
  linkedProductId?: string;
  linkedCouponId?: string;
};

export type RewardPresentationValues = Pick<AdminReward, "displayName" | "displayDescription" | "image" | "visible" | "linkedProductId" | "linkedCouponId">;

export function normalizeReward(r: Partial<AdminReward> & { id: string }): AdminReward {
  return {
    id: r.id,
    name: r.name ?? "",
    rewardType: r.rewardType ?? "gift",
    coinCost: typeof r.coinCost === "number" ? r.coinCost : 0,
    stockRemaining: typeof r.stockRemaining === "number" ? r.stockRemaining : 0,
    status: r.status ?? "active",
    startDate: r.startDate ?? "",
    endDate: r.endDate ?? "",
    source: "Cordy CRM",
    syncedAt: r.syncedAt ?? "",
    displayName: r.displayName ?? r.name ?? "",
    displayDescription: r.displayDescription ?? "",
    image: r.image ?? "",
    visible: r.visible ?? true,
    linkedProductId: r.linkedProductId,
    linkedCouponId: r.linkedCouponId,
  };
}

const REWARD_SEEDS: AdminReward[] = [
  {
    id: "reward-001",
    name: "ส่วนลด 50 บาท",
    rewardType: "discount_coupon",
    coinCost: 200,
    stockRemaining: 340,
    status: "active",
    startDate: "1 ก.ย. 2569",
    endDate: "31 ธ.ค. 2569",
    source: "Cordy CRM",
    syncedAt: "18 ก.ย. 2569 08:00 น.",
    displayName: "คูปองส่วนลด 50 บาท",
    displayDescription: "แลกคอยน์รับส่วนลด 50 บาท สำหรับการสั่งซื้อครั้งถัดไป",
    image: "",
    visible: true,
  },
  {
    id: "reward-002",
    name: "ส่งฟรีทั่วประเทศ",
    rewardType: "free_shipping",
    coinCost: 100,
    stockRemaining: 1200,
    status: "active",
    startDate: "1 ก.ย. 2569",
    endDate: "31 ธ.ค. 2569",
    source: "Cordy CRM",
    syncedAt: "18 ก.ย. 2569 08:00 น.",
    displayName: "ส่งฟรี! ไม่มีขั้นต่ำ",
    displayDescription: "แลกคอยน์เพื่อรับสิทธิ์จัดส่งฟรีในคำสั่งซื้อถัดไป",
    image: "",
    visible: true,
  },
  {
    id: "reward-003",
    name: "Charmiss x Sanrio Blooming Heart Lip Gloss (ไซส์ทดลอง)",
    rewardType: "product",
    coinCost: 500,
    stockRemaining: 42,
    status: "active",
    startDate: "1 ก.ย. 2569",
    endDate: "30 พ.ย. 2569",
    source: "Cordy CRM",
    syncedAt: "17 ก.ย. 2569 21:45 น.",
    displayName: "ลิปกลอสไซส์ทดลอง (คอลแลบ Sanrio)",
    displayDescription: "แลกคอยน์รับลิปกลอสไซส์ทดลองจากคอลเลกชันคอลแลบ Sanrio",
    image: "",
    visible: true,
  },
  {
    id: "reward-004",
    name: "กระเป๋าผ้า Charmiss",
    rewardType: "gift",
    coinCost: 350,
    stockRemaining: 0,
    status: "inactive",
    startDate: "1 มิ.ย. 2569",
    endDate: "31 ส.ค. 2569",
    source: "Cordy CRM",
    syncedAt: "10 ก.ย. 2569 10:00 น.",
    displayName: "กระเป๋าผ้า Charmiss ลิมิเต็ด",
    displayDescription: "ของแถมสุดพิเศษ หมดเขตร่วมสนุกแล้ว",
    image: "",
    visible: false,
  },
];

/** Baseline builder — fixed string-literal ids, not an incrementing counter, same rule as every other Admin module's `buildMock*()`. */
export function buildMockRewards(): AdminReward[] {
  return REWARD_SEEDS.map((seed) => ({ ...seed }));
}
