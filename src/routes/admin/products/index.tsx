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
import { ProductRowActionsMenu } from "~/components/admin/products/ProductRowActionsMenu";
import { ProductQuickView } from "~/components/admin/products/ProductQuickView";
import { RefreshIcon, CatalogIcon, PlusIcon } from "~/components/admin/icons";
import { formatAdminCurrency } from "~/lib/adminDashboard";
import {
  useAdminProducts,
  getStockStatus,
  STOCK_STATUS_META,
  ADMIN_PRODUCT_STATUS_META,
  type AdminProduct,
  type AdminProductStatus,
  type StockStatus,
} from "~/lib/adminProductStore";
import { useAdminCategories } from "~/lib/adminCategoryStore";
import { useAdminBrands } from "~/lib/adminBrandStore";
import { pushToast } from "~/lib/toast";
import type { AsyncStatus } from "~/lib/types";

/** Fallback only for products saved before `categoryId` existed (see `normalizeAdminProduct`). */
const LEGACY_CATEGORY_LABELS: Record<string, string> = { eye: "ตา", cheek: "แก้ม", lip: "ปาก" };

const SORT_OPTIONS = [
  { value: "name-asc", label: "ชื่อสินค้า A–Z" },
  { value: "name-desc", label: "ชื่อสินค้า Z–A" },
  { value: "price-asc", label: "ราคา ต่ำ→สูง" },
  { value: "price-desc", label: "ราคา สูง→ต่ำ" },
  { value: "stock-asc", label: "สต๊อก น้อย→มาก" },
  { value: "stock-desc", label: "สต๊อก มาก→น้อย" },
  { value: "best-selling", label: "ขายดีที่สุด" },
];

export default function AdminProductListPage() {
  const store = useAdminProducts();
  const categoryStore = useAdminCategories();
  const brandStore = useAdminBrands();
  const navigate = useNavigate();

  const [search, setSearchRaw] = createSignal("");
  const [categoryFilter, setCategoryFilterRaw] = createSignal("all");
  const [brandFilter, setBrandFilterRaw] = createSignal("all");
  const [statusFilter, setStatusFilterRaw] = createSignal("all");
  const [stockFilter, setStockFilterRaw] = createSignal("all");
  const [sort, setSortRaw] = createSignal("name-asc");
  const [page, setPage] = createSignal(1);
  const [pageSize, setPageSizeRaw] = createSignal(20);
  const [selectedIds, setSelectedIds] = createSignal<Set<string>>(new Set());
  const [listStatus, setListStatus] = createSignal<AsyncStatus>("loading");

  const [confirmDelete, setConfirmDelete] = createSignal<AdminProduct | null>(null);
  const [confirmToggle, setConfirmToggle] = createSignal<AdminProduct | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = createSignal(false);
  const [actionLoading, setActionLoading] = createSignal(false);
  const [quickViewId, setQuickViewId] = createSignal<string | null>(null);
  const quickViewProduct = createMemo(() => (quickViewId() ? store.getById(quickViewId()!) : undefined));

  const loadList = () => {
    setListStatus("loading");
    setTimeout(() => setListStatus(Math.random() < 0.08 ? "error" : "success"), 500);
  };
  onMount(loadList);

  const resetPage = () => setPage(1);
  const setSearch = (v: string) => { setSearchRaw(v); resetPage(); };
  const setCategoryFilter = (v: string) => { setCategoryFilterRaw(v); resetPage(); };
  const setBrandFilter = (v: string) => { setBrandFilterRaw(v); resetPage(); };
  const setStatusFilter = (v: string) => { setStatusFilterRaw(v); resetPage(); };
  const setStockFilter = (v: string) => { setStockFilterRaw(v); resetPage(); };
  const setSort = (v: string) => { setSortRaw(v); resetPage(); };
  const setPageSize = (v: number) => { setPageSizeRaw(v); resetPage(); };

  const hasActiveFilters = () =>
    search().trim() !== "" || categoryFilter() !== "all" || brandFilter() !== "all" || statusFilter() !== "all" || stockFilter() !== "all";

  const clearFilters = () => {
    setSearchRaw("");
    setCategoryFilterRaw("all");
    setBrandFilterRaw("all");
    setStatusFilterRaw("all");
    setStockFilterRaw("all");
    resetPage();
  };

  const filtered = createMemo(() => {
    const q = search().trim().toLowerCase();
    return store.products().filter((p) => {
      if (q) {
        const categoryName = categoryStore.getById(p.categoryId)?.name ?? "";
        const brandName = brandStore.getById(p.brandId)?.name ?? p.brand;
        const haystack = `${p.name} ${p.sku} ${brandName} ${categoryName}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      // Real Category id (Admin Master Data Foundation) — replaces the old
      // 3-value `p.category` enum comparison, so all 5 Categories are
      // actually filterable here, not just eye/cheek/lip.
      if (categoryFilter() !== "all" && p.categoryId !== categoryFilter()) return false;
      if (brandFilter() !== "all" && p.brandId !== brandFilter()) return false;
      if (statusFilter() !== "all" && p.status !== statusFilter()) return false;
      if (stockFilter() !== "all" && getStockStatus(p) !== (stockFilter() as StockStatus)) return false;
      return true;
    });
  });

  const sorted = createMemo(() => {
    const list = [...filtered()];
    switch (sort()) {
      case "name-desc":
        return list.sort((a, b) => b.name.localeCompare(a.name));
      case "price-asc":
        return list.sort((a, b) => a.price - b.price);
      case "price-desc":
        return list.sort((a, b) => b.price - a.price);
      case "stock-asc":
        return list.sort((a, b) => (a.stockLeft ?? 0) - (b.stockLeft ?? 0));
      case "stock-desc":
        return list.sort((a, b) => (b.stockLeft ?? 0) - (a.stockLeft ?? 0));
      case "best-selling":
        return list.sort((a, b) => (b.soldCount ?? 0) - (a.soldCount ?? 0));
      default:
        return list.sort((a, b) => a.name.localeCompare(b.name));
    }
  });

  const totalPages = createMemo(() => Math.max(1, Math.ceil(sorted().length / pageSize())));
  const currentPage = createMemo(() => Math.min(page(), totalPages()));
  const pageItems = createMemo(() => {
    const p = currentPage();
    return sorted().slice((p - 1) * pageSize(), p * pageSize());
  });

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

  const requestDelete = (product: AdminProduct) => setConfirmDelete(product);
  const confirmDeleteAction = async () => {
    const product = confirmDelete();
    if (!product) return;
    setActionLoading(true);
    await store.deleteProduct(product.id);
    setActionLoading(false);
    setConfirmDelete(null);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(product.id);
      return next;
    });
    pushToast(`ลบ "${product.name}" เรียบร้อยแล้ว`, "error");
  };

  const requestToggle = (product: AdminProduct) => setConfirmToggle(product);
  const confirmToggleAction = async () => {
    const product = confirmToggle();
    if (!product) return;
    const nextStatus: AdminProductStatus = product.status === "disabled" ? "active" : "disabled";
    setActionLoading(true);
    await store.setStatus(product.id, nextStatus);
    setActionLoading(false);
    setConfirmToggle(null);
    pushToast(nextStatus === "disabled" ? "ปิดการขายสินค้าแล้ว" : "เปิดการขายสินค้าแล้ว", "success");
  };

  const handleDuplicate = async (product: AdminProduct) => {
    const duplicate = await store.duplicateProduct(product.id);
    pushToast(`ทำสำเนา "${product.name}" เรียบร้อยแล้ว`, "success");
    navigate(`/admin/products/${duplicate.id}/edit`);
  };

  const confirmBulkDeleteAction = async () => {
    const ids = [...selectedIds()];
    setActionLoading(true);
    await Promise.all(ids.map((id) => store.deleteProduct(id)));
    setActionLoading(false);
    setConfirmBulkDelete(false);
    clearSelection();
    pushToast(`ลบสินค้า ${ids.length} รายการเรียบร้อยแล้ว`, "error");
  };

  const bulkSetStatus = async (status: AdminProductStatus) => {
    const ids = [...selectedIds()];
    await Promise.all(ids.map((id) => store.setStatus(id, status)));
    clearSelection();
    pushToast(status === "active" ? `เปิดใช้งาน ${ids.length} รายการแล้ว` : `ปิดใช้งาน ${ids.length} รายการแล้ว`, "success");
  };

  const columns: DataTableColumn<AdminProduct>[] = [
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
          aria-label={`เลือก ${row.name}`}
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
      render: (row) => (
        <div class="flex min-w-0 items-center gap-3">
          <img src={row.image} alt="" class="size-11 shrink-0 rounded-media object-cover" />
          <div class="min-w-0">
            <p class="truncate text-sm font-medium text-ink">{row.name}</p>
            <p class="text-xs text-ink-gray">
              {row.adminVariants.length > 0 ? `${row.adminVariants.length} ตัวเลือก` : "ไม่มีตัวเลือก"}
            </p>
          </div>
        </div>
      ),
    },
    { key: "sku", label: "SKU", render: (row) => <span class="whitespace-nowrap text-ink-gray">{row.sku}</span> },
    {
      key: "category",
      label: "Category",
      hideBelowXl: true,
      render: (row) => <span class="text-ink-gray">{categoryStore.getById(row.categoryId)?.name ?? LEGACY_CATEGORY_LABELS[row.category ?? ""] ?? "-"}</span>,
    },
    {
      key: "brand",
      label: "Brand",
      hideBelowXl: true,
      render: (row) => <span class="text-ink-gray">{brandStore.getById(row.brandId)?.name ?? row.brand ?? "-"}</span>,
    },
    { key: "price", label: "Price", align: "right", render: (row) => <span class="font-medium text-ink">{formatAdminCurrency(row.price)}</span> },
    {
      key: "stock",
      label: "Stock",
      render: (row) => {
        const stockStatus = getStockStatus(row);
        // Global UI Correction — Final Refinement #3: number and status
        // badge share one line (Stock 0 [สินค้าหมด]), never stacked — a
        // stacked layout read as two unrelated facts instead of one.
        return (
          <div class="flex items-center gap-2 whitespace-nowrap">
            <span class="text-ink">{row.stockLeft ?? 0}</span>
            <StatusBadge tone={STOCK_STATUS_META[stockStatus].tone}>{STOCK_STATUS_META[stockStatus].label}</StatusBadge>
          </div>
        );
      },
    },
    { key: "sold", label: "Sold", align: "right", hideBelowXl: true, render: (row) => <span class="text-ink-gray">{row.soldCount ?? 0}</span> },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <StatusBadge tone={ADMIN_PRODUCT_STATUS_META[row.status].tone}>{ADMIN_PRODUCT_STATUS_META[row.status].label}</StatusBadge>
      ),
    },
    { key: "updated", label: "Updated", hideBelowXl: true, render: (row) => <span class="whitespace-nowrap text-ink-gray">{row.updatedAt}</span> },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (row) => (
        <ProductRowActionsMenu
          product={row}
          onDuplicate={() => handleDuplicate(row)}
          onToggleStatus={() => requestToggle(row)}
          onDelete={() => requestDelete(row)}
        />
      ),
    },
  ];

  return (
    <div class="flex flex-col gap-6" classList={{ "pb-20": selectedIds().size > 0 }}>
      <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "สินค้า" }]} />
      <PageHeader
        title="สินค้า"
        description="จัดการสินค้า ราคา สต็อก และข้อมูลผลิตภัณฑ์ของ Charmiss"
        actions={
          <Button href="/admin/products/new" variant="primary">
            <PlusIcon class="size-4" /> เพิ่มสินค้า
          </Button>
        }
      />

      <FilterBar
        search={{ value: search(), onInput: setSearch, placeholder: "ค้นหาชื่อสินค้า, SKU, แบรนด์..." }}
        filters={[
          {
            id: "category",
            label: "หมวดหมู่",
            value: categoryFilter(),
            options: [{ value: "all", label: "ทุกหมวดหมู่" }, ...categoryStore.categories().map((c) => ({ value: c.id, label: c.name }))],
          },
          {
            id: "brand",
            label: "แบรนด์",
            value: brandFilter(),
            options: [{ value: "all", label: "ทุกแบรนด์" }, ...brandStore.brands().map((b) => ({ value: b.id, label: b.name }))],
          },
          {
            id: "status",
            label: "สถานะ",
            value: statusFilter(),
            options: [{ value: "all", label: "ทุกสถานะ" }, { value: "active", label: "Active" }, { value: "draft", label: "Draft" }, { value: "disabled", label: "Disabled" }],
          },
          {
            id: "stock",
            label: "สต๊อก",
            value: stockFilter(),
            options: [
              { value: "all", label: "ทุกสต๊อก" },
              { value: "in_stock", label: "In Stock" },
              { value: "low_stock", label: "Low Stock" },
              { value: "out_of_stock", label: "Out of Stock" },
            ],
          },
        ]}
        onFilterChange={(id, value) => {
          if (id === "category") setCategoryFilter(value);
          if (id === "brand") setBrandFilter(value);
          if (id === "status") setStatusFilter(value);
          if (id === "stock") setStockFilter(value);
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
              title="ไม่สามารถโหลดรายการสินค้าได้"
              description="เกิดข้อผิดพลาดชั่วคราว ลองโหลดข้อมูลอีกครั้ง"
              actionLabel="ลองอีกครั้ง"
              onAction={loadList}
              class="bg-white shadow-card"
            />
          }
        >
          <Show
            when={sorted().length > 0}
            fallback={
              <EmptyState
                icon={<CatalogIcon />}
                title={hasActiveFilters() ? "ไม่พบสินค้าที่ตรงกับการค้นหา" : "ยังไม่มีสินค้า"}
                description={hasActiveFilters() ? undefined : "เริ่มเพิ่มสินค้าแรกของคุณ"}
                actionLabel={hasActiveFilters() ? "ล้างการค้นหา" : "+ เพิ่มสินค้า"}
                onAction={hasActiveFilters() ? clearFilters : () => navigate("/admin/products/new")}
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
              renderMobileCard={(row) => {
                const stockStatus = getStockStatus(row);
                return (
                  <div class="flex gap-3 rounded-card bg-white p-3 shadow-card">
                    <input
                      type="checkbox"
                      aria-label={`เลือก ${row.name}`}
                      checked={selectedIds().has(row.id)}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => toggleSelect(row.id)}
                      class="mt-1 size-4 shrink-0 rounded accent-brand-pink"
                    />
                    <button type="button" onClick={() => setQuickViewId(row.id)} class="flex flex-1 gap-3 text-left">
                      <img src={row.image} alt="" class="size-16 shrink-0 rounded-media object-cover" />
                      <div class="min-w-0 flex-1">
                        <p class="truncate text-sm font-medium text-ink">{row.name}</p>
                        <p class="text-xs text-ink-gray">{row.sku}</p>
                        <p class="mt-1 text-sm font-semibold text-ink">{formatAdminCurrency(row.price)}</p>
                        <div class="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <span class="flex items-center gap-1.5 whitespace-nowrap text-sm text-ink-gray">
                            Stock {row.stockLeft ?? 0}
                            <StatusBadge tone={STOCK_STATUS_META[stockStatus].tone}>{STOCK_STATUS_META[stockStatus].label}</StatusBadge>
                          </span>
                          <StatusBadge tone={ADMIN_PRODUCT_STATUS_META[row.status].tone}>{ADMIN_PRODUCT_STATUS_META[row.status].label}</StatusBadge>
                        </div>
                        <p class="mt-1 text-xs text-ink-placeholder">ขายแล้ว {row.soldCount ?? 0}</p>
                      </div>
                    </button>
                    <ProductRowActionsMenu
                      product={row}
                      onDuplicate={() => handleDuplicate(row)}
                      onToggleStatus={() => requestToggle(row)}
                      onDelete={() => requestDelete(row)}
                      triggerClass="flex size-9 shrink-0 items-center justify-center self-start rounded-pill text-ink-gray hover:bg-surface-pink"
                    />
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
        actions={[
          { label: "เปิดใช้งาน", onClick: () => bulkSetStatus("active") },
          { label: "ปิดใช้งาน", onClick: () => bulkSetStatus("disabled") },
          { label: "ลบ", tone: "danger", onClick: () => setConfirmBulkDelete(true) },
        ]}
      />

      <QuickViewDrawer
        open={quickViewProduct() !== undefined}
        onOpenChange={(open) => !open && setQuickViewId(null)}
        title={quickViewProduct()?.name ?? ""}
        subtitle={quickViewProduct()?.sku}
        onViewFull={() => {
          const id = quickViewId();
          setQuickViewId(null);
          if (id) navigate(`/admin/products/${id}`);
        }}
      >
        <Show when={quickViewProduct()}>{(product) => <ProductQuickView product={product()} />}</Show>
      </QuickViewDrawer>

      <ConfirmDialog
        open={confirmDelete() !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title="ลบสินค้า?"
        description={`คุณต้องการลบ "${confirmDelete()?.name ?? ""}" หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`}
        confirmLabel="ลบสินค้า"
        tone="danger"
        loading={actionLoading()}
        onConfirm={confirmDeleteAction}
      />

      <ConfirmDialog
        open={confirmToggle() !== null}
        onOpenChange={(open) => !open && setConfirmToggle(null)}
        title={confirmToggle()?.status === "disabled" ? "เปิดการขายสินค้านี้?" : "ปิดการขายสินค้านี้?"}
        description={`"${confirmToggle()?.name ?? ""}" จะ${confirmToggle()?.status === "disabled" ? "กลับมาแสดงในร้านค้า" : "ถูกซ่อนจากร้านค้า"}`}
        confirmLabel={confirmToggle()?.status === "disabled" ? "เปิดการขาย" : "ปิดการขาย"}
        loading={actionLoading()}
        onConfirm={confirmToggleAction}
      />

      <ConfirmDialog
        open={confirmBulkDelete()}
        onOpenChange={setConfirmBulkDelete}
        title="ลบสินค้าที่เลือก?"
        description={`คุณต้องการลบสินค้า ${selectedIds().size} รายการที่เลือกหรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`}
        confirmLabel="ลบสินค้า"
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
          <div class="flex items-center gap-3 rounded-card bg-white p-3 shadow-card">
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
