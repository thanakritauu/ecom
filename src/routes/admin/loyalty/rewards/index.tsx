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
import { RewardQuickView } from "~/components/admin/loyalty/RewardQuickView";
import { RefreshIcon, RewardGiftIcon, EyeIcon, CheckCircleIcon, ImageIcon } from "~/components/admin/icons";
import { REWARD_STATUS_META, REWARD_TYPE_META, type AdminReward, type RewardStatus, type RewardType } from "~/lib/adminLoyaltyRewards";
import { useAdminRewards } from "~/lib/adminLoyaltyRewardStore";
import { pushToast } from "~/lib/toast";
import type { AsyncStatus } from "~/lib/types";

const SORT_OPTIONS = [
  { value: "name-asc", label: "ชื่อ A→Z" },
  { value: "name-desc", label: "ชื่อ Z→A" },
  { value: "coins-desc", label: "คอยน์ที่ใช้ มาก→น้อย" },
  { value: "coins-asc", label: "คอยน์ที่ใช้ น้อย→มาก" },
  { value: "synced-desc", label: "Sync ล่าสุด" },
];

const TYPE_FILTER_OPTIONS: SelectFilterConfig = {
  id: "type",
  label: "ประเภท",
  value: "all",
  options: [{ value: "all", label: "ทุกประเภท" }, ...(Object.keys(REWARD_TYPE_META) as RewardType[]).map((t) => ({ value: t, label: REWARD_TYPE_META[t].label }))],
};

const STATUS_FILTER_OPTIONS: SelectFilterConfig = {
  id: "status",
  label: "สถานะ",
  value: "all",
  options: [
    { value: "all", label: "สถานะทั้งหมด" },
    { value: "active", label: REWARD_STATUS_META.active.label },
    { value: "inactive", label: REWARD_STATUS_META.inactive.label },
  ],
};

/**
 * Loyalty (Phase 08.4) — "ของรางวัล". Same list shell as the other Loyalty
 * modules, plus a Sync integration card — but unlike Coin Rules/Members/
 * Missions, a Reward *does* have an Edit affordance (its Charmiss-owned
 * Presentation fields only) reachable from its Detail page.
 */
export default function AdminLoyaltyRewardsListPage() {
  const store = useAdminRewards();
  const navigate = useNavigate();

  const [search, setSearchRaw] = createSignal("");
  const [typeFilter, setTypeFilterRaw] = createSignal<"all" | RewardType>("all");
  const [statusFilter, setStatusFilterRaw] = createSignal<"all" | RewardStatus>("all");
  const [sort, setSortRaw] = createSignal("name-asc");
  const [page, setPage] = createSignal(1);
  const [pageSize, setPageSizeRaw] = createSignal(10);
  const [listStatus, setListStatus] = createSignal<AsyncStatus>("loading");
  const [selectedIds, setSelectedIds] = createSignal<Set<string>>(new Set());
  const [quickViewId, setQuickViewId] = createSignal<string | null>(null);
  const [syncingAll, setSyncingAll] = createSignal(false);
  const [syncingSelected, setSyncingSelected] = createSignal(false);
  const quickViewReward = createMemo(() => (quickViewId() ? store.getById(quickViewId()!) : undefined));

  const loadList = () => {
    setListStatus("loading");
    setTimeout(() => setListStatus(Math.random() < 0.08 ? "error" : "success"), 400);
  };
  onMount(loadList);

  const resetPage = () => setPage(1);
  const setSearch = (v: string) => { setSearchRaw(v); resetPage(); };
  const setSort = (v: string) => { setSortRaw(v); resetPage(); };
  const setPageSize = (v: number) => { setPageSizeRaw(v); resetPage(); };

  const hasActiveFilters = () => search().trim() !== "" || typeFilter() !== "all" || statusFilter() !== "all";
  const clearFilters = () => {
    setSearchRaw("");
    setTypeFilterRaw("all");
    setStatusFilterRaw("all");
    resetPage();
  };

  const handleFilterChange = (id: string, value: string) => {
    if (id === "type") {
      setTypeFilterRaw(value as "all" | RewardType);
      resetPage();
    } else if (id === "status") {
      setStatusFilterRaw(value as "all" | RewardStatus);
      resetPage();
    }
  };

  const filtered = createMemo(() => {
    const type = typeFilter();
    const status = statusFilter();
    const q = search().trim().toLowerCase();
    return store.rewards().filter((r) => {
      if (type !== "all" && r.rewardType !== type) return false;
      if (status !== "all" && r.status !== status) return false;
      if (q && !`${r.displayName} ${r.name} ${r.id}`.toLowerCase().includes(q)) return false;
      return true;
    });
  });

  const sorted = createMemo(() => {
    const list = [...filtered()];
    switch (sort()) {
      case "name-asc":
        return list.sort((a, b) => a.displayName.localeCompare(b.displayName));
      case "name-desc":
        return list.sort((a, b) => b.displayName.localeCompare(a.displayName));
      case "coins-desc":
        return list.sort((a, b) => b.coinCost - a.coinCost);
      case "coins-asc":
        return list.sort((a, b) => a.coinCost - b.coinCost);
      case "synced-desc":
        return list.sort((a, b) => b.syncedAt.localeCompare(a.syncedAt));
      default:
        return list.sort((a, b) => a.displayName.localeCompare(b.displayName));
    }
  });

  const totalPages = createMemo(() => Math.max(1, Math.ceil(sorted().length / pageSize())));
  const currentPage = createMemo(() => Math.min(page(), totalPages()));
  const pageItems = createMemo(() => sorted().slice((currentPage() - 1) * pageSize(), currentPage() * pageSize()));

  const allOnPageSelected = createMemo(() => pageItems().length > 0 && pageItems().every((r) => selectedIds().has(r.id)));
  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const toggleSelectAllOnPage = () =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected()) pageItems().forEach((r) => next.delete(r.id));
      else pageItems().forEach((r) => next.add(r.id));
      return next;
    });
  const clearSelection = () => setSelectedIds(new Set<string>());

  const viewDetail = (row: AdminReward) => navigate(`/admin/loyalty/rewards/${row.id}`);

  const handleSyncAll = async () => {
    setSyncingAll(true);
    await store.syncAll();
    setSyncingAll(false);
    pushToast("Sync ข้อมูลจาก Cordy CRM เรียบร้อยแล้ว", "success");
  };

  const handleSyncSelected = async () => {
    const ids = [...selectedIds()];
    setSyncingSelected(true);
    await store.syncSelected(ids);
    setSyncingSelected(false);
    clearSelection();
    pushToast(`Sync ${ids.length} รายการที่เลือกเรียบร้อยแล้ว`, "success");
  };

  const openCordyCrm = () => pushToast("(จำลอง) กำลังเปิด Cordy CRM ในแท็บใหม่", "success");

  const columns: DataTableColumn<AdminReward>[] = [
    {
      key: "select",
      label: "",
      renderHeader: () => (
        <input type="checkbox" aria-label="เลือกทั้งหมดในหน้านี้" checked={allOnPageSelected()} onChange={toggleSelectAllOnPage} class="size-4 rounded accent-brand-pink" />
      ),
      render: (row) => (
        <input
          type="checkbox"
          aria-label={`เลือก ${row.displayName}`}
          checked={selectedIds().has(row.id)}
          onClick={(e) => e.stopPropagation()}
          onChange={() => toggleSelect(row.id)}
          class="size-4 rounded accent-brand-pink"
        />
      ),
    },
    {
      key: "name",
      label: "ชื่อของรางวัล",
      render: (row) => (
        <div class="flex items-center gap-3">
          <div class="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-media bg-surface-gray/60 text-ink-placeholder">
            <Show when={row.image} fallback={<ImageIcon class="size-4" />}>
              <img src={row.image} alt="" class="size-full object-cover" />
            </Show>
          </div>
          <div class="min-w-0">
            <p class="truncate font-medium text-ink">{row.displayName}</p>
            <p class="truncate text-xs text-ink-gray">{REWARD_TYPE_META[row.rewardType].label}</p>
          </div>
        </div>
      ),
    },
    { key: "coinCost", label: "คอยน์ที่ใช้", align: "right", render: (row) => <span class="font-medium text-ink">{row.coinCost.toLocaleString("th-TH")}</span> },
    { key: "stock", label: "จำนวนคงเหลือ", align: "right", hideBelowXl: true, render: (row) => <span class="text-ink-gray">{row.stockRemaining.toLocaleString("th-TH")}</span> },
    { key: "status", label: "สถานะ", render: (row) => <StatusBadge tone={REWARD_STATUS_META[row.status].tone}>{REWARD_STATUS_META[row.status].label}</StatusBadge> },
    { key: "syncedAt", label: "Sync ล่าสุด", align: "right", hideBelowXl: true, render: (row) => <span class="whitespace-nowrap text-ink-gray">{row.syncedAt}</span> },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (row) => (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); viewDetail(row); }}
          aria-label={`ดูรายละเอียด ${row.displayName}`}
          class="flex size-9 shrink-0 items-center justify-center rounded-pill text-ink-gray transition-colors duration-150 hover:bg-surface-pink"
        >
          <EyeIcon class="size-4" />
        </button>
      ),
    },
  ];

  return (
    <div class="flex flex-col gap-6" classList={{ "pb-20": selectedIds().size > 0 }}>
      <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "สะสมแต้ม", href: "/admin/loyalty" }, { label: "ของรางวัล" }]} />
      <PageHeader title="ของรางวัล" description="ของรางวัลที่ Sync มาจาก Cordy CRM — จัดการการแสดงผลฝั่ง Charmiss ได้" />

      <div class="flex flex-col gap-4 rounded-card bg-surface-card p-4 shadow-card sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div class="flex flex-col gap-2">
          <div class="flex items-center gap-2">
            <CheckCircleIcon class="size-5 text-success" />
            <p class="text-sm font-semibold text-ink">เชื่อมต่อกับ Cordy CRM แล้ว</p>
          </div>
          <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-gray">
            <span>Sync ล่าสุด: {store.lastSyncedAt()}</span>
            <span>จำนวนข้อมูลที่ Sync: {store.rewards().length.toLocaleString("th-TH")} รายการ</span>
          </div>
        </div>
        <div class="flex shrink-0 flex-wrap gap-2">
          <Button variant="outline" onClick={openCordyCrm}>
            จัดการใน Cordy CRM
          </Button>
          <Button variant="primary" onClick={handleSyncAll} loading={syncingAll()}>
            <RefreshIcon class="size-4" /> Sync ข้อมูล
          </Button>
        </div>
      </div>

      <FilterBar
        search={{ value: search(), onInput: setSearch, placeholder: "ค้นหาชื่อของรางวัล, ID..." }}
        filters={[{ ...TYPE_FILTER_OPTIONS, value: typeFilter() }, { ...STATUS_FILTER_OPTIONS, value: statusFilter() }]}
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
                icon={<RewardGiftIcon />}
                title={hasActiveFilters() ? "ไม่พบของรางวัลที่ตรงกับการค้นหา" : "ยังไม่มีข้อมูลจาก Cordy CRM"}
                description={hasActiveFilters() ? "ลองเปลี่ยนคำค้นหาหรือตัวกรอง" : "ลอง Sync ข้อมูลจาก Cordy CRM อีกครั้ง"}
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
                    aria-label={`เลือก ${row.displayName}`}
                    checked={selectedIds().has(row.id)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => toggleSelect(row.id)}
                    class="mt-1 size-4 shrink-0 rounded accent-brand-pink"
                  />
                  <button type="button" onClick={() => setQuickViewId(row.id)} class="font-normal flex min-w-0 flex-1 flex-col gap-2 text-left">
                    <div class="flex items-start gap-3">
                      <div class="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-media bg-surface-gray/60 text-ink-placeholder">
                        <Show when={row.image} fallback={<ImageIcon class="size-4" />}>
                          <img src={row.image} alt="" class="size-full object-cover" />
                        </Show>
                      </div>
                      <div class="min-w-0 flex-1">
                        <div class="flex items-start justify-between gap-2">
                          <p class="truncate font-semibold text-ink">{row.displayName}</p>
                          <StatusBadge tone={REWARD_STATUS_META[row.status].tone}>{REWARD_STATUS_META[row.status].label}</StatusBadge>
                        </div>
                        <p class="truncate text-xs text-ink-gray">{REWARD_TYPE_META[row.rewardType].label} · ใช้ {row.coinCost.toLocaleString("th-TH")} คอยน์</p>
                      </div>
                    </div>
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
        open={quickViewReward() !== undefined}
        onOpenChange={(open) => !open && setQuickViewId(null)}
        title={quickViewReward()?.displayName ?? ""}
        onViewFull={() => {
          const id = quickViewId();
          setQuickViewId(null);
          if (id) navigate(`/admin/loyalty/rewards/${id}`);
        }}
      >
        <Show when={quickViewReward()}>{(r) => <RewardQuickView reward={r()} />}</Show>
      </QuickViewDrawer>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div class="flex flex-col gap-3">
      {Array.from({ length: 4 }).map(() => (
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
