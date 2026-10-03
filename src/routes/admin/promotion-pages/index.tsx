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
import { LandingPageStatusSummary } from "~/components/admin/content/LandingPageStatusSummary";
import { LandingPageRowActionsMenu } from "~/components/admin/content/LandingPageRowActionsMenu";
import { LandingPageQuickView } from "~/components/admin/content/LandingPageQuickView";
import { RefreshIcon, ContentIcon, PlusIcon, ImageIcon } from "~/components/admin/icons";
import { LANDING_PAGE_STATUS_META, validatePublishRequirements, findLandingPageReferences, type LandingPage, type LandingPageStatus } from "~/lib/adminContent";
import { formatMarketingDate } from "~/lib/adminMarketing";
import { useAdminContent } from "~/lib/adminContentStore";
import { useAdminNavigation } from "~/lib/adminNavigationStore";
import { findNavigationReferences, describeNavigationReference, type NavigationItem } from "~/lib/adminNavigation";
import { useAdminBanners } from "~/lib/adminBannerStore";
import { useAdminCampaigns } from "~/lib/adminCampaignStore";
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
 * หน้าโปรโมชั่น Architecture & หน้าโปรโมชั่น Migration — was
 * `routes/admin/content/promotion-pages/index.tsx`, same `useAdminContent()`
 * data (the `LandingPage` alias of `PromotionPage`, see `adminContent.ts`),
 * only the route path/labels moved to the generic "หน้าโปรโมชั่น" vocabulary.
 * List/Search/Filter/Sort/Pagination/Bulk/QuickView, same
 * `DataTable`+`FilterBar`+`AdminBulkActionBar` shell every other Admin list
 * module already uses.
 */
export default function AdminLandingPagesListPage() {
  const store = useAdminContent();
  const bannerStore = useAdminBanners();
  const campaignStore = useAdminCampaigns();
  const navigation = useAdminNavigation();
  const navigate = useNavigate();

  const [search, setSearchRaw] = createSignal("");
  const [statusFilter, setStatusFilterRaw] = createSignal<"all" | LandingPageStatus>("all");
  const [sort, setSortRaw] = createSignal("updated-desc");
  const [page, setPage] = createSignal(1);
  const [pageSize, setPageSizeRaw] = createSignal(10);
  const [listStatus, setListStatus] = createSignal<AsyncStatus>("loading");
  const [selectedIds, setSelectedIds] = createSignal<Set<string>>(new Set());
  const [quickViewId, setQuickViewId] = createSignal<string | null>(null);
  const [confirmDelete, setConfirmDelete] = createSignal<LandingPage | null>(null);
  const [confirmToggle, setConfirmToggle] = createSignal<LandingPage | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = createSignal(false);
  const [blockedDelete, setBlockedDelete] = createSignal<{ page: LandingPage; refs: NavigationItem[] } | null>(null);
  const [actionLoading, setActionLoading] = createSignal(false);
  const quickViewPage = createMemo(() => (quickViewId() ? store.getById(quickViewId()!) : undefined));
  const quickViewSubtitle = createMemo(() => {
    const page = quickViewPage();
    if (!page) return undefined;
    return page.isHomepage ? "/" : `/${page.slug}`;
  });

  const loadList = () => {
    setListStatus("loading");
    setTimeout(() => setListStatus(Math.random() < 0.08 ? "error" : "success"), 400);
  };
  onMount(loadList);

  const resetPage = () => setPage(1);
  const setSearch = (v: string) => { setSearchRaw(v); resetPage(); };
  const setStatusFilter = (v: "all" | LandingPageStatus) => { setStatusFilterRaw(v); resetPage(); };
  const setSort = (v: string) => { setSortRaw(v); resetPage(); };
  const setPageSize = (v: number) => { setPageSizeRaw(v); resetPage(); };

  const hasActiveFilters = () => search().trim() !== "" || statusFilter() !== "all";
  const clearFilters = () => {
    setSearchRaw("");
    setStatusFilterRaw("all");
    resetPage();
  };

  const statusCounts = createMemo(() => {
    const tally: Partial<Record<"all" | LandingPageStatus, number>> = { all: store.pages().length };
    for (const p of store.pages()) tally[p.status] = (tally[p.status] ?? 0) + 1;
    return tally;
  });

  const filtered = createMemo(() => {
    const status = statusFilter();
    const q = search().trim().toLowerCase();
    return store.pages().filter((p) => {
      if (status !== "all" && p.status !== status) return false;
      if (q && !`${p.name} ${p.slug} ${p.id}`.toLowerCase().includes(q)) return false;
      return true;
    });
  });

  /** §14/§15 — Homepage is pinned to the very top of the list regardless of the active sort, so it's always the first thing an admin sees; it's excluded like any other row when a filter/search hides it. */
  const sorted = createMemo(() => {
    const list = [...filtered()];
    const sortRest = (rest: LandingPage[]) => {
      switch (sort()) {
        case "name-asc":
          return rest.sort((a, b) => a.name.localeCompare(b.name));
        case "name-desc":
          return rest.sort((a, b) => b.name.localeCompare(a.name));
        case "start-asc":
          return rest.sort((a, b) => a.startDate.localeCompare(b.startDate));
        case "end-asc":
          return rest.sort((a, b) => a.endDate.localeCompare(b.endDate));
        default:
          return rest.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      }
    };
    const home = list.find((p) => p.isHomepage);
    const rest = sortRest(list.filter((p) => !p.isHomepage));
    return home ? [home, ...rest] : rest;
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
          allPages: store.pages(),
        }),
      ),
    ];
  });

  const [blockedHomepageDelete, setBlockedHomepageDelete] = createSignal(false);

  /** §44 — the Homepage can never be deleted (checked first); then §6/§19's dependency guard — a หน้าโปรโมชั่น a NavigationItem points at must never be deleted out from under it. Both block *before* the Banners/Campaigns/other-Promotion-Pages reference warning below, which still allows deleting through. */
  const requestDelete = (p: LandingPage) => {
    if (p.isHomepage) {
      setBlockedHomepageDelete(true);
      return;
    }
    const refs = findNavigationReferences(navigation.items(), "promotion_page", p.id);
    if (refs.length > 0) setBlockedDelete({ page: p, refs });
    else setConfirmDelete(p);
  };
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
    navigate(`/admin/promotion-pages/${created.id}/edit`);
  };

  const confirmBulkDeleteAction = async () => {
    const ids = [...selectedIds()];
    setActionLoading(true);
    await Promise.all(ids.map((id) => store.remove(id)));
    setActionLoading(false);
    setConfirmBulkDelete(false);
    clearSelection();
    pushToast(`ลบหน้าโปรโมชั่น ${ids.length} รายการเรียบร้อยแล้ว`, "error");
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
    {
      key: "name",
      label: "Page Title",
      render: (row) => (
        <div class="flex items-center gap-2">
          <p class="font-medium text-ink">{row.name}</p>
          <Show when={row.isHomepage}>
            <span class="shrink-0 rounded-pill bg-surface-pink px-2 py-0.5 text-xs font-medium text-brand-pink">★ Homepage</span>
          </Show>
        </div>
      ),
    },
    { key: "slug", label: "Slug", hideBelowXl: true, render: (row) => <span class="text-ink-gray">{row.isHomepage ? "/" : `/${row.slug}`}</span> },
    { key: "products", label: "จำนวนสินค้า", align: "right", hideBelowXl: true, render: (row) => <span class="text-ink-gray">{row.products.length}</span> },
    { key: "start", label: "Start Date", hideBelowXl: true, render: (row) => <span class="whitespace-nowrap text-ink-gray">{row.startDate ? formatMarketingDate(row.startDate) : "—"}</span> },
    { key: "end", label: "End Date", hideBelowXl: true, render: (row) => <span class="whitespace-nowrap text-ink-gray">{row.endDate ? formatMarketingDate(row.endDate) : "—"}</span> },
    { key: "status", label: "Status", render: (row) => <StatusBadge tone={LANDING_PAGE_STATUS_META[row.status].tone}>{LANDING_PAGE_STATUS_META[row.status].label}</StatusBadge> },
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
          hideDelete={row.isHomepage}
          onTogglePublish={() => requestToggle(row)}
          onDuplicate={() => handleDuplicate(row)}
          onDelete={() => requestDelete(row)}
        />
      ),
    },
  ];

  return (
    <div class="flex flex-col gap-6" classList={{ "pb-20": selectedIds().size > 0 }}>
      <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "จัดการเนื้อหา", href: "/admin/promotion-pages" }, { label: "หน้าโปรโมชั่น" }]} />
      <PageHeader
        title="หน้าโปรโมชั่น"
        description="จัดการหน้าโปรโมชั่น สำหรับ Shopping / Merchandising / Content Experience"
        actions={
          <div class="flex flex-wrap items-center gap-2">
            <Button href="/admin/promotion-pages/new" variant="primary">
              <PlusIcon class="size-4" /> เพิ่มหน้าโปรโมชั่น
            </Button>
          </div>
        }
      />

      <LandingPageStatusSummary value={statusFilter()} counts={statusCounts()} onChange={setStatusFilter} />

      <FilterBar
        search={{ value: search(), onInput: setSearch, placeholder: "ค้นหาชื่อหน้า, Slug, ID..." }}
        filters={[]}
        onFilterChange={() => {}}
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
            <EmptyState tone="error" icon={<RefreshIcon />} title="ไม่สามารถโหลดรายการหน้าโปรโมชั่นได้" description="เกิดข้อผิดพลาดชั่วคราว ลองโหลดข้อมูลอีกครั้ง" actionLabel="ลองอีกครั้ง" onAction={loadList} class="bg-surface-card shadow-card" />
          }
        >
          <Show
            when={sorted().length > 0}
            fallback={
              <EmptyState
                icon={<ContentIcon />}
                title={hasActiveFilters() ? "ไม่พบหน้าที่ตรงกับการค้นหา" : "ยังไม่มีหน้าโปรโมชั่น"}
                description={hasActiveFilters() ? "ลองเปลี่ยนคำค้นหาหรือตัวกรอง" : "สร้างหน้าแรกของคุณเพื่อเริ่มต้น"}
                actionLabel={hasActiveFilters() ? "ล้างตัวกรอง" : "เพิ่มหน้าโปรโมชั่น"}
                onAction={hasActiveFilters() ? clearFilters : () => navigate("/admin/promotion-pages/new")}
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
                    <div class="flex items-start gap-3">
                      <div class="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-media bg-surface-gray/60 text-ink-placeholder">
                        <Show when={row.banners.desktop} fallback={<ImageIcon class="size-4" />}>
                          <img src={row.banners.desktop} alt="" class="size-full object-cover" />
                        </Show>
                      </div>
                      <div class="min-w-0 flex-1">
                        <div class="flex items-start justify-between gap-2">
                          <p class="truncate font-semibold text-ink">
                            {row.name}
                            <Show when={row.isHomepage}> ★</Show>
                          </p>
                          <StatusBadge tone={LANDING_PAGE_STATUS_META[row.status].tone}>{LANDING_PAGE_STATUS_META[row.status].label}</StatusBadge>
                        </div>
                        <p class="text-sm text-ink-gray">{row.isHomepage ? "/" : `/${row.slug}`}</p>
                      </div>
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
        subtitle={quickViewSubtitle()}
        onViewFull={() => {
          const id = quickViewId();
          setQuickViewId(null);
          if (id) navigate(`/admin/promotion-pages/${id}`);
        }}
      >
        <Show when={quickViewPage()}>{(p) => <LandingPageQuickView page={p()} />}</Show>
      </QuickViewDrawer>

      <ConfirmDialog
        open={confirmDelete() !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title="ลบหน้าโปรโมชั่น?"
        description={
          deleteReferences().length > 0
            ? `คุณต้องการลบ "${confirmDelete()?.name ?? ""}" หรือไม่? หน้านี้ถูกอ้างอิงอยู่โดย ${deleteReferences().join(", ")} การกระทำนี้ไม่สามารถย้อนกลับได้`
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
        description={`คุณต้องการลบหน้าโปรโมชั่น ${selectedIds().size} รายการที่เลือกหรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`}
        confirmLabel="ลบ"
        tone="danger"
        loading={actionLoading()}
        onConfirm={confirmBulkDeleteAction}
      />

      <ConfirmDialog
        open={blockedHomepageDelete()}
        onOpenChange={setBlockedHomepageDelete}
        title="ไม่สามารถลบ Homepage ได้"
        description="เว็บไซต์ต้องมี Homepage อยู่เสมอ — กรุณากำหนดหน้าโปรโมชั่นอื่นเป็น Homepage ก่อน (ฟีเจอร์นี้ยังไม่เปิดใช้งานใน Prototype นี้) จึงจะสามารถลบหน้านี้ได้"
        confirmLabel="เข้าใจแล้ว"
        cancelLabel="ปิด"
        onConfirm={() => setBlockedHomepageDelete(false)}
      />

      <ConfirmDialog
        open={blockedDelete() !== null}
        onOpenChange={(open) => !open && setBlockedDelete(null)}
        title="ไม่สามารถลบได้"
        description={`"${blockedDelete()?.page.name ?? ""}" ถูกใช้งานใน Navigation อยู่ — เมนูที่อ้างอิง: ${blockedDelete()
          ?.refs.map((r) => `- ${describeNavigationReference(r, navigation.items())}`)
          .join(" ") ?? ""} กรุณาย้ายหรือแก้ไขเมนูเหล่านี้ในหน้า Navigation ก่อนลบหน้านี้`}
        confirmLabel="ไปที่ Navigation"
        cancelLabel="ปิด"
        onConfirm={() => {
          setBlockedDelete(null);
          navigate("/admin/navigation");
        }}
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
