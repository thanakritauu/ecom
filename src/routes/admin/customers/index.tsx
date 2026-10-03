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
import { RefreshIcon, CustomersIcon } from "~/components/admin/icons";
import { ExportMenu } from "~/components/admin/ExportMenu";
import { ImportExcelDialog, type ImportRowResult } from "~/components/admin/ImportExcelDialog";
import type { ExportColumn } from "~/lib/adminExport";
import { formatAdminCurrency } from "~/lib/adminDashboard";
import { useAdminCustomers } from "~/lib/adminCustomerStore";
import { useAdminOrders } from "~/lib/adminOrderStore";
import type { AdminOrder } from "~/lib/adminOrders";
import {
  CUSTOMER_STATUS_META,
  getCustomerFullName,
  getCustomerInitials,
  isCustomerEmailTaken,
  isCustomerPhoneTaken,
  isValidEmail,
  parseThaiDateLabel,
  type Customer,
  type CustomerFormValues,
  type CustomerStatus,
} from "~/lib/adminCustomers";
import { getCustomerLastOrder, getCustomerOrderCount, getCustomerTotalSpent } from "~/lib/customerResolvers";
import { pushToast } from "~/lib/toast";
import type { AsyncStatus } from "~/lib/types";

type CustomerRow = Customer & { orderCount: number; totalSpent: number; lastOrder: AdminOrder | undefined };

const STATUS_LABEL_TO_VALUE: Record<string, CustomerStatus> = {
  active: "active",
  "ใช้งานอยู่": "active",
  inactive: "inactive",
  "ไม่ได้ใช้งาน": "inactive",
  blocked: "blocked",
  "ถูกระงับ": "blocked",
};

/** §22/§23 — Import Excel template/columns/validation for Customer. */
const CUSTOMER_IMPORT_COLUMNS = [
  { key: "firstName", label: "First Name" },
  { key: "lastName", label: "Last Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "status", label: "Status" },
];

const SORT_OPTIONS = [
  { value: "name-asc", label: "ชื่อ A–Z" },
  { value: "name-desc", label: "ชื่อ Z–A" },
  { value: "orders-desc", label: "คำสั่งซื้อ มาก→น้อย" },
  { value: "orders-asc", label: "คำสั่งซื้อ น้อย→มาก" },
  { value: "spent-desc", label: "ยอดซื้อสะสม มาก→น้อย" },
  { value: "spent-asc", label: "ยอดซื้อสะสม น้อย→มาก" },
  { value: "lastorder-desc", label: "คำสั่งซื้อล่าสุด ใหม่→เก่า" },
  { value: "lastorder-asc", label: "คำสั่งซื้อล่าสุด เก่า→ใหม่" },
  { value: "membersince-desc", label: "สมัครสมาชิก ใหม่→เก่า" },
  { value: "membersince-asc", label: "สมัครสมาชิก เก่า→ใหม่" },
];

export default function AdminCustomerListPage() {
  const store = useAdminCustomers();
  const orderStore = useAdminOrders();
  const navigate = useNavigate();

  const [search, setSearchRaw] = createSignal("");
  const [statusFilter, setStatusFilterRaw] = createSignal("all");
  const [hasOrdersFilter, setHasOrdersFilterRaw] = createSignal("all");
  const [sort, setSortRaw] = createSignal("name-asc");
  const [page, setPage] = createSignal(1);
  const [pageSize, setPageSizeRaw] = createSignal(20);
  const [selectedIds, setSelectedIds] = createSignal<Set<string>>(new Set());
  const [listStatus, setListStatus] = createSignal<AsyncStatus>("loading");

  const [confirmDelete, setConfirmDelete] = createSignal<CustomerRow | null>(null);
  const [confirmToggleBlocked, setConfirmToggleBlocked] = createSignal<CustomerRow | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = createSignal(false);
  const [confirmBulkStatus, setConfirmBulkStatus] = createSignal<CustomerStatus | null>(null);
  const [blockedDelete, setBlockedDelete] = createSignal<{ customer: CustomerRow } | null>(null);
  const [actionLoading, setActionLoading] = createSignal(false);
  const [quickViewId, setQuickViewId] = createSignal<string | null>(null);
  const [importOpen, setImportOpen] = createSignal(false);

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

  /** §23 — required fields, email format, duplicate email/phone, and an unrecognized Status value are all checked here, per row, before anything is written to the Customer Store. */
  const parseCustomerImportRow = (raw: Record<string, string>, rowIndex: number): ImportRowResult<CustomerFormValues> => {
    const messages: string[] = [];
    let rowStatus: "ready" | "warning" | "error" = "ready";
    const flag = (msg: string, level: "warning" | "error" = "error") => {
      messages.push(msg);
      if (level === "error") rowStatus = "error";
      else if (rowStatus === "ready") rowStatus = "warning";
    };
    const cell = (...keys: string[]) => keys.map((k) => (raw[k] ?? "").toString().trim()).find((v) => v !== "") ?? "";

    const firstName = cell("First Name", "firstName");
    const lastName = cell("Last Name", "lastName");
    const email = cell("Email", "email");
    const phone = cell("Phone", "phone");
    const statusRaw = cell("Status", "status");

    if (!firstName) flag("ไม่มีชื่อ");
    if (!lastName) flag("ไม่มีนามสกุล");
    if (!email) flag("ไม่มีอีเมล");
    else if (!isValidEmail(email)) flag("รูปแบบอีเมลไม่ถูกต้อง");
    else if (isCustomerEmailTaken(store.customers(), email)) flag(`อีเมล "${email}" ซ้ำกับลูกค้าที่มีอยู่แล้ว`);
    if (!phone) flag("ไม่มีเบอร์โทรศัพท์");
    else if (isCustomerPhoneTaken(store.customers(), phone)) flag(`เบอร์โทร "${phone}" ซ้ำกับลูกค้าที่มีอยู่แล้ว`);

    const resolvedStatus = statusRaw ? STATUS_LABEL_TO_VALUE[statusRaw.toLowerCase()] ?? STATUS_LABEL_TO_VALUE[statusRaw] : "active";
    if (statusRaw && !resolvedStatus) flag(`สถานะ "${statusRaw}" ไม่ถูกต้อง — จะบันทึกเป็น "ใช้งานอยู่"`, "warning");

    return {
      row: rowIndex,
      status: rowStatus,
      messages,
      preview: { firstName: firstName || "-", lastName: lastName || "-", email: email || "-", phone: phone || "-", status: statusRaw || "-" },
      data: { firstName: firstName || `ลูกค้า #${rowIndex}`, lastName: lastName || "-", email, phone, status: resolvedStatus ?? "active" },
    };
  };

  /** Each row retries the Customer Store's own simulated ~8% random save failure up to 3 times, same convention as Product Import. */
  const handleCustomerImport = async (importRows: CustomerFormValues[]) => {
    for (const row of importRows) {
      for (let attempt = 1; ; attempt++) {
        try {
          await store.add(row);
          break;
        } catch {
          if (attempt >= 3) throw new Error("IMPORT_ROW_FAILED");
        }
      }
    }
  };

  const customerExportColumns: ExportColumn<CustomerRow>[] = [
    { header: "Customer ID", value: (c) => c.id },
    { header: "Name", value: (c) => getCustomerFullName(c) },
    { header: "Email", value: (c) => c.email },
    { header: "Phone", value: (c) => c.phone },
    { header: "Status", value: (c) => CUSTOMER_STATUS_META[c.status].label },
    { header: "Orders", value: (c) => c.orderCount },
    { header: "Total Spent", value: (c) => c.totalSpent },
    { header: "Member Since", value: (c) => c.memberSince },
  ];

  const loadList = () => {
    setListStatus("loading");
    setTimeout(() => setListStatus(Math.random() < 0.08 ? "error" : "success"), 500);
  };
  onMount(loadList);

  const resetPage = () => setPage(1);
  const setSearch = (v: string) => { setSearchRaw(v); resetPage(); };
  const setStatusFilter = (v: string) => { setStatusFilterRaw(v); resetPage(); };
  const setHasOrdersFilter = (v: string) => { setHasOrdersFilterRaw(v); resetPage(); };
  const setSort = (v: string) => { setSortRaw(v); resetPage(); };
  const setPageSize = (v: number) => { setPageSizeRaw(v); resetPage(); };

  const hasActiveFilters = () => search().trim() !== "" || statusFilter() !== "all" || hasOrdersFilter() !== "all";
  const clearFilters = () => {
    setSearchRaw("");
    setStatusFilterRaw("all");
    setHasOrdersFilterRaw("all");
    resetPage();
  };

  const filtered = createMemo(() => {
    const q = search().trim().toLowerCase();
    return rows().filter((c) => {
      if (q) {
        const haystack = `${getCustomerFullName(c)} ${c.email} ${c.phone} ${c.id}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (statusFilter() !== "all" && c.status !== statusFilter()) return false;
      if (hasOrdersFilter() === "has" && c.orderCount === 0) return false;
      if (hasOrdersFilter() === "none" && c.orderCount > 0) return false;
      return true;
    });
  });

  const sorted = createMemo(() => {
    const list = [...filtered()];
    switch (sort()) {
      case "name-desc":
        return list.sort((a, b) => getCustomerFullName(b).localeCompare(getCustomerFullName(a)));
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

  const requestToggleBlocked = (c: CustomerRow) => setConfirmToggleBlocked(c);
  const confirmToggleBlockedAction = async () => {
    const c = confirmToggleBlocked();
    if (!c) return;
    const nextStatus: CustomerStatus = c.status === "blocked" ? "active" : "blocked";
    setActionLoading(true);
    await store.setStatus(c.id, nextStatus);
    setActionLoading(false);
    setConfirmToggleBlocked(null);
    pushToast(nextStatus === "blocked" ? "ระงับบัญชีลูกค้าแล้ว" : "เปิดใช้งานบัญชีลูกค้าแล้ว", "success");
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
      pushToast(`ลบไม่สำเร็จ ${blocked.length} รายการ (มีคำสั่งซื้ออยู่) — ลบสำเร็จ ${ok.length} รายการ`, "warning");
    } else {
      pushToast(`ลบลูกค้า ${ok.length} รายการเรียบร้อยแล้ว`, "error");
    }
  };

  const confirmBulkStatusAction = async () => {
    const status = confirmBulkStatus();
    if (!status) return;
    const ids = [...selectedIds()];
    setActionLoading(true);
    await Promise.all(ids.map((id) => store.setStatus(id, status)));
    setActionLoading(false);
    setConfirmBulkStatus(null);
    clearSelection();
    pushToast(`เปลี่ยนสถานะ ${ids.length} รายการเป็น "${CUSTOMER_STATUS_META[status].label}" แล้ว`, "success");
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
      label: "Customer",
      render: (row) => (
        <div class="flex min-w-0 items-center gap-3">
          <div class="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-pink text-xs font-semibold text-white">{getCustomerInitials(row)}</div>
          <div class="min-w-0">
            <p class="truncate text-sm font-medium text-ink">{getCustomerFullName(row)}</p>
            <p class="text-xs text-ink-gray">{row.id}</p>
          </div>
        </div>
      ),
    },
    { key: "email", label: "Email", hideBelowXl: true, render: (row) => <span class="truncate text-ink-gray">{row.email}</span> },
    { key: "phone", label: "Phone", hideBelowXl: true, render: (row) => <span class="whitespace-nowrap text-ink-gray">{row.phone}</span> },
    { key: "orders", label: "Orders", align: "right", render: (row) => <span class="text-ink">{row.orderCount}</span> },
    { key: "spent", label: "Total Spent", align: "right", render: (row) => <span class="font-medium text-ink">{formatAdminCurrency(row.totalSpent)}</span> },
    { key: "lastOrder", label: "Last Order", hideBelowXl: true, render: (row) => <span class="whitespace-nowrap text-ink-gray">{row.lastOrder?.createdAt ?? "-"}</span> },
    { key: "status", label: "Status", render: (row) => <StatusBadge tone={CUSTOMER_STATUS_META[row.status].tone}>{CUSTOMER_STATUS_META[row.status].label}</StatusBadge> },
    { key: "memberSince", label: "Member Since", hideBelowXl: true, render: (row) => <span class="whitespace-nowrap text-ink-gray">{row.memberSince}</span> },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (row) => <CustomerRowActionsMenu customer={row} onToggleBlocked={() => requestToggleBlocked(row)} onDelete={() => requestDelete(row)} />,
    },
  ];

  return (
    <div class="flex flex-col gap-6" classList={{ "pb-20": selectedIds().size > 0 }}>
      <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "ลูกค้า" }]} />
      <PageHeader
        title="ลูกค้า"
        description="ดูข้อมูลลูกค้า ประวัติการสั่งซื้อ และยอดซื้อสะสมของ Charmiss"
        actions={
          <div class="flex flex-wrap items-center gap-2">
            <ExportMenu filenameBase="customers-report" columns={customerExportColumns} rows={sorted()} />
            {/* "นำเข้าลูกค้า"/"เพิ่มลูกค้า" hidden for now per explicit request — ImportDialog and /admin/customers/new stay intact, just unreachable from here until asked to bring the buttons back. */}
          </div>
        }
      />

      <FilterBar
        search={{ value: search(), onInput: setSearch, placeholder: "ค้นหาชื่อ, อีเมล, เบอร์โทร, Customer ID..." }}
        filters={[
          {
            id: "status",
            label: "สถานะ",
            value: statusFilter(),
            options: [{ value: "all", label: "ทุกสถานะ" }, ...(Object.keys(CUSTOMER_STATUS_META) as CustomerStatus[]).map((s) => ({ value: s, label: CUSTOMER_STATUS_META[s].label }))],
          },
          {
            id: "hasOrders",
            label: "คำสั่งซื้อ",
            value: hasOrdersFilter(),
            options: [
              { value: "all", label: "ทั้งหมด" },
              { value: "has", label: "มีคำสั่งซื้อ" },
              { value: "none", label: "ยังไม่เคยสั่งซื้อ" },
            ],
          },
        ]}
        onFilterChange={(id, value) => {
          if (id === "status") setStatusFilter(value);
          if (id === "hasOrders") setHasOrdersFilter(value);
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
              title="ไม่สามารถโหลดรายชื่อลูกค้าได้"
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
                description={hasActiveFilters() ? undefined : "ยังไม่มีลูกค้าในระบบ"}
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
                    <div class="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-pink text-sm font-semibold text-white">{getCustomerInitials(row)}</div>
                    <div class="min-w-0 flex-1">
                      <p class="truncate text-sm font-medium text-ink">{getCustomerFullName(row)}</p>
                      <p class="truncate text-xs text-ink-gray">{row.email}</p>
                      <p class="mt-1 text-sm font-semibold text-ink">{formatAdminCurrency(row.totalSpent)}</p>
                      <div class="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <span class="whitespace-nowrap text-sm text-ink-gray">{row.orderCount} คำสั่งซื้อ</span>
                        <StatusBadge tone={CUSTOMER_STATUS_META[row.status].tone}>{CUSTOMER_STATUS_META[row.status].label}</StatusBadge>
                      </div>
                    </div>
                  </button>
                  <CustomerRowActionsMenu
                    customer={row}
                    onToggleBlocked={() => requestToggleBlocked(row)}
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
          { label: "ใช้งานอยู่", onClick: () => setConfirmBulkStatus("active") },
          { label: "ไม่ได้ใช้งาน", onClick: () => setConfirmBulkStatus("inactive") },
          { label: "ระงับ", onClick: () => setConfirmBulkStatus("blocked") },
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
          return `"${getCustomerFullName(b.customer)}" มีคำสั่งซื้อ ${b.customer.orderCount} รายการผูกอยู่ — ต้องรักษาความสัมพันธ์กับคำสั่งซื้อในอดีตไว้ จึงไม่สามารถลบลูกค้ารายนี้ได้`;
        })()}
        confirmLabel="เข้าใจแล้ว"
        cancelLabel="ปิด"
        onConfirm={() => setBlockedDelete(null)}
      />

      <ConfirmDialog
        open={confirmToggleBlocked() !== null}
        onOpenChange={(open) => !open && setConfirmToggleBlocked(null)}
        title={confirmToggleBlocked()?.status === "blocked" ? "เปิดใช้งานบัญชีนี้?" : "ระงับบัญชีนี้?"}
        description={`"${confirmToggleBlocked() ? getCustomerFullName(confirmToggleBlocked()!) : ""}" จะ${confirmToggleBlocked()?.status === "blocked" ? "กลับมาใช้งานได้ตามปกติ" : "ถูกระงับการใช้งาน"}`}
        confirmLabel={confirmToggleBlocked()?.status === "blocked" ? "เปิดใช้งาน" : "ระงับบัญชี"}
        tone={confirmToggleBlocked()?.status === "blocked" ? "default" : "danger"}
        loading={actionLoading()}
        onConfirm={confirmToggleBlockedAction}
      />

      <ConfirmDialog
        open={confirmBulkDelete()}
        onOpenChange={setConfirmBulkDelete}
        title="ลบลูกค้าที่เลือก?"
        description={`คุณต้องการลบลูกค้า ${selectedIds().size} รายการที่เลือกหรือไม่? รายการที่มีคำสั่งซื้ออยู่จะถูกข้ามไป การกระทำนี้ไม่สามารถย้อนกลับได้`}
        confirmLabel="ลบลูกค้า"
        tone="danger"
        loading={actionLoading()}
        onConfirm={confirmBulkDeleteAction}
      />

      <ConfirmDialog
        open={confirmBulkStatus() !== null}
        onOpenChange={(open) => !open && setConfirmBulkStatus(null)}
        title="เปลี่ยนสถานะลูกค้าที่เลือก?"
        description={`คุณต้องการเปลี่ยนสถานะลูกค้า ${selectedIds().size} รายการที่เลือกเป็น "${confirmBulkStatus() ? CUSTOMER_STATUS_META[confirmBulkStatus()!].label : ""}" หรือไม่?`}
        confirmLabel="เปลี่ยนสถานะ"
        loading={actionLoading()}
        onConfirm={confirmBulkStatusAction}
      />

      <ImportExcelDialog
        open={importOpen()}
        onOpenChange={setImportOpen}
        title="นำเข้าลูกค้าจาก Excel"
        description="เลือกไฟล์ Excel/CSV ที่มีคอลัมน์ First Name, Last Name, Email, Phone, Status ระบบจะตรวจสอบข้อมูลก่อนนำเข้าจริง"
        templateColumns={CUSTOMER_IMPORT_COLUMNS}
        parseRow={parseCustomerImportRow}
        onConfirm={handleCustomerImport}
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
