import { createSignal, For, Show } from "solid-js";
import type { Shipment } from "~/lib/types";
import { CARRIERS, getCarrierTrackingUrl } from "~/lib/carriers";
import { buildTrackingTimeline, formatEventTime, getTrackingHistory, TRACKING_STEPS, type TimelineEntry } from "~/lib/orderTracking";

/**
 * Phase 05 — "ติดตามการจัดส่ง". Everything is shown on the Charmiss site:
 * a current-status hero (what's happening now), a vertical step timeline
 * (done → now → next), carrier + tracking number, and a link out to DHL's
 * own tracking page. Reads only the normalized `Shipment` — the data source
 * (mock today, DHL API later) can change without touching this component.
 */
export function OrderTrackingTimeline(props: { shipment: Shipment }) {
  const timeline = () => buildTrackingTimeline(props.shipment);
  const current = () => timeline().find((e) => e.state === "current") ?? [...timeline()].reverse().find((e) => e.state === "completed");
  const delivered = () => timeline().at(-1)?.state === "completed";
  const next = () => timeline().find((e) => e.state === "upcoming");
  const carrier = () => CARRIERS[props.shipment.carrier];
  const history = () => getTrackingHistory(props.shipment).filter((e) => TRACKING_STEPS.findIndex((s) => s.status === e.status) >= 2);
  const [showHistory, setShowHistory] = createSignal(false);
  const [copied, setCopied] = createSignal(false);

  const copyTrackingNumber = async () => {
    try {
      await navigator.clipboard.writeText(props.shipment.trackingNumber!);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <section aria-labelledby="tracking-heading" class="flex flex-col gap-4 rounded-card bg-white p-4 shadow-card sm:p-6">
      <h2 id="tracking-heading" class="text-lg font-semibold text-ink">
        ติดตามการจัดส่ง
      </h2>

      {/* Current status — the first thing the eye lands on */}
      <Show when={current()}>
        {(now) => (
          <div
            class="flex flex-col gap-1 rounded-2xl p-4"
            classList={{ "bg-success-soft": delivered(), "bg-surface-pink": !delivered() }}
            role="status"
          >
            <p class="text-xs font-medium text-ink-gray">สถานะปัจจุบัน</p>
            <p class="text-xl font-bold" classList={{ "text-success": delivered(), "text-brand-pink": !delivered() }}>
              {now().title}
            </p>
            <Show when={now().description}>
              <p class="text-sm text-ink">{now().description}</p>
            </Show>
            <p class="text-xs text-ink-gray">
              {now().timestamp ? formatEventTime(now().timestamp!) : ""}
              <Show when={now().location}> · {now().location}</Show>
            </p>
            <Show when={next()}>
              {(n) => <p class="mt-1 text-xs text-ink-gray">ขั้นตอนถัดไป: <span class="font-medium text-ink">{n().title}</span></p>}
            </Show>
          </div>
        )}
      </Show>

      {/* Carrier + tracking number + DHL link */}
      <div class="flex flex-col gap-3 rounded-2xl border border-surface-gray p-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex min-w-0 items-center gap-3">
          <span class="flex h-9 shrink-0 items-center rounded-lg bg-[#FFCC00] px-2.5 text-sm font-black italic tracking-tight text-[#D40511]" aria-hidden="true">
            {carrier().name}
          </span>
          <div class="min-w-0">
            <p class="text-sm font-semibold text-ink">{carrier().name} · {props.shipment.method}</p>
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
              class="flex min-h-[44px] shrink-0 items-center justify-center gap-1 rounded-pill bg-brand-pink px-5 text-sm font-medium text-white transition-colors duration-150 hover:bg-brand-pink/90"
            >
              ติดตามพัสดุบน {carrier().name}
              <span aria-hidden="true">↗</span>
              <span class="sr-only">(เปิดในแท็บใหม่)</span>
            </a>
          )}
        </Show>
      </div>

      {/* Step timeline — vertical at every size so it never gets cramped */}
      <ol class="flex flex-col" aria-label="ขั้นตอนการจัดส่ง">
        <For each={timeline()}>{(entry, i) => <TimelineRow entry={entry} isLast={i() === timeline().length - 1} nextState={timeline()[i() + 1]?.state} />}</For>
      </ol>

      <Show when={history().length > 1}>
        <div class="flex flex-col gap-3 border-t border-surface-gray pt-3">
          <button
            type="button"
            aria-expanded={showHistory()}
            onClick={() => setShowHistory((v) => !v)}
            class="flex min-h-[44px] items-center justify-between text-sm font-medium text-ink"
          >
            ประวัติการขนส่งจาก {carrier().name} ({history().length})
            <span aria-hidden="true" class="transition-transform" classList={{ "rotate-180": showHistory() }}>
              ▾
            </span>
          </button>
          <Show when={showHistory()}>
            <ul class="flex flex-col gap-3">
              <For each={history()}>
                {(event) => (
                  <li class="flex gap-3 text-sm">
                    <span class="w-[92px] shrink-0 text-xs text-ink-gray">{formatEventTime(event.timestamp)}</span>
                    <span class="min-w-0 flex-1">
                      <span class="text-ink">{event.description ?? TRACKING_STEPS.find((s) => s.status === event.status)?.title}</span>
                      <Show when={event.location}>
                        <span class="block text-xs text-ink-gray">{event.location}</span>
                      </Show>
                    </span>
                  </li>
                )}
              </For>
            </ul>
          </Show>
        </div>
      </Show>
    </section>
  );
}

function TimelineRow(props: { entry: TimelineEntry; isLast: boolean; nextState?: TimelineEntry["state"] }) {
  const done = () => props.entry.state === "completed";
  const now = () => props.entry.state === "current";
  return (
    <li class="flex gap-3" aria-current={now() ? "step" : undefined}>
      {/* Marker + connector */}
      <div class="flex w-7 shrink-0 flex-col items-center">
        <Show
          when={now()}
          fallback={
            <span
              class="flex size-6 shrink-0 items-center justify-center rounded-pill text-xs font-bold"
              classList={{ "bg-brand-pink text-white": done(), "border-2 border-surface-gray bg-white": !done() }}
              aria-hidden="true"
            >
              {done() ? "✓" : ""}
            </span>
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
          <span
            class="my-1 w-0.5 flex-1 rounded-pill"
            classList={{ "bg-brand-pink": done() && props.nextState !== "upcoming", "bg-surface-gray": !(done() && props.nextState !== "upcoming") }}
            aria-hidden="true"
          />
        </Show>
      </div>

      {/* Text */}
      <div class="flex min-w-0 flex-1 flex-col gap-0.5" classList={{ "pb-5": !props.isLast }}>
        <p
          classList={{
            "text-base font-bold text-brand-pink": now(),
            "text-sm font-semibold text-ink": done(),
            "text-sm text-ink-placeholder": props.entry.state === "upcoming",
          }}
        >
          {props.entry.title}
          <span class="sr-only">{now() ? " (สถานะปัจจุบัน)" : done() ? " (เสร็จแล้ว)" : " (ยังไม่ถึง)"}</span>
        </p>
        <p class="text-xs" classList={{ "text-ink-gray": props.entry.state !== "upcoming", "text-ink-placeholder": props.entry.state === "upcoming" }}>
          {props.entry.timestamp ? formatEventTime(props.entry.timestamp) : props.entry.state === "upcoming" ? "รอการอัปเดต" : ""}
        </p>
        <Show when={now() && props.entry.location}>
          <p class="text-xs text-ink-gray">{props.entry.location}</p>
        </Show>
      </div>
    </li>
  );
}
