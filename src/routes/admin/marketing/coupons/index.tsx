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
import { ConfirmDialog } from "~/components/admin/ConfirmDialog";
import { AdminBulkActionBar } from "~/components/admin/AdminBulkActionBar";
import { QuickViewDrawer } from "~/components/admin/QuickViewDrawer";
import { ExportMenu } from "~/components/admin/ExportMenu";
import { MarketingStatusSummary, MARKETING_PHASE_TABS } from "~/components/admin/marketing/MarketingStatusSummary";
import { MarketingListSkeleton } from "~/components/admin/marketing/MarketingListSkeleton";
import { MarketingRowActionsMenu } from "~/components/admin/marketing/MarketingRowActionsMenu";
import { CouponQuickView } from "~/components/admin/marketing/CouponQuickView";
import { RefreshIcon, CouponTicketIcon, PlusIcon } from "~/components/admin/icons";
import {
  MARKETING_PHASE_META,
  couponUsageCount,
  formatCouponDiscount,
  formatCouponLimit,
  formatCouponMinSpend,
  formatCouponUsage,
  formatCouponPlacement,
  formatMarketingDate,
  formatMarketingDateTime,
  marketingPhase,
  type Coupon,
  type MarketingPhase,
} from "~/lib/adminMarketing";
import { useAdminMarketing } from "~/lib/adminMarketingStore";
import { useAdminOrders } from "~/lib/adminOrderStore";
import type { ExportColumn } from "~/lib/adminExport";
import { pushToast } from "~/lib/toast";
import type { AsyncStatus } from "~/lib/types";

const SORT_OPTIONS = [
  { value: "start-desc", label: "วันที่เริ่ม ใหม่ไปเก่า" },
  { value: "start-asc", label: "วันที่เริ่ม เก่าไปใหม่" },
  { value: "end-asc", label: "วันสิ้นสุด ใกล้ที่สุด" },
  { value: "code-asc", label: "โค้ด A-Z" },
  { value: "usage-desc", label: "ใช้แล้ว มากไปน้อย" },
];

type Placement = "all" | "home" | "checkout" | "code";
const PLACEMENT_OPTIONS: { value: Placement; label: string }[] = [
  { value: "all", label: "ทุกตำแหน่ง" },
  { value: "home", label: "หน้าแรก" },
  { value: "checkout", label: "หน้าชำระเงิน" },
  { value: "code", label: "กรอกโค้ดเท่านั้น" },
];

export default function AdminCouponListPage() {
  const store = useAdminMarketing().coupons;
  const orderStore = useAdminOrders();
  const navigate = useNavigate();
  const usage = (c: Coupon) => couponUsageCount(c.code, orderStore.orders());
  const phaseOf = (c: Coupon) => marketingPhase(c);

  const [search, setSearchRaw] = createSignal("");
  const [phaseFilter, setPhaseFilterRaw] = createSignal<"all" | MarketingPhase>("all");
  const [placement, setPlacementRaw] = createSignal<Placement>("all");
  const [sort, setSortRaw] = createSignal("start-desc");
  const [page, setPage] = createSignal(1);
  const [pageSize, setPageSizeRaw] = createSignal(20);
  const [listStatus, setListStatus] = createSignal<AsyncStatus>("loading");
  const [selectedIds, setSelectedIds] = createSignal<Set<string>>(new Set());
  const [quickViewId, setQuickViewId] = createSignal<string | null>(null);
  const [confirmDelete, setConfirmDelete] = createSignal<Coupon | null>(null);
  const [confirmToggle, setConfirmToggle] = createSignal<Coupon | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = createSignal(false);
  const [actionLoading, setActionLoading] = createSignal(false);
  const quickViewCoupon = createMemo(() => (quickViewId() ? store.getById(quickViewId()!) : undefined));

  const loadList = () => {
    setListStatus("loading");
    setTimeout(() => setListStatus(Math.random() < 0.08 ? "error" : "success"), 450);
  };
  onMount(loadList);

  const resetPage = () => setPage(1);
  const setSearch = (v: string) => { setSearchRaw(v); resetPage(); };
  const setPhaseFilter = (v: "all" | MarketingPhase) => { setPhaseFilterRaw(v); resetPage(); };
  const setPlacement = (v: string) => { setPlacementRaw(v as Placement); resetPage(); };
  const setSort = (v: string) => { setSortRaw(v); resetPage(); };
  const setPageSize = (v: number) => { setPageSizeRaw(v); resetPage(); };

  const hasActiveFilters = () => search().trim() !== "" || phaseFilter() !== "all" || placement() !== "all";
  const clearFilters = () => {
    setSearchRaw("");
    setPhaseFilterRaw("all");
    setPlacementRaw("all");
    resetPage();
  };

  const phaseCounts = createMemo(() => {
    const tally: Partial<Record<"all" | MarketingPhase, number>> = { all: store.items().length };
    for (const c of store.items()) tally[phaseOf(c)] = (tally[phaseOf(c)] ?? 0) + 1;
    return tally;
  });

  const matchesPlacement = (c: Coupon, p: Placement) =>
    p === "all" || (p === "home" && c.showOnHome) || (p === "checkout" && c.showAtCheckout) || (p === "code" && !c.showOnHome && !c.showAtCheckout);

  const filtered = createMemo(() => {
    const phase = phaseFilter();
    const p = placement();
    const q = search().trim().toLowerCase();
    return store.items().filter((c) => {
      if (phase !== "all" && phaseOf(c) !== phase) return false;
      if (!matchesPlacement(c, p)) return false;
      if (q && !c.code.toLowerCase().includes(q)) return false;
      return true;
    });
  });

  const sorted = createMemo(() => {
    const list = [...filtered()];
    switch (sort()) {
      case "start-asc":
        return list.sort((a, b) => a.startDate.localeCompare(b.startDate));
      case "end-asc":
        return list.sort((a, b) => a.endDate.localeCompare(b.endDate));
      case "code-asc":
        return list.sort((a, b) => a.code.localeCompare(b.code));
      case "usage-desc":
        return list.sort((a, b) => usage(b) - usage(a));
      default:
        return list.sort((a, b) => b.startDate.localeCompare(a.startDate));
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

  const confirmDeleteAction = async () => {
    const c = confirmDelete();
    if (!c) return;
    setActionLoading(true);
    await store.remove(c.id);
    setActionLoading(false);
    setConfirmDelete(null);
    pushToast(`ลบ "${c.code}" เรียบร้อยแล้ว`, "error");
  };

  const confirmToggleAction = async () => {
    const c = confirmToggle();
    if (!c) return;
    const turnOn = c.status === "disabled";
    setActionLoading(true);
    await store.setStatus(c.id, turnOn ? "active" : "disabled");
    setActionLoading(false);
    setConfirmToggle(null);
    pushToast(turnOn ? "เปิดใช้งานคูปองแล้ว" : "ปิดใช้งานคูปองแล้ว", "success");
  };

  const handleDuplicate = async (c: Coupon) => {
    const copy = await store.duplicate(c.id);
    pushToast(`ทำสำเนา "${c.code}" เรียบร้อยแล้ว`, "success");
    navigate(`/admin/marketing/coupons/${copy.id}/edit`);
  };

  const confirmBulkDeleteAction = async () => {
    const ids = [...selectedIds()];
    setActionLoading(true);
    await Promise.all(ids.map((id) => store.remove(id)));
    setActionLoading(false);
    setConfirmBulkDelete(false);
    clearSelection();
    pushToast(`ลบคูปอง ${ids.length} รายการเรียบร้อยแล้ว`, "error");
  };

  const bulkSetStatus = async (status: "active" | "disabled") => {
    const ids = [...selectedIds()];
    await Promise.all(ids.map((id) => store.setStatus(id, status)));
    clearSelection();
    pushToast(status === "active" ? `เปิดใช้งาน ${ids.length} รายการแล้ว` : `ปิดใช้งาน ${ids.length} รายการแล้ว`, "success");
  };

  const PhaseBadge = (props: { row: Coupon; class?: string }) => {
    const meta = () => MARKETING_PHASE_META[phaseOf(props.row)];
    return <StatusBadge tone={meta().tone} class={props.class}>{meta().label}</StatusBadge>;
  };

  const RowMenu = (props: { row: Coupon; triggerClass?: string }) => (
    <MarketingRowActionsMenu
      id={props.row.id}
      name={props.row.code}
      entity="คูปอง"
      basePath="/admin/marketing/coupons"
      isDisabled={props.row.status === "disabled"}
      onDuplicate={() => handleDuplicate(props.row)}
      onToggleStatus={() => setConfirmToggle(props.row)}
      onDelete={() => setConfirmDelete(props.row)}
      triggerClass={props.triggerClass}
    />
  );

  const exportColumns: ExportColumn<Coupon>[] = [
    { header: "โค้ด", value: (c) => c.code },
    { header: "ส่วนลด", value: (c) => formatCouponDiscount(c) },
    { header: "ยอดซื้อขั้นต่ำ (บาท)", value: (c) => c.minSpend ?? 0 },
    { header: "แสดงที่", value: (c) => formatCouponPlacement(c) },
    { header: "ใช้แล้ว (ครั้ง)", value: (c) => usage(c) },
    { header: "จำกัดจำนวนครั้ง", value: (c) => formatCouponLimit(c.usageLimit) },
    { header: "จำกัดต่อลูกค้า", value: (c) => formatCouponLimit(c.perCustomerLimit) },
    { header: "เริ่ม", value: (c) => formatMarketingDateTime(c.startDate, c.startTime) },
    { header: "สิ้นสุด", value: (c) => formatMarketingDateTime(c.endDate, c.endTime) },
    { header: "สถานะ", value: (c) => MARKETING_PHASE_META[phaseOf(c)].label },
  ];

  const columns: DataTableColumn<Coupon>[] = [
    {
      key: "select",
      label: "",
      renderHeader: () => (
        <input type="checkbox" aria-label="เลือกทั้งหมดในหน้านี้" checked={allOnPageSelected()} onChange={toggleSelectAllOnPage} class="size-4 rounded accent-brand-pink" />
      ),
      render: (row) => (
        <input
          type="checkbox"
          aria-label={`เลือก ${row.code}`}
          checked={selectedIds().has(row.id)}
          onClick={(e) => e.stopPropagation()}
          onChange={() => toggleSelect(row.id)}
          class="size-4 rounded accent-brand-pink"
        />
      ),
    },
    {
      key: "code",
      label: "คูปอง",
      render: (row) => (
        <div class="flex min-w-0 flex-col gap-0.5">
          <p class="truncate text-sm font-medium text-ink">{row.code}</p>
          <p class="text-xs text-ink-gray">{formatCouponMinSpend(row)}</p>
        </div>
      ),
    },
    { key: "discount", label: "ส่วนลด", render: (row) => <span class="whitespace-nowrap font-medium text-ink">{formatCouponDiscount(row)}</span> },
    { key: "placement", label: "แสดงที่", hideBelowXl: true, render: (row) => <span class="whitespace-nowrap text-ink-gray">{formatCouponPlacement(row)}</span> },
    { key: "usage", label: "ใช้แล้ว", align: "right", hideBelowXl: true, render: (row) => <span class="whitespace-nowrap text-ink-gray">{formatCouponUsage(usage(row), row.usageLimit)}</span> },
    { key: "start", label: "เริ่ม", hideBelowXl: true, render: (row) => <span class="whitespace-nowrap text-ink-gray">{formatMarketingDate(row.startDate)}</span> },
    { key: "end", label: "สิ้นสุด", render: (row) => <span class="whitespace-nowrap text-ink-gray">{formatMarketingDate(row.endDate)}</span> },
    { key: "status", label: "สถานะ", render: (row) => <PhaseBadge row={row} /> },
    { key: "actions", label: "", align: "right", render: (row) => <RowMenu row={row} /> },
  ];

  return (
    <div class="flex flex-col gap-6" classList={{ "pb-20": selectedIds().size > 0 }}>
      <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "การตลาด" }, { label: "คูปอง" }]} />
      <PageHeader
        title="คูปอง"
        description="จัดการโค้ดส่วนลดที่แสดงในหน้าแรกและหน้าชำระเงิน"
        actions={
          <div class="flex flex-wrap items-center gap-2">
            <ExportMenu filenameBase="coupons-report" columns={exportColumns} rows={sorted()} />
            <Button href="/admin/marketing/coupons/new" variant="primary">
              <PlusIcon class="size-4" /> เพิ่มคูปอง
            </Button>
          </div>
        }
      />

      <MarketingStatusSummary tabs={MARKETING_PHASE_TABS} value={phaseFilter()} counts={phaseCounts()} onChange={setPhaseFilter} />

      <FilterBar
        search={{ value: search(), onInput: setSearch, placeholder: "ค้นหาโค้ดคูปอง..." }}
        filters={[{ id: "placement", label: "แสดงที่", value: placement(), options: PLACEMENT_OPTIONS }]}
        onFilterChange={(id, value) => { if (id === "placement") setPlacement(value); }}
        sort={{ value: sort(), options: SORT_OPTIONS, onChange: setSort }}
      />

      <Show when={listStatus() !== "loading"} fallback={<MarketingListSkeleton />}>
        <Show
          when={listStatus() === "success"}
          fallback={
            <EmptyState tone="error" icon={<RefreshIcon />} title="ไม่สามารถโหลดรายการคูปองได้" description="เกิดข้อผิดพลาดชั่วคราว ลองโหลดข้อมูลอีกครั้ง" actionLabel="ลองอีกครั้ง" onAction={loadList} class="bg-surface-card shadow-card" />
          }
        >
          <Show
            when={sorted().length > 0}
            fallback={
              <EmptyState
                icon={<CouponTicketIcon />}
                title={hasActiveFilters() ? "ไม่พบคูปองที่ตรงกับการค้นหา" : "ยังไม่มีคูปอง"}
                description={hasActiveFilters() ? undefined : "เริ่มเพิ่มคูปองแรกของคุณ"}
                actionLabel={hasActiveFilters() ? "ล้างการค้นหา" : "+ เพิ่มคูปอง"}
                onAction={hasActiveFilters() ? clearFilters : () => navigate("/admin/marketing/coupons/new")}
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
                    aria-label={`เลือก ${row.code}`}
                    checked={selectedIds().has(row.id)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => toggleSelect(row.id)}
                    class="mt-1 size-4 shrink-0 rounded accent-brand-pink"
                  />
                  <button type="button" onClick={() => setQuickViewId(row.id)} class="font-normal flex min-w-0 flex-1 flex-col text-left">
                    <p class="truncate text-sm font-medium text-ink">{row.code}</p>
                    <p class="truncate text-xs text-ink-gray">{formatCouponMinSpend(row)}, {formatCouponPlacement(row)}</p>
                    <p class="mt-1 text-sm font-semibold text-ink">{formatCouponDiscount(row)}</p>
                    <div class="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <PhaseBadge row={row} />
                    </div>
                    <p class="mt-1 text-xs text-ink-placeholder">
                      {formatMarketingDate(row.startDate)} - {formatMarketingDate(row.endDate)} ใช้แล้ว {formatCouponUsage(usage(row), row.usageLimit)} ครั้ง
                    </p>
                  </button>
                  <RowMenu row={row} triggerClass="flex size-9 shrink-0 items-center justify-center self-start rounded-pill text-ink-gray hover:bg-surface-pink" />
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
          { label: "ปิดใช้งาน", onClick: () => bulkSetStatus("disabled") },
          { label: "ลบ", tone: "danger", onClick: () => setConfirmBulkDelete(true) },
        ]}
      />

      <QuickViewDrawer
        open={quickViewCoupon() !== undefined}
        onOpenChange={(open) => !open && setQuickViewId(null)}
        title={quickViewCoupon()?.code ?? ""}
        subtitle={quickViewCoupon() ? formatCouponDiscount(quickViewCoupon()!) : undefined}
        onViewFull={() => {
          const id = quickViewId();
          setQuickViewId(null);
          if (id) navigate(`/admin/marketing/coupons/${id}`);
        }}
      >
        <Show when={quickViewCoupon()}>{(c) => <CouponQuickView coupon={c()} usageCount={usage(c())} />}</Show>
      </QuickViewDrawer>

      <ConfirmDialog
        open={confirmDelete() !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title="ลบคูปอง?"
        description={`คุณต้องการลบ "${confirmDelete()?.code ?? ""}" หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`}
        confirmLabel="ลบคูปอง"
        tone="danger"
        loading={actionLoading()}
        onConfirm={confirmDeleteAction}
      />

      <ConfirmDialog
        open={confirmToggle() !== null}
        onOpenChange={(open) => !open && setConfirmToggle(null)}
        title={confirmToggle()?.status === "disabled" ? "เปิดใช้งานคูปองนี้?" : "ปิดใช้งานคูปองนี้?"}
        description={
          confirmToggle()?.status === "disabled"
            ? `"${confirmToggle()?.code ?? ""}" จะใช้ได้ที่หน้าร้านตามวันที่ที่ตั้งไว้`
            : `"${confirmToggle()?.code ?? ""}" จะถูกซ่อนจากร้านค้าและใช้ไม่ได้ทันที`
        }
        confirmLabel={confirmToggle()?.status === "disabled" ? "เปิดใช้งาน" : "ปิดใช้งาน"}
        loading={actionLoading()}
        onConfirm={confirmToggleAction}
      />

      <ConfirmDialog
        open={confirmBulkDelete()}
        onOpenChange={setConfirmBulkDelete}
        title="ลบคูปองที่เลือก?"
        description={`คุณต้องการลบคูปอง ${selectedIds().size} รายการที่เลือกหรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`}
        confirmLabel="ลบคูปอง"
        tone="danger"
        loading={actionLoading()}
        onConfirm={confirmBulkDeleteAction}
      />
    </div>
  );
}
