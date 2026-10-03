import { createMemo, createSignal, onMount, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { Button } from "~/components/shared/Button";
import { FilterBar } from "~/components/admin/FilterBar";
import { Pagination } from "~/components/admin/Pagination";
import { DataTable, type DataTableColumn } from "~/components/admin/DataTable";
import { StatusBadge } from "~/components/admin/StatusBadge";
import { EmptyState } from "~/components/admin/EmptyState";
import { Skeleton } from "~/components/admin/Skeleton";
import { ConfirmDialog } from "~/components/admin/ConfirmDialog";
import { AdminBulkActionBar } from "~/components/admin/AdminBulkActionBar";
import { QuickViewDrawer } from "~/components/admin/QuickViewDrawer";
import { MarketingStatusSummary } from "~/components/admin/marketing/MarketingStatusSummary";
import { MarketingRowActionsMenu } from "~/components/admin/marketing/MarketingRowActionsMenu";
import { CouponQuickView } from "~/components/admin/marketing/CouponQuickView";
import { RefreshIcon, InventoryIcon, PlusIcon } from "~/components/admin/icons";
import { MARKETING_STATUS_META, formatMarketingDate, formatCouponDiscount, type Coupon, type MarketingStatus } from "~/lib/adminMarketing";
import { useAdminMarketing } from "~/lib/adminMarketingStore";
import { pushToast } from "~/lib/toast";
import type { AsyncStatus } from "~/lib/types";

const SORT_OPTIONS = [
  { value: "start-desc", label: "วันที่เริ่ม ใหม่→เก่า" },
  { value: "start-asc", label: "วันที่เริ่ม เก่า→ใหม่" },
  { value: "end-asc", label: "วันสิ้นสุด ใกล้ที่สุด" },
  { value: "code-asc", label: "รหัส A→Z" },
];

export default function AdminCouponListPage() {
  const store = useAdminMarketing().coupons;
  const navigate = useNavigate();

  const [search, setSearchRaw] = createSignal("");
  const [statusFilter, setStatusFilterRaw] = createSignal<"all" | MarketingStatus>("all");
  const [sort, setSortRaw] = createSignal("start-desc");
  const [page, setPage] = createSignal(1);
  const [pageSize, setPageSizeRaw] = createSignal(10);
  const [listStatus, setListStatus] = createSignal<AsyncStatus>("loading");
  const [selectedIds, setSelectedIds] = createSignal<Set<string>>(new Set());
  const [quickViewId, setQuickViewId] = createSignal<string | null>(null);
  const [confirmDelete, setConfirmDelete] = createSignal<Coupon | null>(null);
  const [confirmToggle, setConfirmToggle] = createSignal<Coupon | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = createSignal(false);
  const [actionLoading, setActionLoading] = createSignal(false);
  const quickViewCoupon = createMemo(() => (quickViewId() ? store.getById(quickViewId()!) : undefined));

  const loadList = () => {
    setListStatus("loading");
    setTimeout(() => setListStatus(Math.random() < 0.08 ? "error" : "success"), 450);
  };
  onMount(loadList);

  const resetPage = () => setPage(1);
  const setSearch = (v: string) => { setSearchRaw(v); resetPage(); };
  const setStatusFilter = (v: "all" | MarketingStatus) => { setStatusFilterRaw(v); resetPage(); };
  const setSort = (v: string) => { setSortRaw(v); resetPage(); };
  const setPageSize = (v: number) => { setPageSizeRaw(v); resetPage(); };

  const hasActiveFilters = () => search().trim() !== "" || statusFilter() !== "all";
  const clearFilters = () => {
    setSearchRaw("");
    setStatusFilterRaw("all");
    resetPage();
  };

  const statusCounts = createMemo(() => {
    const tally: Partial<Record<"all" | MarketingStatus, number>> = { all: store.items().length };
    for (const c of store.items()) tally[c.status] = (tally[c.status] ?? 0) + 1;
    return tally;
  });

  const filtered = createMemo(() => {
    const status = statusFilter();
    const q = search().trim().toLowerCase();
    return store.items().filter((c) => {
      if (status !== "all" && c.status !== status) return false;
      if (q && !`${c.code} ${c.id}`.toLowerCase().includes(q)) return false;
      return true;
    });
  });

  const sorted = createMemo(() => {
    const list = [...filtered()];
    switch (sort()) {
      case "start-asc":
        return list.sort((a, b) => a.startDate.localeCompare(b.startDate));
      case "end-asc":
        return list.sort((a, b) => a.endDate.localeCompare(b.endDate));
      case "code-asc":
        return list.sort((a, b) => a.code.localeCompare(b.code));
      default:
        return list.sort((a, b) => b.startDate.localeCompare(a.startDate));
    }
  });

  const totalPages = createMemo(() => Math.max(1, Math.ceil(sorted().length / pageSize())));
  const currentPage = createMemo(() => Math.min(page(), totalPages()));
  const pageItems = createMemo(() => sorted().slice((currentPage() - 1) * pageSize(), currentPage() * pageSize()));

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

  const requestDelete = (c: Coupon) => setConfirmDelete(c);
  const confirmDeleteAction = async () => {
    const c = confirmDelete();
    if (!c) return;
    setActionLoading(true);
    await store.remove(c.id);
    setActionLoading(false);
    setConfirmDelete(null);
    pushToast(`ลบคูปอง "${c.code}" เรียบร้อยแล้ว`, "error");
  };

  const requestToggle = (c: Coupon) => setConfirmToggle(c);
  const confirmToggleAction = async () => {
    const c = confirmToggle();
    if (!c) return;
    const next: MarketingStatus = c.status === "disabled" ? "active" : "disabled";
    setActionLoading(true);
    await store.setStatus(c.id, next);
    setActionLoading(false);
    setConfirmToggle(null);
    pushToast(next === "disabled" ? "ปิดใช้งานคูปองแล้ว" : "เปิดใช้งานคูปองแล้ว", "success");
  };

  const handleDuplicate = async (c: Coupon) => {
    const copy = await store.duplicate(c.id);
    pushToast(`ทำสำเนาคูปอง "${c.code}" เรียบร้อยแล้ว`, "success");
    navigate(`/admin/marketing/coupons/${copy.id}/edit`);
  };

  const confirmBulkDeleteAction = async () => {
    const ids = [...selectedIds()];
    setActionLoading(true);
    await Promise.all(ids.map((id) => store.remove(id)));
    setActionLoading(false);
    setConfirmBulkDelete(false);
    clearSelection();
    pushToast(`ลบคูปอง ${ids.length} รายการเรียบร้อยแล้ว`, "error");
  };

  const bulkSetStatus = async (status: MarketingStatus) => {
    const ids = [...selectedIds()];
    await Promise.all(ids.map((id) => store.setStatus(id, status)));
    clearSelection();
    pushToast(status === "active" ? `เปิดใช้งาน ${ids.length} รายการแล้ว` : `ปิดใช้งาน ${ids.length} รายการแล้ว`, "success");
  };

  const columns: DataTableColumn<Coupon>[] = [
    {
      key: "select",
      label: "",
      renderHeader: () => (
        <input type="checkbox" aria-label="เลือกทั้งหมดในหน้านี้" checked={allOnPageSelected()} onChange={toggleSelectAllOnPage} class="size-4 rounded accent-brand-pink" />
      ),
      render: (row) => (
        <input
          type="checkbox"
          aria-label={`เลือก ${row.code}`}
          checked={selectedIds().has(row.id)}
          onClick={(e) => e.stopPropagation()}
          onChange={() => toggleSelect(row.id)}
          class="size-4 rounded accent-brand-pink"
        />
      ),
    },
    { key: "code", label: "Code", render: (row) => <p class="font-mono font-medium text-ink">{row.code}</p> },
    { key: "discount", label: "Discount", render: (row) => <span class="font-medium text-ink">{formatCouponDiscount(row)}</span> },
    {
      key: "usage",
      label: "Usage",
      hideBelowXl: true,
      render: (row) => <span class="text-ink-gray">{row.usageCount.toLocaleString("th-TH")}{row.usageLimit ? ` / ${row.usageLimit.toLocaleString("th-TH")}` : ""}</span>,
    },
    { key: "start", label: "Start", hideBelowXl: true, render: (row) => <span class="whitespace-nowrap text-ink-gray">{formatMarketingDate(row.startDate)}</span> },
    { key: "end", label: "End", hideBelowXl: true, render: (row) => <span class="whitespace-nowrap text-ink-gray">{formatMarketingDate(row.endDate)}</span> },
    { key: "status", label: "Status", render: (row) => <StatusBadge tone={MARKETING_STATUS_META[row.status].tone}>{MARKETING_STATUS_META[row.status].label}</StatusBadge> },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (row) => (
        <MarketingRowActionsMenu
          id={row.id}
          name={row.code}
          basePath="/admin/marketing/coupons"
          isDisabled={row.status === "disabled"}
          onDuplicate={() => handleDuplicate(row)}
          onToggleStatus={() => requestToggle(row)}
          onDelete={() => requestDelete(row)}
        />
      ),
    },
  ];

  return (
    <div class="flex flex-col gap-6" classList={{ "pb-20": selectedIds().size > 0 }}>
      <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "การตลาด", href: "/admin/marketing" }, { label: "คูปอง" }]} />
      <PageHeader
        title="คูปอง"
        description="จัดการคูปองส่วนลดของ Charmiss"
        actions={
          <div class="flex flex-wrap items-center gap-2">
            <Button href="/admin/marketing/coupons/new" variant="primary">
              <PlusIcon class="size-4" /> สร้างคูปอง
            </Button>
          </div>
        }
      />

      <MarketingStatusSummary value={statusFilter()} counts={statusCounts()} onChange={setStatusFilter} />

      <FilterBar
        search={{ value: search(), onInput: setSearch, placeholder: "ค้นหารหัสคูปอง, ID..." }}
        filters={[]}
        onFilterChange={() => {}}
        sort={{ value: sort(), options: SORT_OPTIONS, onChange: setSort }}
      />

      <Show when={listStatus() !== "loading"} fallback={<ListSkeleton />}>
        <Show
          when={listStatus() === "success"}
          fallback={
            <EmptyState tone="error" icon={<RefreshIcon />} title="ไม่สามารถโหลดรายการคูปองได้" description="เกิดข้อผิดพลาดชั่วคราว ลองโหลดข้อมูลอีกครั้ง" actionLabel="ลองอีกครั้ง" onAction={loadList} class="bg-surface-card shadow-card" />
          }
        >
          <Show
            when={sorted().length > 0}
            fallback={
              <EmptyState
                icon={<InventoryIcon />}
                title={hasActiveFilters() ? "ไม่พบคูปองที่ตรงกับการค้นหา" : "ยังไม่มีคูปอง"}
                description={hasActiveFilters() ? "ลองเปลี่ยนคำค้นหาหรือตัวกรอง" : "เริ่มสร้างคูปองแรกของคุณ"}
                actionLabel={hasActiveFilters() ? "ล้างตัวกรอง" : "+ สร้างคูปอง"}
                onAction={hasActiveFilters() ? clearFilters : () => navigate("/admin/marketing/coupons/new")}
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
                <div class="flex gap-3 rounded-card bg-surface-card p-4 shadow-card">
                  <input
                    type="checkbox"
                    aria-label={`เลือก ${row.code}`}
                    checked={selectedIds().has(row.id)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => toggleSelect(row.id)}
                    class="mt-1 size-4 shrink-0 rounded accent-brand-pink"
                  />
                  <button type="button" onClick={() => setQuickViewId(row.id)} class="font-normal flex min-w-0 flex-1 flex-col gap-2 text-left">
                    <div class="flex items-start justify-between gap-2">
                      <p class="truncate font-mono font-semibold text-ink">{row.code}</p>
                      <StatusBadge class="shrink-0" tone={MARKETING_STATUS_META[row.status].tone}>{MARKETING_STATUS_META[row.status].label}</StatusBadge>
                    </div>
                    <p class="truncate text-sm text-ink-gray">{formatCouponDiscount(row)}</p>
                    <p class="truncate text-xs text-ink-gray">{formatMarketingDate(row.startDate)} - {formatMarketingDate(row.endDate)}</p>
                    <span class="flex min-h-11 items-center justify-center rounded-pill border border-border text-sm font-medium text-ink">ดูรายละเอียด</span>
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
        actions={[
          { label: "เปิดใช้งาน", onClick: () => bulkSetStatus("active") },
          { label: "ปิดใช้งาน", onClick: () => bulkSetStatus("disabled") },
          { label: "ลบ", tone: "danger", onClick: () => setConfirmBulkDelete(true) },
        ]}
      />

      <QuickViewDrawer
        open={quickViewCoupon() !== undefined}
        onOpenChange={(open) => !open && setQuickViewId(null)}
        title={quickViewCoupon()?.code ?? ""}
        subtitle={quickViewCoupon()?.description}
        onViewFull={() => {
          const id = quickViewId();
          setQuickViewId(null);
          if (id) navigate(`/admin/marketing/coupons/${id}`);
        }}
      >
        <Show when={quickViewCoupon()}>{(c) => <CouponQuickView coupon={c()} />}</Show>
      </QuickViewDrawer>

      <ConfirmDialog
        open={confirmDelete() !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title="ลบคูปอง?"
        description={`คุณต้องการลบ "${confirmDelete()?.code ?? ""}" หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`}
        confirmLabel="ลบ"
        tone="danger"
        loading={actionLoading()}
        onConfirm={confirmDeleteAction}
      />

      <ConfirmDialog
        open={confirmToggle() !== null}
        onOpenChange={(open) => !open && setConfirmToggle(null)}
        title={confirmToggle()?.status === "disabled" ? "เปิดใช้งานคูปองนี้?" : "ปิดใช้งานคูปองนี้?"}
        description={confirmToggle()?.code ?? ""}
        confirmLabel={confirmToggle()?.status === "disabled" ? "เปิดใช้งาน" : "ปิดใช้งาน"}
        loading={actionLoading()}
        onConfirm={confirmToggleAction}
      />

      <ConfirmDialog
        open={confirmBulkDelete()}
        onOpenChange={setConfirmBulkDelete}
        title="ลบคูปองที่เลือก?"
        description={`คุณต้องการลบคูปอง ${selectedIds().size} รายการที่เลือกหรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`}
        confirmLabel="ลบ"
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
      {Array.from({ length: 5 }).map(() => (
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
