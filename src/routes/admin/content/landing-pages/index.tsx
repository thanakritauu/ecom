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
import { LandingPageStatusSummary } from "~/components/admin/content/LandingPageStatusSummary";
import { LandingPageRowActionsMenu } from "~/components/admin/content/LandingPageRowActionsMenu";
import { LandingPageQuickView } from "~/components/admin/content/LandingPageQuickView";
import { RefreshIcon, ContentIcon, PlusIcon, ImageIcon } from "~/components/admin/icons";
import { LANDING_PAGE_STATUS_META, validatePublishRequirements, findLandingPageReferences, type LandingPage, type LandingPageStatus } from "~/lib/adminContent";
import { formatMarketingDate } from "~/lib/adminMarketing";
import { useAdminContent } from "~/lib/adminContentStore";
import { useAdminBanners } from "~/lib/adminBannerStore";
import { useAdminCampaigns } from "~/lib/adminCampaignStore";
import { useAdminHomepage } from "~/lib/adminHomepageStore";
import { pushToast } from "~/lib/toast";
import type { AsyncStatus } from "~/lib/types";

const SORT_OPTIONS = [
  { value: "updated-desc", label: "แก้ไขล่าสุด" },
  { value: "name-asc", label: "ชื่อ A→Z" },
  { value: "name-desc", label: "ชื่อ Z→A" },
  { value: "start-asc", label: "วันที่เริ่ม เก่า→ใหม่" },
  { value: "end-asc", label: "วันสิ้นสุด ใกล้ที่สุด" },
];

/**
 * Landing Page Architecture & Promotion Page Migration — was
 * `routes/admin/content/promotion-pages/index.tsx`, same `useAdminContent()`
 * data (the `LandingPage` alias of `PromotionPage`, see `adminContent.ts`),
 * only the route path/labels moved to the generic "Landing Page" vocabulary.
 * List/Search/Filter/Sort/Pagination/Bulk/QuickView, same
 * `DataTable`+`FilterBar`+`AdminBulkActionBar` shell every other Admin list
 * module already uses.
 */
export default function AdminLandingPagesListPage() {
  const store = useAdminContent();
  const bannerStore = useAdminBanners();
  const campaignStore = useAdminCampaigns();
  const homepageStore = useAdminHomepage();
  const navigate = useNavigate();

  const [search, setSearchRaw] = createSignal("");
  const [statusFilter, setStatusFilterRaw] = createSignal<"all" | LandingPageStatus>("all");
  const [navFilter, setNavFilterRaw] = createSignal<"all" | "visible" | "hidden">("all");
  const [sort, setSortRaw] = createSignal("updated-desc");
  const [page, setPage] = createSignal(1);
  const [pageSize, setPageSizeRaw] = createSignal(10);
  const [listStatus, setListStatus] = createSignal<AsyncStatus>("loading");
  const [selectedIds, setSelectedIds] = createSignal<Set<string>>(new Set());
  const [quickViewId, setQuickViewId] = createSignal<string | null>(null);
  const [confirmDelete, setConfirmDelete] = createSignal<LandingPage | null>(null);
  const [confirmToggle, setConfirmToggle] = createSignal<LandingPage | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = createSignal(false);
  const [actionLoading, setActionLoading] = createSignal(false);
  const quickViewPage = createMemo(() => (quickViewId() ? store.getById(quickViewId()!) : undefined));

  const loadList = () => {
    setListStatus("loading");
    setTimeout(() => setListStatus(Math.random() < 0.08 ? "error" : "success"), 400);
  };
  onMount(loadList);

  const resetPage = () => setPage(1);
  const setSearch = (v: string) => { setSearchRaw(v); resetPage(); };
  const setStatusFilter = (v: "all" | LandingPageStatus) => { setStatusFilterRaw(v); resetPage(); };
  const setNavFilter = (v: "all" | "visible" | "hidden") => { setNavFilterRaw(v); resetPage(); };
  const setSort = (v: string) => { setSortRaw(v); resetPage(); };
  const setPageSize = (v: number) => { setPageSizeRaw(v); resetPage(); };

  const hasActiveFilters = () => search().trim() !== "" || statusFilter() !== "all" || navFilter() !== "all";
  const clearFilters = () => {
    setSearchRaw("");
    setStatusFilterRaw("all");
    setNavFilterRaw("all");
    resetPage();
  };

  const navFilterConfig = (): SelectFilterConfig => ({
    id: "nav",
    label: "Navigation",
    value: navFilter(),
    options: [
      { value: "all", label: "Navigation: ทั้งหมด" },
      { value: "visible", label: "แสดงบน Navigation" },
      { value: "hidden", label: "ซ่อนจาก Navigation" },
    ],
  });
  const handleFilterChange = (id: string, value: string) => {
    if (id === "nav") setNavFilter(value as "all" | "visible" | "hidden");
  };

  const statusCounts = createMemo(() => {
    const tally: Partial<Record<"all" | LandingPageStatus, number>> = { all: store.pages().length };
    for (const p of store.pages()) tally[p.status] = (tally[p.status] ?? 0) + 1;
    return tally;
  });

  const filtered = createMemo(() => {
    const status = statusFilter();
    const q = search().trim().toLowerCase();
    const nav = navFilter();
    return store.pages().filter((p) => {
      if (status !== "all" && p.status !== status) return false;
      if (nav === "visible" && !p.navigation.enabled) return false;
      if (nav === "hidden" && p.navigation.enabled) return false;
      if (q && !`${p.name} ${p.slug} ${p.id}`.toLowerCase().includes(q)) return false;
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
      case "start-asc":
        return list.sort((a, b) => a.startDate.localeCompare(b.startDate));
      case "end-asc":
        return list.sort((a, b) => a.endDate.localeCompare(b.endDate));
      default:
        return list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
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

  /** §26 — same reference check the Detail page uses, so List's own Delete warns just as accurately. */
  const deleteReferences = createMemo(() => {
    const p = confirmDelete();
    if (!p) return [];
    return [
      ...new Set(
        findLandingPageReferences(p.id, {
          banners: bannerStore.banners(),
          campaigns: campaignStore.campaigns(),
          homepageSections: [...homepageStore.draftSections(), ...homepageStore.publishedSections()],
          allPages: store.pages(),
        }),
      ),
    ];
  });

  const requestDelete = (p: LandingPage) => setConfirmDelete(p);
  const confirmDeleteAction = async () => {
    const p = confirmDelete();
    if (!p) return;
    setActionLoading(true);
    await store.remove(p.id);
    setActionLoading(false);
    setConfirmDelete(null);
    pushToast(`ลบ "${p.name}" เรียบร้อยแล้ว`, "error");
  };

  const requestToggle = (p: LandingPage) => setConfirmToggle(p);
  const confirmToggleAction = async () => {
    const p = confirmToggle();
    if (!p) return;
    if (p.status !== "published") {
      const errs = validatePublishRequirements(p);
      if (errs.length > 0) {
        setConfirmToggle(null);
        pushToast(`ไม่สามารถเผยแพร่ "${p.name}" ได้: ${errs[0]}`, "error");
        return;
      }
    }
    setActionLoading(true);
    await store.setStatus(p.id, p.status === "published" ? "unpublished" : "published");
    setActionLoading(false);
    setConfirmToggle(null);
    pushToast(p.status === "published" ? "ยกเลิกการเผยแพร่แล้ว" : "เผยแพร่หน้าแล้ว", "success");
  };

  const handleDuplicate = async (p: LandingPage) => {
    const created = await store.duplicate(p.id);
    pushToast(`ทำสำเนา "${p.name}" เรียบร้อยแล้ว`, "success");
    navigate(`/admin/content/landing-pages/${created.id}/edit`);
  };

  const confirmBulkDeleteAction = async () => {
    const ids = [...selectedIds()];
    setActionLoading(true);
    await Promise.all(ids.map((id) => store.remove(id)));
    setActionLoading(false);
    setConfirmBulkDelete(false);
    clearSelection();
    pushToast(`ลบ Landing Page ${ids.length} รายการเรียบร้อยแล้ว`, "error");
  };

  const bulkSetStatus = async (targetStatus: "published" | "unpublished") => {
    const ids = [...selectedIds()];
    const targets = store.pages().filter((p) => ids.includes(p.id));
    const blocked = targetStatus === "published" ? targets.filter((p) => validatePublishRequirements(p).length > 0) : [];
    const ok = targets.filter((p) => !blocked.includes(p));
    await Promise.all(ok.map((p) => store.setStatus(p.id, targetStatus)));
    clearSelection();
    if (blocked.length > 0) {
      pushToast(`เผยแพร่ไม่สำเร็จ ${blocked.length} รายการ (ข้อมูลไม่ครบ) — สำเร็จ ${ok.length} รายการ`, "warning");
    } else {
      pushToast(targetStatus === "published" ? `เผยแพร่ ${ok.length} รายการแล้ว` : `ยกเลิกการเผยแพร่ ${ok.length} รายการแล้ว`, "success");
    }
  };

  const columns: DataTableColumn<LandingPage>[] = [
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
      key: "banner",
      label: "",
      render: (row) => (
        <div class="flex size-11 items-center justify-center overflow-hidden rounded-media bg-surface-gray/60 text-ink-placeholder">
          <Show when={row.banners.desktop} fallback={<ImageIcon class="size-4" />}>
            <img src={row.banners.desktop} alt="" class="size-full object-cover" />
          </Show>
        </div>
      ),
    },
    { key: "name", label: "Page Title", render: (row) => <p class="font-medium text-ink">{row.name}</p> },
    { key: "slug", label: "Slug", hideBelowXl: true, render: (row) => <span class="text-ink-gray">/{row.slug}</span> },
    { key: "products", label: "จำนวนสินค้า", align: "right", hideBelowXl: true, render: (row) => <span class="text-ink-gray">{row.products.length}</span> },
    { key: "start", label: "Start Date", hideBelowXl: true, render: (row) => <span class="whitespace-nowrap text-ink-gray">{row.startDate ? formatMarketingDate(row.startDate) : "—"}</span> },
    { key: "end", label: "End Date", hideBelowXl: true, render: (row) => <span class="whitespace-nowrap text-ink-gray">{row.endDate ? formatMarketingDate(row.endDate) : "—"}</span> },
    { key: "status", label: "Status", render: (row) => <StatusBadge tone={LANDING_PAGE_STATUS_META[row.status].tone}>{LANDING_PAGE_STATUS_META[row.status].label}</StatusBadge> },
    {
      key: "navigation",
      label: "Navigation",
      hideBelowXl: true,
      render: (row) => (
        <StatusBadge tone={row.navigation.enabled ? "success" : "neutral"}>{row.navigation.enabled ? "แสดง" : "ซ่อน"}</StatusBadge>
      ),
    },
    { key: "updated", label: "Updated", hideBelowXl: true, render: (row) => <span class="whitespace-nowrap text-ink-gray">{row.updatedAt}</span> },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (row) => (
        <LandingPageRowActionsMenu
          id={row.id}
          name={row.name}
          isPublished={row.status === "published"}
          onTogglePublish={() => requestToggle(row)}
          onDuplicate={() => handleDuplicate(row)}
          onDelete={() => requestDelete(row)}
        />
      ),
    },
  ];

  return (
    <div class="flex flex-col gap-6" classList={{ "pb-20": selectedIds().size > 0 }}>
      <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "เนื้อหา", href: "/admin/content" }, { label: "Landing Pages" }]} />
      <PageHeader
        title="Landing Pages"
        description="จัดการหน้า Landing Page สำหรับ Shopping / Merchandising / Content Experience"
        actions={
          <Button href="/admin/content/landing-pages/new" variant="primary">
            <PlusIcon class="size-4" /> เพิ่ม Landing Page
          </Button>
        }
      />

      <LandingPageStatusSummary value={statusFilter()} counts={statusCounts()} onChange={setStatusFilter} />

      <FilterBar
        search={{ value: search(), onInput: setSearch, placeholder: "ค้นหาชื่อหน้า, Slug, ID..." }}
        filters={[navFilterConfig()]}
        onFilterChange={handleFilterChange}
        sort={{ value: sort(), options: SORT_OPTIONS, onChange: setSort }}
      />
      <Show when={hasActiveFilters()}>
        <div>
          <Button type="button" variant="outline" size="sm" onClick={clearFilters}>
            ล้างตัวกรอง
          </Button>
        </div>
      </Show>

      <Show when={listStatus() !== "loading"} fallback={<ListSkeleton />}>
        <Show
          when={listStatus() === "success"}
          fallback={
            <EmptyState tone="error" icon={<RefreshIcon />} title="ไม่สามารถโหลดรายการ Landing Pages ได้" description="เกิดข้อผิดพลาดชั่วคราว ลองโหลดข้อมูลอีกครั้ง" actionLabel="ลองอีกครั้ง" onAction={loadList} class="bg-white shadow-card" />
          }
        >
          <Show
            when={sorted().length > 0}
            fallback={
              <EmptyState
                icon={<ContentIcon />}
                title={hasActiveFilters() ? "ไม่พบหน้าที่ตรงกับการค้นหา" : "ยังไม่มี Landing Page"}
                description={hasActiveFilters() ? "ลองเปลี่ยนคำค้นหาหรือตัวกรอง" : "สร้างหน้าแรกของคุณเพื่อเริ่มต้น"}
                actionLabel={hasActiveFilters() ? "ล้างตัวกรอง" : "เพิ่ม Landing Page"}
                onAction={hasActiveFilters() ? clearFilters : () => navigate("/admin/content/landing-pages/new")}
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
                      <div class="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-media bg-surface-gray/60 text-ink-placeholder">
                        <Show when={row.banners.desktop} fallback={<ImageIcon class="size-4" />}>
                          <img src={row.banners.desktop} alt="" class="size-full object-cover" />
                        </Show>
                      </div>
                      <div class="min-w-0 flex-1">
                        <div class="flex items-start justify-between gap-2">
                          <p class="truncate font-semibold text-ink">{row.name}</p>
                          <StatusBadge tone={LANDING_PAGE_STATUS_META[row.status].tone}>{LANDING_PAGE_STATUS_META[row.status].label}</StatusBadge>
                        </div>
                        <p class="text-sm text-ink-gray">/{row.slug}</p>
                      </div>
                    </div>
                    <p class="text-xs text-ink-gray">{row.products.length} สินค้า · แก้ไขล่าสุด {row.updatedAt}</p>
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
          { label: "เผยแพร่", onClick: () => bulkSetStatus("published") },
          { label: "ยกเลิกการเผยแพร่", onClick: () => bulkSetStatus("unpublished") },
          { label: "ลบ", tone: "danger", onClick: () => setConfirmBulkDelete(true) },
        ]}
      />

      <QuickViewDrawer
        open={quickViewPage() !== undefined}
        onOpenChange={(open) => !open && setQuickViewId(null)}
        title={quickViewPage()?.name ?? ""}
        subtitle={quickViewPage() ? `/${quickViewPage()!.slug}` : undefined}
        onViewFull={() => {
          const id = quickViewId();
          setQuickViewId(null);
          if (id) navigate(`/admin/content/landing-pages/${id}`);
        }}
      >
        <Show when={quickViewPage()}>{(p) => <LandingPageQuickView page={p()} />}</Show>
      </QuickViewDrawer>

      <ConfirmDialog
        open={confirmDelete() !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title="ลบ Landing Page?"
        description={
          deleteReferences().length > 0
            ? `คุณต้องการลบ "${confirmDelete()?.name ?? ""}" หรือไม่? หน้านี้ถูกอ้างอิงอยู่โดย ${deleteReferences().join(", ")} — เมื่อลบแล้ว Navigation ที่เชื่อมโยงมาจะใช้งานไม่ได้ การกระทำนี้ไม่สามารถย้อนกลับได้`
            : `คุณต้องการลบ "${confirmDelete()?.name ?? ""}" หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`
        }
        confirmLabel="ลบ"
        tone="danger"
        loading={actionLoading()}
        onConfirm={confirmDeleteAction}
      />

      <ConfirmDialog
        open={confirmToggle() !== null}
        onOpenChange={(open) => !open && setConfirmToggle(null)}
        title={confirmToggle()?.status === "published" ? "ยกเลิกการเผยแพร่หน้านี้?" : "เผยแพร่หน้านี้?"}
        description={`"${confirmToggle()?.name ?? ""}"`}
        confirmLabel={confirmToggle()?.status === "published" ? "ยกเลิกการเผยแพร่" : "เผยแพร่"}
        loading={actionLoading()}
        onConfirm={confirmToggleAction}
      />

      <ConfirmDialog
        open={confirmBulkDelete()}
        onOpenChange={setConfirmBulkDelete}
        title="ลบหน้าที่เลือก?"
        description={`คุณต้องการลบ Landing Page ${selectedIds().size} รายการที่เลือกหรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`}
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
