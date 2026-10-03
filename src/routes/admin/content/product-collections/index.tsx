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
import { CollectionRowActionsMenu } from "~/components/admin/content/CollectionRowActionsMenu";
import { CollectionQuickView } from "~/components/admin/content/CollectionQuickView";
import { RefreshIcon, LayersIcon, PlusIcon } from "~/components/admin/icons";
import { COLLECTION_STATUS_META, type ProductCollection, type CollectionStatus } from "~/lib/adminCollections";
import { useAdminCollections } from "~/lib/adminCollectionStore";
import { useAdminContent } from "~/lib/adminContentStore";
import { useAdminNavigation } from "~/lib/adminNavigationStore";
import { findNavigationReferences, describeNavigationReference, type NavigationItem } from "~/lib/adminNavigation";
import { findCollectionReferencesInPromotionPages, type PromotionPageSectionReference } from "~/lib/masterDataRelations";
import { pushToast } from "~/lib/toast";
import type { AsyncStatus } from "~/lib/types";

const SORT_OPTIONS = [
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
    { value: "active", label: COLLECTION_STATUS_META.active.label },
    { value: "inactive", label: COLLECTION_STATUS_META.inactive.label },
    { value: "draft", label: COLLECTION_STATUS_META.draft.label },
  ],
};

/** List/Search/Filter/Sort/Pagination/Bulk/QuickView — same `DataTable`+`FilterBar`+`AdminBulkActionBar` shell every other Admin list module uses, kept intentionally simple (no status tab bar, no date range — Collections don't have those concepts). */
export default function AdminProductCollectionsListPage() {
  const store = useAdminCollections();
  const contentStore = useAdminContent();
  const navigation = useAdminNavigation();
  const navigate = useNavigate();

  const [search, setSearchRaw] = createSignal("");
  const [statusFilter, setStatusFilterRaw] = createSignal<"all" | CollectionStatus>("all");
  const [sort, setSortRaw] = createSignal("updated-desc");
  const [page, setPage] = createSignal(1);
  const [pageSize, setPageSizeRaw] = createSignal(10);
  const [listStatus, setListStatus] = createSignal<AsyncStatus>("loading");
  const [selectedIds, setSelectedIds] = createSignal<Set<string>>(new Set());
  const [quickViewId, setQuickViewId] = createSignal<string | null>(null);
  const [confirmDelete, setConfirmDelete] = createSignal<ProductCollection | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = createSignal(false);
  type CollectionDependencies = { navRefs: NavigationItem[]; pageRefs: PromotionPageSectionReference[] };
  const [blockedDelete, setBlockedDelete] = createSignal<{ collection: ProductCollection; deps: CollectionDependencies } | null>(null);
  const [actionLoading, setActionLoading] = createSignal(false);
  const quickViewCollection = createMemo(() => (quickViewId() ? store.getById(quickViewId()!) : undefined));

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
      setStatusFilterRaw(value as "all" | CollectionStatus);
      resetPage();
    }
  };

  const filtered = createMemo(() => {
    const status = statusFilter();
    const q = search().trim().toLowerCase();
    return store.collections().filter((c) => {
      if (status !== "all" && c.status !== status) return false;
      if (q && !`${c.name} ${c.id}`.toLowerCase().includes(q)) return false;
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
      default:
        return list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
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

  /** §20/§45 dependency guard — a Collection must never be deleted while a NavigationItem still targets it or a Promotion Page/Homepage Section still sources from it. */
  const getCollectionDependencies = (c: ProductCollection): CollectionDependencies => ({
    navRefs: findNavigationReferences(navigation.items(), "collection", c.id),
    pageRefs: findCollectionReferencesInPromotionPages(c.id, contentStore.pages()),
  });
  const hasBlockingDependencies = (deps: CollectionDependencies) => deps.navRefs.length > 0 || deps.pageRefs.length > 0;

  const requestDelete = (c: ProductCollection) => {
    const deps = getCollectionDependencies(c);
    if (hasBlockingDependencies(deps)) setBlockedDelete({ collection: c, deps });
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

  /** §47 — bulk delete must use the exact same dependency guard as single delete. */
  const confirmBulkDeleteAction = async () => {
    const ids = [...selectedIds()];
    const targets = store.collections().filter((c) => ids.includes(c.id));
    const blocked = targets.filter((c) => hasBlockingDependencies(getCollectionDependencies(c)));
    const ok = targets.filter((c) => !blocked.includes(c));
    setActionLoading(true);
    await Promise.all(ok.map((c) => store.remove(c.id)));
    setActionLoading(false);
    setConfirmBulkDelete(false);
    clearSelection();
    if (blocked.length > 0) {
      pushToast(`ลบไม่สำเร็จ ${blocked.length} รายการ (มีการใช้งานอยู่) — ลบสำเร็จ ${ok.length} รายการ`, "warning");
    } else {
      pushToast(`ลบ Collection ${ok.length} รายการเรียบร้อยแล้ว`, "error");
    }
  };

  const columns: DataTableColumn<ProductCollection>[] = [
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
    { key: "name", label: "Collection Name", render: (row) => <p class="font-medium text-ink">{row.name}</p> },
    { key: "products", label: "จำนวนสินค้า", align: "right", hideBelowXl: true, render: (row) => <span class="text-ink-gray">{row.products.length} สินค้า</span> },
    { key: "status", label: "Status", render: (row) => <StatusBadge tone={COLLECTION_STATUS_META[row.status].tone}>{COLLECTION_STATUS_META[row.status].label}</StatusBadge> },
    { key: "updated", label: "Updated", hideBelowXl: true, render: (row) => <span class="whitespace-nowrap text-ink-gray">{row.updatedAt}</span> },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (row) => <CollectionRowActionsMenu id={row.id} name={row.name} onDelete={() => requestDelete(row)} />,
    },
  ];

  return (
    <div class="flex flex-col gap-6" classList={{ "pb-20": selectedIds().size > 0 }}>
      <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "จัดการเนื้อหา", href: "/admin/promotion-pages" }, { label: "Product Collections" }]} />
      <PageHeader
        title="Product Collections"
        description="จัดการกลุ่มสินค้าสำหรับใช้งานใน Homepage และ Campaign"
        actions={
          <div class="flex flex-wrap items-center gap-2">
            <Button href="/admin/content/product-collections/new" variant="primary">
              <PlusIcon class="size-4" /> สร้าง Collection
            </Button>
          </div>
        }
      />

      <FilterBar
        search={{ value: search(), onInput: setSearch, placeholder: "ค้นหาชื่อ Collection, ID..." }}
        filters={[{ ...STATUS_FILTER_OPTIONS, value: statusFilter() }]}
        onFilterChange={handleFilterChange}
        sort={{ value: sort(), options: SORT_OPTIONS, onChange: setSort }}
      />

      <Show when={listStatus() !== "loading"} fallback={<ListSkeleton />}>
        <Show
          when={listStatus() === "success"}
          fallback={
            <EmptyState tone="error" icon={<RefreshIcon />} title="ไม่สามารถโหลดรายการ Collections ได้" description="เกิดข้อผิดพลาดชั่วคราว ลองโหลดข้อมูลอีกครั้ง" actionLabel="ลองอีกครั้ง" onAction={loadList} class="bg-surface-card shadow-card" />
          }
        >
          <Show
            when={sorted().length > 0}
            fallback={
              <EmptyState
                icon={<LayersIcon />}
                title={hasActiveFilters() ? "ไม่พบ Collection ที่ตรงกับการค้นหา" : "ยังไม่มี Collection"}
                description={hasActiveFilters() ? "ลองเปลี่ยนคำค้นหาหรือตัวกรอง" : "สร้าง Collection แรกของคุณเพื่อเริ่มต้น"}
                actionLabel={hasActiveFilters() ? "ล้างตัวกรอง" : "สร้าง Collection"}
                onAction={hasActiveFilters() ? clearFilters : () => navigate("/admin/content/product-collections/new")}
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
                      <StatusBadge tone={COLLECTION_STATUS_META[row.status].tone}>{COLLECTION_STATUS_META[row.status].label}</StatusBadge>
                    </div>
                    <p class="text-xs text-ink-gray">{row.products.length} สินค้า · แก้ไขล่าสุด {row.updatedAt}</p>
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
        actions={[{ label: "ลบ", tone: "danger", onClick: () => setConfirmBulkDelete(true) }]}
      />

      <QuickViewDrawer
        open={quickViewCollection() !== undefined}
        onOpenChange={(open) => !open && setQuickViewId(null)}
        title={quickViewCollection()?.name ?? ""}
        onViewFull={() => {
          const id = quickViewId();
          setQuickViewId(null);
          if (id) navigate(`/admin/content/product-collections/${id}`);
        }}
      >
        <Show when={quickViewCollection()}>{(c) => <CollectionQuickView collection={c()} />}</Show>
      </QuickViewDrawer>

      <ConfirmDialog
        open={confirmDelete() !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title="ลบ Collection?"
        description={`คุณต้องการลบ "${confirmDelete()?.name ?? ""}" หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`}
        confirmLabel="ลบ"
        tone="danger"
        loading={actionLoading()}
        onConfirm={confirmDeleteAction}
      />

      <ConfirmDialog
        open={confirmBulkDelete()}
        onOpenChange={setConfirmBulkDelete}
        title="ลบ Collection ที่เลือก?"
        description={`คุณต้องการลบ Collection ${selectedIds().size} รายการที่เลือกหรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`}
        confirmLabel="ลบ"
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
          if (b.deps.navRefs.length > 0) parts.push(`ถูกใช้งานใน Navigation: ${b.deps.navRefs.map((r) => describeNavigationReference(r, navigation.items())).join(", ")}`);
          if (b.deps.pageRefs.length > 0) parts.push(`ถูกใช้งานใน Promotion Page: ${b.deps.pageRefs.map((r) => (r.isHomepage ? "Homepage" : r.pageName)).join(", ")}`);
          return `"${b.collection.name}" — ${parts.join(" / ")} กรุณาย้ายหรือแก้ไขข้อมูลที่เกี่ยวข้องก่อนลบ Collection นี้`;
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
      {Array.from({ length: 5 }).map(() => (
        <div class="flex items-center gap-3 rounded-card bg-surface-card p-3 shadow-card">
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
