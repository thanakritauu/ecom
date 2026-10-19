import type { Order, OrderStatus, Shipment, ShipmentStatus, TrackingStatus } from "./types";
import { ORDER_STATUS_META } from "./accountData";

/**
 * Phase 05 — turns an order's raw `Shipment.events` (mock today, DHL API
 * later — same `TrackingEvent` shape either way) into what the tracking UI
 * shows. The UI only reads these helpers, so swapping the data source never
 * touches the timeline component.
 */

export const TRACKING_STEPS: { status: TrackingStatus; title: string }[] = [
  { status: "ordered", title: "สั่งซื้อสำเร็จ" },
  { status: "preparing", title: "กำลังเตรียมการจัดส่ง" },
  { status: "shipped", title: "ส่งให้บริษัทขนส่ง" },
  { status: "in_transit", title: "อยู่ระหว่างขนส่ง" },
  { status: "out_for_delivery", title: "กำลังนำส่ง" },
  { status: "delivered", title: "จัดส่งสำเร็จ" },
];

export const SHIPMENT_STATUS_META: Record<ShipmentStatus, { label: string; badgeClass: string }> = {
  awaiting_shipment: { label: "รอจัดส่ง", badgeClass: "bg-surface-gray text-ink-gray" },
  shipped: { label: "ส่งให้บริษัทขนส่ง", badgeClass: "bg-warning-soft text-ink" },
  in_transit: { label: "อยู่ระหว่างขนส่ง", badgeClass: "bg-warning-soft text-ink" },
  out_for_delivery: { label: "กำลังนำส่ง", badgeClass: "bg-warning-soft text-ink" },
  delivered: { label: "จัดส่งสำเร็จ", badgeClass: "bg-success-soft text-success" },
};

export type TimelineEntry = {
  status: TrackingStatus;
  title: string;
  /** ISO — unset for steps not reached yet (or reached without a recorded scan). */
  timestamp?: string;
  description?: string;
  location?: string;
  state: "completed" | "current" | "upcoming";
};

const stepIndex = (status: TrackingStatus) => TRACKING_STEPS.findIndex((s) => s.status === status);

/** Furthest step reached. */
function reachedIndex(shipment: Shipment): number {
  return shipment.events.reduce((max, e) => Math.max(max, stepIndex(e.status)), -1);
}

export function getShipmentStatus(shipment: Shipment): ShipmentStatus {
  const idx = reachedIndex(shipment);
  return idx >= stepIndex("shipped") ? (TRACKING_STEPS[idx].status as ShipmentStatus) : "awaiting_shipment";
}

/**
 * One entry per step: completed → current → upcoming. The latest event of
 * each step supplies its time/detail. "จัดส่งสำเร็จ" is terminal, so once
 * reached every step is completed.
 */
export function buildTrackingTimeline(shipment: Shipment): TimelineEntry[] {
  const reached = reachedIndex(shipment);
  return TRACKING_STEPS.map((step, i) => {
    const latest = shipment.events
      .filter((e) => e.status === step.status)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
    const state: TimelineEntry["state"] =
      i < reached || (i === reached && step.status === "delivered") ? "completed" : i === reached ? "current" : "upcoming";
    return { status: step.status, title: step.title, timestamp: latest?.timestamp, description: latest?.description, location: latest?.location, state };
  });
}

/** Full carrier scan history, newest first — for the "ดูประวัติทั้งหมด" detail list. */
export function getTrackingHistory(shipment: Shipment) {
  return [...shipment.events].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

/**
 * One status per order for the purchase-history card — the order's own
 * status until the parcel is with the carrier (รอชำระเงิน / กำลังเตรียมการจัดส่ง /
 * ยกเลิกแล้ว), then DHL's live status (ส่งให้บริษัทขนส่ง → … → จัดส่งสำเร็จ).
 */
export function getOrderDisplayStatus(order: Order): { label: string; badgeClass: string } {
  if (order.status === "pending_payment" || order.status === "cancelled") return ORDER_STATUS_META[order.status];
  const shipment = getShipmentStatus(order.shipment);
  return shipment === "awaiting_shipment" ? ORDER_STATUS_META.preparing : SHIPMENT_STATUS_META[shipment];
}

/** Admin-side return requests (`adminOrders.ts` seeds) — the storefront sends shoppers to LINE instead. */
export const RETURN_REASONS = [
  "ได้รับสินค้าผิดตัวเลือกสินค้า / ผิดรุ่น",
  "สินค้าชำรุดหรือเสียหาย",
  "สินค้าไม่ครบตามที่สั่ง",
  "สินค้าหมดอายุหรือใกล้หมดอายุ",
  "แพ้หรือระคายเคืองหลังใช้",
  "อื่น ๆ",
] as const;

/** Orders and carrier scans are shown in Thai time regardless of the device's zone. */
const TZ = "Asia/Bangkok";

/** "01 ต.ค. 09:32" (adds the year when it isn't this year). */
export function formatEventTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const sameYear = d.getFullYear() === new Date().getFullYear();
  const date = d.toLocaleDateString("th-TH", { timeZone: TZ, day: "2-digit", month: "short", ...(sameYear ? {} : { year: "numeric" }) });
  const time = d.toLocaleTimeString("th-TH", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
  return `${date} ${time}`;
}

/** "01 ต.ค. 2569" */
export function formatOrderDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("th-TH", { timeZone: TZ, day: "2-digit", month: "short", year: "numeric" });
}

/** "01 ต.ค. 2569 14:32" (order headers) */
export function formatOrderDateTime(iso: string): string {
  const date = formatOrderDate(iso);
  return date && `${date} ${new Date(iso).toLocaleTimeString("th-TH", { timeZone: TZ, hour: "2-digit", minute: "2-digit" })}`;
}
