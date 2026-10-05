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
import { AdminBulkActionBar } from "~/components/admin/AdminBulkActionBar";
import { QuickViewDrawer } from "~/components/admin/QuickViewDrawer";
import { InventoryQuickView } from "~/components/admin/inventory/InventoryQuickView";
import { RefreshIcon, InventoryIcon, EyeIcon, ImageIcon, CheckCircleIcon } from "~/components/admin/icons";
import { STOCK_STATUS_META, getAvailableStock, inventoryStatusLabel, type AdminInventoryStock, type StockStatus } from "~/lib/adminInventoryStock";
import { useAdminInventoryStock } from "~/lib/adminInventoryStockStore";
import { useAdminProducts, type AdminProduct } from "~/lib/adminProductStore";
import { pushToast } from "~/lib/toast";
import type { AsyncStatus } from "~/lib/types";

const SORT_OPTIONS = [
  { value: "name-asc", label: "ชื่อ A→Z" },
  { value: "name-desc", label: "ชื่อ Z→A" },
  { value: "available-asc", label: "Available น้อย→มาก" },
  { value: "available-desc", label: "Available มาก→น้อย" },
  { value: "synced-desc", label: "Sync ล่าสุด" },
];

const STATUS_FILTER_OPTIONS: SelectFilterConfig = {
  id: "status",
  label: "สถานะ",
  value: "all",
  options: [
    { value: "all", label: "สถานะทั้งหมด" },
    { value: "in_stock", label: STOCK_STATUS_META.in_stock.label },
    { value: "low_stock", label: STOCK_STATUS_META.low_stock.label },
    { value: "out_of_stock", label: STOCK_STATUS_META.out_of_stock.label },
  ],
};

/**
 * Inventory (Phase 06) — "สินค้าคงคลัง" (B). Same read-only list shell as
 * every other Integration module (Loyalty's Coin Rules/Members/Missions):
 * no Add, no per-row edit/delete/adjust — only a mock re-Sync.
 */
export default function AdminInventoryItemsListPage() {
  const store = useAdminInventoryStock();
  const productStore = useAdminProducts();
  const navigate = useNavigate();

  const [search, setSearchRaw] = createSignal("");
  const [statusFilter, setStatusFilterRaw] = createSignal<"all" | StockStatus>("all");
  const [sort, setSortRaw] = createSignal("name-asc");
  const [page, setPage] = createSignal(1);
  const [pageSize, setPageSizeRaw] = createSignal(10);
  const [listStatus, setListStatus] = createSignal<AsyncStatus>("loading");
  const [selectedIds, setSelectedIds] = createSignal<Set<string>>(new Set());
  const [quickViewId, setQuickViewId] = createSignal<string | null>(null);
  const [syncingAll, setSyncingAll] = createSignal(false);
  const [syncingSelected, setSyncingSelected] = createSignal(false);
  const quickViewStock = createMemo(() => (quickViewId() ? store.getById(quickViewId()!) : undefined));

  const loadList = () => {
    setListStatus("loading");
    setTimeout(() => setListStatus(Math.random() < 0.08 ? "error" : "success"), 400);
  };
  onMount(loadList);

  const productOf = (s: AdminInventoryStock): AdminProduct | undefined => productStore.getById(s.productId);
  const nameOf = (s: AdminInventoryStock) => productOf(s)?.name ?? "(ไม่พบสินค้า)";
  const skuOf = (s: AdminInventoryStock) => productOf(s)?.sku ?? "-";

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
      setStatusFilterRaw(value as "all" | StockStatus);
      resetPage();
    }
  };

  const filtered = createMemo(() => {
    const status = statusFilter();
    const q = search().trim().toLowerCase();
    return store.stocks().filter((s) => {
      if (status !== "all" && s.status !== status) return false;
      if (q && !`${nameOf(s)} ${skuOf(s)} ${s.id}`.toLowerCase().includes(q)) return false;
      return true;
    });
  });

  const sorted = createMemo(() => {
    const list = [...filtered()];
    switch (sort()) {
      case "name-asc":
        return list.sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
      case "name-desc":
        return list.sort((a, b) => nameOf(b).localeCompare(nameOf(a)));
      case "available-asc":
        return list.sort((a, b) => getAvailableStock(a) - getAvailableStock(b));
      case "available-desc":
        return list.sort((a, b) => getAvailableStock(b) - getAvailableStock(a));
      case "synced-desc":
        return list.sort((a, b) => b.syncedAt.localeCompare(a.syncedAt));
      default:
        return list.sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
    }
  });

  const totalPages = createMemo(() => Math.max(1, Math.ceil(sorted().length / pageSize())));
  const currentPage = createMemo(() => Math.min(page(), totalPages()));
  const pageItems = createMemo(() => sorted().slice((currentPage() - 1) * pageSize(), currentPage() * pageSize()));

  const allOnPageSelected = createMemo(() => pageItems().length > 0 && pageItems().every((s) => selectedIds().has(s.id)));
  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const toggleSelectAllOnPage = () =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected()) pageItems().forEach((s) => next.delete(s.id));
      else pageItems().forEach((s) => next.add(s.id));
      return next;
    });
  const clearSelection = () => setSelectedIds(new Set<string>());

  const viewDetail = (row: AdminInventoryStock) => navigate(`/admin/inventory/items/${row.id}`);

  const handleSyncAll = async () => {
    setSyncingAll(true);
    await store.syncAll();
    setSyncingAll(false);
    pushToast("Sync ข้อมูลจากระบบคลังสินค้าเรียบร้อยแล้ว", "success");
  };

  const handleSyncSelected = async () => {
    const ids = [...selectedIds()];
    setSyncingSelected(true);
    await store.syncSelected(ids);
    setSyncingSelected(false);
    clearSelection();
    pushToast(`Sync ${ids.length} รายการที่เลือกเรียบร้อยแล้ว`, "success");
  };

  const columns: DataTableColumn<AdminInventoryStock>[] = [
    {
      key: "select",
      label: "",
      renderHeader: () => (
        <input type="checkbox" aria-label="เลือกทั้งหมดในหน้านี้" checked={allOnPageSelected()} onChange={toggleSelectAllOnPage} class="size-4 rounded accent-brand-pink" />
      ),
      render: (row) => (
        <input
          type="checkbox"
          aria-label={`เลือก ${nameOf(row)}`}
          checked={selectedIds().has(row.id)}
          onClick={(e) => e.stopPropagation()}
          onChange={() => toggleSelect(row.id)}
          class="size-4 rounded accent-brand-pink"
        />
      ),
    },
    {
      key: "product",
      label: "Product",
      render: (row) => {
        const p = productOf(row);
        return (
          <div class="flex items-center gap-3">
            <div class="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-media bg-surface-gray/60 text-ink-placeholder">
              <Show when={p?.image} fallback={<ImageIcon class="size-4" />}>
                <img src={p!.image} alt="" class="size-full object-cover" />
              </Show>
            </div>
            <div class="min-w-0">
              <p class="truncate font-medium text-ink">{nameOf(row)}</p>
              <p class="truncate text-xs text-ink-gray">{skuOf(row)}</p>
            </div>
          </div>
        );
      },
    },
    { key: "variant", label: "Variant", hideBelowXl: true, render: (row) => <span class="text-ink-gray">{row.variantLabel ?? "-"}</span> },
    { key: "onHand", label: "On Hand", align: "right", render: (row) => <span class="text-ink-gray">{row.onHand.toLocaleString("th-TH")}</span> },
    { key: "reserved", label: "Reserved", align: "right", hideBelowXl: true, render: (row) => <span class="text-ink-gray">{row.reserved.toLocaleString("th-TH")}</span> },
    { key: "available", label: "Available", align: "right", render: (row) => <span class="font-medium text-ink">{getAvailableStock(row).toLocaleString("th-TH")}</span> },
    { key: "status", label: "สถานะ", render: (row) => <StatusBadge tone={STOCK_STATUS_META[row.status].tone}>{inventoryStatusLabel(row)}</StatusBadge> },
    { key: "warehouse", label: "Warehouse", hideBelowXl: true, render: (row) => <span class="whitespace-nowrap text-ink-gray">{row.warehouse}</span> },
    { key: "syncedAt", label: "Last Sync", align: "right", hideBelowXl: true, render: (row) => <span class="whitespace-nowrap text-ink-gray">{row.syncedAt}</span> },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (row) => (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); viewDetail(row); }}
          aria-label={`ดูรายละเอียด ${nameOf(row)}`}
          class="flex size-9 shrink-0 items-center justify-center rounded-pill text-ink-gray transition-colors duration-150 hover:bg-surface-pink"
        >
          <EyeIcon class="size-4" />
        </button>
      ),
    },
  ];

  return (
    <div class="flex flex-col gap-6" classList={{ "pb-20": selectedIds().size > 0 }}>
      <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "คลังสินค้า", href: "/admin/inventory" }, { label: "สินค้าคงคลัง" }]} />
      <PageHeader title="สินค้าคงคลัง" description="สต็อกสินค้าที่ Sync มาจากระบบคลังสินค้า" />

      <div class="flex flex-col gap-4 rounded-card bg-surface-card p-4 shadow-card sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div class="flex flex-col gap-2">
          <div class="flex items-center gap-2">
            <CheckCircleIcon class="size-5 text-success" />
            <p class="text-sm font-semibold text-ink">เชื่อมต่อกับระบบคลังสินค้าแล้ว</p>
          </div>
          <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-gray">
            <span>Last Sync: {store.lastSyncedAt()}</span>
            <span>จำนวนข้อมูลที่ Sync: {store.stocks().length.toLocaleString("th-TH")} SKU</span>
          </div>
        </div>
        <Button variant="primary" onClick={handleSyncAll} loading={syncingAll()}>
          <RefreshIcon class="size-4" /> Sync ข้อมูล
        </Button>
      </div>

      <FilterBar
        search={{ value: search(), onInput: setSearch, placeholder: "ค้นหาชื่อสินค้า, SKU..." }}
        filters={[{ ...STATUS_FILTER_OPTIONS, value: statusFilter() }]}
        onFilterChange={handleFilterChange}
        sort={{ value: sort(), options: SORT_OPTIONS, onChange: setSort }}
      />

      <Show when={listStatus() !== "loading"} fallback={<ListSkeleton />}>
        <Show
          when={listStatus() === "success"}
          fallback={
            <EmptyState tone="error" icon={<RefreshIcon />} title="ไม่สามารถโหลดรายการได้" description="เกิดข้อผิดพลาดชั่วคราว ลองโหลดข้อมูลอีกครั้ง" actionLabel="ลองอีกครั้ง" onAction={loadList} class="bg-surface-card shadow-card" />
          }
        >
          <Show
            when={sorted().length > 0}
            fallback={
              <EmptyState
                icon={<InventoryIcon />}
                title={hasActiveFilters() ? "ไม่พบสินค้าที่ตรงกับการค้นหา" : "ยังไม่มีข้อมูลจากระบบคลังสินค้า"}
                description={hasActiveFilters() ? "ลองเปลี่ยนคำค้นหาหรือตัวกรอง" : "ลอง Sync ข้อมูลจากระบบคลังสินค้าอีกครั้ง"}
                actionLabel={hasActiveFilters() ? "ล้างตัวกรอง" : "Sync ข้อมูล"}
                onAction={hasActiveFilters() ? clearFilters : handleSyncAll}
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
              renderMobileCard={(row) => {
                const p = productOf(row);
                return (
                  <div class="flex gap-3 rounded-card bg-surface-card p-4 shadow-card">
                    <input
                      type="checkbox"
                      aria-label={`เลือก ${nameOf(row)}`}
                      checked={selectedIds().has(row.id)}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => toggleSelect(row.id)}
                      class="mt-1 size-4 shrink-0 rounded accent-brand-pink"
                    />
                    <button type="button" onClick={() => setQuickViewId(row.id)} class="font-normal flex min-w-0 flex-1 flex-col gap-2 text-left">
                      <div class="flex items-start gap-3">
                        <div class="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-media bg-surface-gray/60 text-ink-placeholder">
                          <Show when={p?.image} fallback={<ImageIcon class="size-4" />}>
                            <img src={p!.image} alt="" class="size-full object-cover" />
                          </Show>
                        </div>
                        <div class="min-w-0 flex-1">
                          <div class="flex items-start justify-between gap-2">
                            <p class="truncate font-semibold text-ink">{nameOf(row)}</p>
                            <StatusBadge tone={STOCK_STATUS_META[row.status].tone}>{inventoryStatusLabel(row)}</StatusBadge>
                          </div>
                          <p class="truncate text-xs text-ink-gray">{skuOf(row)} · {row.warehouse}</p>
                          <p class="mt-1 text-xs text-ink-gray">Available {getAvailableStock(row).toLocaleString("th-TH")} · On Hand {row.onHand.toLocaleString("th-TH")}</p>
                        </div>
                      </div>
                      <span class="flex min-h-11 items-center justify-center rounded-pill border border-border text-sm font-medium text-ink">ดูรายละเอียด</span>
                    </button>
                  </div>
                );
              }}
            />

            <Pagination page={currentPage()} totalPages={totalPages()} pageSize={pageSize()} onPageChange={setPage} onPageSizeChange={setPageSize} />
          </Show>
        </Show>
      </Show>

      <AdminBulkActionBar
        count={selectedIds().size}
        onClear={clearSelection}
        actions={[{ label: "Sync ที่เลือก", disabled: syncingSelected(), onClick: handleSyncSelected }]}
      />

      <QuickViewDrawer
        open={quickViewStock() !== undefined}
        onOpenChange={(open) => !open && setQuickViewId(null)}
        title={quickViewStock() ? nameOf(quickViewStock()!) : ""}
        onViewFull={() => {
          const id = quickViewId();
          setQuickViewId(null);
          if (id) navigate(`/admin/inventory/items/${id}`);
        }}
      >
        <Show when={quickViewStock()}>{(s) => <InventoryQuickView stock={s()} product={productOf(s())} />}</Show>
      </QuickViewDrawer>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div class="flex flex-col gap-3">
      {Array.from({ length: 5 }).map(() => (
        <div class="flex items-center gap-3 rounded-card bg-surface-card p-3 shadow-card">
          <Skeleton class="size-9 shrink-0 rounded-media" />
          <div class="flex flex-1 flex-col gap-1.5">
            <Skeleton class="h-4 w-1/3" />
            <Skeleton class="h-3 w-1/2" />
          </div>
          <Skeleton class="h-6 w-16 rounded-pill" />
          <Skeleton class="h-6 w-20 rounded-pill" />
        </div>
      ))}
    </div>
  );
}
