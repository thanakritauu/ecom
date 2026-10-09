import { createSignal, For, Show } from "solid-js";
import { TextField } from "~/components/shared/TextField";
import { Button } from "~/components/shared/Button";
import { ChevronDownIcon, PlusIcon } from "~/components/admin/icons";
import { StatusBadge } from "~/components/admin/StatusBadge";
import { getCarrierTrackingUrl } from "~/lib/carriers";
import { formatEventTime, getTrackingHistory, TRACKING_STEPS } from "~/lib/orderTracking";
import type { TrackingEvent } from "~/lib/types";
import { DHL_TRACKING_PATTERN, FULFILLMENT_STATUS_META, type AdminOrder } from "~/lib/adminOrders";
import { useAdminOrders } from "~/lib/adminOrderStore";
import { formatAdminCurrency } from "~/lib/adminDashboard";
import { pushToast } from "~/lib/toast";
import { OrderTimeline } from "./OrderTimeline";

type EventStatus = TrackingEvent["status"];

/** Scans Admin may record by hand ("ordered" is only ever written by payment). Defaults = the storefront seeds' own wording. */
const EVENT_TEMPLATES: { status: EventStatus; description: string; location: string }[] = [
  { status: "preparing", description: "Charmiss กำลังแพ็กสินค้าของคุณ", location: "" },
  { status: "shipped", description: "ส่งมอบพัสดุให้ DHL แล้ว", location: "คลังสินค้า Charmiss บางนา" },
  { status: "in_transit", description: "พัสดุถึงศูนย์คัดแยก", location: "DHL Hub บางพลี" },
  { status: "out_for_delivery", description: "พนักงานกำลังนำส่งพัสดุ", location: "" },
  { status: "delivered", description: "จัดส่งสำเร็จ", location: "" },
];

const stepTitle = (status: EventStatus) => TRACKING_STEPS.find((s) => s.status === status)?.title ?? status;

/**
 * Order Detail's "ติดตามการจัดส่ง" — DHL only (the storefront's single
 * carrier, ฿0). Tracking number + the storefront's 6-step timeline + the
 * full scan list, plus two controls that write to the Admin order store:
 * กรอกเลขพัสดุ and เพิ่มเหตุการณ์การจัดส่ง.
 */
export function OrderTrackingPanel(props: { order: AdminOrder }) {
  const store = useAdminOrders();
  const o = () => props.order;
  const editable = () => o().orderStatus !== "pending_payment" && o().orderStatus !== "cancelled";
  const canAddEvent = () => editable() && o().fulfillmentStatus !== "delivered";

  const [editingNumber, setEditingNumber] = createSignal(false);
  const [numberDraft, setNumberDraft] = createSignal("");
  const [numberError, setNumberError] = createSignal<string>();
  const [savingNumber, setSavingNumber] = createSignal(false);

  const startEditNumber = () => {
    setNumberDraft(o().shipping.trackingNumber ?? "");
    setNumberError(undefined);
    setEditingNumber(true);
  };

  const saveNumber = async (e: Event) => {
    e.preventDefault();
    const value = numberDraft().replace(/\s/g, "");
    if (!DHL_TRACKING_PATTERN.test(value)) return setNumberError("เลขพัสดุ DHL ต้องเป็นตัวเลข 10 หลัก");
    setSavingNumber(true);
    try {
      await store.setTrackingNumber(o().id, value);
      pushToast("บันทึกเลขพัสดุเรียบร้อยแล้ว", "success");
      setEditingNumber(false);
    } catch {
      pushToast("บันทึกเลขพัสดุไม่สำเร็จ กรุณาลองใหม่อีกครั้ง", "error");
    } finally {
      setSavingNumber(false);
    }
  };

  const [addingEvent, setAddingEvent] = createSignal(false);
  const [eventStatus, setEventStatus] = createSignal<EventStatus>("in_transit");
  const [eventDescription, setEventDescription] = createSignal("");
  const [eventLocation, setEventLocation] = createSignal("");
  const [eventError, setEventError] = createSignal<string>();
  const [savingEvent, setSavingEvent] = createSignal(false);

  const applyTemplate = (status: EventStatus) => {
    const t = EVENT_TEMPLATES.find((x) => x.status === status);
    setEventStatus(status);
    setEventDescription(status === "delivered" ? `จัดส่งสำเร็จ ผู้รับ: ${o().shipping.address.recipientName}` : (t?.description ?? ""));
    setEventLocation(status === "delivered" ? o().shipping.address.province : (t?.location ?? ""));
  };

  const startAddEvent = () => {
    applyTemplate(o().shipping.trackingNumber ? "in_transit" : "preparing");
    setEventError(undefined);
    setAddingEvent(true);
  };

  const saveEvent = async (e: Event) => {
    e.preventDefault();
    if (eventStatus() !== "preparing" && !o().shipping.trackingNumber) return setEventError("กรุณากรอกเลขพัสดุ DHL ก่อนบันทึกเหตุการณ์ขนส่ง");
    if (!eventDescription().trim()) return setEventError("กรุณากรอกรายละเอียดเหตุการณ์");
    setSavingEvent(true);
    try {
      await store.addTrackingEvent(o().id, { status: eventStatus(), description: eventDescription(), location: eventLocation() });
      pushToast("บันทึกเหตุการณ์การจัดส่งเรียบร้อยแล้ว", "success");
      setAddingEvent(false);
    } catch {
      pushToast("บันทึกเหตุการณ์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง", "error");
    } finally {
      setSavingEvent(false);
    }
  };

  const history = () => getTrackingHistory(o().shipping);

  return (
    <div class="flex flex-col gap-4">
      <div class="flex flex-col gap-3 rounded-card border border-border p-3 text-sm">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <p class="font-medium text-ink">
            {o().shipping.courier} {o().shipping.method} {o().totals.shippingFee > 0 ? `ค่าจัดส่ง ${formatAdminCurrency(o().totals.shippingFee)}` : "ค่าจัดส่งฟรี"}
          </p>
          <StatusBadge tone={FULFILLMENT_STATUS_META[o().fulfillmentStatus].tone}>{FULFILLMENT_STATUS_META[o().fulfillmentStatus].label}</StatusBadge>
        </div>

        <Show
          when={editingNumber()}
          fallback={
            <div class="flex flex-wrap items-center justify-between gap-2">
              <p class="text-ink-gray">
                เลขพัสดุ:{" "}
                <Show when={o().shipping.trackingNumber} fallback={<span class="text-ink-placeholder">ยังไม่มี กรอกเมื่อส่งมอบพัสดุให้ DHL</span>}>
                  {(n) => (
                    <a href={getCarrierTrackingUrl(o().shipping.carrier, n())} target="_blank" rel="noopener noreferrer" class="font-semibold tracking-wide text-ink underline">
                      {n()}
                      <span class="sr-only">เปิดหน้าติดตามพัสดุของ DHL ในแท็บใหม่</span>
                    </a>
                  )}
                </Show>
              </p>
              <Show when={editable()}>
                <Button type="button" variant="outline" onClick={startEditNumber}>
                  {o().shipping.trackingNumber ? "แก้ไขเลขพัสดุ" : "กรอกเลขพัสดุ"}
                </Button>
              </Show>
            </div>
          }
        >
          <form onSubmit={saveNumber} class="flex flex-col gap-3 sm:flex-row sm:items-start">
            <div class="flex-1">
              <TextField
                label="เลขพัสดุ DHL"
                required
                inputmode="numeric"
                maxLength={10}
                placeholder="เช่น 5093847261"
                value={numberDraft()}
                onInput={(e) => setNumberDraft(e.currentTarget.value.replace(/\D/g, ""))}
                error={numberError()}
                disabled={savingNumber()}
              />
            </div>
            <div class="flex gap-2 sm:pt-7">
              <Button type="button" variant="outline" onClick={() => setEditingNumber(false)} disabled={savingNumber()}>
                ยกเลิก
              </Button>
              <Button type="submit" loading={savingNumber()}>
                บันทึกเลขพัสดุ
              </Button>
            </div>
          </form>
        </Show>
      </div>

      <OrderTimeline order={o()} />

      <Show when={history().length > 0}>
        <div class="flex flex-col gap-2 border-t border-border pt-3">
          <p class="text-sm font-medium text-ink">ประวัติการขนส่งทั้งหมด {history().length} รายการ</p>
          <ul class="flex flex-col gap-2.5">
            <For each={history()}>
              {(event) => (
                <li class="flex gap-3 text-sm">
                  <span class="w-28 shrink-0 text-xs text-ink-gray">{formatEventTime(event.timestamp)}</span>
                  <span class="min-w-0 flex-1">
                    <span class="block text-ink">{event.description ?? stepTitle(event.status)}</span>
                    <span class="block text-xs text-ink-gray">
                      {stepTitle(event.status)}
                      {event.location ? ` ${event.location}` : ""}
                    </span>
                  </span>
                </li>
              )}
            </For>
          </ul>
        </div>
      </Show>

      <Show when={canAddEvent()}>
        <Show
          when={addingEvent()}
          fallback={
            <Button type="button" variant="outline" class="self-start" onClick={startAddEvent}>
              <PlusIcon class="size-4" /> เพิ่มเหตุการณ์การจัดส่ง
            </Button>
          }
        >
          <form onSubmit={saveEvent} class="flex flex-col gap-3 rounded-card border border-border p-3">
            <p class="text-sm font-semibold text-ink">เพิ่มเหตุการณ์การจัดส่ง</p>
            <label class="flex flex-col gap-1.5">
              <span class="text-sm font-medium text-ink">ขั้นตอน</span>
              <div class="relative">
                <select
                  value={eventStatus()}
                  disabled={savingEvent()}
                  onChange={(e) => applyTemplate(e.currentTarget.value as EventStatus)}
                  class="h-11 w-full appearance-none rounded-card border border-border bg-surface-card pl-4 pr-9 text-sm text-ink outline-none focus:border-brand-pink disabled:cursor-not-allowed disabled:bg-surface-gray"
                >
                  <For each={EVENT_TEMPLATES}>{(t) => <option value={t.status}>{stepTitle(t.status)}</option>}</For>
                </select>
                <ChevronDownIcon class="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-gray" />
              </div>
            </label>
            <TextField label="รายละเอียด" required value={eventDescription()} onInput={(e) => setEventDescription(e.currentTarget.value)} disabled={savingEvent()} />
            <TextField label="สถานที่" placeholder="เช่น DHL Hub บางพลี" value={eventLocation()} onInput={(e) => setEventLocation(e.currentTarget.value)} disabled={savingEvent()} />
            <Show when={eventError()}>
              <p role="alert" class="text-sm text-system-red">
                {eventError()}
              </p>
            </Show>
            <p class="text-xs text-ink-gray">บันทึกด้วยเวลาปัจจุบัน และสถานะคำสั่งซื้อจะเลื่อนตามขั้นตอนนี้อัตโนมัติ</p>
            <div class="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setAddingEvent(false)} disabled={savingEvent()}>
                ยกเลิก
              </Button>
              <Button type="submit" loading={savingEvent()}>
                บันทึกเหตุการณ์
              </Button>
            </div>
          </form>
        </Show>
      </Show>
    </div>
  );
}
