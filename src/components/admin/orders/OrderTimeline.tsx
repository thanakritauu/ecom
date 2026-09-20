import { For } from "solid-js";
import { buildOrderTimeline, type AdminOrder } from "~/lib/adminOrders";

/**
 * PART 14 — a vertical checklist of the order's canonical happy-path steps
 * (or the cancelled/refunded branch), each marked done/pending from
 * `statusHistory`. Re-renders automatically after Change Status since it
 * reads straight off the order passed in, not a snapshot.
 */
export function OrderTimeline(props: { order: Pick<AdminOrder, "createdAt" | "statusHistory"> }) {
  const events = () => buildOrderTimeline(props.order);

  return (
    <ol class="flex flex-col">
      <For each={events()}>
        {(event, i) => (
          <li class="flex gap-3">
            <div class="flex flex-col items-center">
              <span
                class={`flex size-6 shrink-0 items-center justify-center rounded-pill text-xs font-bold ${
                  event.completed ? "bg-success text-white" : "bg-surface-gray text-ink-placeholder"
                }`}
              >
                {event.completed ? "✓" : ""}
              </span>
              {i() < events().length - 1 ? (
                <span class={`w-px flex-1 ${event.completed ? "bg-success" : "bg-surface-gray"}`} />
              ) : null}
            </div>
            <div class="flex flex-col gap-0.5 pb-5">
              <p class={`text-sm font-medium ${event.completed ? "text-ink" : "text-ink-placeholder"}`}>{event.label}</p>
              <p class="text-xs text-ink-gray">{event.date ?? "—"}</p>
            </div>
          </li>
        )}
      </For>
    </ol>
  );
}
