import { createMemo, createSignal, For, Show } from "solid-js";
import type { OrderStatus } from "~/lib/types";
import { MOCK_ORDERS } from "~/lib/accountData";
import { OrderCard } from "./OrderCard";

const TABS: { key: OrderStatus | "all"; label: string }[] = [
  { key: "all", label: "ทั้งหมด" },
  { key: "pending", label: "รอชำระเงิน" },
  { key: "shipping", label: "กำลังจัดส่ง" },
  { key: "success", label: "สำเร็จ" },
];

export function OrderHistoryPanel() {
  const [activeTab, setActiveTab] = createSignal<OrderStatus | "all">("all");

  const filteredOrders = createMemo(() =>
    activeTab() === "all" ? MOCK_ORDERS : MOCK_ORDERS.filter((order) => order.status === activeTab()),
  );

  return (
    <div class="flex min-w-0 flex-1 flex-col gap-4 rounded-card bg-white p-4 shadow-card">
      <div role="tablist" aria-label="สถานะคำสั่งซื้อ" class="flex h-11 items-start border-b border-surface-gray">
        <For each={TABS}>
          {(tab) => (
            <button
              type="button"
              role="tab"
              aria-selected={activeTab() === tab.key}
              onClick={() => setActiveTab(tab.key)}
              class="flex h-full shrink-0 items-center justify-center border-b-2 px-4 text-sm font-semibold transition-colors duration-150"
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

      <Show when={filteredOrders().length > 0} fallback={<EmptyOrders />}>
        <div class="flex flex-col gap-4">
          <For each={filteredOrders()}>{(order) => <OrderCard order={order} />}</For>
        </div>
      </Show>
    </div>
  );
}

function EmptyOrders() {
  return (
    <div class="flex flex-col items-center justify-center gap-2 py-16 text-center">
      <p class="text-base text-ink-gray">ไม่มีคำสั่งซื้อในหมวดนี้</p>
    </div>
  );
}
