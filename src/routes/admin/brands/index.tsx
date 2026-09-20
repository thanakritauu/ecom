import { createMemo, createSignal, onMount, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { Button } from "~/components/shared/Button";
import { FilterBar, type SelectFilterConfig } from "~/components/admin/FilterBar";
import { Pagination } from "~/components/admin/Pagination";
import { DataTable, type DataTableColumn } from "~/components/admin/DataTable";
import { StatusBadge } from "~/components/admin/StatusBadge";
import { EmptyState } from "~/components/admin/EmptyState";
import { Skeleton } from "~/components/admin/Skeleton";
import { ConfirmDialog } from "~/components/admin/ConfirmDialog";
import { AdminBulkActionBar } from "~/components/admin/AdminBulkActionBar";
import { QuickViewDrawer } from "~/components/admin/QuickViewDrawer";
import { BrandRowActionsMenu } from "~/components/admin/brands/BrandRowActionsMenu";
import { BrandQuickView } from "~/components/admin/brands/BrandQuickView";
import { RefreshIcon, LayersIcon, PlusIcon, ImageIcon } from "~/components/admin/icons";
import { BRAND_STATUS_META, type AdminBrand, type BrandStatus } from "~/lib/adminBrands";
import { useAdminBrands } from "~/lib/adminBrandStore";
import { useAdminProducts } from "~/lib/adminProductStore";
import { productsInBrand } from "~/lib/masterDataRelations";
import { pushToast } from "~/lib/toast";
import type { AsyncStatus } from "~/lib/types";

const SORT_OPTIONS = [
  { value: "sort-asc", label: "ลำดับการแสดงผล" },
  { value: "updated-desc", label: "แก้ไขล่าสุด" },
  { value: "name-asc", label: "ชื่อ A→Z" },
  { value: "name-desc", label: "ชื่อ Z→A" },
];

const STATUS_FILTER_OPTIONS: SelectFilterConfig = {
  id: "status",
  label: "สถานะ",
  value: "all",
  options: [
    { value: "all", label: "สถานะทั้งหมด" },
    { value: "active", label: BRAND_STATUS_META.active.label },
    { value: "inactive", label: BRAND_STATUS_META.inactive.label },
  ],
};

/** List/Search/Filter/Sort/Pagination/Bulk/QuickView — same shell as `categories/index.tsx`. */
export default function AdminBrandsListPage() {
  const store = useAdminBrands();
  const productStore = useAdminProducts();
  const navigate = useNavigate();
  const brandProductCount = (brandId: string) => productsInBrand(brandId, productStore.products()).length;

  const [search, setSearchRaw] = createSignal("");
  const [statusFilter, setStatusFilterRaw] = createSignal<"all" | BrandStatus>("all");
  const [sort, setSortRaw] = createSignal("sort-asc");
  const [page, setPage] = createSignal(1);
  const [pageSize, setPageSizeRaw] = createSignal(10);
  const [listStatus, setListStatus] = createSignal<AsyncStatus>("loading");
  const [selectedIds, setSelectedIds] = createSignal<Set<string>>(new Set());
  const [quickViewId, setQuickViewId] = createSignal<string | null>(null);
  const [confirmDelete, setConfirmDelete] = createSignal<AdminBrand | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = createSignal(false);
  const [actionLoading, setActionLoading] = createSignal(false);
  const quickViewBrand = createMemo(() => (quickViewId() ? store.getById(quickViewId()!) : undefined));

  const loadList = () => {
    setListStatus("loading");
    setTimeout(() => setListStatus(Math.random() < 0.08 ? "error" : "success"), 400);
  };
  onMount(loadList);

  const resetPage = () => setPage(1);
  const setSearch = (v: string) => { setSearchRaw(v); resetPage(); };
  const setSort = (v: string) => { setSortRaw(v); resetPage(); };
  const setPageSize = (v: number) => { setPageSizeRaw(v); resetPage(); };

  const hasActiveFilters = () => search().trim() !== "" || statusFilter() !== "all";
  const clearFilters = () => {
    setSearchRaw("");
    setStatusFilterRaw("all");
    resetPage();
  };

  const handleFilterChange = (id: string, value: string) => {
    if (id === "status") {
      setStatusFilterRaw(value as "all" | BrandStatus);
      resetPage();
    }
  };

  const filtered = createMemo(() => {
    const status = statusFilter();
    const q = search().trim().toLowerCase();
    return store.brands().filter((b) => {
      if (status !== "all" && b.status !== status) return false;
      if (q && !`${b.name} ${b.slug} ${b.id}`.toLowerCase().includes(q)) return false;
      return true;
    });
  });

  const sorted = createMemo(() => {
    const list = [...filtered()];
    switch (sort()) {
      case "name-asc":
        return list.sort((a, b) => a.name.localeCompare(b.name));
      case "name-desc":
        return list.sort((a, b) => b.name.localeCompare(a.name));
      case "updated-desc":
        return list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      default:
        return list.sort((a, b) => a.sortOrder - b.sortOrder);
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

  const requestDelete = (b: AdminBrand) => setConfirmDelete(b);
  const confirmDeleteAction = async () => {
    const b = confirmDelete();
    if (!b) return;
    setActionLoading(true);
    await store.remove(b.id);
    setActionLoading(false);
    setConfirmDelete(null);
    pushToast(`ลบ "${b.name}" เรียบร้อยแล้ว`, "error");
  };

  const confirmBulkDeleteAction = async () => {
    const ids = [...selectedIds()];
    setActionLoading(true);
    await Promise.all(ids.map((id) => store.remove(id)));
    setActionLoading(false);
    setConfirmBulkDelete(false);
    clearSelection();
    pushToast(`ลบแบรนด์ ${ids.length} รายการเรียบร้อยแล้ว`, "error");
  };

  const columns: DataTableColumn<AdminBrand>[] = [
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
      label: "แบรนด์",
      render: (row) => (
        <div class="flex items-center gap-3">
          <div class="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-media bg-surface-gray/60 text-ink-placeholder">
            <Show when={row.logo} fallback={<ImageIcon class="size-4" />}>
              <img src={row.logo} alt="" class="size-full object-cover" />
            </Show>
          </div>
          <div class="min-w-0">
            <p class="truncate font-medium text-ink">{row.name}</p>
            <p class="truncate text-xs text-ink-gray">/{row.slug}</p>
          </div>
        </div>
      ),
    },
    { key: "products", label: "จำนวนสินค้า", align: "right", hideBelowXl: true, render: (row) => <span class="text-ink-gray">{brandProductCount(row.id)} สินค้า</span> },
    { key: "sortOrder", label: "ลำดับ", align: "right", hideBelowXl: true, render: (row) => <span class="text-ink-gray">{row.sortOrder}</span> },
    { key: "status", label: "Status", render: (row) => <StatusBadge tone={BRAND_STATUS_META[row.status].tone}>{BRAND_STATUS_META[row.status].label}</StatusBadge> },
    { key: "updated", label: "Updated", hideBelowXl: true, render: (row) => <span class="whitespace-nowrap text-ink-gray">{row.updatedAt}</span> },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (row) => <BrandRowActionsMenu id={row.id} name={row.name} onDelete={() => requestDelete(row)} />,
    },
  ];

  return (
    <div class="flex flex-col gap-6" classList={{ "pb-20": selectedIds().size > 0 }}>
      <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "แคตตาล็อก", href: "/admin/products" }, { label: "แบรนด์" }]} />
      <PageHeader
        title="แบรนด์สินค้า"
        description="จัดการแบรนด์สินค้าที่ใช้แสดงในหน้าร้านและตัวกรองสินค้า"
        actions={
          <Button href="/admin/brands/new" variant="primary">
            <PlusIcon class="size-4" /> สร้างแบรนด์
          </Button>
        }
      />

      <FilterBar
        search={{ value: search(), onInput: setSearch, placeholder: "ค้นหาชื่อแบรนด์, Slug, ID..." }}
        filters={[{ ...STATUS_FILTER_OPTIONS, value: statusFilter() }]}
        onFilterChange={handleFilterChange}
        sort={{ value: sort(), options: SORT_OPTIONS, onChange: setSort }}
      />

      <Show when={listStatus() !== "loading"} fallback={<ListSkeleton />}>
        <Show
          when={listStatus() === "success"}
          fallback={
            <EmptyState tone="error" icon={<RefreshIcon />} title="ไม่สามารถโหลดรายการแบรนด์ได้" description="เกิดข้อผิดพลาดชั่วคราว ลองโหลดข้อมูลอีกครั้ง" actionLabel="ลองอีกครั้ง" onAction={loadList} class="bg-white shadow-card" />
          }
        >
          <Show
            when={sorted().length > 0}
            fallback={
              <EmptyState
                icon={<LayersIcon />}
                title={hasActiveFilters() ? "ไม่พบแบรนด์ที่ตรงกับการค้นหา" : "ยังไม่มีแบรนด์"}
                description={hasActiveFilters() ? "ลองเปลี่ยนคำค้นหาหรือตัวกรอง" : "สร้างแบรนด์แรกของคุณเพื่อเริ่มต้น"}
                actionLabel={hasActiveFilters() ? "ล้างตัวกรอง" : "สร้างแบรนด์"}
                onAction={hasActiveFilters() ? clearFilters : () => navigate("/admin/brands/new")}
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
                    <div class="flex items-start gap-3">
                      <div class="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-media bg-surface-gray/60 text-ink-placeholder">
                        <Show when={row.logo} fallback={<ImageIcon class="size-4" />}>
                          <img src={row.logo} alt="" class="size-full object-cover" />
                        </Show>
                      </div>
                      <div class="min-w-0 flex-1">
                        <div class="flex items-start justify-between gap-2">
                          <p class="truncate font-semibold text-ink">{row.name}</p>
                          <StatusBadge tone={BRAND_STATUS_META[row.status].tone}>{BRAND_STATUS_META[row.status].label}</StatusBadge>
                        </div>
                        <p class="text-xs text-ink-gray">/{row.slug} · {brandProductCount(row.id)} สินค้า</p>
                      </div>
                    </div>
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
        actions={[{ label: "ลบ", tone: "danger", onClick: () => setConfirmBulkDelete(true) }]}
      />

      <QuickViewDrawer
        open={quickViewBrand() !== undefined}
        onOpenChange={(open) => !open && setQuickViewId(null)}
        title={quickViewBrand()?.name ?? ""}
        onViewFull={() => {
          const id = quickViewId();
          setQuickViewId(null);
          if (id) navigate(`/admin/brands/${id}`);
        }}
      >
        <Show when={quickViewBrand()}>{(b) => <BrandQuickView brand={b()} />}</Show>
      </QuickViewDrawer>

      <ConfirmDialog
        open={confirmDelete() !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title="ลบแบรนด์?"
        description={`คุณต้องการลบ "${confirmDelete()?.name ?? ""}" หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`}
        confirmLabel="ลบ"
        tone="danger"
        loading={actionLoading()}
        onConfirm={confirmDeleteAction}
      />

      <ConfirmDialog
        open={confirmBulkDelete()}
        onOpenChange={setConfirmBulkDelete}
        title="ลบแบรนด์ที่เลือก?"
        description={`คุณต้องการลบแบรนด์ ${selectedIds().size} รายการที่เลือกหรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`}
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
          <Skeleton class="size-11 shrink-0 rounded-media" />
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
