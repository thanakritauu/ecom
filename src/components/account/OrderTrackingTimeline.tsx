import { createSignal, For, Show, type JSX } from "solid-js";
import type { Shipment } from "~/lib/types";
import { CARRIERS, getCarrierTrackingUrl } from "~/lib/carriers";
import { buildTrackingTimeline, formatEventTime, type TimelineEntry } from "~/lib/orderTracking";
import dhlLogo from "~/assets/icons/dhl-logo-circle.png";
import { CheckBadge } from "../shared/icons";

/**
 * Phase 05 — "ติดตามการจัดส่ง". Everything is shown on the Charmiss site:
 * the status timeline in the pink box (newest first — the current status
 * always sits on top with its detail, then the steps already done),
 * carrier + tracking number, and a link out to DHL's
 * own tracking page. Reads only the normalized `Shipment` — the data source
 * (mock today, DHL API later) can change without touching this component.
 */
export function OrderTrackingTimeline(props: { shipment: Shipment; /** Order title block shown at the top of the box (order number, date, status). */ header?: JSX.Element }) {
  const timeline = () => buildTrackingTimeline(props.shipment);
  const delivered = () => timeline().at(-1)?.state === "completed";
  // Reached steps only, newest first — what's happening now is always the top row.
  const reachedSteps = () => timeline().filter((e) => e.state !== "upcoming").reverse();
  const carrier = () => CARRIERS[props.shipment.carrier];
  const [copied, setCopied] = createSignal(false);

  const copyTrackingNumber = async () => {
    try {
      await navigator.clipboard.writeText(props.shipment.trackingNumber!);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <section id="tracking" aria-label="ติดตามการจัดส่ง" class="flex scroll-mt-24 flex-col gap-4 rounded-card bg-white p-4 shadow-card sm:p-6">
      <Show when={props.header}>
        <div>{props.header}</div>
      </Show>

      {/* Status timeline — newest (what's happening now) on top, the steps already done below; green once delivered */}
      <div class="flex flex-col gap-3 rounded-2xl p-4" classList={{ "bg-success-soft": delivered(), "bg-surface-pink": !delivered() }} role="status">
        <p class="text-xs font-medium text-ink-gray">สถานะปัจจุบัน</p>
        <ol class="flex flex-col" aria-label="ขั้นตอนการจัดส่ง ล่าสุดอยู่บนสุด">
          <For each={reachedSteps()}>
            {(entry, i) => <TimelineRow entry={entry} isFirst={i() === 0} isLast={i() === reachedSteps().length - 1} delivered={delivered()} />}
          </For>
        </ol>
      </div>

      {/* Carrier + tracking number + DHL link */}
      <div class="flex flex-col gap-3 rounded-2xl border border-surface-gray p-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex min-w-0 items-center gap-3">
          {/* Same circular DHL mark as Checkout's delivery card. */}
          <img src={dhlLogo} alt="" class="size-10 shrink-0 sm:size-12" />
          <div class="min-w-0">
            <p class="text-sm font-semibold text-ink">{carrier().name} {props.shipment.method}</p>
            <Show
              when={props.shipment.trackingNumber}
              fallback={<p class="text-xs text-ink-gray">จะได้รับเลขพัสดุเมื่อส่งมอบสินค้าให้ {carrier().name}</p>}
            >
              {(n) => (
                <p class="flex flex-wrap items-center gap-x-2 text-sm text-ink-gray">
                  Tracking Number: <span class="font-semibold tracking-wide text-ink">{n()}</span>
                  <button type="button" onClick={copyTrackingNumber} class="min-h-8 text-xs font-medium text-brand-pink underline">
                    {copied() ? "คัดลอกแล้ว" : "คัดลอก"}
                  </button>
                </p>
              )}
            </Show>
          </div>
        </div>
        <Show when={props.shipment.trackingNumber}>
          {(n) => (
            <a
              href={getCarrierTrackingUrl(props.shipment.carrier, n())}
              target="_blank"
              rel="noopener noreferrer"
              class="flex min-h-[44px] shrink-0 items-center justify-center rounded-pill bg-brand-pink px-5 text-sm font-medium text-white transition-colors duration-150 lg:hover:bg-brand-pink/90"
            >
              ติดตามพัสดุบน {carrier().name}
              <span class="sr-only">(เปิดในแท็บใหม่)</span>
            </a>
          )}
        </Show>
      </div>
    </section>
  );
}

function TimelineRow(props: { entry: TimelineEntry; isFirst: boolean; isLast: boolean; delivered: boolean }) {
  const now = () => props.entry.state === "current";
  return (
    <li class="flex gap-3" aria-current={now() ? "step" : undefined}>
      {/* Marker + connector */}
      <div class="flex w-7 shrink-0 flex-col items-center">
        <Show
          when={now()}
          fallback={
            <CheckBadge class={`size-6 ${props.isFirst && props.delivered ? "bg-success" : "bg-brand-pink"}`} />
          }
        >
          <span class="relative flex size-7 shrink-0 items-center justify-center" aria-hidden="true">
            <span class="absolute inset-0 animate-ping rounded-pill bg-brand-pink/30" />
            <span class="relative flex size-7 items-center justify-center rounded-pill border-[3px] border-brand-pink bg-white">
              <span class="size-2.5 rounded-pill bg-brand-pink" />
            </span>
          </span>
        </Show>
        <Show when={!props.isLast}>
          <span class="my-1 w-0.5 flex-1 rounded-pill bg-brand-pink/40" aria-hidden="true" />
        </Show>
      </div>

      {/* Text — the top row carries the latest scan's detail */}
      <div class="flex min-w-0 flex-1 flex-col gap-0.5" classList={{ "pb-5": !props.isLast }}>
        <p
          classList={{
            "text-xl font-bold text-brand-pink": props.isFirst && !props.delivered,
            "text-xl font-bold text-success": props.isFirst && props.delivered,
            "text-sm font-semibold text-ink": !props.isFirst,
          }}
        >
          {props.entry.title}
          <span class="sr-only">{now() ? " (สถานะปัจจุบัน)" : " (เสร็จแล้ว)"}</span>
        </p>
        <Show when={props.isFirst && props.entry.description}>
          <p class="text-sm text-ink">{props.entry.description}</p>
        </Show>
        <p class="text-xs text-ink-gray">
          {props.entry.timestamp ? formatEventTime(props.entry.timestamp) : ""}
          <Show when={props.isFirst && props.entry.location}> {props.entry.location}</Show>
        </p>
      </div>
    </li>
  );
}
