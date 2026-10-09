import { createMemo, createSignal, For, onMount, Show } from "solid-js";
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
import { PAYMENT_METHODS } from "~/lib/cartSelectors";
import type { DashboardPeriodKey, DateRange } from "~/lib/adminDashboard";
import { isWithinRange, resolvePeriodRange } from "~/lib/adminDashboardAnalytics";
import {
  ORDER_STATUS_META,
  PAYMENT_STATUS_META,
  FULFILLMENT_STATUS_META,
  ORDER_VALUE_BUCKETS,
  canCancelOrder,
  type AdminOrder,
  type OrderStatus,
  type PaymentStatus,
  type FulfillmentStatus,
} from "~/lib/adminOrders";
import { useAdminOrders } from "~/lib/adminOrderStore";
import { pushToast } from "~/lib/toast";
import type { AsyncStatus } from "~/lib/types";

const SORT_OPTIONS = [
  { value: "date-desc", label: "วันที่ ใหม่ไปเก่า" },
  { value: "date-asc", label: "วันที่ เก่าไปใหม่" },
  { value: "value-desc", label: "ยอดสั่งซื้อ สูงไปต่ำ" },
  { value: "value-asc", label: "ยอดสั่งซื้อ ต่ำไปสูง" },
  { value: "customer-asc", label: "ชื่อลูกค้า A-Z" },
];

const METHOD_FILTER_OPTIONS = [{ value: "all", label: "ทุกช่องทางชำระเงิน" }, ...PAYMENT_METHODS.map((m) => ({ value: m.id, label: m.label }))];

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
  const [methodFilter, setMethodFilterRaw] = createSignal("all");
  const [dateFilter, setDateFilter] = createSignal<DashboardPeriodKey>("30d");
  const [customRange, setCustomRange] = createSignal<DateRange>();
  const [sort, setSortRaw] = createSignal("date-desc");
  const [page, setPage] = createSignal(1);
  const [pageSize, setPageSizeRaw] = createSignal(20);
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
  const setMethodFilter = (v: string) => { setMethodFilterRaw(v); resetPage(); };
  const setDateFilterAndReset = (v: DashboardPeriodKey, range?: DateRange) => { setDateFilter(v); if (range) setCustomRange(range); resetPage(); };
  const setSort = (v: string) => { setSortRaw(v); resetPage(); };
  const setPageSize = (v: number) => { setPageSizeRaw(v); resetPage(); };

  const hasActiveFilters = () =>
    search().trim() !== "" || statusFilter() !== "all" || paymentFilter() !== "all" || fulfillmentFilter() !== "all" || valueFilter() !== "all" || methodFilter() !== "all";

  const clearFilters = () => {
    setSearchRaw("");
    setSearchParams({ status: undefined, payment: undefined });
    setFulfillmentFilterRaw("all");
    setValueFilterRaw("all");
    setMethodFilterRaw("all");
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
    const method = methodFilter();
    const range = resolvePeriodRange(dateFilter(), customRange());
    const q = search().trim().toLowerCase();
    const bucket = ORDER_VALUE_BUCKETS.find((b) => b.value === valueBucket);

    return store.orders().filter((order) => {
      if (status !== "all" && order.orderStatus !== status) return false;
      if (payment !== "all" && order.paymentStatus !== payment) return false;
      if (fulfillment !== "all" && order.fulfillmentStatus !== fulfillment) return false;
      if (bucket && (order.totals.grandTotal < bucket.min || order.totals.grandTotal >= bucket.max)) return false;
      if (method !== "all" && order.payment.methodId !== method) return false;
      if (!isWithinRange(order, range)) return false;
      if (q) {
        const haystack = `${order.orderNumber} ${order.customer.name} ${order.customer.email} ${order.customer.phone} ${order.shipping.trackingNumber ?? ""} ${order.items
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
        return list.sort((a, b) => a.placedAt.localeCompare(b.placedAt));
      case "value-desc":
        return list.sort((a, b) => b.totals.grandTotal - a.totals.grandTotal);
      case "value-asc":
        return list.sort((a, b) => a.totals.grandTotal - b.totals.grandTotal);
      case "customer-asc":
        return list.sort((a, b) => a.customer.name.localeCompare(b.customer.name));
      default:
        return list.sort((a, b) => b.placedAt.localeCompare(a.placedAt));
    }
  });

  const orderExportColumns: ExportColumn<AdminOrder>[] = [
    { header: "เลขที่คำสั่งซื้อ", value: (o) => o.orderNumber },
    { header: "ลูกค้า", value: (o) => o.customer.name },
    { header: "วันที่สั่งซื้อ", value: (o) => o.createdAt },
    { header: "จำนวนรายการ", value: (o) => o.items.length },
    { header: "ยอดรวมสินค้า", value: (o) => o.totals.subtotal },
    { header: "คูปอง", value: (o) => (o.totals.couponDiscount > 0 ? `${o.totals.couponCode ?? ""} -${o.totals.couponDiscount}` : "") },
    { header: "Charmiss Coin", value: (o) => (o.totals.coinDiscount > 0 ? `${o.totals.coinsRedeemed} คอยน์ -${o.totals.coinDiscount}` : "") },
    { header: "ค่าจัดส่ง", value: (o) => o.totals.shippingFee },
    { header: "ยอดชำระ", value: (o) => o.totals.grandTotal },
    { header: "ช่องทางชำระเงิน", value: (o) => o.payment.method },
    { header: "เลขพัสดุ DHL", value: (o) => o.shipping.trackingNumber ?? "" },
    { header: "สถานะคำสั่งซื้อ", value: (o) => ORDER_STATUS_META[o.orderStatus].label },
    { header: "การชำระเงิน", value: (o) => PAYMENT_STATUS_META[o.paymentStatus].label },
    { header: "การจัดส่ง", value: (o) => FULFILLMENT_STATUS_META[o.fulfillmentStatus].label },
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

  /** PART 4 — bulk Cancel only ever applies where every selected order can still be cancelled (storefront rule: before hand-over to DHL); otherwise the action stays disabled per Global Rule #4 rather than silently skipping orders it can't touch. */
  const selectedOrders = createMemo(() => store.orders().filter((o) => selectedIds().has(o.id)));
  const canBulkCancel = createMemo(() => selectedOrders().length > 0 && selectedOrders().every(canCancelOrder));

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
      label: "คำสั่งซื้อ",
      render: (row) => (
        <div>
          <p class="font-medium text-ink">{row.orderNumber}</p>
          <p class="text-xs text-ink-gray">{row.createdAt}</p>
        </div>
      ),
    },
    {
      key: "customer",
      label: "ลูกค้า",
      render: (row) => (
        <div class="min-w-0">
          <p class="truncate text-ink">{row.customer.name}</p>
          <p class="truncate text-xs text-ink-gray">{row.customer.email}</p>
        </div>
      ),
    },
    { key: "items", label: "สินค้า", hideBelowXl: true, render: (row) => <span class="text-ink-gray">{row.items.length} รายการ</span> },
    { key: "total", label: "ยอดชำระ", align: "right", render: (row) => <span class="font-medium text-ink">{formatAdminCurrency(row.totals.grandTotal)}</span> },
    {
      key: "payment",
      label: "การชำระเงิน",
      hideBelowXl: true,
      render: (row) => <StatusBadge tone={PAYMENT_STATUS_META[row.paymentStatus].tone}>{PAYMENT_STATUS_META[row.paymentStatus].label}</StatusBadge>,
    },
    {
      key: "shipping",
      label: "การจัดส่ง",
      hideBelowXl: true,
      render: (row) => (
        <StatusBadge tone={FULFILLMENT_STATUS_META[row.fulfillmentStatus].tone}>{FULFILLMENT_STATUS_META[row.fulfillmentStatus].label}</StatusBadge>
      ),
    },
    {
      key: "status",
      label: "สถานะ",
      render: (row) => <StatusBadge tone={ORDER_STATUS_META[row.orderStatus].tone}>{ORDER_STATUS_META[row.orderStatus].label}</StatusBadge>,
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
            search={{ value: search(), onInput: setSearch, placeholder: "ค้นหาเลขที่คำสั่งซื้อ, ลูกค้า, อีเมล, เบอร์โทร, เลขพัสดุ, SKU..." }}
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
                id: "method",
                label: "ช่องทางชำระเงิน",
                value: methodFilter(),
                options: METHOD_FILTER_OPTIONS,
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
              if (id === "method") setMethodFilter(value);
            }}
            sort={{ value: sort(), options: SORT_OPTIONS, onChange: setSort }}
          />
        </div>
        <DateRangeSelector value={dateFilter()} range={customRange()} onChange={setDateFilterAndReset} />
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
                title={hasActiveFilters() ? "ไม่พบคำสั่งซื้อที่ตรงกับการค้นหา" : "ยังไม่มีคำสั่งซื้อในช่วงเวลานี้"}
                description={hasActiveFilters() ? undefined : "ลองเลือกช่วงเวลาอื่น"}
                actionLabel={hasActiveFilters() ? "ล้างการค้นหา" : undefined}
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
                <div class="flex gap-3 rounded-card bg-surface-card p-3 shadow-card">
                  <input
                    type="checkbox"
                    aria-label={`เลือก ${row.orderNumber}`}
                    checked={selectedIds().has(row.id)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => toggleSelect(row.id)}
                    class="mt-1 size-4 shrink-0 rounded accent-brand-pink"
                  />
                  <button type="button" onClick={() => setQuickViewId(row.id)} class="font-normal flex min-w-0 flex-1 flex-col gap-2 text-left">
                    <div class="flex items-start justify-between gap-2">
                      <div class="min-w-0">
                        <p class="truncate text-sm font-medium text-ink">{row.orderNumber}</p>
                        <p class="truncate text-xs text-ink-gray">{row.createdAt}</p>
                      </div>
                      <p class="shrink-0 text-sm font-semibold text-ink">{formatAdminCurrency(row.totals.grandTotal)}</p>
                    </div>
                    <p class="truncate text-sm text-ink-gray">
                      {row.customer.name} สั่ง {row.items.length} รายการ
                    </p>
                    <div class="flex flex-wrap items-center gap-1.5">
                      <StatusBadge tone={ORDER_STATUS_META[row.orderStatus].tone}>{ORDER_STATUS_META[row.orderStatus].label}</StatusBadge>
                      <StatusBadge tone={PAYMENT_STATUS_META[row.paymentStatus].tone}>{PAYMENT_STATUS_META[row.paymentStatus].label}</StatusBadge>
                      <StatusBadge tone={FULFILLMENT_STATUS_META[row.fulfillmentStatus].tone}>{FULFILLMENT_STATUS_META[row.fulfillmentStatus].label}</StatusBadge>
                    </div>
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
      <Skeleton class="h-11 w-full rounded-pill" />
      <For each={[0, 1, 2, 3, 4, 5]}>
        {() => (
          <div class="flex items-center gap-3 rounded-card bg-surface-card p-3 shadow-card">
            <Skeleton class="size-11 shrink-0 rounded-media" />
            <div class="flex flex-1 flex-col gap-1.5">
              <Skeleton class="h-4 w-1/2" />
              <Skeleton class="h-3 w-1/4" />
            </div>
            <Skeleton class="h-8 w-16 rounded-pill" />
          </div>
        )}
      </For>
    </div>
  );
}
