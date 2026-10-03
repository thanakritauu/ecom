import { createMemo, createSignal, For, Show } from "solid-js";
import type { Order, OrderStatus } from "~/lib/types";
import { Button } from "../shared/Button";
import { OrderCard } from "./OrderCard";

type TabKey = "all" | "pending_payment" | "in_progress" | "completed" | "cancelled";

/** Tabs group the order statuses a shopper thinks in — "กำลังจัดส่ง" covers everything paid but not yet delivered. */
const TABS: { key: TabKey; label: string; statuses?: OrderStatus[] }[] = [
  { key: "all", label: "ทั้งหมด" },
  { key: "pending_payment", label: "รอชำระเงิน", statuses: ["pending_payment"] },
  { key: "in_progress", label: "กำลังจัดส่ง", statuses: ["paid", "preparing", "shipping"] },
  { key: "completed", label: "สำเร็จ", statuses: ["completed"] },
  { key: "cancelled", label: "ยกเลิก", statuses: ["cancelled"] },
];

export function OrderHistoryPanel(props: { orders: Order[]; ready: boolean }) {
  const [activeTab, setActiveTab] = createSignal<TabKey>("all");

  const filteredOrders = createMemo(() => {
    const statuses = TABS.find((t) => t.key === activeTab())?.statuses;
    return statuses ? props.orders.filter((o) => statuses.includes(o.status)) : props.orders;
  });

  return (
    <section aria-labelledby="purchase-history-heading" class="flex min-w-0 flex-1 flex-col gap-4 rounded-card bg-white p-4 shadow-card">
      <h1 id="purchase-history-heading" class="text-xl font-bold text-ink">
        ประวัติการซื้อ
      </h1>

      <Show when={props.ready} fallback={<OrdersSkeleton />}>
        <Show when={props.orders.length > 0} fallback={<NoOrdersYet />}>
          <div role="tablist" aria-label="สถานะคำสั่งซื้อ" class="-mx-4 flex h-11 items-start overflow-x-auto border-b border-surface-gray px-4">
            <For each={TABS}>
              {(tab) => (
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab() === tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  class="flex h-full shrink-0 items-center justify-center whitespace-nowrap border-b-2 px-4 text-sm font-medium transition-colors duration-150"
                  classList={{
                    "border-brand-pink text-ink": activeTab() === tab.key,
                    "border-transparent text-ink-placeholder hover:text-ink-gray": activeTab() !== tab.key,
                  }}
                >
                  {tab.label}
                </button>
              )}
            </For>
          </div>

          <Show
            when={filteredOrders().length > 0}
            fallback={<p class="py-16 text-center text-base text-ink-gray">ไม่มีคำสั่งซื้อในหมวดนี้</p>}
          >
            <div class="flex flex-col gap-4">
              <For each={filteredOrders()}>{(order) => <OrderCard order={order} />}</For>
            </div>
          </Show>
        </Show>
      </Show>
    </section>
  );
}

function NoOrdersYet() {
  return (
    <div class="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <p class="text-lg font-semibold text-ink">ยังไม่มีประวัติการซื้อ</p>
      <p class="max-w-xs text-sm text-ink-gray">เมื่อคุณสั่งซื้อสินค้า คำสั่งซื้อและสถานะการจัดส่งจะแสดงที่นี่</p>
      <Button href="/products" variant="primary">
        เริ่มช้อปเลย
      </Button>
    </div>
  );
}

function OrdersSkeleton() {
  return (
    <div class="flex flex-col gap-4" aria-hidden="true">
      {Array.from({ length: 3 }).map(() => (
        <div class="h-40 animate-pulse rounded-2xl bg-surface-gray" />
      ))}
    </div>
  );
}
