import { createMemo, createSignal, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { ORDER_STATUS_META, PAYMENT_STATUS_META, type AdminOrder } from "~/lib/adminOrders";
import { useAdminOrders } from "~/lib/adminOrderStore";
import { formatAdminCurrency } from "~/lib/adminDashboard";
import { DataTable, type DataTableColumn } from "~/components/admin/DataTable";
import { StatusBadge } from "~/components/admin/StatusBadge";
import { EmptyState } from "~/components/admin/EmptyState";
import { OrdersIcon } from "~/components/admin/icons";
import { QuickViewDrawer } from "~/components/admin/QuickViewDrawer";
import { OrderQuickView } from "~/components/admin/orders/OrderQuickView";

const RECENT_LIMIT = 8;

/**
 * PART 12/13 (Phase 02) — now backed by the live order store Phase 04
 * introduces. Global UI Correction #9/12: a row click opens the same
 * OrderQuickView drawer the Orders list uses, with "ดูรายละเอียดทั้งหมด"
 * landing on the real Order Detail page (`/admin/orders/:id`).
 */
export function RecentOrdersTable() {
  const store = useAdminOrders();
  const navigate = useNavigate();
  const recentOrders = createMemo(() => store.orders().slice(0, RECENT_LIMIT));
  const [quickViewId, setQuickViewId] = createSignal<string | null>(null);
  const quickViewOrder = createMemo(() => (quickViewId() ? store.getById(quickViewId()!) : undefined));

  const columns: DataTableColumn<AdminOrder>[] = [
    { key: "id", label: "Order", render: (row) => <span class="font-medium text-ink">{row.orderNumber}</span> },
    { key: "customer", label: "Customer", render: (row) => <span class="text-ink">{row.customer.name}</span> },
    { key: "items", label: "Items", hideBelowXl: true, render: (row) => <span class="text-ink-gray">{row.items.length} รายการ</span> },
    { key: "total", label: "Total", align: "right", render: (row) => <span class="font-medium text-ink">{formatAdminCurrency(row.totals.grandTotal)}</span> },
    {
      key: "payment",
      label: "Payment",
      hideBelowXl: true,
      render: (row) => <StatusBadge tone={PAYMENT_STATUS_META[row.paymentStatus].tone}>{PAYMENT_STATUS_META[row.paymentStatus].label}</StatusBadge>,
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <StatusBadge tone={ORDER_STATUS_META[row.orderStatus].tone}>{ORDER_STATUS_META[row.orderStatus].label}</StatusBadge>,
    },
    { key: "date", label: "Date", hideBelowXl: true, render: (row) => <span class="whitespace-nowrap text-ink-gray">{row.createdAt}</span> },
  ];

  return (
    <Show when={recentOrders().length > 0} fallback={<EmptyState icon={<OrdersIcon />} title="ยังไม่มีคำสั่งซื้อ" />}>
      <DataTable
        columns={columns}
        rows={recentOrders()}
        getRowKey={(row) => row.id}
        onRowClick={(row) => setQuickViewId(row.id)}
        renderMobileCard={(row) => (
          <button
            type="button"
            onClick={() => setQuickViewId(row.id)}
            class="flex w-full flex-col gap-3 rounded-card bg-white p-4 text-left shadow-card"
          >
            <div class="flex items-start justify-between gap-2">
              <div>
                <p class="font-semibold text-ink">{row.orderNumber}</p>
                <p class="text-sm text-ink-gray">{row.customer.name}</p>
              </div>
              <p class="font-semibold text-ink">{formatAdminCurrency(row.totals.grandTotal)}</p>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <StatusBadge tone={PAYMENT_STATUS_META[row.paymentStatus].tone}>{PAYMENT_STATUS_META[row.paymentStatus].label}</StatusBadge>
              <StatusBadge tone={ORDER_STATUS_META[row.orderStatus].tone}>{ORDER_STATUS_META[row.orderStatus].label}</StatusBadge>
              <span class="text-xs text-ink-gray">
                {row.items.length} รายการ · {row.createdAt}
              </span>
            </div>
          </button>
        )}
      />

      <QuickViewDrawer
        open={quickViewOrder() !== undefined}
        onOpenChange={(open) => !open && setQuickViewId(null)}
        title={quickViewOrder()?.orderNumber ?? ""}
        subtitle={quickViewOrder()?.customer.name}
        onViewFull={() => navigate(`/admin/orders/${quickViewId()}`)}
      >
        <Show when={quickViewOrder()}>{(o) => <OrderQuickView order={o()} />}</Show>
      </QuickViewDrawer>
    </Show>
  );
}
