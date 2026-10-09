import { createMemo, createSignal, For, onMount, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { FilterBar } from "~/components/admin/FilterBar";
import { Pagination } from "~/components/admin/Pagination";
import { DataTable, type DataTableColumn } from "~/components/admin/DataTable";
import { StatusBadge } from "~/components/admin/StatusBadge";
import { EmptyState } from "~/components/admin/EmptyState";
import { Skeleton } from "~/components/admin/Skeleton";
import { QuickViewDrawer } from "~/components/admin/QuickViewDrawer";
import { ExportMenu } from "~/components/admin/ExportMenu";
import { InventoryIcon, RefreshIcon } from "~/components/admin/icons";
import { InventoryQuickView } from "~/components/admin/inventory/InventoryQuickView";
import { InventoryRowActionsMenu } from "~/components/admin/inventory/InventoryRowActionsMenu";
import { StockEditDialog } from "~/components/admin/inventory/StockEditDialog";
import type { ExportColumn } from "~/lib/adminExport";
import {
  ADMIN_PRODUCT_STATUS_META,
  getStockStatus,
  STOCK_STATUS_META,
  stockStatusLabel,
  useAdminProducts,
  type AdminProduct,
  type StockStatus,
} from "~/lib/adminProductStore";
import { useAdminCategories } from "~/lib/adminCategoryStore";
import { pushToast } from "~/lib/toast";
import type { AsyncStatus } from "~/lib/types";

type StockTab = "all" | StockStatus;
const STOCK_TABS: StockTab[] = ["all", "low_stock", "out_of_stock", "in_stock"];

const SORT_OPTIONS = [
  { value: "stock-asc", label: "สต๊อก น้อยไปมาก" },
  { value: "stock-desc", label: "สต๊อก มากไปน้อย" },
  { value: "name-asc", label: "ชื่อสินค้า A-Z" },
  { value: "name-desc", label: "ชื่อสินค้า Z-A" },
];

/**
 * Stock list over the admin product store: the storefront's stock is
 * `product.stockLeft` plus each option's stock, so this page reads and
 * writes exactly those (no separate inventory dataset).
 */
export default function AdminInventoryPage() {
  const store = useAdminProducts();
  const categoryStore = useAdminCategories();
  const navigate = useNavigate();

  const [search, setSearchRaw] = createSignal("");
  const [stockTab, setStockTabRaw] = createSignal<StockTab>("all");
  const [categoryFilter, setCategoryFilterRaw] = createSignal("all");
  const [sort, setSortRaw] = createSignal("stock-asc");
  const [page, setPage] = createSignal(1);
  const [pageSize, setPageSizeRaw] = createSignal(20);
  const [listStatus, setListStatus] = createSignal<AsyncStatus>("loading");
  const [quickViewId, setQuickViewId] = createSignal<string | null>(null);
  const [editId, setEditId] = createSignal<string | null>(null);
  const quickViewProduct = createMemo(() => (quickViewId() ? store.getById(quickViewId()!) : undefined));
  const editProduct = createMemo(() => (editId() ? store.getById(editId()!) : undefined));

  const loadList = () => {
    setListStatus("loading");
    setTimeout(() => setListStatus(Math.random() < 0.08 ? "error" : "success"), 500);
  };
  onMount(loadList);

  const resetPage = () => setPage(1);
  const setSearch = (v: string) => { setSearchRaw(v); resetPage(); };
  const setStockTab = (v: StockTab) => { setStockTabRaw(v); resetPage(); };
  const setSort = (v: string) => { setSortRaw(v); resetPage(); };
  const setPageSize = (v: number) => { setPageSizeRaw(v); resetPage(); };

  const hasActiveFilters = () => search().trim() !== "" || stockTab() !== "all" || categoryFilter() !== "all";
  const clearFilters = () => {
    setSearchRaw("");
    setStockTabRaw("all");
    setCategoryFilterRaw("all");
    resetPage();
  };

  const categoryName = (p: AdminProduct) => categoryStore.getById(p.categoryId)?.name ?? "-";

  const searched = createMemo(() => {
    const q = search().trim().toLowerCase();
    const category = categoryFilter();
    return store.products().filter((p) => {
      if (category !== "all" && p.categoryId !== category) return false;
      if (q && !`${p.name} ${p.sku} ${p.adminVariants.map((v) => `${v.label} ${v.sku}`).join(" ")}`.toLowerCase().includes(q)) return false;
      return true;
    });
  });
  const tabCount = (tab: StockTab) => (tab === "all" ? searched().length : searched().filter((p) => getStockStatus(p) === tab).length);

  const sorted = createMemo(() => {
    const tab = stockTab();
    const list = searched().filter((p) => tab === "all" || getStockStatus(p) === tab);
    const stock = (p: AdminProduct) => p.stockLeft ?? 0;
    switch (sort()) {
      case "stock-desc":
        return list.sort((a, b) => stock(b) - stock(a));
      case "name-asc":
        return list.sort((a, b) => a.name.localeCompare(b.name));
      case "name-desc":
        return list.sort((a, b) => b.name.localeCompare(a.name));
      default:
        return list.sort((a, b) => stock(a) - stock(b));
    }
  });

  const totalPages = createMemo(() => Math.max(1, Math.ceil(sorted().length / pageSize())));
  const currentPage = createMemo(() => Math.min(page(), totalPages()));
  const pageItems = createMemo(() => sorted().slice((currentPage() - 1) * pageSize(), currentPage() * pageSize()));

  const exportColumns: ExportColumn<AdminProduct>[] = [
    { header: "SKU", value: (p) => p.sku },
    { header: "ชื่อสินค้า", value: (p) => p.name },
    { header: "หมวดหมู่", value: (p) => (categoryName(p) === "-" ? "" : categoryName(p)) },
    { header: "สต๊อก", value: (p) => p.stockLeft ?? 0 },
    { header: "ใกล้หมดเมื่อเหลือ", value: (p) => p.lowStockThreshold },
    { header: "สถานะสต๊อก", value: (p) => STOCK_STATUS_META[getStockStatus(p)].label },
    { header: "สต๊อกตามตัวเลือก", value: (p) => p.adminVariants.map((v) => `${v.label} ${v.stock}`).join(", ") },
  ];

  const saveStock = async (values: { stockLeft: number; variantStock: Record<string, number> }) => {
    const p = editProduct();
    if (!p) return;
    await store.updateStock(p.id, values.stockLeft, values.variantStock);
    setEditId(null);
    pushToast("บันทึกสต๊อกเรียบร้อยแล้ว", "success");
  };

  const stockBadge = (p: AdminProduct) => (
    <StatusBadge tone={STOCK_STATUS_META[getStockStatus(p)].tone}>{stockStatusLabel(p)}</StatusBadge>
  );
  const soldOutOptions = (p: AdminProduct) => p.adminVariants.filter((v) => v.soldOut || v.stock <= 0).length;

  const columns: DataTableColumn<AdminProduct>[] = [
    {
      key: "product",
      label: "สินค้า",
      render: (row) => (
        <div class="flex items-center gap-3">
          <img src={row.image} alt="" class="size-11 shrink-0 rounded-media object-cover" />
          <div class="min-w-0">
            <p class="truncate text-sm font-medium text-ink">{row.name}</p>
            <p class="truncate text-xs text-ink-gray">{row.sku}</p>
          </div>
        </div>
      ),
    },
    { key: "category", label: "หมวดหมู่", hideBelowXl: true, render: (row) => <span class="text-ink-gray">{categoryName(row)}</span> },
    {
      key: "options",
      label: "ตัวเลือก",
      hideBelowXl: true,
      render: (row) => (
        <span class="whitespace-nowrap text-ink-gray">
          {row.adminVariants.length > 0 ? `${row.adminVariants.length} ตัวเลือก` : "-"}
          <Show when={soldOutOptions(row) > 0}> หมด {soldOutOptions(row)}</Show>
        </span>
      ),
    },
    {
      key: "stock",
      label: "สต๊อก",
      align: "right",
      render: (row) => (
        <div class="flex items-center justify-end gap-2 whitespace-nowrap">
          <span class="font-medium text-ink">{(row.stockLeft ?? 0).toLocaleString("th-TH")}</span>
          {stockBadge(row)}
        </div>
      ),
    },
    { key: "threshold", label: "ใกล้หมดเมื่อเหลือ", align: "right", hideBelowXl: true, render: (row) => <span class="text-ink-gray">{row.lowStockThreshold}</span> },
    {
      key: "status",
      label: "สถานะสินค้า",
      hideBelowXl: true,
      render: (row) => <StatusBadge tone={ADMIN_PRODUCT_STATUS_META[row.status].tone}>{ADMIN_PRODUCT_STATUS_META[row.status].label}</StatusBadge>,
    },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (row) => (
        <InventoryRowActionsMenu productId={row.id} name={row.name} onView={() => setQuickViewId(row.id)} onEditStock={() => setEditId(row.id)} />
      ),
    },
  ];

  return (
    <div class="flex flex-col gap-6">
      <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "คลังสินค้า" }]} />
      <PageHeader
        title="คลังสินค้า"
        description="ดูและแก้ไขสต๊อกที่ลูกค้าเห็นบนหน้าร้าน"
        actions={
          <div class="flex flex-wrap items-center gap-2">
            <ExportMenu filenameBase="inventory-report" columns={exportColumns} rows={sorted()} />
          </div>
        }
      />

      <div class="scroll-rail !mx-0 !px-0">
        <For each={STOCK_TABS}>
          {(tab) => {
            const active = () => stockTab() === tab;
            return (
              <button
                type="button"
                aria-pressed={active()}
                onClick={() => setStockTab(tab)}
                class={`flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-pill px-4 text-sm font-medium transition-colors duration-150 ${
                  active() ? "bg-brand-pink text-white" : "border border-border bg-surface-card text-ink-gray lg:hover:bg-surface-pink/40"
                }`}
              >
                {tab === "all" ? "ทั้งหมด" : STOCK_STATUS_META[tab].label}
                <span class={`rounded-pill px-1.5 py-0.5 text-xs ${active() ? "bg-white/20" : "bg-surface-gray text-ink-gray"}`}>{tabCount(tab)}</span>
              </button>
            );
          }}
        </For>
      </div>

      <FilterBar
        search={{ value: search(), onInput: setSearch, placeholder: "ค้นหาชื่อสินค้า, SKU, ตัวเลือก..." }}
        filters={[
          {
            id: "category",
            label: "หมวดหมู่",
            value: categoryFilter(),
            options: [{ value: "all", label: "ทุกหมวดหมู่" }, ...categoryStore.categories().map((c) => ({ value: c.id, label: c.name }))],
          },
        ]}
        onFilterChange={(id, value) => {
          if (id === "category") {
            setCategoryFilterRaw(value);
            resetPage();
          }
        }}
        sort={{ value: sort(), options: SORT_OPTIONS, onChange: setSort }}
      />

      <Show when={listStatus() !== "loading"} fallback={<ListSkeleton />}>
        <Show
          when={listStatus() === "success"}
          fallback={
            <EmptyState tone="error" icon={<RefreshIcon />} title="ไม่สามารถโหลดรายการสต๊อกได้" description="เกิดข้อผิดพลาดชั่วคราว ลองโหลดข้อมูลอีกครั้ง" actionLabel="ลองอีกครั้ง" onAction={loadList} class="bg-surface-card shadow-card" />
          }
        >
          <Show
            when={sorted().length > 0}
            fallback={
              <EmptyState
                icon={<InventoryIcon />}
                title={hasActiveFilters() ? "ไม่พบสินค้าที่ตรงกับการค้นหา" : "ยังไม่มีสินค้า"}
                description={hasActiveFilters() ? undefined : "เพิ่มสินค้าในเมนูสินค้า แล้วสต๊อกจะแสดงที่นี่"}
                actionLabel={hasActiveFilters() ? "ล้างการค้นหา" : "ไปที่หน้าสินค้า"}
                onAction={hasActiveFilters() ? clearFilters : () => navigate("/admin/products")}
                class="bg-surface-card shadow-card"
              />
            }
          >
            <DataTable
              columns={columns}
              rows={pageItems()}
              getRowKey={(row) => row.id}
              onRowClick={(row) => setQuickViewId(row.id)}
              renderMobileCard={(row) => (
                <div class="flex gap-3 rounded-card bg-surface-card p-3 shadow-card">
                  <button type="button" onClick={() => setQuickViewId(row.id)} class="font-normal flex min-w-0 flex-1 gap-3 text-left">
                    <img src={row.image} alt="" class="size-16 shrink-0 rounded-media object-cover" />
                    <div class="min-w-0 flex-1">
                      <p class="truncate text-sm font-medium text-ink">{row.name}</p>
                      <p class="truncate text-xs text-ink-gray">{row.sku}</p>
                      <div class="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <span class="flex items-center gap-1.5 whitespace-nowrap text-sm text-ink-gray">
                          สต๊อก {(row.stockLeft ?? 0).toLocaleString("th-TH")}
                          {stockBadge(row)}
                        </span>
                      </div>
                      <p class="mt-1 text-xs text-ink-placeholder">
                        {row.adminVariants.length > 0 ? `${row.adminVariants.length} ตัวเลือก` : "ไม่มีตัวเลือก"}
                        <Show when={soldOutOptions(row) > 0}> หมด {soldOutOptions(row)}</Show>
                      </p>
                    </div>
                  </button>
                  <InventoryRowActionsMenu
                    productId={row.id}
                    name={row.name}
                    onEditStock={() => setEditId(row.id)}
                    triggerClass="flex size-9 shrink-0 items-center justify-center self-start rounded-pill text-ink-gray hover:bg-surface-pink"
                  />
                </div>
              )}
            />
            <Pagination page={currentPage()} totalPages={totalPages()} pageSize={pageSize()} onPageChange={setPage} onPageSizeChange={setPageSize} />
          </Show>
        </Show>
      </Show>

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
        <Show when={quickViewProduct()}>{(p) => <InventoryQuickView product={p()} />}</Show>
      </QuickViewDrawer>

      <StockEditDialog product={editProduct()} onOpenChange={(open) => !open && setEditId(null)} onSave={saveStock} />
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
