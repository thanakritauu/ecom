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
import { DateRangeSelector } from "~/components/admin/dashboard/DateRangeSelector";
import { CampaignStatusSummary } from "~/components/admin/content/CampaignStatusSummary";
import { CampaignRowActionsMenu } from "~/components/admin/content/CampaignRowActionsMenu";
import { CampaignQuickView } from "~/components/admin/content/CampaignQuickView";
import { RefreshIcon, ContentIcon, PlusIcon, ImageIcon } from "~/components/admin/icons";
import { CAMPAIGN_STATUS_META, validateCampaignPublish, type Campaign, type CampaignStatus } from "~/lib/adminCampaigns";
import { formatMarketingDate } from "~/lib/adminMarketing";
import { useAdminCampaigns } from "~/lib/adminCampaignStore";
import { pushToast } from "~/lib/toast";
import type { AsyncStatus } from "~/lib/types";
import type { DashboardPeriodKey } from "~/lib/adminDashboard";

const SORT_OPTIONS = [
  { value: "updated-desc", label: "แก้ไขล่าสุด" },
  { value: "name-asc", label: "ชื่อ A→Z" },
  { value: "name-desc", label: "ชื่อ Z→A" },
  { value: "start-asc", label: "วันที่เริ่ม เก่า→ใหม่" },
  { value: "end-asc", label: "วันสิ้นสุด ใกล้ที่สุด" },
];

const TODAY_DAY = 18;
function dayOf(date: string): number {
  return Number(date.match(/-(\d+)$/)?.[1] ?? TODAY_DAY);
}
function withinPeriod(date: string, period: DashboardPeriodKey): boolean {
  if (!date) return true;
  if (period === "today") return dayOf(date) === TODAY_DAY;
  if (period === "7d") return Math.abs(TODAY_DAY - dayOf(date)) <= 7;
  return true;
}

/** List/Search/Filter/Sort/Pagination/Bulk/QuickView — same `DataTable`+`FilterBar`+`AdminBulkActionBar` shell as `promotion-pages/index.tsx`. */
export default function AdminCampaignsListPage() {
  const store = useAdminCampaigns();
  const navigate = useNavigate();

  const [search, setSearchRaw] = createSignal("");
  const [statusFilter, setStatusFilterRaw] = createSignal<"all" | CampaignStatus>("all");
  const [dateFilter, setDateFilterRaw] = createSignal<DashboardPeriodKey>("30d");
  const [sort, setSortRaw] = createSignal("updated-desc");
  const [page, setPage] = createSignal(1);
  const [pageSize, setPageSizeRaw] = createSignal(10);
  const [listStatus, setListStatus] = createSignal<AsyncStatus>("loading");
  const [selectedIds, setSelectedIds] = createSignal<Set<string>>(new Set());
  const [quickViewId, setQuickViewId] = createSignal<string | null>(null);
  const [confirmDelete, setConfirmDelete] = createSignal<Campaign | null>(null);
  const [confirmToggle, setConfirmToggle] = createSignal<Campaign | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = createSignal(false);
  const [actionLoading, setActionLoading] = createSignal(false);
  const quickViewCampaign = createMemo(() => (quickViewId() ? store.getById(quickViewId()!) : undefined));

  const loadList = () => {
    setListStatus("loading");
    setTimeout(() => setListStatus(Math.random() < 0.08 ? "error" : "success"), 400);
  };
  onMount(loadList);

  const resetPage = () => setPage(1);
  const setSearch = (v: string) => { setSearchRaw(v); resetPage(); };
  const setStatusFilter = (v: "all" | CampaignStatus) => { setStatusFilterRaw(v); resetPage(); };
  const setDateFilter = (v: DashboardPeriodKey) => { setDateFilterRaw(v); resetPage(); };
  const setSort = (v: string) => { setSortRaw(v); resetPage(); };
  const setPageSize = (v: number) => { setPageSizeRaw(v); resetPage(); };

  const hasActiveFilters = () => search().trim() !== "" || statusFilter() !== "all";
  const clearFilters = () => {
    setSearchRaw("");
    setStatusFilterRaw("all");
    resetPage();
  };

  const statusCounts = createMemo(() => {
    const tally: Partial<Record<"all" | CampaignStatus, number>> = { all: store.campaigns().length };
    for (const c of store.campaigns()) tally[c.status] = (tally[c.status] ?? 0) + 1;
    return tally;
  });

  const filtered = createMemo(() => {
    const status = statusFilter();
    const q = search().trim().toLowerCase();
    const period = dateFilter();
    return store.campaigns().filter((c) => {
      if (status !== "all" && c.status !== status) return false;
      if (q && !`${c.name} ${c.slug} ${c.id}`.toLowerCase().includes(q)) return false;
      if (!withinPeriod(c.startDate, period)) return false;
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

  const requestDelete = (c: Campaign) => setConfirmDelete(c);
  const confirmDeleteAction = async () => {
    const c = confirmDelete();
    if (!c) return;
    setActionLoading(true);
    await store.remove(c.id);
    setActionLoading(false);
    setConfirmDelete(null);
    pushToast(`ลบ "${c.name}" เรียบร้อยแล้ว`, "error");
  };

  const requestToggle = (c: Campaign) => setConfirmToggle(c);
  const confirmToggleAction = async () => {
    const c = confirmToggle();
    if (!c) return;
    if (c.status !== "published") {
      const errs = validateCampaignPublish(c);
      if (errs.length > 0) {
        setConfirmToggle(null);
        pushToast(`ไม่สามารถเผยแพร่ "${c.name}" ได้: ${errs[0]}`, "error");
        return;
      }
    }
    setActionLoading(true);
    await store.setStatus(c.id, c.status === "published" ? "unpublished" : "published");
    setActionLoading(false);
    setConfirmToggle(null);
    pushToast(c.status === "published" ? "ยกเลิกการเผยแพร่แล้ว" : "เผยแพร่ Campaign แล้ว", "success");
  };

  const confirmBulkDeleteAction = async () => {
    const ids = [...selectedIds()];
    setActionLoading(true);
    await Promise.all(ids.map((id) => store.remove(id)));
    setActionLoading(false);
    setConfirmBulkDelete(false);
    clearSelection();
    pushToast(`ลบ Campaign ${ids.length} รายการเรียบร้อยแล้ว`, "error");
  };

  const bulkSetStatus = async (targetStatus: "published" | "unpublished") => {
    const ids = [...selectedIds()];
    const targets = store.campaigns().filter((c) => ids.includes(c.id));
    const blocked = targetStatus === "published" ? targets.filter((c) => validateCampaignPublish(c).length > 0) : [];
    const ok = targets.filter((c) => !blocked.includes(c));
    await Promise.all(ok.map((c) => store.setStatus(c.id, targetStatus)));
    clearSelection();
    if (blocked.length > 0) {
      pushToast(`เผยแพร่ไม่สำเร็จ ${blocked.length} รายการ (ข้อมูลไม่ครบ) — สำเร็จ ${ok.length} รายการ`, "warning");
    } else {
      pushToast(targetStatus === "published" ? `เผยแพร่ ${ok.length} รายการแล้ว` : `ยกเลิกการเผยแพร่ ${ok.length} รายการแล้ว`, "success");
    }
  };

  const columns: DataTableColumn<Campaign>[] = [
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
    { key: "name", label: "Campaign Name", render: (row) => <p class="font-medium text-ink">{row.name}</p> },
    { key: "slug", label: "Slug", hideBelowXl: true, render: (row) => <span class="text-ink-gray">/{row.slug}</span> },
    { key: "products", label: "Products", align: "right", hideBelowXl: true, render: (row) => <span class="text-ink-gray">{row.products.length} สินค้า</span> },
    { key: "start", label: "Start Date", hideBelowXl: true, render: (row) => <span class="whitespace-nowrap text-ink-gray">{row.startDate ? formatMarketingDate(row.startDate) : "—"}</span> },
    { key: "end", label: "End Date", hideBelowXl: true, render: (row) => <span class="whitespace-nowrap text-ink-gray">{row.endDate ? formatMarketingDate(row.endDate) : "—"}</span> },
    { key: "status", label: "Status", render: (row) => <StatusBadge tone={CAMPAIGN_STATUS_META[row.status].tone}>{CAMPAIGN_STATUS_META[row.status].label}</StatusBadge> },
    { key: "updated", label: "Updated", hideBelowXl: true, render: (row) => <span class="whitespace-nowrap text-ink-gray">{row.updatedAt}</span> },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (row) => (
        <CampaignRowActionsMenu
          id={row.id}
          name={row.name}
          isPublished={row.status === "published"}
          onTogglePublish={() => requestToggle(row)}
          onDelete={() => requestDelete(row)}
        />
      ),
    },
  ];

  return (
    <div class="flex flex-col gap-6" classList={{ "pb-20": selectedIds().size > 0 }}>
      <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "เนื้อหา", href: "/admin/content" }, { label: "Campaigns" }]} />
      <PageHeader
        title="Campaigns"
        description="จัดการแคมเปญสำหรับ Homepage และหน้า Landing Page"
        actions={
          <Button href="/admin/content/campaigns/new" variant="primary">
            <PlusIcon class="size-4" /> สร้าง Campaign
          </Button>
        }
      />

      <CampaignStatusSummary value={statusFilter()} counts={statusCounts()} onChange={setStatusFilter} />

      <div class="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div class="flex-1">
          <FilterBar
            search={{ value: search(), onInput: setSearch, placeholder: "ค้นหาชื่อ Campaign, Slug, ID..." }}
            filters={[]}
            onFilterChange={() => {}}
            sort={{ value: sort(), options: SORT_OPTIONS, onChange: setSort }}
          />
        </div>
        <DateRangeSelector value={dateFilter()} onChange={setDateFilter} />
      </div>

      <Show when={listStatus() !== "loading"} fallback={<ListSkeleton />}>
        <Show
          when={listStatus() === "success"}
          fallback={
            <EmptyState tone="error" icon={<RefreshIcon />} title="ไม่สามารถโหลดรายการ Campaigns ได้" description="เกิดข้อผิดพลาดชั่วคราว ลองโหลดข้อมูลอีกครั้ง" actionLabel="ลองอีกครั้ง" onAction={loadList} class="bg-white shadow-card" />
          }
        >
          <Show
            when={sorted().length > 0}
            fallback={
              <EmptyState
                icon={<ContentIcon />}
                title={hasActiveFilters() ? "ไม่พบ Campaign ที่ตรงกับการค้นหา" : "ยังไม่มี Campaign"}
                description={hasActiveFilters() ? "ลองเปลี่ยนคำค้นหาหรือตัวกรอง" : "สร้าง Campaign แรกของคุณเพื่อเริ่มต้น"}
                actionLabel={hasActiveFilters() ? "ล้างตัวกรอง" : "สร้าง Campaign"}
                onAction={hasActiveFilters() ? clearFilters : () => navigate("/admin/content/campaigns/new")}
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
                          <StatusBadge tone={CAMPAIGN_STATUS_META[row.status].tone}>{CAMPAIGN_STATUS_META[row.status].label}</StatusBadge>
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
        open={quickViewCampaign() !== undefined}
        onOpenChange={(open) => !open && setQuickViewId(null)}
        title={quickViewCampaign()?.name ?? ""}
        subtitle={quickViewCampaign() ? `/${quickViewCampaign()!.slug}` : undefined}
        onViewFull={() => {
          const id = quickViewId();
          setQuickViewId(null);
          if (id) navigate(`/admin/content/campaigns/${id}`);
        }}
      >
        <Show when={quickViewCampaign()}>{(c) => <CampaignQuickView campaign={c()} />}</Show>
      </QuickViewDrawer>

      <ConfirmDialog
        open={confirmDelete() !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title="ลบ Campaign?"
        description={`คุณต้องการลบ "${confirmDelete()?.name ?? ""}" หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`}
        confirmLabel="ลบ"
        tone="danger"
        loading={actionLoading()}
        onConfirm={confirmDeleteAction}
      />

      <ConfirmDialog
        open={confirmToggle() !== null}
        onOpenChange={(open) => !open && setConfirmToggle(null)}
        title={confirmToggle()?.status === "published" ? "ยกเลิกการเผยแพร่ Campaign นี้?" : "เผยแพร่ Campaign นี้?"}
        description={`"${confirmToggle()?.name ?? ""}"`}
        confirmLabel={confirmToggle()?.status === "published" ? "ยกเลิกการเผยแพร่" : "เผยแพร่"}
        loading={actionLoading()}
        onConfirm={confirmToggleAction}
      />

      <ConfirmDialog
        open={confirmBulkDelete()}
        onOpenChange={setConfirmBulkDelete}
        title="ลบ Campaign ที่เลือก?"
        description={`คุณต้องการลบ Campaign ${selectedIds().size} รายการที่เลือกหรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`}
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
