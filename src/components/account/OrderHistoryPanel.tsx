import { createMemo, createSignal, For, Show } from "solid-js";
import { useSearchParams } from "@solidjs/router";
import type { Order } from "~/lib/types";
import { EmptyState } from "../shared/EmptyState";
import { DocumentIcon } from "../shared/icons";
import { OrderCard } from "./OrderCard";
import { LineContactNote } from "./OrderMeta";

type TabKey = "all" | "pending_payment" | "in_progress" | "completed" | "cancelled";

/**
 * Tabs group the order statuses a shopper thinks in — "กำลังจัดส่ง" covers
 * everything paid but not yet delivered (เตรียมการจัดส่ง → ส่งให้บริษัทขนส่ง →
 * กำลังจัดส่ง). "ยกเลิก" also holds unpaid orders past their payment deadline —
 * the repository already reads those as cancelled (`applyPaymentDeadline`).
 * Tabs flagged `hidden` aren't rendered (their orders still show under "ทั้งหมด").
 */
const TABS: { key: TabKey; label: string; match?: (o: Order) => boolean; hidden?: boolean }[] = [
  { key: "all", label: "ทั้งหมด" },
  { key: "pending_payment", label: "รอชำระเงิน", match: (o) => o.status === "pending_payment" },
  { key: "in_progress", label: "กำลังจัดส่ง", match: (o) => ["preparing", "handed_over", "shipping"].includes(o.status) },
  { key: "completed", label: "ส่งสำเร็จ", match: (o) => o.status === "completed" },
  { key: "cancelled", label: "ยกเลิก", match: (o) => o.status === "cancelled" },
];

/** Empty state title per tab (the "ทั้งหมด" tab never shows one: no orders at all is `NoOrdersYet`). */
const EMPTY_TAB_TITLE: Record<TabKey, string> = {
  all: "ยังไม่มีคำสั่งซื้อ",
  pending_payment: "ไม่มีคำสั่งซื้อที่รอชำระเงิน",
  in_progress: "ไม่มีคำสั่งซื้อที่กำลังจัดส่ง",
  completed: "ยังไม่มีคำสั่งซื้อที่ส่งสำเร็จ",
  cancelled: "ไม่มีคำสั่งซื้อที่ยกเลิก",
};

export function OrderHistoryPanel(props: { orders: Order[]; ready: boolean }) {
  // `?tab=...` opens a tab directly: Checkout's success page links `in_progress` (กำลังจัดส่ง), its failed notices `pending_payment`.
  const [searchParams] = useSearchParams();
  const initialTab = () => {
    const t = searchParams.tab;
    return TABS.some((tab) => tab.key === t && !tab.hidden) ? (t as TabKey) : "all";
  };
  const [activeTab, setActiveTab] = createSignal<TabKey>(initialTab());

  const filteredOrders = createMemo(() => {
    const match = TABS.find((t) => t.key === activeTab())?.match;
    return match ? props.orders.filter(match) : props.orders;
  });

  return (
    <section aria-labelledby="purchase-history-heading" class="flex min-w-0 flex-1 flex-col gap-4 rounded-card bg-white p-4 shadow-card">
      <h1 id="purchase-history-heading" class="text-xl font-bold text-ink">
        ประวัติการซื้อ
      </h1>

      <Show when={props.ready} fallback={<OrdersSkeleton />}>
        <Show when={props.orders.length > 0} fallback={<NoOrdersYet />}>
          <div role="tablist" aria-label="สถานะคำสั่งซื้อ" class="-mx-4 flex h-11 items-start overflow-x-auto border-b border-surface-gray px-4">
            <For each={TABS.filter((t) => !t.hidden)}>
              {(tab) => (
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab() === tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  class="flex h-full shrink-0 items-center justify-center whitespace-nowrap border-b-2 px-4 text-sm font-medium transition-colors duration-150"
                  classList={{
                    "border-brand-pink text-ink": activeTab() === tab.key,
                    "border-transparent text-ink-placeholder lg:hover:text-ink-gray": activeTab() !== tab.key,
                  }}
                >
                  {tab.label}
                </button>
              )}
            </For>
          </div>

          <Show
            when={filteredOrders().length > 0}
            fallback={<EmptyState icon={DocumentIcon} title={EMPTY_TAB_TITLE[activeTab()]} description="ดูคำสั่งซื้ออื่นได้ที่แท็บทั้งหมด" />}
          >
            <div class="flex flex-col gap-4">
              <For each={filteredOrders()}>{(order) => <OrderCard order={order} />}</For>
            </div>
            <LineContactNote />
          </Show>
        </Show>
      </Show>
    </section>
  );
}

function NoOrdersYet() {
  return (
    <EmptyState
      icon={DocumentIcon}
      title="ยังไม่มีประวัติการซื้อ"
      description="เมื่อคุณสั่งซื้อสินค้า คำสั่งซื้อและสถานะการจัดส่งจะแสดงที่นี่"
      action={{ label: "เริ่มช้อปเลย", href: "/products" }}
    />
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
