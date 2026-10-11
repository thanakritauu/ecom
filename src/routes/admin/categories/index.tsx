import { createMemo, createSignal, For, onMount, Show } from "solid-js";
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
import { CategoryRowActionsMenu } from "~/components/admin/categories/CategoryRowActionsMenu";
import { CategoryQuickView } from "~/components/admin/categories/CategoryQuickView";
import { RefreshIcon, CatalogIcon, PlusIcon } from "~/components/admin/icons";
import { CATEGORY_STATUS_META, categoryPublishProblems, type AdminCategory, type CategoryStatus } from "~/lib/adminCategories";
import { useAdminCategories } from "~/lib/adminCategoryStore";
import { useAdminProducts } from "~/lib/adminProductStore";
import { useAdminContent } from "~/lib/adminContentStore";
import { productsInCategory, findCategoryReferencesInPromotionPages, type PromotionPageSectionReference } from "~/lib/masterDataRelations";
import { useAdminNavigation } from "~/lib/adminNavigationStore";
import { findNavigationReferences, describeNavigationReference, type NavigationItem } from "~/lib/adminNavigation";
import { pushToast } from "~/lib/toast";
import { ExportMenu } from "~/components/admin/ExportMenu";
import type { ExportColumn } from "~/lib/adminExport";
import type { AsyncStatus } from "~/lib/types";

const SORT_OPTIONS = [
  { value: "name-asc", label: "ชื่อหมวดหมู่ A-Z" },
  { value: "name-desc", label: "ชื่อหมวดหมู่ Z-A" },
  { value: "updated-desc", label: "แก้ไขล่าสุด" },
];

const STATUS_FILTER_OPTIONS: SelectFilterConfig = {
  id: "status",
  label: "สถานะ",
  value: "all",
  options: [
    { value: "all", label: "ทุกสถานะ" },
    { value: "draft", label: CATEGORY_STATUS_META.draft.label },
    { value: "active", label: CATEGORY_STATUS_META.active.label },
    { value: "inactive", label: CATEGORY_STATUS_META.inactive.label },
  ],
};

/** List/Search/Filter/Sort/Pagination/Bulk/QuickView — same `DataTable`+`FilterBar`+`AdminBulkActionBar` shell every other Admin list module uses. */
export default function AdminCategoriesListPage() {
  const store = useAdminCategories();
  const productStore = useAdminProducts();
  const contentStore = useAdminContent();
  const navigation = useAdminNavigation();
  const navigate = useNavigate();
  const categoryProductCount = (categoryId: string) => productsInCategory(categoryId, productStore.products()).length;

  const [search, setSearchRaw] = createSignal("");
  const [statusFilter, setStatusFilterRaw] = createSignal<"all" | CategoryStatus>("all");
  const [sort, setSortRaw] = createSignal("name-asc");
  const [page, setPage] = createSignal(1);
  const [pageSize, setPageSizeRaw] = createSignal(20);
  const [listStatus, setListStatus] = createSignal<AsyncStatus>("loading");
  const [selectedIds, setSelectedIds] = createSignal<Set<string>>(new Set());
  const [quickViewId, setQuickViewId] = createSignal<string | null>(null);
  const [confirmDelete, setConfirmDelete] = createSignal<AdminCategory | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = createSignal(false);
  type CategoryDependencies = { productCount: number; navRefs: NavigationItem[]; pageRefs: PromotionPageSectionReference[] };
  const [blockedDelete, setBlockedDelete] = createSignal<{ category: AdminCategory; deps: CategoryDependencies } | null>(null);
  const [actionLoading, setActionLoading] = createSignal(false);
  const quickViewCategory = createMemo(() => (quickViewId() ? store.getById(quickViewId()!) : undefined));

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
      setStatusFilterRaw(value as "all" | CategoryStatus);
      resetPage();
    }
  };

  const filtered = createMemo(() => {
    const status = statusFilter();
    const q = search().trim().toLowerCase();
    return store.categories().filter((c) => {
      if (status !== "all" && c.status !== status) return false;
      if (q && !`${c.name} ${c.slug} ${c.id}`.toLowerCase().includes(q)) return false;
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
        return list.sort((a, b) => a.name.localeCompare(b.name));
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

  /**
   * Category/Brand Action + Dark Mode Refinement §2 — Table status changes now
   * go exclusively through this bulk action (Floating Action Bar), same
   * `store.setStatus` the Edit page's own Toggle writes through, mirroring
   * `products/index.tsx`'s own `bulkSetStatus` byte-for-byte (same shape,
   * same toast copy) rather than inventing a second bulk-action pattern. No
   * per-row Toggle/Status column control in the table anymore (§1B) — a
   * read-only `StatusBadge` is still shown so the table stays informative.
   */
  const bulkSetStatus = async (status: CategoryStatus) => {
    const targets = store.categories().filter((c) => selectedIds().has(c.id));
    // Draft-first: เปิดใช้งาน publishes a draft only when it passes the publish checks; ปิดใช้งาน leaves drafts as drafts.
    const blocked = status === "active" ? targets.filter((c) => c.status === "draft" && categoryPublishProblems(c, store.categories()).length > 0) : [];
    const ok = targets.filter((c) => !blocked.includes(c) && !(status === "inactive" && c.status === "draft"));
    await Promise.all(ok.map((c) => store.setStatus(c.id, status)));
    clearSelection();
    pushToast(status === "active" ? `เปิดใช้งาน ${ok.length} รายการแล้ว` : `ปิดใช้งาน ${ok.length} รายการแล้ว`, "success");
    if (blocked.length > 0) pushToast(`เผยแพร่ไม่ได้ ${blocked.length} รายการ`, "warning", `ข้อมูลยังไม่ครบ: ${blocked.map((c) => c.name).join(", ")}`);
  };

  /** Row action for a แบบร่าง: same checks as the form's บันทึกและเผยแพร่; refuses with a toast naming what's missing. */
  const publish = async (c: AdminCategory) => {
    const problems = categoryPublishProblems(c, store.categories());
    if (problems.length > 0) {
      pushToast(`เผยแพร่ "${c.name}" ไม่ได้`, "error", `ยังกรอกข้อมูลไม่ครบ: ${problems.join(", ")}`);
      return;
    }
    await store.setStatus(c.id, "active");
    pushToast(`เผยแพร่ "${c.name}" แล้ว`, "success");
  };

  /** §10/§43 dependency guard — a Category must never be deleted while Products still classify themselves under it, a Promotion Page/Homepage Section still sources from it, or a NavigationItem still targets it. */
  const getCategoryDependencies = (c: AdminCategory): CategoryDependencies => ({
    productCount: productsInCategory(c.id, productStore.products()).length,
    navRefs: findNavigationReferences(navigation.items(), "category", c.id),
    pageRefs: findCategoryReferencesInPromotionPages(c.id, contentStore.pages()),
  });
  const hasBlockingDependencies = (deps: CategoryDependencies) => deps.productCount > 0 || deps.navRefs.length > 0 || deps.pageRefs.length > 0;

  const requestDelete = (c: AdminCategory) => {
    const deps = getCategoryDependencies(c);
    if (hasBlockingDependencies(deps)) setBlockedDelete({ category: c, deps });
    else setConfirmDelete(c);
  };
  const confirmDeleteAction = async () => {
    const c = confirmDelete();
    if (!c) return;
    setActionLoading(true);
    await store.remove(c.id);
    setActionLoading(false);
    setConfirmDelete(null);
    pushToast(`ลบ "${c.name}" เรียบร้อยแล้ว`, "error");
  };

  /** §47 — bulk delete must use the exact same dependency guard as single delete, never a raw unguarded loop. */
  const confirmBulkDeleteAction = async () => {
    const ids = [...selectedIds()];
    const targets = store.categories().filter((c) => ids.includes(c.id));
    const blocked = targets.filter((c) => hasBlockingDependencies(getCategoryDependencies(c)));
    const ok = targets.filter((c) => !blocked.includes(c));
    setActionLoading(true);
    await Promise.all(ok.map((c) => store.remove(c.id)));
    setActionLoading(false);
    setConfirmBulkDelete(false);
    clearSelection();
    if (blocked.length > 0) {
      pushToast(`ลบสำเร็จ ${ok.length} รายการ และลบไม่ได้ ${blocked.length} รายการเพราะยังมีการใช้งานอยู่`, "warning");
    } else {
      pushToast(`ลบหมวดหมู่ ${ok.length} รายการเรียบร้อยแล้ว`, "error");
    }
  };

  const exportColumns: ExportColumn<AdminCategory>[] = [
    { header: "ชื่อหมวดหมู่", value: (row) => row.name },
    { header: "Slug", value: (row) => row.slug },
    { header: "จำนวนสินค้า", value: (row) => categoryProductCount(row.id) },
    { header: "สถานะ", value: (row) => CATEGORY_STATUS_META[row.status].label },
    { header: "แก้ไขล่าสุด", value: (row) => row.updatedAt },
  ];

  const columns: DataTableColumn<AdminCategory>[] = [
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
      label: "หมวดหมู่",
      render: (row) => (
        <div class="min-w-0">
          <p class="truncate text-sm font-medium text-ink">{row.name}</p>
          <p class="truncate text-xs text-ink-gray">{row.slug ? `/${row.slug}` : "-"}</p>
        </div>
      ),
    },
    { key: "products", label: "จำนวนสินค้า", align: "right", hideBelowXl: true, render: (row) => <span class="text-ink-gray">{categoryProductCount(row.id)} สินค้า</span> },
    { key: "status", label: "สถานะ", render: (row) => <StatusBadge tone={CATEGORY_STATUS_META[row.status].tone}>{CATEGORY_STATUS_META[row.status].label}</StatusBadge> },
    { key: "updated", label: "แก้ไขล่าสุด", hideBelowXl: true, render: (row) => <span class="whitespace-nowrap text-ink-gray">{row.updatedAt}</span> },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (row) => <CategoryRowActionsMenu id={row.id} name={row.name} onDelete={() => requestDelete(row)} onPublish={row.status === "draft" ? () => void publish(row) : undefined} />,
    },
  ];

  return (
    <div class="flex flex-col gap-6" classList={{ "pb-20": selectedIds().size > 0 }}>
      <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "สินค้า", href: "/admin/products" }, { label: "หมวดหมู่" }]} />
      <PageHeader
        title="หมวดหมู่สินค้า"
        description="จัดการหมวดหมู่สินค้าที่ใช้แสดงในหน้าร้านและตัวกรองสินค้า"
        actions={
          <div class="flex flex-wrap items-center gap-2">
            <ExportMenu filenameBase="categories-report" columns={exportColumns} rows={sorted()} />
            <Button href="/admin/categories/new" variant="primary">
              <PlusIcon class="size-4" /> เพิ่มหมวดหมู่
            </Button>
          </div>
        }
      />

      <FilterBar
        search={{ value: search(), onInput: setSearch, placeholder: "ค้นหาชื่อหมวดหมู่, Slug, ID..." }}
        filters={[{ ...STATUS_FILTER_OPTIONS, value: statusFilter() }]}
        onFilterChange={handleFilterChange}
        sort={{ value: sort(), options: SORT_OPTIONS, onChange: setSort }}
      />

      <Show when={listStatus() !== "loading"} fallback={<ListSkeleton />}>
        <Show
          when={listStatus() === "success"}
          fallback={
            <EmptyState tone="error" icon={<RefreshIcon />} title="ไม่สามารถโหลดรายการหมวดหมู่ได้" description="เกิดข้อผิดพลาดชั่วคราว ลองโหลดข้อมูลอีกครั้ง" actionLabel="ลองอีกครั้ง" onAction={loadList} class="bg-surface-card shadow-card" />
          }
        >
          <Show
            when={sorted().length > 0}
            fallback={
              <EmptyState
                icon={<CatalogIcon />}
                title={hasActiveFilters() ? "ไม่พบหมวดหมู่ที่ตรงกับการค้นหา" : "ยังไม่มีหมวดหมู่"}
                description={hasActiveFilters() ? undefined : "เริ่มเพิ่มหมวดหมู่แรกของคุณ"}
                actionLabel={hasActiveFilters() ? "ล้างการค้นหา" : "+ เพิ่มหมวดหมู่"}
                onAction={hasActiveFilters() ? clearFilters : () => navigate("/admin/categories/new")}
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
                    aria-label={`เลือก ${row.name}`}
                    checked={selectedIds().has(row.id)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => toggleSelect(row.id)}
                    class="mt-1 size-4 shrink-0 rounded accent-brand-pink"
                  />
                  <button type="button" onClick={() => setQuickViewId(row.id)} class="font-normal flex min-w-0 flex-1 flex-col text-left">
                    <p class="truncate text-sm font-medium text-ink">{row.name}</p>
                    <p class="truncate text-xs text-ink-gray">{row.slug ? `/${row.slug}` : "-"}</p>
                    <div class="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <StatusBadge tone={CATEGORY_STATUS_META[row.status].tone}>{CATEGORY_STATUS_META[row.status].label}</StatusBadge>
                    </div>
                    <p class="mt-1 text-xs text-ink-placeholder">{categoryProductCount(row.id).toLocaleString("th-TH")} สินค้า แก้ไขล่าสุด {row.updatedAt}</p>
                  </button>
                  <CategoryRowActionsMenu id={row.id} name={row.name} onDelete={() => requestDelete(row)} onPublish={row.status === "draft" ? () => void publish(row) : undefined} triggerClass="flex size-9 shrink-0 items-center justify-center self-start rounded-pill text-ink-gray hover:bg-surface-pink" />
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
          { label: "ปิดใช้งาน", onClick: () => bulkSetStatus("inactive") },
          { label: "ลบ", tone: "danger", onClick: () => setConfirmBulkDelete(true) },
        ]}
      />

      <QuickViewDrawer
        open={quickViewCategory() !== undefined}
        onOpenChange={(open) => !open && setQuickViewId(null)}
        title={quickViewCategory()?.name ?? ""}
        onViewFull={() => {
          const id = quickViewId();
          setQuickViewId(null);
          if (id) navigate(`/admin/categories/${id}`);
        }}
      >
        <Show when={quickViewCategory()}>{(c) => <CategoryQuickView category={c()} />}</Show>
      </QuickViewDrawer>

      <ConfirmDialog
        open={confirmDelete() !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title="ลบหมวดหมู่?"
        description={`คุณต้องการลบ "${confirmDelete()?.name ?? ""}" หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`}
        confirmLabel="ลบหมวดหมู่"
        tone="danger"
        loading={actionLoading()}
        onConfirm={confirmDeleteAction}
      />

      <ConfirmDialog
        open={confirmBulkDelete()}
        onOpenChange={setConfirmBulkDelete}
        title="ลบหมวดหมู่ที่เลือก?"
        description={`คุณต้องการลบหมวดหมู่ ${selectedIds().size} รายการที่เลือกหรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`}
        confirmLabel="ลบหมวดหมู่"
        tone="danger"
        loading={actionLoading()}
        onConfirm={confirmBulkDeleteAction}
      />

      <ConfirmDialog
        open={blockedDelete() !== null}
        onOpenChange={(open) => !open && setBlockedDelete(null)}
        title="ไม่สามารถลบได้"
        description={(() => {
          const b = blockedDelete();
          if (!b) return "";
          const parts: string[] = [];
          if (b.deps.productCount > 0) parts.push(`มีสินค้า ${b.deps.productCount} รายการที่ใช้หมวดหมู่นี้`);
          if (b.deps.navRefs.length > 0) parts.push(`ถูกใช้งานในเมนู: ${b.deps.navRefs.map((r) => describeNavigationReference(r, navigation.items())).join(", ")}`);
          if (b.deps.pageRefs.length > 0) parts.push(`ถูกใช้งานในหน้าแคมเปญ: ${b.deps.pageRefs.map((r) => (r.isHomepage ? "หน้าแรก" : r.pageName)).join(", ")}`);
          return `"${b.category.name}" ${parts.join(" และ")} กรุณาย้ายหรือแก้ไขข้อมูลที่เกี่ยวข้องก่อนลบหมวดหมู่นี้`;
        })()}
        confirmLabel="เข้าใจแล้ว"
        cancelLabel="ปิด"
        onConfirm={() => setBlockedDelete(null)}
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
