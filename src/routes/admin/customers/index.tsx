import { createMemo, createSignal, For, onMount, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { Button } from "~/components/shared/Button";
import { FilterBar } from "~/components/admin/FilterBar";
import { Pagination } from "~/components/admin/Pagination";
import { DataTable, type DataTableColumn } from "~/components/admin/DataTable";
import { StatusBadge } from "~/components/admin/StatusBadge";
import { EmptyState } from "~/components/admin/EmptyState";
import { ConfirmDialog } from "~/components/admin/ConfirmDialog";
import { Skeleton } from "~/components/admin/Skeleton";
import { AdminBulkActionBar } from "~/components/admin/AdminBulkActionBar";
import { QuickViewDrawer } from "~/components/admin/QuickViewDrawer";
import { CustomerRowActionsMenu } from "~/components/admin/customers/CustomerRowActionsMenu";
import { CustomerQuickView } from "~/components/admin/customers/CustomerQuickView";
import { TierBadge } from "~/components/admin/loyalty/TierBadge";
import { RefreshIcon, CustomersIcon } from "~/components/admin/icons";
import { ExportMenu } from "~/components/admin/ExportMenu";
import type { ExportColumn } from "~/lib/adminExport";
import { formatAdminCurrency } from "~/lib/adminDashboard";
import { useAdminCustomers } from "~/lib/adminCustomerStore";
import { useAdminOrders } from "~/lib/adminOrderStore";
import type { AdminOrder } from "~/lib/adminOrders";
import {
  CUSTOMER_SOURCE_META,
  CUSTOMER_TIER_META,
  customerCodeSearchText,
  getCustomerCode,
  getCustomerFullName,
  getCustomerInitials,
  parseThaiDateLabel,
  type Customer,
  type CustomerSource,
  type CustomerTier,
} from "~/lib/adminCustomers";
import { TIERS } from "~/lib/membership";
import { getCustomerLastOrder, getCustomerOrderCount, getCustomerTotalSpent } from "~/lib/customerResolvers";
import { pushToast } from "~/lib/toast";
import type { AsyncStatus } from "~/lib/types";

type CustomerRow = Customer & { orderCount: number; totalSpent: number; lastOrder: AdminOrder | undefined };

const SORT_OPTIONS = [
  { value: "name-asc", label: "ชื่อลูกค้า A-Z" },
  { value: "name-desc", label: "ชื่อลูกค้า Z-A" },
  { value: "coins-desc", label: "คอยน์ มากไปน้อย" },
  { value: "orders-desc", label: "คำสั่งซื้อ มากไปน้อย" },
  { value: "orders-asc", label: "คำสั่งซื้อ น้อยไปมาก" },
  { value: "spent-desc", label: "ยอดซื้อสะสม มากไปน้อย" },
  { value: "spent-asc", label: "ยอดซื้อสะสม น้อยไปมาก" },
  { value: "lastorder-desc", label: "คำสั่งซื้อล่าสุด ใหม่ไปเก่า" },
  { value: "lastorder-asc", label: "คำสั่งซื้อล่าสุด เก่าไปใหม่" },
  { value: "membersince-desc", label: "สมัครสมาชิก ใหม่ไปเก่า" },
  { value: "membersince-asc", label: "สมัครสมาชิก เก่าไปใหม่" },
];

export default function AdminCustomerListPage() {
  const store = useAdminCustomers();
  const orderStore = useAdminOrders();
  const navigate = useNavigate();

  const [search, setSearchRaw] = createSignal("");
  const [tierFilter, setTierFilterRaw] = createSignal("all");
  const [hasOrdersFilter, setHasOrdersFilterRaw] = createSignal("all");
  const [sourceFilter, setSourceFilterRaw] = createSignal("all");
  const [sort, setSortRaw] = createSignal("name-asc");
  const [page, setPage] = createSignal(1);
  const [pageSize, setPageSizeRaw] = createSignal(20);
  const [selectedIds, setSelectedIds] = createSignal<Set<string>>(new Set());
  const [listStatus, setListStatus] = createSignal<AsyncStatus>("loading");

  const [confirmDelete, setConfirmDelete] = createSignal<CustomerRow | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = createSignal(false);
  const [blockedDelete, setBlockedDelete] = createSignal<{ customer: CustomerRow } | null>(null);
  const [actionLoading, setActionLoading] = createSignal(false);
  const [quickViewId, setQuickViewId] = createSignal<string | null>(null);

  const rows = createMemo<CustomerRow[]>(() => {
    const orders = orderStore.orders();
    return store.customers().map((c) => ({
      ...c,
      orderCount: getCustomerOrderCount(c.id, orders),
      totalSpent: getCustomerTotalSpent(c.id, orders),
      lastOrder: getCustomerLastOrder(c.id, orders),
    }));
  });

  const quickViewCustomer = createMemo(() => (quickViewId() ? rows().find((r) => r.id === quickViewId()) : undefined));

  const customerExportColumns: ExportColumn<CustomerRow>[] = [
    { header: "รหัสลูกค้า", value: (c) => getCustomerCode(c) },
    { header: "ชื่อ-นามสกุล", value: (c) => getCustomerFullName(c) },
    { header: "อีเมล", value: (c) => c.email },
    { header: "เบอร์โทรศัพท์", value: (c) => c.phone },
    { header: "ระดับสมาชิก", value: (c) => CUSTOMER_TIER_META[c.tier ?? "glow"].name },
    { header: "Charmiss Coin", value: (c) => c.loyaltyPoints ?? 0 },
    { header: "ที่มา", value: (c) => CUSTOMER_SOURCE_META[c.source].label },
    { header: "รหัส CRM", value: (c) => c.crmMemberId ?? "" },
    { header: "คำสั่งซื้อ", value: (c) => c.orderCount },
    { header: "ยอดซื้อสะสม", value: (c) => c.totalSpent },
    { header: "เป็นสมาชิกตั้งแต่", value: (c) => c.memberSince },
  ];

  const loadList = () => {
    setListStatus("loading");
    setTimeout(() => setListStatus(Math.random() < 0.08 ? "error" : "success"), 500);
  };
  onMount(loadList);

  const resetPage = () => setPage(1);
  const setSearch = (v: string) => { setSearchRaw(v); resetPage(); };
  const setTierFilter = (v: string) => { setTierFilterRaw(v); resetPage(); };
  const setHasOrdersFilter = (v: string) => { setHasOrdersFilterRaw(v); resetPage(); };
  const setSourceFilter = (v: string) => { setSourceFilterRaw(v); resetPage(); };
  const setSort = (v: string) => { setSortRaw(v); resetPage(); };
  const setPageSize = (v: number) => { setPageSizeRaw(v); resetPage(); };

  const hasActiveFilters = () => search().trim() !== "" || tierFilter() !== "all" || hasOrdersFilter() !== "all" || sourceFilter() !== "all";
  const clearFilters = () => {
    setSearchRaw("");
    setTierFilterRaw("all");
    setHasOrdersFilterRaw("all");
    setSourceFilterRaw("all");
    resetPage();
  };

  const filtered = createMemo(() => {
    const q = search().trim().toLowerCase();
    return rows().filter((c) => {
      if (q) {
        const haystack = `${getCustomerFullName(c)} ${c.email} ${c.phone} ${customerCodeSearchText(c)} ${c.crmMemberId ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (tierFilter() !== "all" && (c.tier ?? "glow") !== tierFilter()) return false;
      if (hasOrdersFilter() === "has" && c.orderCount === 0) return false;
      if (hasOrdersFilter() === "none" && c.orderCount > 0) return false;
      if (sourceFilter() !== "all" && c.source !== sourceFilter()) return false;
      return true;
    });
  });

  const sorted = createMemo(() => {
    const list = [...filtered()];
    switch (sort()) {
      case "name-desc":
        return list.sort((a, b) => getCustomerFullName(b).localeCompare(getCustomerFullName(a)));
      case "coins-desc":
        return list.sort((a, b) => (b.loyaltyPoints ?? 0) - (a.loyaltyPoints ?? 0));
      case "orders-asc":
        return list.sort((a, b) => a.orderCount - b.orderCount);
      case "orders-desc":
        return list.sort((a, b) => b.orderCount - a.orderCount);
      case "spent-asc":
        return list.sort((a, b) => a.totalSpent - b.totalSpent);
      case "spent-desc":
        return list.sort((a, b) => b.totalSpent - a.totalSpent);
      case "lastorder-asc":
        return list.sort((a, b) => parseThaiDateLabel(a.lastOrder?.createdAt) - parseThaiDateLabel(b.lastOrder?.createdAt));
      case "lastorder-desc":
        return list.sort((a, b) => parseThaiDateLabel(b.lastOrder?.createdAt) - parseThaiDateLabel(a.lastOrder?.createdAt));
      case "membersince-asc":
        return list.sort((a, b) => parseThaiDateLabel(a.memberSince) - parseThaiDateLabel(b.memberSince));
      case "membersince-desc":
        return list.sort((a, b) => parseThaiDateLabel(b.memberSince) - parseThaiDateLabel(a.memberSince));
      default:
        return list.sort((a, b) => getCustomerFullName(a).localeCompare(getCustomerFullName(b)));
    }
  });

  const totalPages = createMemo(() => Math.max(1, Math.ceil(sorted().length / pageSize())));
  const currentPage = createMemo(() => Math.min(page(), totalPages()));
  const pageItems = createMemo(() => {
    const p = currentPage();
    return sorted().slice((p - 1) * pageSize(), p * pageSize());
  });

  const allOnPageSelected = createMemo(() => pageItems().length > 0 && pageItems().every((c) => selectedIds().has(c.id)));
  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const toggleSelectAllOnPage = () =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected()) pageItems().forEach((c) => next.delete(c.id));
      else pageItems().forEach((c) => next.add(c.id));
      return next;
    });
  const clearSelection = () => setSelectedIds(new Set<string>());

  /** §20 dependency guard — a Customer with any Order must never be deleted; the Order's own historical relationship (`customerId`) can never be left dangling. */
  const hasBlockingDependencies = (c: CustomerRow) => c.orderCount > 0;

  const requestDelete = (c: CustomerRow) => {
    if (hasBlockingDependencies(c)) setBlockedDelete({ customer: c });
    else setConfirmDelete(c);
  };
  const confirmDeleteAction = async () => {
    const c = confirmDelete();
    if (!c) return;
    setActionLoading(true);
    await store.remove(c.id);
    setActionLoading(false);
    setConfirmDelete(null);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(c.id);
      return next;
    });
    pushToast(`ลบ "${getCustomerFullName(c)}" เรียบร้อยแล้ว`, "error");
  };

  /** §21 — bulk delete must use the exact same dependency guard as single delete. */
  const confirmBulkDeleteAction = async () => {
    const ids = [...selectedIds()];
    const targets = rows().filter((c) => ids.includes(c.id));
    const blocked = targets.filter(hasBlockingDependencies);
    const ok = targets.filter((c) => !blocked.includes(c));
    setActionLoading(true);
    await Promise.all(ok.map((c) => store.remove(c.id)));
    setActionLoading(false);
    setConfirmBulkDelete(false);
    clearSelection();
    if (blocked.length > 0) {
      pushToast(`ลบสำเร็จ ${ok.length} รายการ และลบไม่ได้ ${blocked.length} รายการเพราะยังมีการใช้งานอยู่`, "warning");
    } else {
      pushToast(`ลบลูกค้า ${ok.length} รายการเรียบร้อยแล้ว`, "error");
    }
  };

  const columns: DataTableColumn<CustomerRow>[] = [
    {
      key: "select",
      label: "",
      renderHeader: () => (
        <input type="checkbox" aria-label="เลือกทั้งหมดในหน้านี้" checked={allOnPageSelected()} onChange={toggleSelectAllOnPage} class="size-4 rounded accent-brand-pink" />
      ),
      render: (row) => (
        <input
          type="checkbox"
          aria-label={`เลือก ${getCustomerFullName(row)}`}
          checked={selectedIds().has(row.id)}
          onClick={(e) => e.stopPropagation()}
          onChange={() => toggleSelect(row.id)}
          class="size-4 rounded accent-brand-pink"
        />
      ),
    },
    {
      key: "customer",
      label: "ลูกค้า",
      render: (row) => (
        <div class="flex min-w-0 items-center gap-3">
          <div class="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-pink text-xs font-semibold text-white">{getCustomerInitials(row)}</div>
          <div class="min-w-0">
            <p class="truncate text-sm font-medium text-ink">{getCustomerFullName(row)}</p>
            <p class="text-xs text-ink-gray">{getCustomerCode(row)}</p>
          </div>
        </div>
      ),
    },
    {
      key: "source",
      label: "ที่มา",
      render: (row) => <StatusBadge tone={CUSTOMER_SOURCE_META[row.source].tone}>{CUSTOMER_SOURCE_META[row.source].label}</StatusBadge>,
    },
    { key: "tier", label: "ระดับสมาชิก", render: (row) => <TierBadge tier={row.tier ?? "glow"} short /> },
    { key: "coins", label: "คอยน์", align: "right", hideBelowXl: true, render: (row) => <span class="text-ink">{(row.loyaltyPoints ?? 0).toLocaleString("th-TH")}</span> },
    { key: "email", label: "อีเมล", hideBelowXl: true, render: (row) => <span class="truncate text-ink-gray">{row.email}</span> },
    { key: "phone", label: "เบอร์โทร", hideBelowXl: true, render: (row) => <span class="whitespace-nowrap text-ink-gray">{row.phone}</span> },
    { key: "orders", label: "คำสั่งซื้อ", align: "right", render: (row) => <span class="text-ink">{row.orderCount.toLocaleString("th-TH")}</span> },
    { key: "spent", label: "ยอดซื้อสะสม", align: "right", render: (row) => <span class="font-medium text-ink">{formatAdminCurrency(row.totalSpent)}</span> },
    { key: "lastOrder", label: "สั่งซื้อล่าสุด", hideBelowXl: true, render: (row) => <span class="whitespace-nowrap text-ink-gray">{row.lastOrder?.createdAt ?? "-"}</span> },
    { key: "memberSince", label: "สมัครเมื่อ", hideBelowXl: true, render: (row) => <span class="whitespace-nowrap text-ink-gray">{row.memberSince}</span> },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (row) => <CustomerRowActionsMenu customer={row} onDelete={() => requestDelete(row)} />,
    },
  ];

  return (
    <div class="flex flex-col gap-6" classList={{ "pb-20": selectedIds().size > 0 }}>
      <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "ลูกค้า" }]} />
      <PageHeader
        title="ลูกค้า"
        description="ดูข้อมูลลูกค้า ระดับสมาชิก คอยน์ และประวัติการสั่งซื้อ"
        actions={
          <div class="flex flex-wrap items-center gap-2">
            <ExportMenu filenameBase="customers-report" columns={customerExportColumns} rows={sorted()} />
            {/* No create/import on purpose (owner request): customers come from storefront sign-ups and the CRM. */}
          </div>
        }
      />

      <FilterBar
        search={{ value: search(), onInput: setSearch, placeholder: "ค้นหาชื่อ, อีเมล, เบอร์โทร, รหัสลูกค้า, รหัส CRM..." }}
        filters={[
          {
            id: "tier",
            label: "ระดับสมาชิก",
            value: tierFilter(),
            options: [{ value: "all", label: "ทุกระดับสมาชิก" }, ...TIERS.map((t) => ({ value: t.id as CustomerTier, label: t.name }))],
          },
          {
            id: "source",
            label: "ที่มา",
            value: sourceFilter(),
            options: [{ value: "all", label: "ทุกที่มา" }, ...(Object.keys(CUSTOMER_SOURCE_META) as CustomerSource[]).map((v) => ({ value: v, label: CUSTOMER_SOURCE_META[v].label }))],
          },
          {
            id: "hasOrders",
            label: "คำสั่งซื้อ",
            value: hasOrdersFilter(),
            options: [
              { value: "all", label: "ทุกคำสั่งซื้อ" },
              { value: "has", label: "มีคำสั่งซื้อ" },
              { value: "none", label: "ยังไม่เคยสั่งซื้อ" },
            ],
          },
        ]}
        onFilterChange={(id, value) => {
          if (id === "tier") setTierFilter(value);
          if (id === "hasOrders") setHasOrdersFilter(value);
          if (id === "source") setSourceFilter(value);
        }}
        sort={{ value: sort(), options: SORT_OPTIONS, onChange: setSort }}
      />

      <Show when={listStatus() !== "loading"} fallback={<ListSkeleton />}>
        <Show
          when={listStatus() === "success"}
          fallback={
            <EmptyState
              tone="error"
              icon={<RefreshIcon />}
              title="ไม่สามารถโหลดรายการลูกค้าได้"
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
                icon={<CustomersIcon />}
                title={hasActiveFilters() ? "ไม่พบลูกค้าที่ตรงกับการค้นหา" : "ยังไม่มีลูกค้า"}
                description={hasActiveFilters() ? undefined : "ลูกค้าจะเข้ามาเมื่อสมัครหรือเข้าสู่ระบบบนเว็บไซต์"}
                actionLabel={hasActiveFilters() ? "ล้างการค้นหา" : undefined}
                onAction={hasActiveFilters() ? clearFilters : undefined}
                class="bg-surface-card shadow-card"
              />
            }
          >
            <div class="flex items-center gap-2 px-1 lg:hidden">
              <input type="checkbox" checked={allOnPageSelected()} onChange={toggleSelectAllOnPage} class="size-4 rounded accent-brand-pink" aria-label="เลือกทั้งหมดในหน้านี้" />
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
                    aria-label={`เลือก ${getCustomerFullName(row)}`}
                    checked={selectedIds().has(row.id)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => toggleSelect(row.id)}
                    class="mt-1 size-4 shrink-0 rounded accent-brand-pink"
                  />
                  <button type="button" onClick={() => setQuickViewId(row.id)} class="font-normal flex min-w-0 flex-1 gap-3 text-left">
                    <div class="flex size-16 shrink-0 items-center justify-center rounded-full bg-brand-pink text-base font-semibold text-white">{getCustomerInitials(row)}</div>
                    <div class="min-w-0 flex-1">
                      <p class="truncate text-sm font-medium text-ink">{getCustomerFullName(row)}</p>
                      <p class="text-xs text-ink-gray">{getCustomerCode(row)}</p>
                      <p class="truncate text-xs text-ink-gray">{row.email}</p>
                      <p class="mt-1 text-sm font-semibold text-ink">{formatAdminCurrency(row.totalSpent)}</p>
                      <div class="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <TierBadge tier={row.tier ?? "glow"} short />
                        <StatusBadge tone={CUSTOMER_SOURCE_META[row.source].tone}>{CUSTOMER_SOURCE_META[row.source].label}</StatusBadge>
                      </div>
                      <p class="mt-1 text-xs text-ink-placeholder">
                        คำสั่งซื้อ {row.orderCount.toLocaleString("th-TH")} รายการ คอยน์ {(row.loyaltyPoints ?? 0).toLocaleString("th-TH")}
                      </p>
                    </div>
                  </button>
                  <CustomerRowActionsMenu
                    customer={row}
                    onDelete={() => requestDelete(row)}
                    triggerClass="flex size-9 shrink-0 items-center justify-center self-start rounded-pill text-ink-gray hover:bg-surface-pink"
                  />
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
        actions={[
          { label: "ลบ", tone: "danger", onClick: () => setConfirmBulkDelete(true) },
        ]}
      />

      <QuickViewDrawer
        open={quickViewCustomer() !== undefined}
        onOpenChange={(open) => !open && setQuickViewId(null)}
        title={quickViewCustomer() ? getCustomerFullName(quickViewCustomer()!) : ""}
        subtitle={quickViewCustomer()?.email}
        onViewFull={() => {
          const id = quickViewId();
          setQuickViewId(null);
          if (id) navigate(`/admin/customers/${id}`);
        }}
      >
        <Show when={quickViewCustomer()}>{(c) => <CustomerQuickView customer={c()} />}</Show>
      </QuickViewDrawer>

      <ConfirmDialog
        open={confirmDelete() !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title="ลบลูกค้า?"
        description={`คุณต้องการลบ "${confirmDelete() ? getCustomerFullName(confirmDelete()!) : ""}" หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`}
        confirmLabel="ลบลูกค้า"
        tone="danger"
        loading={actionLoading()}
        onConfirm={confirmDeleteAction}
      />

      <ConfirmDialog
        open={blockedDelete() !== null}
        onOpenChange={(open) => !open && setBlockedDelete(null)}
        title="ไม่สามารถลบได้"
        description={(() => {
          const b = blockedDelete();
          if (!b) return "";
          return `ลูกค้า "${getCustomerFullName(b.customer)}" ถูกใช้งานในคำสั่งซื้อ ${b.customer.orderCount.toLocaleString("th-TH")} รายการ ต้องเก็บประวัติคำสั่งซื้อไว้ จึงลบลูกค้ารายนี้ไม่ได้`;
        })()}
        confirmLabel="เข้าใจแล้ว"
        cancelLabel="ปิด"
        onConfirm={() => setBlockedDelete(null)}
      />

      <ConfirmDialog
        open={confirmBulkDelete()}
        onOpenChange={setConfirmBulkDelete}
        title="ลบลูกค้าที่เลือก?"
        description={`คุณต้องการลบลูกค้า ${selectedIds().size} รายการที่เลือกหรือไม่? ลูกค้าที่มีคำสั่งซื้อจะไม่ถูกลบ การกระทำนี้ไม่สามารถย้อนกลับได้`}
        confirmLabel="ลบลูกค้า"
        tone="danger"
        loading={actionLoading()}
        onConfirm={confirmBulkDeleteAction}
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
            <Skeleton class="size-11 shrink-0 rounded-full" />
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
