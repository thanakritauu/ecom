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
import { BannerStatusSummary } from "~/components/admin/content/BannerStatusSummary";
import { BannerRowActionsMenu } from "~/components/admin/content/BannerRowActionsMenu";
import { BannerQuickView } from "~/components/admin/content/BannerQuickView";
import { RefreshIcon, ContentIcon, PlusIcon, ImageIcon } from "~/components/admin/icons";
import {
  BANNER_STATUS_META,
  BANNER_PLACEMENT_META,
  validateBannerPublish,
  getBannerDevices,
  type Banner,
  type BannerStatus,
  type BannerPlacement,
} from "~/lib/adminBanners";
import { formatMarketingDate } from "~/lib/adminMarketing";
import { resolveHomepageDestinationHref } from "~/lib/adminHomepage";
import { useAdminBanners } from "~/lib/adminBannerStore";
import { useAdminDestinationLookups } from "~/lib/adminDestinationLookups";
import { pushToast } from "~/lib/toast";
import type { AsyncStatus } from "~/lib/types";

const SORT_OPTIONS = [
  { value: "updated-desc", label: "แก้ไขล่าสุด" },
  { value: "name-asc", label: "ชื่อ A→Z" },
  { value: "name-desc", label: "ชื่อ Z→A" },
  { value: "start-asc", label: "วันที่เริ่ม เก่า→ใหม่" },
  { value: "end-asc", label: "วันสิ้นสุด ใกล้ที่สุด" },
];

const PLACEMENT_FILTER_OPTIONS = [
  { value: "all", label: "ทุก Placement" },
  ...(Object.keys(BANNER_PLACEMENT_META) as BannerPlacement[]).map((value) => ({ value, label: BANNER_PLACEMENT_META[value].label })),
];

const DEVICE_FILTER_OPTIONS = [
  { value: "all", label: "ทั้งหมด" },
  { value: "desktop", label: "Desktop" },
  { value: "tablet", label: "Tablet" },
  { value: "mobile", label: "Mobile" },
];

const DEVICE_LABEL: Record<"desktop" | "tablet" | "mobile", string> = { desktop: "Desktop", tablet: "Tablet", mobile: "Mobile" };

/** List/Search/Filter/Sort/Pagination/Bulk/QuickView, same `DataTable`+`FilterBar`+`AdminBulkActionBar` shell `promotion-pages/index.tsx` already established. */
export default function AdminBannersListPage() {
  const store = useAdminBanners();
  const lookups = useAdminDestinationLookups();
  const navigate = useNavigate();

  const [search, setSearchRaw] = createSignal("");
  const [statusFilter, setStatusFilterRaw] = createSignal<"all" | BannerStatus>("all");
  const [placementFilter, setPlacementFilterRaw] = createSignal<"all" | BannerPlacement>("all");
  const [deviceFilter, setDeviceFilterRaw] = createSignal<"all" | "desktop" | "tablet" | "mobile">("all");
  const [sort, setSortRaw] = createSignal("updated-desc");
  const [page, setPage] = createSignal(1);
  const [pageSize, setPageSizeRaw] = createSignal(10);
  const [listStatus, setListStatus] = createSignal<AsyncStatus>("loading");
  const [selectedIds, setSelectedIds] = createSignal<Set<string>>(new Set());
  const [quickViewId, setQuickViewId] = createSignal<string | null>(null);
  const [confirmDelete, setConfirmDelete] = createSignal<Banner | null>(null);
  const [confirmToggle, setConfirmToggle] = createSignal<Banner | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = createSignal(false);
  const [actionLoading, setActionLoading] = createSignal(false);
  const quickViewBanner = createMemo(() => (quickViewId() ? store.getById(quickViewId()!) : undefined));

  const loadList = () => {
    setListStatus("loading");
    setTimeout(() => setListStatus(Math.random() < 0.08 ? "error" : "success"), 400);
  };
  onMount(loadList);

  const resetPage = () => setPage(1);
  const setSearch = (v: string) => { setSearchRaw(v); resetPage(); };
  const setStatusFilter = (v: "all" | BannerStatus) => { setStatusFilterRaw(v); resetPage(); };
  const setPlacementFilter = (v: string) => { setPlacementFilterRaw(v as "all" | BannerPlacement); resetPage(); };
  const setDeviceFilter = (v: string) => { setDeviceFilterRaw(v as "all" | "desktop" | "tablet" | "mobile"); resetPage(); };
  const setSort = (v: string) => { setSortRaw(v); resetPage(); };
  const setPageSize = (v: number) => { setPageSizeRaw(v); resetPage(); };

  const hasActiveFilters = () => search().trim() !== "" || statusFilter() !== "all" || placementFilter() !== "all" || deviceFilter() !== "all";
  const clearFilters = () => {
    setSearchRaw("");
    setStatusFilterRaw("all");
    setPlacementFilterRaw("all");
    setDeviceFilterRaw("all");
    resetPage();
  };

  const statusCounts = createMemo(() => {
    const tally: Partial<Record<"all" | BannerStatus, number>> = { all: store.banners().length };
    for (const b of store.banners()) tally[b.status] = (tally[b.status] ?? 0) + 1;
    return tally;
  });

  const destinationLabel = (b: Banner) => resolveHomepageDestinationHref(b.destination, lookups) ?? "—";

  const filtered = createMemo(() => {
    const status = statusFilter();
    const placement = placementFilter();
    const device = deviceFilter();
    const q = search().trim().toLowerCase();
    return store.banners().filter((b) => {
      if (status !== "all" && b.status !== status) return false;
      if (placement !== "all" && b.placement !== placement) return false;
      if (device !== "all" && !b.banners[device]) return false;
      if (q && !`${b.name} ${b.id}`.toLowerCase().includes(q)) return false;
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

  const allOnPageSelected = createMemo(() => pageItems().length > 0 && pageItems().every((b) => selectedIds().has(b.id)));
  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const toggleSelectAllOnPage = () =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected()) pageItems().forEach((b) => next.delete(b.id));
      else pageItems().forEach((b) => next.add(b.id));
      return next;
    });
  const clearSelection = () => setSelectedIds(new Set<string>());

  const requestDelete = (b: Banner) => setConfirmDelete(b);
  const confirmDeleteAction = async () => {
    const b = confirmDelete();
    if (!b) return;
    setActionLoading(true);
    await store.remove(b.id);
    setActionLoading(false);
    setConfirmDelete(null);
    pushToast(`ลบ "${b.name}" เรียบร้อยแล้ว`, "error");
  };

  const requestToggle = (b: Banner) => setConfirmToggle(b);
  const confirmToggleAction = async () => {
    const b = confirmToggle();
    if (!b) return;
    if (b.status !== "published") {
      const errs = validateBannerPublish(b);
      if (errs.length > 0) {
        setConfirmToggle(null);
        pushToast(`ไม่สามารถเผยแพร่ "${b.name}" ได้: ${errs[0]}`, "error");
        return;
      }
    }
    setActionLoading(true);
    await store.setStatus(b.id, b.status === "published" ? "unpublished" : "published");
    setActionLoading(false);
    setConfirmToggle(null);
    pushToast(b.status === "published" ? "ยกเลิกการเผยแพร่แล้ว" : "เผยแพร่ Banner แล้ว", "success");
  };

  const confirmBulkDeleteAction = async () => {
    const ids = [...selectedIds()];
    setActionLoading(true);
    await Promise.all(ids.map((id) => store.remove(id)));
    setActionLoading(false);
    setConfirmBulkDelete(false);
    clearSelection();
    pushToast(`ลบ Banner ${ids.length} รายการเรียบร้อยแล้ว`, "error");
  };

  const bulkSetStatus = async (targetStatus: "published" | "unpublished") => {
    const ids = [...selectedIds()];
    const targets = store.banners().filter((b) => ids.includes(b.id));
    const blocked = targetStatus === "published" ? targets.filter((b) => validateBannerPublish(b).length > 0) : [];
    const ok = targets.filter((b) => !blocked.includes(b));
    await Promise.all(ok.map((b) => store.setStatus(b.id, targetStatus)));
    clearSelection();
    if (blocked.length > 0) {
      pushToast(`เผยแพร่ไม่สำเร็จ ${blocked.length} รายการ (ข้อมูลไม่ครบ) — สำเร็จ ${ok.length} รายการ`, "warning");
    } else {
      pushToast(targetStatus === "published" ? `เผยแพร่ ${ok.length} รายการแล้ว` : `ยกเลิกการเผยแพร่ ${ok.length} รายการแล้ว`, "success");
    }
  };

  const columns: DataTableColumn<Banner>[] = [
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
    { key: "name", label: "Banner Name", render: (row) => <p class="font-medium text-ink">{row.name}</p> },
    { key: "placement", label: "Placement", hideBelowXl: true, render: (row) => <span class="text-ink-gray">{BANNER_PLACEMENT_META[row.placement].label}</span> },
    {
      key: "device",
      label: "Device",
      hideBelowXl: true,
      render: (row) => {
        const devices = getBannerDevices(row);
        return <span class="text-ink-gray">{devices.length > 0 ? devices.map((d) => DEVICE_LABEL[d]).join(", ") : "—"}</span>;
      },
    },
    { key: "destination", label: "Destination", hideBelowXl: true, render: (row) => <span class="truncate text-ink-gray">{destinationLabel(row)}</span> },
    { key: "start", label: "Start Date", hideBelowXl: true, render: (row) => <span class="whitespace-nowrap text-ink-gray">{row.startDate ? formatMarketingDate(row.startDate) : "—"}</span> },
    { key: "end", label: "End Date", hideBelowXl: true, render: (row) => <span class="whitespace-nowrap text-ink-gray">{row.endDate ? formatMarketingDate(row.endDate) : "—"}</span> },
    { key: "status", label: "Status", render: (row) => <StatusBadge tone={BANNER_STATUS_META[row.status].tone}>{BANNER_STATUS_META[row.status].label}</StatusBadge> },
    { key: "updated", label: "Updated", hideBelowXl: true, render: (row) => <span class="whitespace-nowrap text-ink-gray">{row.updatedAt}</span> },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (row) => (
        <BannerRowActionsMenu
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
      <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "จัดการเนื้อหา", href: "/admin/promotion-pages" }, { label: "Banners" }]} />
      <PageHeader
        title="Banners"
        description="คลังไฟล์ Banner (Asset Library) — เก็บรูป Desktop / Tablet / Mobile ไว้เลือกใช้ใน Section ของหน้าแรกและหน้าโปรโมชั่น ผ่านปุ่ม “เลือกจาก Banner ที่มีอยู่” การเผยแพร่ในหน้านี้ไม่ได้วาง Banner บนหน้าร้านโดยตรง"
        actions={
          <div class="flex flex-wrap items-center gap-2">
            <Button href="/admin/content/banners/new" variant="primary">
              <PlusIcon class="size-4" /> สร้าง Banner
            </Button>
          </div>
        }
      />

      <BannerStatusSummary value={statusFilter()} counts={statusCounts()} onChange={setStatusFilter} />

      <FilterBar
        search={{ value: search(), onInput: setSearch, placeholder: "ค้นหาชื่อ Banner, ID..." }}
        filters={[
          { id: "placement", label: "Placement", value: placementFilter(), options: PLACEMENT_FILTER_OPTIONS },
          { id: "device", label: "Device", value: deviceFilter(), options: DEVICE_FILTER_OPTIONS },
        ]}
        onFilterChange={(id, value) => (id === "placement" ? setPlacementFilter(value) : setDeviceFilter(value))}
        sort={{ value: sort(), options: SORT_OPTIONS, onChange: setSort }}
      />

      <Show when={listStatus() !== "loading"} fallback={<ListSkeleton />}>
        <Show
          when={listStatus() === "success"}
          fallback={
            <EmptyState tone="error" icon={<RefreshIcon />} title="ไม่สามารถโหลดรายการ Banners ได้" description="เกิดข้อผิดพลาดชั่วคราว ลองโหลดข้อมูลอีกครั้ง" actionLabel="ลองอีกครั้ง" onAction={loadList} class="bg-surface-card shadow-card" />
          }
        >
          <Show
            when={sorted().length > 0}
            fallback={
              <EmptyState
                icon={<ContentIcon />}
                title={hasActiveFilters() ? "ไม่พบ Banner ที่ตรงกับการค้นหา" : "ยังไม่มี Banner"}
                description={hasActiveFilters() ? "ลองเปลี่ยนคำค้นหาหรือตัวกรอง" : "สร้าง Banner แรกของคุณเพื่อเริ่มต้น"}
                actionLabel={hasActiveFilters() ? "ล้างตัวกรอง" : "สร้าง Banner"}
                onAction={hasActiveFilters() ? clearFilters : () => navigate("/admin/content/banners/new")}
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
                          <p class="truncate font-semibold text-ink">{row.name}</p>
                          <StatusBadge tone={BANNER_STATUS_META[row.status].tone}>{BANNER_STATUS_META[row.status].label}</StatusBadge>
                        </div>
                        <p class="text-sm text-ink-gray">{BANNER_PLACEMENT_META[row.placement].label}</p>
                      </div>
                    </div>
                    <p class="text-xs text-ink-gray">แก้ไขล่าสุด {row.updatedAt}</p>
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
        open={quickViewBanner() !== undefined}
        onOpenChange={(open) => !open && setQuickViewId(null)}
        title={quickViewBanner()?.name ?? ""}
        subtitle={quickViewBanner() ? BANNER_PLACEMENT_META[quickViewBanner()!.placement].label : undefined}
        onViewFull={() => {
          const id = quickViewId();
          setQuickViewId(null);
          if (id) navigate(`/admin/content/banners/${id}`);
        }}
      >
        <Show when={quickViewBanner()}>{(b) => <BannerQuickView banner={b()} />}</Show>
      </QuickViewDrawer>

      <ConfirmDialog
        open={confirmDelete() !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title="ลบ Banner?"
        description={`คุณต้องการลบ "${confirmDelete()?.name ?? ""}" หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`}
        confirmLabel="ลบ"
        tone="danger"
        loading={actionLoading()}
        onConfirm={confirmDeleteAction}
      />

      <ConfirmDialog
        open={confirmToggle() !== null}
        onOpenChange={(open) => !open && setConfirmToggle(null)}
        title={confirmToggle()?.status === "published" ? "ยกเลิกการเผยแพร่ Banner นี้?" : "เผยแพร่ Banner นี้?"}
        description={`"${confirmToggle()?.name ?? ""}"`}
        confirmLabel={confirmToggle()?.status === "published" ? "ยกเลิกการเผยแพร่" : "เผยแพร่"}
        loading={actionLoading()}
        onConfirm={confirmToggleAction}
      />

      <ConfirmDialog
        open={confirmBulkDelete()}
        onOpenChange={setConfirmBulkDelete}
        title="ลบ Banner ที่เลือก?"
        description={`คุณต้องการลบ Banner ${selectedIds().size} รายการที่เลือกหรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`}
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
