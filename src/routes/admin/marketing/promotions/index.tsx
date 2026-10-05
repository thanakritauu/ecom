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
import { DateRangeSelector } from "~/components/admin/dashboard/DateRangeSelector";
import { MarketingStatusSummary } from "~/components/admin/marketing/MarketingStatusSummary";
import { MarketingRowActionsMenu } from "~/components/admin/marketing/MarketingRowActionsMenu";
import { PromotionQuickView } from "~/components/admin/marketing/PromotionQuickView";
import { RefreshIcon, MarketingIcon, PlusIcon } from "~/components/admin/icons";
import {
  MARKETING_STATUS_META,
  PROMOTION_TYPE_META,
  formatMarketingDate,
  formatPromotionDiscount,
  type Promotion,
  type PromotionType,
  type MarketingStatus,
} from "~/lib/adminMarketing";
import { useAdminMarketing } from "~/lib/adminMarketingStore";
import { useAdminProducts } from "~/lib/adminProductStore";
import { pushToast } from "~/lib/toast";
import type { AsyncStatus } from "~/lib/types";
import type { DashboardPeriodKey } from "~/lib/adminDashboard";

const SORT_OPTIONS = [
  { value: "start-desc", label: "วันที่เริ่ม ใหม่→เก่า" },
  { value: "start-asc", label: "วันที่เริ่ม เก่า→ใหม่" },
  { value: "end-asc", label: "วันสิ้นสุด ใกล้ที่สุด" },
  { value: "name-asc", label: "ชื่อ A→Z" },
  { value: "name-desc", label: "ชื่อ Z→A" },
];

const TODAY_DAY = 17;
function dayOf(date: string): number {
  return Number(date.match(/-(\d+)$/)?.[1] ?? TODAY_DAY);
}
function withinPeriod(date: string, period: DashboardPeriodKey): boolean {
  if (period === "today") return dayOf(date) === TODAY_DAY;
  if (period === "7d") return Math.abs(TODAY_DAY - dayOf(date)) <= 7;
  return true;
}

export default function AdminPromotionListPage() {
  const store = useAdminMarketing().promotions;
  const navigate = useNavigate();
  const productStore = useAdminProducts();
  const summary = (p: Promotion) => formatPromotionDiscount(p, p.giftProductId ? productStore.getById(p.giftProductId)?.name : undefined);

  const [search, setSearchRaw] = createSignal("");
  const [statusFilter, setStatusFilterRaw] = createSignal<"all" | MarketingStatus>("all");
  const [typeFilter, setTypeFilterRaw] = createSignal<"all" | PromotionType>("all");
  const [dateFilter, setDateFilter] = createSignal<DashboardPeriodKey>("30d");
  const [sort, setSortRaw] = createSignal("start-desc");
  const [page, setPage] = createSignal(1);
  const [pageSize, setPageSizeRaw] = createSignal(10);
  const [listStatus, setListStatus] = createSignal<AsyncStatus>("loading");
  const [selectedIds, setSelectedIds] = createSignal<Set<string>>(new Set());
  const [quickViewId, setQuickViewId] = createSignal<string | null>(null);
  const [confirmDelete, setConfirmDelete] = createSignal<Promotion | null>(null);
  const [confirmToggle, setConfirmToggle] = createSignal<Promotion | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = createSignal(false);
  const [actionLoading, setActionLoading] = createSignal(false);
  const quickViewPromotion = createMemo(() => (quickViewId() ? store.getById(quickViewId()!) : undefined));

  const loadList = () => {
    setListStatus("loading");
    setTimeout(() => setListStatus(Math.random() < 0.08 ? "error" : "success"), 450);
  };
  onMount(loadList);

  const resetPage = () => setPage(1);
  const setSearch = (v: string) => { setSearchRaw(v); resetPage(); };
  const setStatusFilter = (v: "all" | MarketingStatus) => { setStatusFilterRaw(v); resetPage(); };
  const setTypeFilter = (v: string) => { setTypeFilterRaw(v as "all" | PromotionType); resetPage(); };
  const setDateFilterAndReset = (v: DashboardPeriodKey) => { setDateFilter(v); resetPage(); };
  const setSort = (v: string) => { setSortRaw(v); resetPage(); };
  const setPageSize = (v: number) => { setPageSizeRaw(v); resetPage(); };

  const hasActiveFilters = () => search().trim() !== "" || statusFilter() !== "all" || typeFilter() !== "all";
  const clearFilters = () => {
    setSearchRaw("");
    setStatusFilterRaw("all");
    setTypeFilterRaw("all");
    resetPage();
  };

  const statusCounts = createMemo(() => {
    const tally: Partial<Record<"all" | MarketingStatus, number>> = { all: store.items().length };
    for (const p of store.items()) tally[p.status] = (tally[p.status] ?? 0) + 1;
    return tally;
  });

  const filtered = createMemo(() => {
    const status = statusFilter();
    const type = typeFilter();
    const period = dateFilter();
    const q = search().trim().toLowerCase();
    return store.items().filter((p) => {
      if (status !== "all" && p.status !== status) return false;
      if (type !== "all" && p.type !== type) return false;
      if (!withinPeriod(p.startDate, period)) return false;
      if (q && !`${p.name} ${p.id}`.toLowerCase().includes(q)) return false;
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
      case "name-asc":
        return list.sort((a, b) => a.name.localeCompare(b.name));
      case "name-desc":
        return list.sort((a, b) => b.name.localeCompare(a.name));
      default:
        return list.sort((a, b) => b.startDate.localeCompare(a.startDate));
    }
  });

  const totalPages = createMemo(() => Math.max(1, Math.ceil(sorted().length / pageSize())));
  const currentPage = createMemo(() => Math.min(page(), totalPages()));
  const pageItems = createMemo(() => sorted().slice((currentPage() - 1) * pageSize(), currentPage() * pageSize()));

  const allOnPageSelected = createMemo(() => pageItems().length > 0 && pageItems().every((p) => selectedIds().has(p.id)));
  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const toggleSelectAllOnPage = () =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected()) pageItems().forEach((p) => next.delete(p.id));
      else pageItems().forEach((p) => next.add(p.id));
      return next;
    });
  const clearSelection = () => setSelectedIds(new Set<string>());

  const requestDelete = (p: Promotion) => setConfirmDelete(p);
  const confirmDeleteAction = async () => {
    const p = confirmDelete();
    if (!p) return;
    setActionLoading(true);
    await store.remove(p.id);
    setActionLoading(false);
    setConfirmDelete(null);
    pushToast(`ลบ "${p.name}" เรียบร้อยแล้ว`, "error");
  };

  const requestToggle = (p: Promotion) => setConfirmToggle(p);
  const confirmToggleAction = async () => {
    const p = confirmToggle();
    if (!p) return;
    const next: MarketingStatus = p.status === "disabled" ? "active" : "disabled";
    setActionLoading(true);
    await store.setStatus(p.id, next);
    setActionLoading(false);
    setConfirmToggle(null);
    pushToast(next === "disabled" ? "ปิดใช้งานโปรโมชั่นแล้ว" : "เปิดใช้งานโปรโมชั่นแล้ว", "success");
  };

  const handleDuplicate = async (p: Promotion) => {
    const copy = await store.duplicate(p.id);
    pushToast(`ทำสำเนา "${p.name}" เรียบร้อยแล้ว`, "success");
    navigate(`/admin/marketing/promotions/${copy.id}/edit`);
  };

  const confirmBulkDeleteAction = async () => {
    const ids = [...selectedIds()];
    setActionLoading(true);
    await Promise.all(ids.map((id) => store.remove(id)));
    setActionLoading(false);
    setConfirmBulkDelete(false);
    clearSelection();
    pushToast(`ลบโปรโมชั่น ${ids.length} รายการเรียบร้อยแล้ว`, "error");
  };

  const bulkSetStatus = async (status: MarketingStatus) => {
    const ids = [...selectedIds()];
    await Promise.all(ids.map((id) => store.setStatus(id, status)));
    clearSelection();
    pushToast(status === "active" ? `เปิดใช้งาน ${ids.length} รายการแล้ว` : `ปิดใช้งาน ${ids.length} รายการแล้ว`, "success");
  };

  const scopeLabel = (p: Promotion) => (p.productIds.length === 0 ? "ทุกสินค้า" : `${p.productIds.length} สินค้า`);

  const columns: DataTableColumn<Promotion>[] = [
    {
      key: "select",
      label: "",
      renderHeader: () => (
        <input type="checkbox" aria-label="เลือกทั้งหมดในหน้านี้" checked={allOnPageSelected()} onChange={toggleSelectAllOnPage} class="size-4 rounded accent-brand-pink" />
      ),
      render: (row) => (
        <input
          type="checkbox"
          aria-label={`เลือก ${row.name}`}
          checked={selectedIds().has(row.id)}
          onClick={(e) => e.stopPropagation()}
          onChange={() => toggleSelect(row.id)}
          class="size-4 rounded accent-brand-pink"
        />
      ),
    },
    {
      key: "name",
      label: "Promotion",
      render: (row) => (
        <div class="flex flex-col gap-1">
          <p class="font-medium text-ink">{row.name}</p>
          <Show when={row.showInCart}>
            <StatusBadge tone="info" class="w-fit">แสดงในตะกร้า</StatusBadge>
          </Show>
        </div>
      ),
    },
    { key: "type", label: "Type", hideBelowXl: true, render: (row) => <span class="text-ink-gray">{PROMOTION_TYPE_META[row.type].label}</span> },
    { key: "scope", label: "Products", hideBelowXl: true, render: (row) => <span class="text-ink-gray">{scopeLabel(row)}</span> },
    { key: "discount", label: "Discount", render: (row) => <span class="line-clamp-2 max-w-72 font-medium text-ink">{summary(row)}</span> },
    { key: "start", label: "Start", hideBelowXl: true, render: (row) => <span class="whitespace-nowrap text-ink-gray">{formatMarketingDate(row.startDate)}</span> },
    { key: "end", label: "End", hideBelowXl: true, render: (row) => <span class="whitespace-nowrap text-ink-gray">{formatMarketingDate(row.endDate)}</span> },
    { key: "status", label: "Status", render: (row) => <StatusBadge tone={MARKETING_STATUS_META[row.status].tone}>{MARKETING_STATUS_META[row.status].label}</StatusBadge> },
    { key: "usage", label: "Usage", align: "right", hideBelowXl: true, render: (row) => <span class="text-ink-gray">{row.usageCount.toLocaleString("th-TH")}</span> },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (row) => (
        <MarketingRowActionsMenu
          id={row.id}
          name={row.name}
          basePath="/admin/marketing/promotions"
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
      <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "การตลาด", href: "/admin/marketing" }, { label: "โปรโมชั่น" }]} />
      <PageHeader
        title="โปรโมชั่น"
        description="จัดการส่วนลดและโปรโมชั่นของ Charmiss"
        actions={
          <div class="flex flex-wrap items-center gap-2">
            <Button href="/admin/marketing/promotions/new" variant="primary">
              <PlusIcon class="size-4" /> สร้างโปรโมชั่น
            </Button>
          </div>
        }
      />

      <MarketingStatusSummary value={statusFilter()} counts={statusCounts()} onChange={setStatusFilter} />

      <div class="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div class="flex-1">
          <FilterBar
            search={{ value: search(), onInput: setSearch, placeholder: "ค้นหาชื่อโปรโมชั่น, ID..." }}
            filters={[
              {
                id: "type",
                label: "ประเภท",
                value: typeFilter(),
                options: [{ value: "all", label: "ทุกประเภท" }, ...Object.entries(PROMOTION_TYPE_META).map(([value, meta]) => ({ value, label: meta.label }))],
              },
            ]}
            onFilterChange={(id, value) => { if (id === "type") setTypeFilter(value); }}
            sort={{ value: sort(), options: SORT_OPTIONS, onChange: setSort }}
          />
        </div>
        <DateRangeSelector value={dateFilter()} onChange={setDateFilterAndReset} />
      </div>

      <Show when={listStatus() !== "loading"} fallback={<ListSkeleton />}>
        <Show
          when={listStatus() === "success"}
          fallback={
            <EmptyState tone="error" icon={<RefreshIcon />} title="ไม่สามารถโหลดรายการโปรโมชั่นได้" description="เกิดข้อผิดพลาดชั่วคราว ลองโหลดข้อมูลอีกครั้ง" actionLabel="ลองอีกครั้ง" onAction={loadList} class="bg-surface-card shadow-card" />
          }
        >
          <Show
            when={sorted().length > 0}
            fallback={
              <EmptyState
                icon={<MarketingIcon />}
                title={hasActiveFilters() ? "ไม่พบโปรโมชั่นที่ตรงกับการค้นหา" : "ยังไม่มีโปรโมชั่น"}
                description={hasActiveFilters() ? "ลองเปลี่ยนคำค้นหาหรือตัวกรอง" : "เริ่มสร้างโปรโมชั่นแรกของคุณ"}
                actionLabel={hasActiveFilters() ? "ล้างตัวกรอง" : "+ สร้างโปรโมชั่น"}
                onAction={hasActiveFilters() ? clearFilters : () => navigate("/admin/marketing/promotions/new")}
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
                    aria-label={`เลือก ${row.name}`}
                    checked={selectedIds().has(row.id)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => toggleSelect(row.id)}
                    class="mt-1 size-4 shrink-0 rounded accent-brand-pink"
                  />
                  <button type="button" onClick={() => setQuickViewId(row.id)} class="font-normal flex min-w-0 flex-1 flex-col gap-2 text-left">
                    <div class="flex items-start justify-between gap-2">
                      <p class="truncate font-semibold text-ink">{row.name}</p>
                      <StatusBadge class="shrink-0" tone={MARKETING_STATUS_META[row.status].tone}>{MARKETING_STATUS_META[row.status].label}</StatusBadge>
                    </div>
                    <p class="truncate text-sm text-ink-gray">{PROMOTION_TYPE_META[row.type].label} · {summary(row)}</p>
                    <Show when={row.showInCart}>
                      <StatusBadge tone="info" class="w-fit">แสดงในตะกร้า</StatusBadge>
                    </Show>
                    <p class="truncate text-xs text-ink-gray">{scopeLabel(row)} · {formatMarketingDate(row.startDate)} - {formatMarketingDate(row.endDate)}</p>
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
        open={quickViewPromotion() !== undefined}
        onOpenChange={(open) => !open && setQuickViewId(null)}
        title={quickViewPromotion()?.name ?? ""}
        subtitle={quickViewPromotion() ? PROMOTION_TYPE_META[quickViewPromotion()!.type].label : undefined}
        onViewFull={() => {
          const id = quickViewId();
          setQuickViewId(null);
          if (id) navigate(`/admin/marketing/promotions/${id}`);
        }}
      >
        <Show when={quickViewPromotion()}>{(p) => <PromotionQuickView promotion={p()} />}</Show>
      </QuickViewDrawer>

      <ConfirmDialog
        open={confirmDelete() !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title="ลบโปรโมชั่น?"
        description={`คุณต้องการลบ "${confirmDelete()?.name ?? ""}" หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`}
        confirmLabel="ลบ"
        tone="danger"
        loading={actionLoading()}
        onConfirm={confirmDeleteAction}
      />

      <ConfirmDialog
        open={confirmToggle() !== null}
        onOpenChange={(open) => !open && setConfirmToggle(null)}
        title={confirmToggle()?.status === "disabled" ? "เปิดใช้งานโปรโมชั่นนี้?" : "ปิดใช้งานโปรโมชั่นนี้?"}
        description={`"${confirmToggle()?.name ?? ""}"`}
        confirmLabel={confirmToggle()?.status === "disabled" ? "เปิดใช้งาน" : "ปิดใช้งาน"}
        loading={actionLoading()}
        onConfirm={confirmToggleAction}
      />

      <ConfirmDialog
        open={confirmBulkDelete()}
        onOpenChange={setConfirmBulkDelete}
        title="ลบโปรโมชั่นที่เลือก?"
        description={`คุณต้องการลบโปรโมชั่น ${selectedIds().size} รายการที่เลือกหรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`}
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
