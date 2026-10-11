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
import { ExportMenu } from "~/components/admin/ExportMenu";
import type { ExportColumn } from "~/lib/adminExport";
import { useAdminProducts } from "~/lib/adminProductStore";
import { CollectionRowActionsMenu } from "~/components/admin/content/CollectionRowActionsMenu";
import { CollectionQuickView } from "~/components/admin/content/CollectionQuickView";
import { RefreshIcon, LayersIcon, PlusIcon, ImageIcon } from "~/components/admin/icons";
import { COLLECTION_STATUS_META, collectionPublishProblems, type ProductCollection, type CollectionStatus } from "~/lib/adminCollections";
import { useAdminCollections } from "~/lib/adminCollectionStore";
import { useAdminContent } from "~/lib/adminContentStore";
import { useAdminNavigation } from "~/lib/adminNavigationStore";
import { findNavigationReferences, describeNavigationReference, type NavigationItem } from "~/lib/adminNavigation";
import { findCollectionReferencesInPromotionPages, type PromotionPageSectionReference } from "~/lib/masterDataRelations";
import { pushToast } from "~/lib/toast";
import type { AsyncStatus } from "~/lib/types";

const SORT_OPTIONS = [
  { value: "updated-desc", label: "แก้ไขล่าสุด" },
  { value: "name-asc", label: "ชื่อกลุ่มสินค้าพิเศษ A-Z" },
  { value: "name-desc", label: "ชื่อกลุ่มสินค้าพิเศษ Z-A" },
];

const STATUS_FILTER_OPTIONS: SelectFilterConfig = {
  id: "status",
  label: "สถานะ",
  value: "all",
  options: [
    { value: "all", label: "ทุกสถานะ" },
    { value: "draft", label: COLLECTION_STATUS_META.draft.label },
    { value: "active", label: COLLECTION_STATUS_META.active.label },
    { value: "inactive", label: COLLECTION_STATUS_META.inactive.label },
  ],
};

/** List/Search/Filter/Sort/Pagination/Bulk/QuickView — same `DataTable`+`FilterBar`+`AdminBulkActionBar` shell every other Admin list module uses, kept intentionally simple (no status tab bar, no date range — Collections don't have those concepts). */
export default function AdminProductCollectionsListPage() {
  const store = useAdminCollections();
  const contentStore = useAdminContent();
  const navigation = useAdminNavigation();
  const productStore = useAdminProducts();
  const navigate = useNavigate();

  const [search, setSearchRaw] = createSignal("");
  const [statusFilter, setStatusFilterRaw] = createSignal<"all" | CollectionStatus>("all");
  const [sort, setSortRaw] = createSignal("updated-desc");
  const [page, setPage] = createSignal(1);
  const [pageSize, setPageSizeRaw] = createSignal(20);
  const [listStatus, setListStatus] = createSignal<AsyncStatus>("loading");
  const [selectedIds, setSelectedIds] = createSignal<Set<string>>(new Set());
  const [quickViewId, setQuickViewId] = createSignal<string | null>(null);
  const [confirmDelete, setConfirmDelete] = createSignal<ProductCollection | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = createSignal(false);
  const [confirmToggle, setConfirmToggle] = createSignal<ProductCollection | null>(null);
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
      pushToast(`ลบสำเร็จ ${ok.length} รายการ และลบไม่ได้ ${blocked.length} รายการเพราะยังมีการใช้งานอยู่`, "warning");
    } else {
      pushToast(`ลบกลุ่มสินค้าพิเศษ ${ok.length} รายการเรียบร้อยแล้ว`, "error");
    }
  };

  const confirmToggleAction = async () => {
    const c = confirmToggle();
    if (!c) return;
    setActionLoading(true);
    try {
      await store.setStatus(c.id, c.status === "active" ? "inactive" : "active");
      pushToast(c.status === "active" ? "ปิดใช้งานกลุ่มสินค้าพิเศษแล้ว" : "เปิดใช้งานกลุ่มสินค้าพิเศษแล้ว", "success");
      setConfirmToggle(null);
    } catch {
      pushToast("เปลี่ยนสถานะไม่สำเร็จ กรุณาลองใหม่อีกครั้ง", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const bulkSetStatus = async (status: CollectionStatus) => {
    const targets = store.collections().filter((c) => selectedIds().has(c.id));
    // Draft-first: เปิดใช้งาน publishes a draft only when it passes the publish checks; ปิดใช้งาน leaves drafts as drafts.
    const blocked = status === "active" ? targets.filter((c) => c.status === "draft" && collectionPublishProblems(c).length > 0) : [];
    const ok = targets.filter((c) => !blocked.includes(c) && !(status === "inactive" && c.status === "draft"));
    await Promise.all(ok.map((c) => store.setStatus(c.id, status)));
    clearSelection();
    pushToast(status === "active" ? `เปิดใช้งาน ${ok.length} รายการแล้ว` : `ปิดใช้งาน ${ok.length} รายการแล้ว`, "success");
    if (blocked.length > 0) pushToast(`เผยแพร่ไม่ได้ ${blocked.length} รายการ`, "warning", `ข้อมูลยังไม่ครบ: ${blocked.map((c) => c.name).join(", ")}`);
  };

  /** Row action for a แบบร่าง: same checks as the form's บันทึกและเผยแพร่; refuses with a toast naming what's missing. */
  const publish = async (c: ProductCollection) => {
    const problems = collectionPublishProblems(c);
    if (problems.length > 0) {
      pushToast(`เผยแพร่ "${c.name}" ไม่ได้`, "error", `ยังกรอกข้อมูลไม่ครบ: ${problems.join(", ")}`);
      return;
    }
    await store.setStatus(c.id, "active");
    pushToast(`เผยแพร่ "${c.name}" แล้ว`, "success");
  };
  const requestToggle = (c: ProductCollection) => (c.status === "draft" ? void publish(c) : setConfirmToggle(c));

  const thumbOf = (c: ProductCollection) => {
    const first = c.products[0];
    return first ? productStore.getById(first.productId)?.image : undefined;
  };

  const exportColumns: ExportColumn<ProductCollection>[] = [
    { header: "ชื่อกลุ่มสินค้าพิเศษ", value: (c) => c.name },
    { header: "จำนวนสินค้า", value: (c) => c.products.length },
    { header: "สถานะ", value: (c) => COLLECTION_STATUS_META[c.status].label },
    { header: "แก้ไขล่าสุด", value: (c) => c.updatedAt },
  ];

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
    {
      key: "name",
      label: "กลุ่มสินค้าพิเศษ",
      render: (row) => (
        <div class="flex min-w-0 items-center gap-3">
          <Thumb src={thumbOf(row)} class="size-11" />
          <div class="min-w-0">
            <p class="truncate text-sm font-medium text-ink">{row.name}</p>
            <p class="truncate text-xs text-ink-gray">{row.id}</p>
          </div>
        </div>
      ),
    },
    { key: "products", label: "จำนวนสินค้า", align: "right", hideBelowXl: true, render: (row) => <span class="text-ink-gray">{row.products.length.toLocaleString("th-TH")}</span> },
    { key: "status", label: "สถานะ", render: (row) => <StatusBadge tone={COLLECTION_STATUS_META[row.status].tone}>{COLLECTION_STATUS_META[row.status].label}</StatusBadge> },
    { key: "updated", label: "แก้ไขล่าสุด", hideBelowXl: true, render: (row) => <span class="whitespace-nowrap text-ink-gray">{row.updatedAt}</span> },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (row) => (
        <CollectionRowActionsMenu id={row.id} name={row.name} isActive={row.status === "active"} isDraft={row.status === "draft"} onToggleStatus={() => requestToggle(row)} onDelete={() => requestDelete(row)} />
      ),
    },
  ];

  return (
    <div class="flex flex-col gap-6" classList={{ "pb-20": selectedIds().size > 0 }}>
      <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "สินค้า", href: "/admin/products" }, { label: "กลุ่มสินค้าพิเศษ" }]} />
      <PageHeader
        title="กลุ่มสินค้าพิเศษ"
        description="เลือกสินค้าเองเพื่อใช้ในหน้าแคมเปญ เมนู และหน้าแรก"
        actions={
          <div class="flex flex-wrap items-center gap-2">
            <ExportMenu filenameBase="collections-report" columns={exportColumns} rows={sorted()} />
            <Button href="/admin/content/product-collections/new" variant="primary">
              <PlusIcon class="size-4" /> เพิ่มกลุ่มสินค้าพิเศษ
            </Button>
          </div>
        }
      />

      <FilterBar
        search={{ value: search(), onInput: setSearch, placeholder: "ค้นหาชื่อกลุ่มสินค้าพิเศษ, ID..." }}
        filters={[{ ...STATUS_FILTER_OPTIONS, value: statusFilter() }]}
        onFilterChange={handleFilterChange}
        sort={{ value: sort(), options: SORT_OPTIONS, onChange: setSort }}
      />

      <Show when={listStatus() !== "loading"} fallback={<ListSkeleton />}>
        <Show
          when={listStatus() === "success"}
          fallback={
            <EmptyState tone="error" icon={<RefreshIcon />} title="ไม่สามารถโหลดรายการกลุ่มสินค้าพิเศษได้" description="เกิดข้อผิดพลาดชั่วคราว ลองโหลดข้อมูลอีกครั้ง" actionLabel="ลองอีกครั้ง" onAction={loadList} class="bg-surface-card shadow-card" />
          }
        >
          <Show
            when={sorted().length > 0}
            fallback={
              <EmptyState
                icon={<LayersIcon />}
                title={hasActiveFilters() ? "ไม่พบกลุ่มสินค้าพิเศษที่ตรงกับการค้นหา" : "ยังไม่มีกลุ่มสินค้าพิเศษ"}
                description={hasActiveFilters() ? undefined : "เริ่มเพิ่มกลุ่มสินค้าพิเศษแรกของคุณ"}
                actionLabel={hasActiveFilters() ? "ล้างการค้นหา" : "+ เพิ่มกลุ่มสินค้าพิเศษ"}
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
                <div class="flex gap-3 rounded-card bg-surface-card p-3 shadow-card">
                  <input
                    type="checkbox"
                    aria-label={`เลือก ${row.name}`}
                    checked={selectedIds().has(row.id)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => toggleSelect(row.id)}
                    class="mt-1 size-4 shrink-0 rounded accent-brand-pink"
                  />
                  <button type="button" onClick={() => setQuickViewId(row.id)} class="font-normal flex min-w-0 flex-1 gap-3 text-left">
                    <Thumb src={thumbOf(row)} class="size-16" />
                    <div class="min-w-0 flex-1">
                      <p class="truncate text-sm font-medium text-ink">{row.name}</p>
                      <p class="truncate text-xs text-ink-gray">{row.products.length.toLocaleString("th-TH")} สินค้า</p>
                      <div class="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <StatusBadge tone={COLLECTION_STATUS_META[row.status].tone}>{COLLECTION_STATUS_META[row.status].label}</StatusBadge>
                      </div>
                      <p class="mt-1 text-xs text-ink-placeholder">แก้ไขล่าสุด {row.updatedAt}</p>
                    </div>
                  </button>
                  <CollectionRowActionsMenu
                    id={row.id}
                    name={row.name}
                    isActive={row.status === "active"}
                    isDraft={row.status === "draft"}
                    onToggleStatus={() => requestToggle(row)}
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
          { label: "เปิดใช้งาน", onClick: () => bulkSetStatus("active") },
          { label: "ปิดใช้งาน", onClick: () => bulkSetStatus("inactive") },
          { label: "ลบ", tone: "danger", onClick: () => setConfirmBulkDelete(true) },
        ]}
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
        title="ลบกลุ่มสินค้าพิเศษ?"
        description={`คุณต้องการลบ "${confirmDelete()?.name ?? ""}" หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`}
        confirmLabel="ลบกลุ่มสินค้าพิเศษ"
        tone="danger"
        loading={actionLoading()}
        onConfirm={confirmDeleteAction}
      />

      <ConfirmDialog
        open={confirmBulkDelete()}
        onOpenChange={setConfirmBulkDelete}
        title="ลบกลุ่มสินค้าพิเศษที่เลือก?"
        description={`คุณต้องการลบกลุ่มสินค้าพิเศษ ${selectedIds().size} รายการที่เลือกหรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`}
        confirmLabel="ลบกลุ่มสินค้าพิเศษ"
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
          if (b.deps.navRefs.length > 0) parts.push(`ถูกใช้งานในเมนู: ${b.deps.navRefs.map((r) => describeNavigationReference(r, navigation.items())).join(", ")}`);
          if (b.deps.pageRefs.length > 0) parts.push(`ถูกใช้งานในหน้า: ${b.deps.pageRefs.map((r) => (r.isHomepage ? "หน้าแรก" : r.pageName)).join(", ")}`);
          return `กลุ่มสินค้าพิเศษ "${b.collection.name}" ${parts.join(" / ")} กรุณาย้ายหรือแก้ไขข้อมูลที่เกี่ยวข้องก่อนลบกลุ่มสินค้าพิเศษนี้`;
        })()}
        confirmLabel="เข้าใจแล้ว"
        cancelLabel="ปิด"
        onConfirm={() => setBlockedDelete(null)}
      />

      <ConfirmDialog
        open={confirmToggle() !== null}
        onOpenChange={(open) => !open && setConfirmToggle(null)}
        title={confirmToggle()?.status === "active" ? "ปิดใช้งานกลุ่มสินค้าพิเศษนี้?" : "เปิดใช้งานกลุ่มสินค้าพิเศษนี้?"}
        description={confirmToggle()?.status === "active" ? `"${confirmToggle()?.name ?? ""}" จะไม่แสดงสินค้าในส่วนที่ใช้กลุ่มสินค้าพิเศษนี้บนหน้าร้าน` : `"${confirmToggle()?.name ?? ""}" จะกลับมาแสดงสินค้าบนหน้าร้าน`}
        confirmLabel={confirmToggle()?.status === "active" ? "ปิดใช้งาน" : "เปิดใช้งาน"}
        loading={actionLoading()}
        onConfirm={confirmToggleAction}
      />
    </div>
  );
}

function Thumb(props: { src?: string; class: string }) {
  return (
    <div class={`flex shrink-0 items-center justify-center overflow-hidden rounded-media bg-surface-gray/60 text-ink-placeholder ${props.class}`}>
      <Show when={props.src} fallback={<ImageIcon class="size-5" />}>
        <img src={props.src} alt="" class="size-full object-cover" />
      </Show>
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
