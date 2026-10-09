import { For, Show } from "solid-js";
import { CheckBadge } from "~/components/shared/icons";
import { CloseXIcon } from "~/components/admin/icons";
import { buildTrackingTimeline, formatEventTime } from "~/lib/orderTracking";
import { CANCELLED_BY_LABEL, type AdminOrder } from "~/lib/adminOrders";

/**
 * The storefront's 6 DHL tracking steps (`orderTracking.ts` TRACKING_STEPS —
 * สั่งซื้อสำเร็จ → … → จัดส่งสำเร็จ), built with the exact same
 * `buildTrackingTimeline` the shopper's tracking box uses, so Admin and the
 * customer always see the same step reached. Each reached step shows its
 * latest scan's description/location. A cancelled order ends with a
 * cancel row instead of the remaining steps.
 */
export function OrderTimeline(props: { order: Pick<AdminOrder, "shipping" | "orderStatus" | "cancellation"> }) {
  const cancelled = () => props.order.orderStatus === "cancelled";
  const steps = () => {
    const all = buildTrackingTimeline(props.order.shipping);
    return cancelled() ? all.filter((s) => s.state !== "upcoming") : all;
  };

  return (
    <ol class="flex flex-col">
      <For each={steps()}>
        {(step, i) => {
          const done = () => step.state === "completed" || (cancelled() && step.state === "current");
          const isLast = () => i() === steps().length - 1 && !cancelled();
          return (
            <li class="flex gap-3">
              <div class="flex flex-col items-center">
                <Show
                  when={done()}
                  fallback={
                    <span
                      class={`flex size-6 shrink-0 items-center justify-center rounded-pill ${
                        step.state === "current" ? "border-[3px] border-brand-pink bg-surface-card" : "bg-surface-gray"
                      }`}
                      aria-hidden="true"
                    />
                  }
                >
                  <CheckBadge class="size-6 bg-success" />
                </Show>
                <Show when={!isLast()}>
                  <span class={`w-px flex-1 ${done() ? "bg-success" : "bg-surface-gray"}`} />
                </Show>
              </div>
              <div class="flex min-w-0 flex-col gap-0.5 pb-5">
                <p class={`text-sm font-medium ${step.state === "upcoming" ? "text-ink-placeholder" : "text-ink"}`}>
                  {step.title}
                  <Show when={step.state === "current" && !cancelled()}>
                    <span class="ml-1.5 text-xs font-medium text-brand-pink">สถานะปัจจุบัน</span>
                  </Show>
                </p>
                <Show when={step.description}>
                  <p class="text-xs text-ink">{step.description}</p>
                </Show>
                <p class="text-xs text-ink-gray">
                  {step.timestamp ? formatEventTime(step.timestamp) : "-"}
                  <Show when={step.location}> {step.location}</Show>
                </p>
              </div>
            </li>
          );
        }}
      </For>
      <Show when={cancelled()}>
        <li class="flex gap-3">
          <span class="flex size-6 shrink-0 items-center justify-center rounded-pill bg-surface-gray text-ink-gray" aria-hidden="true">
            <CloseXIcon class="size-3.5" />
          </span>
          <div class="flex min-w-0 flex-col gap-0.5">
            <p class="text-sm font-medium text-ink">ยกเลิกคำสั่งซื้อ</p>
            <Show when={props.order.cancellation}>
              {(c) => (
                <>
                  <p class="text-xs text-ink">
                    {CANCELLED_BY_LABEL[c().by]}
                    {c().reason ? ` ${c().reason}` : ""}
                  </p>
                  <p class="text-xs text-ink-gray">{formatEventTime(c().at)}</p>
                </>
              )}
            </Show>
          </div>
        </li>
      </Show>
    </ol>
  );
}
