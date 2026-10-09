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
import { Toggle } from "~/components/admin/Toggle";
import { MarketingStatusSummary, MARKETING_PHASE_TABS } from "~/components/admin/marketing/MarketingStatusSummary";
import { MarketingListSkeleton } from "~/components/admin/marketing/MarketingListSkeleton";
import { MarketingRowActionsMenu } from "~/components/admin/marketing/MarketingRowActionsMenu";
import { PromotionQuickView } from "~/components/admin/marketing/PromotionQuickView";
import { RefreshIcon, PromotionTagIcon, PlusIcon } from "~/components/admin/icons";
import {
  MARKETING_PHASE_META,
  PROMOTION_TYPES,
  PROMOTION_TYPE_META,
  formatMarketingDate,
  formatMarketingDateTime,
  formatPromotionDiscount,
  marketingPhase,
  type MarketingPhase,
  type Promotion,
  type PromotionType,
} from "~/lib/adminMarketing";
import { useAdminMarketing } from "~/lib/adminMarketingStore";
import { useAdminProducts } from "~/lib/adminProductStore";
import type { ExportColumn } from "~/lib/adminExport";
import { pushToast } from "~/lib/toast";
import type { AsyncStatus } from "~/lib/types";

const SORT_OPTIONS = [
  { value: "start-desc", label: "วันที่เริ่ม ใหม่ไปเก่า" },
  { value: "start-asc", label: "วันที่เริ่ม เก่าไปใหม่" },
  { value: "end-asc", label: "วันสิ้นสุด ใกล้ที่สุด" },
  { value: "name-asc", label: "ชื่อโปรโมชั่น A-Z" },
  { value: "name-desc", label: "ชื่อโปรโมชั่น Z-A" },
];

export default function AdminPromotionListPage() {
  const store = useAdminMarketing().promotions;
  const navigate = useNavigate();
  const productStore = useAdminProducts();
  const summary = (p: Promotion) => formatPromotionDiscount(p, (id) => productStore.getById(id)?.name);
  const phaseOf = (p: Promotion) => marketingPhase(p);

  const [search, setSearchRaw] = createSignal("");
  const [phaseFilter, setPhaseFilterRaw] = createSignal<"all" | MarketingPhase>("all");
  const [typeFilter, setTypeFilterRaw] = createSignal<"all" | PromotionType>("all");
  const [sort, setSortRaw] = createSignal("start-desc");
  const [page, setPage] = createSignal(1);
  const [pageSize, setPageSizeRaw] = createSignal(20);
  const [listStatus, setListStatus] = createSignal<AsyncStatus>("loading");
  const [selectedIds, setSelectedIds] = createSignal<Set<string>>(new Set());
  const [quickViewId, setQuickViewId] = createSignal<string | null>(null);
  const [confirmDelete, setConfirmDelete] = createSignal<Promotion | null>(null);
  const [confirmToggle, setConfirmToggle] = createSignal<Promotion | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = createSignal(false);
  const [actionLoading, setActionLoading] = createSignal(false);
  const quickViewPromotion = createMemo(() => (quickViewId() ? store.getById(quickViewId()!) : undefined));

  const loadList = () => {
    setListStatus("loading");
    setTimeout(() => setListStatus(Math.random() < 0.08 ? "error" : "success"), 450);
  };
  onMount(loadList);

  const resetPage = () => setPage(1);
  const setSearch = (v: string) => { setSearchRaw(v); resetPage(); };
  const setPhaseFilter = (v: "all" | MarketingPhase) => { setPhaseFilterRaw(v); resetPage(); };
  const setTypeFilter = (v: string) => { setTypeFilterRaw(v as "all" | PromotionType); resetPage(); };
  const setSort = (v: string) => { setSortRaw(v); resetPage(); };
  const setPageSize = (v: number) => { setPageSizeRaw(v); resetPage(); };

  const hasActiveFilters = () => search().trim() !== "" || phaseFilter() !== "all" || typeFilter() !== "all";
  const clearFilters = () => {
    setSearchRaw("");
    setPhaseFilterRaw("all");
    setTypeFilterRaw("all");
    resetPage();
  };

  const phaseCounts = createMemo(() => {
    const tally: Partial<Record<"all" | MarketingPhase, number>> = { all: store.items().length };
    for (const p of store.items()) tally[phaseOf(p)] = (tally[phaseOf(p)] ?? 0) + 1;
    return tally;
  });

  const filtered = createMemo(() => {
    const phase = phaseFilter();
    const type = typeFilter();
    const q = search().trim().toLowerCase();
    return store.items().filter((p) => {
      if (phase !== "all" && phaseOf(p) !== phase) return false;
      if (type !== "all" && p.type !== type) return false;
      if (q && !p.name.toLowerCase().includes(q)) return false;
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
      case "name-asc":
        return list.sort((a, b) => a.name.localeCompare(b.name, "th"));
      case "name-desc":
        return list.sort((a, b) => b.name.localeCompare(a.name, "th"));
      default:
        return list.sort((a, b) => b.startDate.localeCompare(a.startDate));
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

  const confirmDeleteAction = async () => {
    const p = confirmDelete();
    if (!p) return;
    setActionLoading(true);
    await store.remove(p.id);
    setActionLoading(false);
    setConfirmDelete(null);
    pushToast(`ลบ "${p.name}" เรียบร้อยแล้ว`, "error");
  };

  const confirmToggleAction = async () => {
    const p = confirmToggle();
    if (!p) return;
    const turnOn = p.status === "disabled";
    setActionLoading(true);
    await store.setStatus(p.id, turnOn ? "active" : "disabled");
    setActionLoading(false);
    setConfirmToggle(null);
    pushToast(turnOn ? "เปิดใช้งานโปรโมชั่นแล้ว" : "ปิดใช้งานโปรโมชั่นแล้ว", "success");
  };

  // Quick on/off for trying promos on the storefront: no confirm, the cart updates as soon as it's saved.
  const [switching, setSwitching] = createSignal<string | null>(null);
  const switchLive = async (p: Promotion, on: boolean) => {
    setSwitching(p.id);
    await store.setStatus(p.id, on ? "active" : "disabled");
    setSwitching(null);
    pushToast(on ? `เปิดใช้ "${p.name}" แล้ว` : `ปิด "${p.name}" แล้ว`, "success");
  };
  const LiveSwitch = (props: { row: Promotion }) => (
    <span onClick={(e) => e.stopPropagation()} class="inline-flex">
      <Toggle checked={props.row.status === "active"} onChange={(on) => switchLive(props.row, on)} onLabel="เปิด" offLabel="ปิด" disabled={switching() === props.row.id} />
    </span>
  );

  const handleDuplicate = async (p: Promotion) => {
    const copy = await store.duplicate(p.id);
    pushToast(`ทำสำเนา "${p.name}" เรียบร้อยแล้ว`, "success");
    navigate(`/admin/marketing/promotions/${copy.id}/edit`);
  };

  const confirmBulkDeleteAction = async () => {
    const ids = [...selectedIds()];
    setActionLoading(true);
    await Promise.all(ids.map((id) => store.remove(id)));
    setActionLoading(false);
    setConfirmBulkDelete(false);
    clearSelection();
    pushToast(`ลบโปรโมชั่น ${ids.length} รายการเรียบร้อยแล้ว`, "error");
  };

  const bulkSetStatus = async (status: "active" | "disabled") => {
    const ids = [...selectedIds()];
    await Promise.all(ids.map((id) => store.setStatus(id, status)));
    clearSelection();
    pushToast(status === "active" ? `เปิดใช้งาน ${ids.length} รายการแล้ว` : `ปิดใช้งาน ${ids.length} รายการแล้ว`, "success");
  };

  const scopeLabel = (p: Promotion) => {
    if (p.type === "bundle") return `${p.bundleItems?.length ?? 0} สินค้าในเซ็ต`;
    if (p.type === "buy_x_get_y") return `ซื้อ ${p.buyItems?.length ?? 0} แถม ${p.getItems?.length ?? 0} สินค้า`;
    return p.productIds.length === 0 ? "ทุกสินค้า" : `${p.productIds.length} สินค้า`;
  };
  const PhaseBadge = (props: { row: Promotion; class?: string }) => {
    const meta = () => MARKETING_PHASE_META[phaseOf(props.row)];
    return <StatusBadge tone={meta().tone} class={props.class}>{meta().label}</StatusBadge>;
  };

  const exportColumns: ExportColumn<Promotion>[] = [
    { header: "ชื่อโปรโมชั่น", value: (p) => p.name },
    { header: "ประเภท", value: (p) => PROMOTION_TYPE_META[p.type].label },
    { header: "เงื่อนไข", value: (p) => summary(p) },
    { header: "สินค้าที่เข้าร่วม", value: (p) => scopeLabel(p) },
    { header: "แสดงในตะกร้า", value: (p) => (p.showInCart ? "แสดง" : "ไม่แสดง") },
    { header: "เริ่ม", value: (p) => formatMarketingDateTime(p.startDate, p.startTime) },
    { header: "สิ้นสุด", value: (p) => formatMarketingDateTime(p.endDate, p.endTime) },
    { header: "สถานะ", value: (p) => MARKETING_PHASE_META[phaseOf(p)].label },
  ];

  const columns: DataTableColumn<Promotion>[] = [
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
      label: "โปรโมชั่น",
      render: (row) => (
        <div class="flex min-w-0 flex-col gap-0.5">
          <p class="truncate text-sm font-medium text-ink">{row.name}</p>
          <p class="text-xs text-ink-gray">{PROMOTION_TYPE_META[row.type].label}{row.showInCart ? " แสดงในตะกร้า" : ""}</p>
        </div>
      ),
    },
    { key: "discount", label: "เงื่อนไข", render: (row) => <span class="line-clamp-2 max-w-72 font-medium text-ink">{summary(row)}</span> },
    { key: "scope", label: "สินค้า", hideBelowXl: true, render: (row) => <span class="whitespace-nowrap text-ink-gray">{scopeLabel(row)}</span> },
    { key: "start", label: "เริ่ม", hideBelowXl: true, render: (row) => <span class="whitespace-nowrap text-ink-gray">{formatMarketingDate(row.startDate)}</span> },
    { key: "end", label: "สิ้นสุด", hideBelowXl: true, render: (row) => <span class="whitespace-nowrap text-ink-gray">{formatMarketingDate(row.endDate)}</span> },
    { key: "status", label: "สถานะ", render: (row) => <PhaseBadge row={row} /> },
    { key: "live", label: "เปิดใช้", render: (row) => <LiveSwitch row={row} /> },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (row) => (
        <MarketingRowActionsMenu
          id={row.id}
          name={row.name}
          entity="โปรโมชั่น"
          basePath="/admin/marketing/promotions"
          isDisabled={row.status === "disabled"}
          onDuplicate={() => handleDuplicate(row)}
          onToggleStatus={() => setConfirmToggle(row)}
          onDelete={() => setConfirmDelete(row)}
        />
      ),
    },
  ];

  return (
    <div class="flex flex-col gap-6" classList={{ "pb-20": selectedIds().size > 0 }}>
      <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "การตลาด" }, { label: "โปรโมชั่น" }]} />
      <PageHeader
        title="โปรโมชั่น"
        description="จัดการโปรส่งฟรี ของแถม ส่วนลด ซื้อ X แถม Y และชุดสินค้า"
        actions={
          <div class="flex flex-wrap items-center gap-2">
            <ExportMenu filenameBase="promotions-report" columns={exportColumns} rows={sorted()} />
            <Button href="/admin/marketing/promotions/new" variant="primary">
              <PlusIcon class="size-4" /> เพิ่มโปรโมชั่น
            </Button>
          </div>
        }
      />

      <MarketingStatusSummary tabs={MARKETING_PHASE_TABS} value={phaseFilter()} counts={phaseCounts()} onChange={setPhaseFilter} />

      <FilterBar
        search={{ value: search(), onInput: setSearch, placeholder: "ค้นหาชื่อโปรโมชั่น..." }}
        filters={[
          {
            id: "type",
            label: "ประเภท",
            value: typeFilter(),
            options: [{ value: "all", label: "ทุกประเภท" }, ...PROMOTION_TYPES.map((t) => ({ value: t, label: PROMOTION_TYPE_META[t].label }))],
          },
        ]}
        onFilterChange={(id, value) => { if (id === "type") setTypeFilter(value); }}
        sort={{ value: sort(), options: SORT_OPTIONS, onChange: setSort }}
      />

      <Show when={listStatus() !== "loading"} fallback={<MarketingListSkeleton />}>
        <Show
          when={listStatus() === "success"}
          fallback={
            <EmptyState tone="error" icon={<RefreshIcon />} title="ไม่สามารถโหลดรายการโปรโมชั่นได้" description="เกิดข้อผิดพลาดชั่วคราว ลองโหลดข้อมูลอีกครั้ง" actionLabel="ลองอีกครั้ง" onAction={loadList} class="bg-surface-card shadow-card" />
          }
        >
          <Show
            when={sorted().length > 0}
            fallback={
              <EmptyState
                icon={<PromotionTagIcon />}
                title={hasActiveFilters() ? "ไม่พบโปรโมชั่นที่ตรงกับการค้นหา" : "ยังไม่มีโปรโมชั่น"}
                description={hasActiveFilters() ? undefined : "เริ่มเพิ่มโปรโมชั่นแรกของคุณ"}
                actionLabel={hasActiveFilters() ? "ล้างการค้นหา" : "+ เพิ่มโปรโมชั่น"}
                onAction={hasActiveFilters() ? clearFilters : () => navigate("/admin/marketing/promotions/new")}
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
                <div class="flex flex-col gap-3 rounded-card bg-surface-card p-3 shadow-card">
                  <div class="flex gap-3">
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
                      <p class="truncate text-xs text-ink-gray">{PROMOTION_TYPE_META[row.type].label} {scopeLabel(row)}</p>
                      <p class="mt-1 line-clamp-2 text-sm font-semibold text-ink">{summary(row)}</p>
                      <div class="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <PhaseBadge row={row} />
                        <Show when={row.showInCart}>
                          <StatusBadge tone="info">แสดงในตะกร้า</StatusBadge>
                        </Show>
                      </div>
                      <p class="mt-1 text-xs text-ink-placeholder">
                        {formatMarketingDate(row.startDate)} - {formatMarketingDate(row.endDate)}
                      </p>
                    </button>
                    <MarketingRowActionsMenu
                      id={row.id}
                      name={row.name}
                      entity="โปรโมชั่น"
                      basePath="/admin/marketing/promotions"
                      isDisabled={row.status === "disabled"}
                      onDuplicate={() => handleDuplicate(row)}
                      onToggleStatus={() => setConfirmToggle(row)}
                      onDelete={() => setConfirmDelete(row)}
                      triggerClass="flex size-9 shrink-0 items-center justify-center self-start rounded-pill text-ink-gray hover:bg-surface-pink"
                    />
                  </div>
                  <div class="flex items-center justify-between border-t border-border pt-3">
                    <span class="text-sm text-ink-gray">เปิดใช้บนหน้าร้าน</span>
                    <LiveSwitch row={row} />
                  </div>
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
        open={quickViewPromotion() !== undefined}
        onOpenChange={(open) => !open && setQuickViewId(null)}
        title={quickViewPromotion()?.name ?? ""}
        subtitle={quickViewPromotion() ? PROMOTION_TYPE_META[quickViewPromotion()!.type].label : undefined}
        onViewFull={() => {
          const id = quickViewId();
          setQuickViewId(null);
          if (id) navigate(`/admin/marketing/promotions/${id}`);
        }}
      >
        <Show when={quickViewPromotion()}>{(p) => <PromotionQuickView promotion={p()} />}</Show>
      </QuickViewDrawer>

      <ConfirmDialog
        open={confirmDelete() !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title="ลบโปรโมชั่น?"
        description={`คุณต้องการลบ "${confirmDelete()?.name ?? ""}" หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`}
        confirmLabel="ลบโปรโมชั่น"
        tone="danger"
        loading={actionLoading()}
        onConfirm={confirmDeleteAction}
      />

      <ConfirmDialog
        open={confirmToggle() !== null}
        onOpenChange={(open) => !open && setConfirmToggle(null)}
        title={confirmToggle()?.status === "disabled" ? "เปิดใช้งานโปรโมชั่นนี้?" : "ปิดใช้งานโปรโมชั่นนี้?"}
        description={
          confirmToggle()?.status === "disabled"
            ? `"${confirmToggle()?.name ?? ""}" จะมีผลในตะกร้าตามวันที่ที่ตั้งไว้`
            : `"${confirmToggle()?.name ?? ""}" จะหยุดมีผลในตะกร้าทันที`
        }
        confirmLabel={confirmToggle()?.status === "disabled" ? "เปิดใช้งาน" : "ปิดใช้งาน"}
        loading={actionLoading()}
        onConfirm={confirmToggleAction}
      />

      <ConfirmDialog
        open={confirmBulkDelete()}
        onOpenChange={setConfirmBulkDelete}
        title="ลบโปรโมชั่นที่เลือก?"
        description={`คุณต้องการลบโปรโมชั่น ${selectedIds().size} รายการที่เลือกหรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`}
        confirmLabel="ลบโปรโมชั่น"
        tone="danger"
        loading={actionLoading()}
        onConfirm={confirmBulkDeleteAction}
      />
    </div>
  );
}

