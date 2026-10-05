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
import { MissionQuickView } from "~/components/admin/loyalty/MissionQuickView";
import { RefreshIcon, MissionFlagIcon, EyeIcon, CheckCircleIcon } from "~/components/admin/icons";
import { MISSION_STATUS_META, type AdminMission, type MissionStatus } from "~/lib/adminLoyaltyMissions";
import { useAdminMissions } from "~/lib/adminLoyaltyMissionStore";
import { pushToast } from "~/lib/toast";
import type { AsyncStatus } from "~/lib/types";

const SORT_OPTIONS = [
  { value: "name-asc", label: "ชื่อ A→Z" },
  { value: "name-desc", label: "ชื่อ Z→A" },
  { value: "participants-desc", label: "ผู้เข้าร่วม มาก→น้อย" },
  { value: "synced-desc", label: "Sync ล่าสุด" },
];

const STATUS_FILTER_OPTIONS: SelectFilterConfig = {
  id: "status",
  label: "สถานะ",
  value: "all",
  options: [
    { value: "all", label: "สถานะทั้งหมด" },
    { value: "active", label: MISSION_STATUS_META.active.label },
    { value: "inactive", label: MISSION_STATUS_META.inactive.label },
  ],
};

/** Loyalty (Phase 08.3) — "ภารกิจ" as a Charmiss Club CRM Integration view. Same read-only shell as "สะสมคอยน์"/"สมาชิก": no Add, no per-row edit/delete, only a mock re-sync. */
export default function AdminLoyaltyMissionsListPage() {
  const store = useAdminMissions();
  const navigate = useNavigate();

  const [search, setSearchRaw] = createSignal("");
  const [statusFilter, setStatusFilterRaw] = createSignal<"all" | MissionStatus>("all");
  const [sort, setSortRaw] = createSignal("name-asc");
  const [page, setPage] = createSignal(1);
  const [pageSize, setPageSizeRaw] = createSignal(10);
  const [listStatus, setListStatus] = createSignal<AsyncStatus>("loading");
  const [selectedIds, setSelectedIds] = createSignal<Set<string>>(new Set());
  const [quickViewId, setQuickViewId] = createSignal<string | null>(null);
  const [syncingAll, setSyncingAll] = createSignal(false);
  const [syncingSelected, setSyncingSelected] = createSignal(false);
  const quickViewMission = createMemo(() => (quickViewId() ? store.getById(quickViewId()!) : undefined));

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
      setStatusFilterRaw(value as "all" | MissionStatus);
      resetPage();
    }
  };

  const filtered = createMemo(() => {
    const status = statusFilter();
    const q = search().trim().toLowerCase();
    return store.missions().filter((m) => {
      if (status !== "all" && m.status !== status) return false;
      if (q && !`${m.name} ${m.description} ${m.id}`.toLowerCase().includes(q)) return false;
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
      case "participants-desc":
        return list.sort((a, b) => b.participantCount - a.participantCount);
      case "synced-desc":
        return list.sort((a, b) => b.syncedAt.localeCompare(a.syncedAt));
      default:
        return list.sort((a, b) => a.name.localeCompare(b.name));
    }
  });

  const totalPages = createMemo(() => Math.max(1, Math.ceil(sorted().length / pageSize())));
  const currentPage = createMemo(() => Math.min(page(), totalPages()));
  const pageItems = createMemo(() => sorted().slice((currentPage() - 1) * pageSize(), currentPage() * pageSize()));

  const allOnPageSelected = createMemo(() => pageItems().length > 0 && pageItems().every((m) => selectedIds().has(m.id)));
  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const toggleSelectAllOnPage = () =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected()) pageItems().forEach((m) => next.delete(m.id));
      else pageItems().forEach((m) => next.add(m.id));
      return next;
    });
  const clearSelection = () => setSelectedIds(new Set<string>());

  const viewDetail = (row: AdminMission) => navigate(`/admin/loyalty/missions/${row.id}`);

  const handleSyncAll = async () => {
    setSyncingAll(true);
    await store.syncAll();
    setSyncingAll(false);
    pushToast("Sync ข้อมูลจาก Charmiss Club CRM เรียบร้อยแล้ว", "success");
  };

  const handleSyncSelected = async () => {
    const ids = [...selectedIds()];
    setSyncingSelected(true);
    await store.syncSelected(ids);
    setSyncingSelected(false);
    clearSelection();
    pushToast(`Sync ${ids.length} รายการที่เลือกเรียบร้อยแล้ว`, "success");
  };

  const openCrm = () => pushToast("(จำลอง) กำลังเปิด Charmiss Club CRM ในแท็บใหม่", "success");

  const columns: DataTableColumn<AdminMission>[] = [
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
      label: "ชื่อภารกิจ",
      render: (row) => (
        <div class="min-w-0">
          <p class="truncate font-medium text-ink">{row.name}</p>
          <p class="truncate text-xs text-ink-gray">{row.description}</p>
        </div>
      ),
    },
    { key: "coinReward", label: "คอยน์รางวัล", align: "right", render: (row) => <span class="font-medium text-ink">+{row.coinReward.toLocaleString("th-TH")}</span> },
    { key: "participants", label: "ผู้เข้าร่วม", align: "right", hideBelowXl: true, render: (row) => <span class="text-ink-gray">{row.participantCount.toLocaleString("th-TH")}</span> },
    { key: "status", label: "สถานะ", render: (row) => <StatusBadge tone={MISSION_STATUS_META[row.status].tone}>{MISSION_STATUS_META[row.status].label}</StatusBadge> },
    { key: "source", label: "Source", hideBelowXl: true, render: (row) => <span class="whitespace-nowrap text-ink-gray">{row.source}</span> },
    { key: "syncedAt", label: "Sync ล่าสุด", align: "right", hideBelowXl: true, render: (row) => <span class="whitespace-nowrap text-ink-gray">{row.syncedAt}</span> },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (row) => (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); viewDetail(row); }}
          aria-label={`ดูรายละเอียด ${row.name}`}
          class="flex size-9 shrink-0 items-center justify-center rounded-pill text-ink-gray transition-colors duration-150 hover:bg-surface-pink"
        >
          <EyeIcon class="size-4" />
        </button>
      ),
    },
  ];

  return (
    <div class="flex flex-col gap-6" classList={{ "pb-20": selectedIds().size > 0 }}>
      <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "สะสมแต้ม", href: "/admin/loyalty" }, { label: "ภารกิจ" }]} />
      <PageHeader title="ภารกิจ" description="ภารกิจที่ Sync มาจาก Charmiss Club CRM" />

      <div class="flex flex-col gap-4 rounded-card bg-surface-card p-4 shadow-card sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div class="flex flex-col gap-2">
          <div class="flex items-center gap-2">
            <CheckCircleIcon class="size-5 text-success" />
            <p class="text-sm font-semibold text-ink">เชื่อมต่อกับ Charmiss Club CRM แล้ว</p>
          </div>
          <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-gray">
            <span>Sync ล่าสุด: {store.lastSyncedAt()}</span>
            <span>จำนวนข้อมูลที่ Sync: {store.missions().length.toLocaleString("th-TH")} ภารกิจ</span>
          </div>
        </div>
        <div class="flex shrink-0 flex-wrap gap-2">
          <Button variant="outline" onClick={openCrm}>
            จัดการใน Charmiss Club CRM
          </Button>
          <Button variant="primary" onClick={handleSyncAll} loading={syncingAll()}>
            <RefreshIcon class="size-4" /> Sync ข้อมูล
          </Button>
        </div>
      </div>

      <FilterBar
        search={{ value: search(), onInput: setSearch, placeholder: "ค้นหาชื่อภารกิจ, รายละเอียด, ID..." }}
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
                icon={<MissionFlagIcon />}
                title={hasActiveFilters() ? "ไม่พบภารกิจที่ตรงกับการค้นหา" : "ยังไม่มีข้อมูลจาก Charmiss Club CRM"}
                description={hasActiveFilters() ? "ลองเปลี่ยนคำค้นหาหรือตัวกรอง" : "ลอง Sync ข้อมูลจาก Charmiss Club CRM อีกครั้ง"}
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
                      <div class="min-w-0">
                        <p class="truncate font-semibold text-ink">{row.name}</p>
                        <p class="truncate text-xs text-ink-gray">{row.description}</p>
                      </div>
                      <StatusBadge tone={MISSION_STATUS_META[row.status].tone}>{MISSION_STATUS_META[row.status].label}</StatusBadge>
                    </div>
                    <p class="text-sm font-medium text-ink">+{row.coinReward.toLocaleString("th-TH")} คอยน์ · {row.participantCount.toLocaleString("th-TH")} คนเข้าร่วม</p>
                    <p class="text-xs text-ink-placeholder">Sync ล่าสุด: {row.syncedAt}</p>
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
        actions={[{ label: "Sync ที่เลือก", disabled: syncingSelected(), onClick: handleSyncSelected }]}
      />

      <QuickViewDrawer
        open={quickViewMission() !== undefined}
        onOpenChange={(open) => !open && setQuickViewId(null)}
        title={quickViewMission()?.name ?? ""}
        onViewFull={() => {
          const id = quickViewId();
          setQuickViewId(null);
          if (id) navigate(`/admin/loyalty/missions/${id}`);
        }}
      >
        <Show when={quickViewMission()}>{(m) => <MissionQuickView mission={m()} />}</Show>
      </QuickViewDrawer>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div class="flex flex-col gap-3">
      {Array.from({ length: 3 }).map(() => (
        <div class="flex items-center gap-3 rounded-card bg-surface-card p-3 shadow-card">
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
