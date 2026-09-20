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
import { BundleQuickView } from "~/components/admin/marketing/BundleQuickView";
import { RefreshIcon, ReviewsIcon, PlusIcon } from "~/components/admin/icons";
import { formatAdminCurrency } from "~/lib/adminDashboard";
import { useAdminProducts } from "~/lib/adminProductStore";
import { MARKETING_STATUS_META, formatMarketingDate, type Bundle, type MarketingStatus } from "~/lib/adminMarketing";
import { useAdminMarketing } from "~/lib/adminMarketingStore";
import { pushToast } from "~/lib/toast";
import type { AsyncStatus } from "~/lib/types";

const SORT_OPTIONS = [
  { value: "start-desc", label: "วันที่เริ่ม ใหม่→เก่า" },
  { value: "start-asc", label: "วันที่เริ่ม เก่า→ใหม่" },
  { value: "end-asc", label: "วันสิ้นสุด ใกล้ที่สุด" },
  { value: "name-asc", label: "ชื่อ A→Z" },
];

export default function AdminBundleListPage() {
  const store = useAdminMarketing().bundles;
  const productStore = useAdminProducts();
  const navigate = useNavigate();

  const [search, setSearchRaw] = createSignal("");
  const [statusFilter, setStatusFilterRaw] = createSignal<"all" | MarketingStatus>("all");
  const [sort, setSortRaw] = createSignal("start-desc");
  const [page, setPage] = createSignal(1);
  const [pageSize, setPageSizeRaw] = createSignal(10);
  const [listStatus, setListStatus] = createSignal<AsyncStatus>("loading");
  const [selectedIds, setSelectedIds] = createSignal<Set<string>>(new Set());
  const [quickViewId, setQuickViewId] = createSignal<string | null>(null);
  const [confirmDelete, setConfirmDelete] = createSignal<Bundle | null>(null);
  const [confirmToggle, setConfirmToggle] = createSignal<Bundle | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = createSignal(false);
  const [actionLoading, setActionLoading] = createSignal(false);
  const quickViewBundle = createMemo(() => (quickViewId() ? store.getById(quickViewId()!) : undefined));

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

  const regularTotal = (b: Bundle) => b.items.reduce((sum, item) => sum + (productStore.getById(item.productId)?.price ?? 0) * item.qty, 0);
  const savings = (b: Bundle) => Math.max(0, regularTotal(b) - b.bundlePrice);

  const statusCounts = createMemo(() => {
    const tally: Partial<Record<"all" | MarketingStatus, number>> = { all: store.items().length };
    for (const b of store.items()) tally[b.status] = (tally[b.status] ?? 0) + 1;
    return tally;
  });

  const filtered = createMemo(() => {
    const status = statusFilter();
    const q = search().trim().toLowerCase();
    return store.items().filter((b) => {
      if (status !== "all" && b.status !== status) return false;
      if (q && !`${b.name} ${b.id}`.toLowerCase().includes(q)) return false;
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
      default:
        return list.sort((a, b) => b.startDate.localeCompare(a.startDate));
    }
  });

  const totalPages = createMemo(() => Math.max(1, Math.ceil(sorted().length / pageSize())));
  const currentPage = createMemo(() => Math.min(page(), totalPages()));
  const pageItems = createMemo(() => sorted().slice((currentPage() - 1) * pageSize(), currentPage() * pageSize()));

  const allOnPageSelected = createMemo(() => pageItems().length > 0 && pageItems().every((b) => selectedIds().has(b.id)));
  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const toggleSelectAllOnPage = () =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected()) pageItems().forEach((b) => next.delete(b.id));
      else pageItems().forEach((b) => next.add(b.id));
      return next;
    });
  const clearSelection = () => setSelectedIds(new Set<string>());

  const requestDelete = (b: Bundle) => setConfirmDelete(b);
  const confirmDeleteAction = async () => {
    const b = confirmDelete();
    if (!b) return;
    setActionLoading(true);
    await store.remove(b.id);
    setActionLoading(false);
    setConfirmDelete(null);
    pushToast(`ลบเซ็ต "${b.name}" เรียบร้อยแล้ว`, "error");
  };

  const requestToggle = (b: Bundle) => setConfirmToggle(b);
  const confirmToggleAction = async () => {
    const b = confirmToggle();
    if (!b) return;
    const next: MarketingStatus = b.status === "disabled" ? "active" : "disabled";
    setActionLoading(true);
    await store.setStatus(b.id, next);
    setActionLoading(false);
    setConfirmToggle(null);
    pushToast(next === "disabled" ? "ปิดใช้งานเซ็ตแล้ว" : "เปิดใช้งานเซ็ตแล้ว", "success");
  };

  const handleDuplicate = async (b: Bundle) => {
    const copy = await store.duplicate(b.id);
    pushToast(`ทำสำเนาเซ็ต "${b.name}" เรียบร้อยแล้ว`, "success");
    navigate(`/admin/marketing/bundles/${copy.id}/edit`);
  };

  const confirmBulkDeleteAction = async () => {
    const ids = [...selectedIds()];
    setActionLoading(true);
    await Promise.all(ids.map((id) => store.remove(id)));
    setActionLoading(false);
    setConfirmBulkDelete(false);
    clearSelection();
    pushToast(`ลบเซ็ตสินค้า ${ids.length} รายการเรียบร้อยแล้ว`, "error");
  };

  const bulkSetStatus = async (status: MarketingStatus) => {
    const ids = [...selectedIds()];
    await Promise.all(ids.map((id) => store.setStatus(id, status)));
    clearSelection();
    pushToast(status === "active" ? `เปิดใช้งาน ${ids.length} รายการแล้ว` : `ปิดใช้งาน ${ids.length} รายการแล้ว`, "success");
  };

  const columns: DataTableColumn<Bundle>[] = [
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
    { key: "name", label: "Bundle", render: (row) => <p class="font-medium text-ink">{row.name}</p> },
    { key: "products", label: "Products", hideBelowXl: true, render: (row) => <span class="text-ink-gray">{row.items.length} สินค้า</span> },
    { key: "regular", label: "Regular Total", align: "right", hideBelowXl: true, render: (row) => <span class="text-ink-gray line-through">{formatAdminCurrency(regularTotal(row))}</span> },
    { key: "price", label: "Bundle Price", align: "right", render: (row) => <span class="font-medium text-ink">{formatAdminCurrency(row.bundlePrice)}</span> },
    { key: "savings", label: "Savings", align: "right", hideBelowXl: true, render: (row) => <span class="font-medium text-success">{formatAdminCurrency(savings(row))}</span> },
    { key: "status", label: "Status", render: (row) => <StatusBadge tone={MARKETING_STATUS_META[row.status].tone}>{MARKETING_STATUS_META[row.status].label}</StatusBadge> },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (row) => (
        <MarketingRowActionsMenu
          id={row.id}
          name={row.name}
          basePath="/admin/marketing/bundles"
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
      <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "การตลาด", href: "/admin/marketing" }, { label: "บันเดิล / เซ็ต" }]} />
      <PageHeader
        title="บันเดิล / เซ็ต"
        description="จัดการเซ็ตสินค้าและราคาพิเศษของ Charmiss"
        actions={
          <Button href="/admin/marketing/bundles/new" variant="primary">
            <PlusIcon class="size-4" /> สร้างเซ็ตสินค้า
          </Button>
        }
      />

      <MarketingStatusSummary value={statusFilter()} counts={statusCounts()} onChange={setStatusFilter} />

      <FilterBar
        search={{ value: search(), onInput: setSearch, placeholder: "ค้นหาชื่อเซ็ต, ID..." }}
        filters={[]}
        onFilterChange={() => {}}
        sort={{ value: sort(), options: SORT_OPTIONS, onChange: setSort }}
      />

      <Show when={listStatus() !== "loading"} fallback={<ListSkeleton />}>
        <Show
          when={listStatus() === "success"}
          fallback={
            <EmptyState tone="error" icon={<RefreshIcon />} title="ไม่สามารถโหลดรายการเซ็ตสินค้าได้" description="เกิดข้อผิดพลาดชั่วคราว ลองโหลดข้อมูลอีกครั้ง" actionLabel="ลองอีกครั้ง" onAction={loadList} class="bg-white shadow-card" />
          }
        >
          <Show
            when={sorted().length > 0}
            fallback={
              <EmptyState
                icon={<ReviewsIcon />}
                title={hasActiveFilters() ? "ไม่พบเซ็ตสินค้าที่ตรงกับการค้นหา" : "ยังไม่มีเซ็ตสินค้า"}
                description={hasActiveFilters() ? "ลองเปลี่ยนคำค้นหาหรือตัวกรอง" : "เริ่มสร้างเซ็ตสินค้าแรกของคุณ"}
                actionLabel={hasActiveFilters() ? "ล้างตัวกรอง" : "+ สร้างเซ็ตสินค้า"}
                onAction={hasActiveFilters() ? clearFilters : () => navigate("/admin/marketing/bundles/new")}
                class="bg-white shadow-card"
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
                <div class="flex gap-3 rounded-card bg-white p-4 shadow-card">
                  <input
                    type="checkbox"
                    aria-label={`เลือก ${row.name}`}
                    checked={selectedIds().has(row.id)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => toggleSelect(row.id)}
                    class="mt-1 size-4 shrink-0 rounded accent-brand-pink"
                  />
                  <button type="button" onClick={() => setQuickViewId(row.id)} class="flex flex-1 flex-col gap-2 text-left">
                    <div class="flex items-start justify-between gap-2">
                      <p class="font-semibold text-ink">{row.name}</p>
                      <StatusBadge tone={MARKETING_STATUS_META[row.status].tone}>{MARKETING_STATUS_META[row.status].label}</StatusBadge>
                    </div>
                    <p class="text-sm text-ink-gray">{row.items.length} สินค้า · ประหยัด {formatAdminCurrency(savings(row))}</p>
                    <p class="text-sm font-semibold text-ink">
                      <span class="text-ink-placeholder line-through">{formatAdminCurrency(regularTotal(row))}</span> {formatAdminCurrency(row.bundlePrice)}
                    </p>
                    <span class="flex min-h-11 items-center justify-center rounded-pill border border-surface-gray text-sm font-medium text-ink">ดูรายละเอียด</span>
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
        open={quickViewBundle() !== undefined}
        onOpenChange={(open) => !open && setQuickViewId(null)}
        title={quickViewBundle()?.name ?? ""}
        subtitle={quickViewBundle() ? `${quickViewBundle()!.items.length} สินค้า` : undefined}
        onViewFull={() => {
          const id = quickViewId();
          setQuickViewId(null);
          if (id) navigate(`/admin/marketing/bundles/${id}`);
        }}
      >
        <Show when={quickViewBundle()}>{(b) => <BundleQuickView bundle={b()} />}</Show>
      </QuickViewDrawer>

      <ConfirmDialog
        open={confirmDelete() !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title="ลบเซ็ตสินค้า?"
        description={`คุณต้องการลบ "${confirmDelete()?.name ?? ""}" หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`}
        confirmLabel="ลบ"
        tone="danger"
        loading={actionLoading()}
        onConfirm={confirmDeleteAction}
      />

      <ConfirmDialog
        open={confirmToggle() !== null}
        onOpenChange={(open) => !open && setConfirmToggle(null)}
        title={confirmToggle()?.status === "disabled" ? "เปิดใช้งานเซ็ตนี้?" : "ปิดใช้งานเซ็ตนี้?"}
        description={confirmToggle()?.name ?? ""}
        confirmLabel={confirmToggle()?.status === "disabled" ? "เปิดใช้งาน" : "ปิดใช้งาน"}
        loading={actionLoading()}
        onConfirm={confirmToggleAction}
      />

      <ConfirmDialog
        open={confirmBulkDelete()}
        onOpenChange={setConfirmBulkDelete}
        title="ลบเซ็ตสินค้าที่เลือก?"
        description={`คุณต้องการลบเซ็ตสินค้า ${selectedIds().size} รายการที่เลือกหรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`}
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
        <div class="flex items-center gap-3 rounded-card bg-white p-3 shadow-card">
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
