import { createMemo, createSignal, onMount, Show } from "solid-js";
import { useNavigate, useSearchParams } from "@solidjs/router";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { FilterBar } from "~/components/admin/FilterBar";
import { Pagination } from "~/components/admin/Pagination";
import { DataTable, type DataTableColumn } from "~/components/admin/DataTable";
import { StatusBadge } from "~/components/admin/StatusBadge";
import { EmptyState } from "~/components/admin/EmptyState";
import { Skeleton } from "~/components/admin/Skeleton";
import { ConfirmDialog } from "~/components/admin/ConfirmDialog";
import { AdminBulkActionBar } from "~/components/admin/AdminBulkActionBar";
import { QuickViewDrawer } from "~/components/admin/QuickViewDrawer";
import { DateRangeSelector } from "~/components/admin/dashboard/DateRangeSelector";
import { OrderStatusSummary } from "~/components/admin/orders/OrderStatusSummary";
import { OrderQuickView } from "~/components/admin/orders/OrderQuickView";
import { RefreshIcon, OrdersIcon } from "~/components/admin/icons";
import { ExportMenu } from "~/components/admin/ExportMenu";
import type { ExportColumn } from "~/lib/adminExport";
import { formatAdminCurrency } from "~/lib/adminDashboard";
import type { DashboardPeriodKey } from "~/lib/adminDashboard";
import {
  ORDER_STATUS_META,
  PAYMENT_STATUS_META,
  FULFILLMENT_STATUS_META,
  ORDER_VALUE_BUCKETS,
  VALID_NEXT_ORDER_STATUS,
  type AdminOrder,
  type OrderStatus,
  type PaymentStatus,
  type FulfillmentStatus,
} from "~/lib/adminOrders";
import { useAdminOrders } from "~/lib/adminOrderStore";
import { pushToast } from "~/lib/toast";
import type { AsyncStatus } from "~/lib/types";

const SORT_OPTIONS = [
  { value: "date-desc", label: "วันที่ ใหม่→เก่า" },
  { value: "date-asc", label: "วันที่ เก่า→ใหม่" },
  { value: "value-desc", label: "ยอดสั่งซื้อ สูง→ต่ำ" },
  { value: "value-asc", label: "ยอดสั่งซื้อ ต่ำ→สูง" },
  { value: "customer-asc", label: "ชื่อลูกค้า A→Z" },
];

/** All our mock dates fall within 6–17 ก.ย. 2569 — "today" is anchored at 17, matching the rest of the admin prototype's mock timeline (Phase 02's Dashboard). */
const TODAY_DAY = 17;
function dayOf(dateLabel: string): number {
  return Number(dateLabel.match(/^(\d+)/)?.[1] ?? TODAY_DAY);
}
function withinPeriod(dateLabel: string, period: DashboardPeriodKey): boolean {
  if (period === "today") return dayOf(dateLabel) === TODAY_DAY;
  if (period === "7d") return TODAY_DAY - dayOf(dateLabel) <= 7;
  return true; // 30d / month / custom — the whole mock dataset already fits within 30 days
}

export default function AdminOrderListPage() {
  const store = useAdminOrders();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Order Status is URL-driven (PART 5/6/22) so Dashboard links and browser
  // Back/Forward both work; the other filters stay local component state —
  // the spec only asks the status (and optionally payment) query param to
  // round-trip through the URL.
  const statusFilter = () => (searchParams.status as OrderStatus | "all" | undefined) ?? "all";
  const paymentFilter = () => (searchParams.payment as PaymentStatus | "all" | undefined) ?? "all";

  const [search, setSearchRaw] = createSignal("");
  const [fulfillmentFilter, setFulfillmentFilterRaw] = createSignal<FulfillmentStatus | "all">("all");
  const [valueFilter, setValueFilterRaw] = createSignal("all");
  const [dateFilter, setDateFilter] = createSignal<DashboardPeriodKey>("30d");
  const [sort, setSortRaw] = createSignal("date-desc");
  const [page, setPage] = createSignal(1);
  const [pageSize, setPageSizeRaw] = createSignal(10);
  const [listStatus, setListStatus] = createSignal<AsyncStatus>("loading");
  const [selectedIds, setSelectedIds] = createSignal<Set<string>>(new Set());
  const [quickViewId, setQuickViewId] = createSignal<string | null>(null);
  const [confirmBulkCancel, setConfirmBulkCancel] = createSignal(false);
  const [bulkActionLoading, setBulkActionLoading] = createSignal(false);
  const quickViewOrder = createMemo(() => (quickViewId() ? store.getById(quickViewId()!) : undefined));

  const loadList = () => {
    setListStatus("loading");
    setTimeout(() => setListStatus(Math.random() < 0.08 ? "error" : "success"), 500);
  };
  onMount(loadList);

  const resetPage = () => setPage(1);
  const setSearch = (v: string) => { setSearchRaw(v); resetPage(); };
  const setStatusFilter = (v: string) => { setSearchParams({ status: v === "all" ? undefined : v }); resetPage(); };
  const setPaymentFilter = (v: string) => { setSearchParams({ payment: v === "all" ? undefined : v }); resetPage(); };
  const setFulfillmentFilter = (v: string) => { setFulfillmentFilterRaw(v as FulfillmentStatus | "all"); resetPage(); };
  const setValueFilter = (v: string) => { setValueFilterRaw(v); resetPage(); };
  const setDateFilterAndReset = (v: DashboardPeriodKey) => { setDateFilter(v); resetPage(); };
  const setSort = (v: string) => { setSortRaw(v); resetPage(); };
  const setPageSize = (v: number) => { setPageSizeRaw(v); resetPage(); };

  const hasActiveFilters = () =>
    search().trim() !== "" || statusFilter() !== "all" || paymentFilter() !== "all" || fulfillmentFilter() !== "all" || valueFilter() !== "all";

  const clearFilters = () => {
    setSearchRaw("");
    setSearchParams({ status: undefined, payment: undefined });
    setFulfillmentFilterRaw("all");
    setValueFilterRaw("all");
    resetPage();
  };

  const statusCounts = createMemo(() => {
    const tally: Partial<Record<"all" | OrderStatus, number>> = { all: store.orders().length };
    for (const order of store.orders()) tally[order.orderStatus] = (tally[order.orderStatus] ?? 0) + 1;
    return tally;
  });

  const filtered = createMemo(() => {
    const status = statusFilter();
    const payment = paymentFilter();
    const fulfillment = fulfillmentFilter();
    const valueBucket = valueFilter();
    const period = dateFilter();
    const q = search().trim().toLowerCase();
    const bucket = ORDER_VALUE_BUCKETS.find((b) => b.value === valueBucket);

    return store.orders().filter((order) => {
      if (status !== "all" && order.orderStatus !== status) return false;
      if (payment !== "all" && order.paymentStatus !== payment) return false;
      if (fulfillment !== "all" && order.fulfillmentStatus !== fulfillment) return false;
      if (bucket && (order.totals.grandTotal < bucket.min || order.totals.grandTotal >= bucket.max)) return false;
      if (!withinPeriod(order.createdAt, period)) return false;
      if (q) {
        const haystack = `${order.orderNumber} ${order.customer.name} ${order.customer.email} ${order.customer.phone} ${order.items
          .map((i) => `${i.sku} ${i.name}`)
          .join(" ")}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  });

  const sorted = createMemo(() => {
    const list = [...filtered()];
    switch (sort()) {
      case "date-asc":
        return list.sort((a, b) => dayOf(a.createdAt) - dayOf(b.createdAt));
      case "value-desc":
        return list.sort((a, b) => b.totals.grandTotal - a.totals.grandTotal);
      case "value-asc":
        return list.sort((a, b) => a.totals.grandTotal - b.totals.grandTotal);
      case "customer-asc":
        return list.sort((a, b) => a.customer.name.localeCompare(b.customer.name));
      default:
        return list.sort((a, b) => dayOf(b.createdAt) - dayOf(a.createdAt));
    }
  });

  const orderExportColumns: ExportColumn<AdminOrder>[] = [
    { header: "Order Number", value: (o) => o.orderNumber },
    { header: "Customer Name", value: (o) => o.customer.name },
    { header: "Date", value: (o) => o.createdAt },
    { header: "Items", value: (o) => o.items.length },
    { header: "Total", value: (o) => o.totals.grandTotal },
    { header: "Order Status", value: (o) => ORDER_STATUS_META[o.orderStatus].label },
    { header: "Payment Status", value: (o) => PAYMENT_STATUS_META[o.paymentStatus].label },
    { header: "Fulfillment Status", value: (o) => FULFILLMENT_STATUS_META[o.fulfillmentStatus].label },
  ];

  const totalPages = createMemo(() => Math.max(1, Math.ceil(sorted().length / pageSize())));
  const currentPage = createMemo(() => Math.min(page(), totalPages()));
  const pageItems = createMemo(() => sorted().slice((currentPage() - 1) * pageSize(), currentPage() * pageSize()));

  const allOnPageSelected = createMemo(() => pageItems().length > 0 && pageItems().every((o) => selectedIds().has(o.id)));
  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const toggleSelectAllOnPage = () =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected()) pageItems().forEach((o) => next.delete(o.id));
      else pageItems().forEach((o) => next.add(o.id));
      return next;
    });
  const clearSelection = () => setSelectedIds(new Set<string>());

  /** PART 4 — bulk Cancel only ever applies where every selected order can actually reach `cancelled` next; otherwise the action stays disabled per Global Rule #4 rather than silently skipping orders it can't touch. */
  const selectedOrders = createMemo(() => store.orders().filter((o) => selectedIds().has(o.id)));
  const canBulkCancel = createMemo(() => selectedOrders().length > 0 && selectedOrders().every((o) => VALID_NEXT_ORDER_STATUS[o.orderStatus].includes("cancelled")));

  const confirmBulkCancelAction = async () => {
    const ids = [...selectedIds()];
    setBulkActionLoading(true);
    try {
      await Promise.all(ids.map((id) => store.updateOrderStatus(id, "cancelled")));
      pushToast(`ยกเลิกคำสั่งซื้อ ${ids.length} รายการแล้ว`, "error");
      clearSelection();
      setConfirmBulkCancel(false);
    } catch {
      pushToast("ยกเลิกคำสั่งซื้อไม่สำเร็จ กรุณาลองใหม่อีกครั้ง", "error");
    } finally {
      setBulkActionLoading(false);
    }
  };

  const columns: DataTableColumn<AdminOrder>[] = [
    {
      key: "select",
      label: "",
      renderHeader: () => (
        <input
          type="checkbox"
          aria-label="เลือกทั้งหมดในหน้านี้"
          checked={allOnPageSelected()}
          onChange={toggleSelectAllOnPage}
          class="size-4 rounded accent-brand-pink"
        />
      ),
      render: (row) => (
        <input
          type="checkbox"
          aria-label={`เลือก ${row.orderNumber}`}
          checked={selectedIds().has(row.id)}
          onClick={(e) => e.stopPropagation()}
          onChange={() => toggleSelect(row.id)}
          class="size-4 rounded accent-brand-pink"
        />
      ),
    },
    {
      key: "order",
      label: "Order",
      render: (row) => (
        <div>
          <p class="font-medium text-ink">{row.orderNumber}</p>
          <p class="text-xs text-ink-gray">{row.createdAt}</p>
        </div>
      ),
    },
    {
      key: "customer",
      label: "Customer",
      render: (row) => (
        <div class="min-w-0">
          <p class="truncate text-ink">{row.customer.name}</p>
          <p class="truncate text-xs text-ink-gray">{row.customer.email}</p>
        </div>
      ),
    },
    { key: "items", label: "Items", hideBelowXl: true, render: (row) => <span class="text-ink-gray">{row.items.length} รายการ</span> },
    { key: "total", label: "Total", align: "right", render: (row) => <span class="font-medium text-ink">{formatAdminCurrency(row.totals.grandTotal)}</span> },
    {
      key: "payment",
      label: "Payment",
      hideBelowXl: true,
      render: (row) => <StatusBadge tone={PAYMENT_STATUS_META[row.paymentStatus].tone}>{PAYMENT_STATUS_META[row.paymentStatus].label}</StatusBadge>,
    },
    {
      key: "shipping",
      label: "Shipping",
      hideBelowXl: true,
      render: (row) => (
        <StatusBadge tone={FULFILLMENT_STATUS_META[row.fulfillmentStatus].tone}>{FULFILLMENT_STATUS_META[row.fulfillmentStatus].label}</StatusBadge>
      ),
    },
    {
      key: "status",
      label: "Order Status",
      render: (row) => <StatusBadge tone={ORDER_STATUS_META[row.orderStatus].tone}>{ORDER_STATUS_META[row.orderStatus].label}</StatusBadge>,
    },
    {
      key: "action",
      label: "",
      align: "right",
      render: (row) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/admin/orders/${row.id}`);
          }}
          class="rounded-pill border border-border px-3 py-1.5 text-sm font-medium text-ink hover:bg-surface-pink/40"
        >
          ดู
        </button>
      ),
    },
  ];

  return (
    <div class="flex flex-col gap-6" classList={{ "pb-20": selectedIds().size > 0 }}>
      <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "คำสั่งซื้อ" }]} />
      <PageHeader
        title="คำสั่งซื้อ"
        description="ติดตามและจัดการคำสั่งซื้อของลูกค้า"
        actions={<ExportMenu filenameBase="orders-report" columns={orderExportColumns} rows={sorted()} />}
      />

      <OrderStatusSummary value={statusFilter()} counts={statusCounts()} onChange={setStatusFilter} />

      <div class="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div class="flex-1">
          <FilterBar
            search={{ value: search(), onInput: setSearch, placeholder: "ค้นหาเลขที่คำสั่งซื้อ, ลูกค้า, อีเมล, เบอร์โทร, SKU..." }}
            filters={[
              {
                id: "payment",
                label: "การชำระเงิน",
                value: paymentFilter(),
                options: [{ value: "all", label: "ทุกสถานะการชำระเงิน" }, ...Object.entries(PAYMENT_STATUS_META).map(([value, meta]) => ({ value, label: meta.label }))],
              },
              {
                id: "fulfillment",
                label: "การจัดส่ง",
                value: fulfillmentFilter(),
                options: [{ value: "all", label: "ทุกสถานะการจัดส่ง" }, ...Object.entries(FULFILLMENT_STATUS_META).map(([value, meta]) => ({ value, label: meta.label }))],
              },
              {
                id: "value",
                label: "ยอดสั่งซื้อ",
                value: valueFilter(),
                options: ORDER_VALUE_BUCKETS.map((b) => ({ value: b.value, label: b.label })),
              },
            ]}
            onFilterChange={(id, value) => {
              if (id === "payment") setPaymentFilter(value);
              if (id === "fulfillment") setFulfillmentFilter(value);
              if (id === "value") setValueFilter(value);
            }}
            sort={{ value: sort(), options: SORT_OPTIONS, onChange: setSort }}
          />
        </div>
        <DateRangeSelector value={dateFilter()} onChange={setDateFilterAndReset} />
      </div>

      <Show when={listStatus() !== "loading"} fallback={<ListSkeleton />}>
        <Show
          when={listStatus() === "success"}
          fallback={
            <EmptyState
              tone="error"
              icon={<RefreshIcon />}
              title="ไม่สามารถโหลดรายการคำสั่งซื้อได้"
              description="เกิดข้อผิดพลาดชั่วคราว ลองโหลดข้อมูลอีกครั้ง"
              actionLabel="ลองอีกครั้ง"
              onAction={loadList}
              class="bg-surface-card shadow-card"
            />
          }
        >
          <Show
            when={sorted().length > 0}
            fallback={
              <EmptyState
                icon={<OrdersIcon />}
                title="ไม่พบคำสั่งซื้อ"
                description={hasActiveFilters() ? "ลองเปลี่ยนคำค้นหาหรือตัวกรอง" : undefined}
                actionLabel={hasActiveFilters() ? "ล้างตัวกรอง" : undefined}
                onAction={hasActiveFilters() ? clearFilters : undefined}
                class="bg-surface-card shadow-card"
              />
            }
          >
            <div class="flex items-center gap-2 px-1 lg:hidden">
              <input
                type="checkbox"
                checked={allOnPageSelected()}
                onChange={toggleSelectAllOnPage}
                class="size-4 rounded accent-brand-pink"
                aria-label="เลือกทั้งหมดในหน้านี้"
              />
              <span class="text-sm text-ink-gray">เลือกทั้งหมดในหน้านี้</span>
            </div>

            <DataTable
              columns={columns}
              rows={pageItems()}
              getRowKey={(row) => row.id}
              onRowClick={(row) => setQuickViewId(row.id)}
              renderMobileCard={(row) => (
                <div class="flex gap-3 rounded-card bg-surface-card p-4 shadow-card">
                  <input
                    type="checkbox"
                    aria-label={`เลือก ${row.orderNumber}`}
                    checked={selectedIds().has(row.id)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => toggleSelect(row.id)}
                    class="mt-1 size-4 shrink-0 rounded accent-brand-pink"
                  />
                  <button type="button" onClick={() => setQuickViewId(row.id)} class="font-normal flex min-w-0 flex-1 flex-col gap-3 text-left">
                    <div class="flex items-start justify-between gap-2">
                      <div class="min-w-0">
                        <p class="truncate font-semibold text-ink">{row.orderNumber}</p>
                        <p class="truncate text-xs text-ink-gray">{row.createdAt}</p>
                      </div>
                      <p class="shrink-0 font-semibold text-ink">{formatAdminCurrency(row.totals.grandTotal)}</p>
                    </div>
                    <p class="truncate text-sm text-ink-gray">
                      {row.customer.name} · {row.items.length} รายการ
                    </p>
                    <div class="flex flex-wrap items-center gap-1.5">
                      <StatusBadge tone={ORDER_STATUS_META[row.orderStatus].tone}>{ORDER_STATUS_META[row.orderStatus].label}</StatusBadge>
                      <StatusBadge tone={PAYMENT_STATUS_META[row.paymentStatus].tone}>{PAYMENT_STATUS_META[row.paymentStatus].label}</StatusBadge>
                      <StatusBadge tone={FULFILLMENT_STATUS_META[row.fulfillmentStatus].tone}>{FULFILLMENT_STATUS_META[row.fulfillmentStatus].label}</StatusBadge>
                    </div>
                    <span class="flex min-h-11 items-center justify-center rounded-pill border border-border text-sm font-medium text-ink">
                      ดูรายละเอียด
                    </span>
                  </button>
                </div>
              )}
            />

            <Pagination page={currentPage()} totalPages={totalPages()} pageSize={pageSize()} onPageChange={setPage} onPageSizeChange={setPageSize} />
          </Show>
        </Show>
      </Show>

      <AdminBulkActionBar
        count={selectedIds().size}
        onClear={clearSelection}
        actions={[{ label: "ยกเลิกคำสั่งซื้อ", tone: "danger", disabled: !canBulkCancel(), onClick: () => setConfirmBulkCancel(true) }]}
      />

      <QuickViewDrawer
        open={quickViewOrder() !== undefined}
        onOpenChange={(open) => !open && setQuickViewId(null)}
        title={quickViewOrder()?.orderNumber ?? ""}
        subtitle={quickViewOrder()?.customer.name}
        onViewFull={() => {
          const id = quickViewId();
          setQuickViewId(null);
          if (id) navigate(`/admin/orders/${id}`);
        }}
      >
        <Show when={quickViewOrder()}>{(order) => <OrderQuickView order={order()} />}</Show>
      </QuickViewDrawer>

      <ConfirmDialog
        open={confirmBulkCancel()}
        onOpenChange={setConfirmBulkCancel}
        title="ยกเลิกคำสั่งซื้อที่เลือก?"
        description={`คำสั่งซื้อ ${selectedIds().size} รายการที่เลือกจะถูกยกเลิก การกระทำนี้ไม่สามารถย้อนกลับได้`}
        confirmLabel="ยกเลิกคำสั่งซื้อ"
        tone="danger"
        loading={bulkActionLoading()}
        onConfirm={confirmBulkCancelAction}
      />
    </div>
  );
}

function ListSkeleton() {
  return (
    <div class="flex flex-col gap-3">
      {Array.from({ length: 6 }).map(() => (
        <div class="flex items-center gap-3 rounded-card bg-surface-card p-3 shadow-card">
          <div class="flex flex-1 flex-col gap-1.5">
            <Skeleton class="h-4 w-1/3" />
            <Skeleton class="h-3 w-1/4" />
          </div>
          <Skeleton class="h-6 w-20 rounded-pill" />
          <Skeleton class="h-8 w-14 rounded-pill" />
        </div>
      ))}
    </div>
  );
}
