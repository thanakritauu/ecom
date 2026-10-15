import { createMemo, createSignal, onMount, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { FilterBar } from "~/components/admin/FilterBar";
import { Pagination } from "~/components/admin/Pagination";
import { DataTable, type DataTableColumn } from "~/components/admin/DataTable";
import { StatusBadge } from "~/components/admin/StatusBadge";
import { EmptyState } from "~/components/admin/EmptyState";
import { ConfirmDialog } from "~/components/admin/ConfirmDialog";
import { AdminBulkActionBar } from "~/components/admin/AdminBulkActionBar";
import { QuickViewDrawer } from "~/components/admin/QuickViewDrawer";
import { ExportMenu } from "~/components/admin/ExportMenu";
import { RefreshIcon, PromotionTagIcon } from "~/components/admin/icons";
import { MarketingStatusSummary, MARKETING_PHASE_TABS } from "./MarketingStatusSummary";
import { MarketingListSkeleton } from "./MarketingListSkeleton";
import { MarketingRowActionsMenu } from "./MarketingRowActionsMenu";
import { PromotionQuickView } from "./PromotionQuickView";
import { CouponQuickView } from "./CouponQuickView";
import { MarketingToolIcon } from "./MarketingToolIcon";
import {
  MARKETING_PHASE_META,
  MARKETING_TOOL_META,
  MARKETING_TOOLS,
  couponPublishProblems,
  couponTool,
  couponUsageCount,
  formatCombinable,
  formatCouponDiscount,
  formatCouponMinSpend,
  formatCouponUsage,
  formatMarketingDate,
  formatMarketingDateTime,
  formatPromotionDiscount,
  isMarketingTool,
  marketingPhase,
  promotionPublishProblems,
  promotionTool,
  type Coupon,
  type CouponTool,
  type MarketingPhase,
  type MarketingTool,
  type Promotion,
  type PromotionTool,
} from "~/lib/adminMarketing";
import { formatAudience } from "~/lib/marketingAudience";
import { useAdminMarketing } from "~/lib/adminMarketingStore";
import { useAdminProducts } from "~/lib/adminProductStore";
import { useAdminOrders } from "~/lib/adminOrderStore";
import { flashPricesOf } from "~/lib/flashSalePricing";
import { flashCampaignPhase, flashCampaignPublishProblems, formatFlashSchedule, type FlashSaleCampaign } from "~/lib/flashSaleCampaigns";
import { getDiscountPercent } from "~/lib/products";
import type { ExportColumn } from "~/lib/adminExport";
import { pushToast } from "~/lib/toast";
import type { AsyncStatus } from "~/lib/types";

/** One row of "จัดการโปรโมชั่น": a promotion, a coupon, or a flash sale campaign. */
type Row =
  | { key: string; kind: "promotion"; tool: PromotionTool; item: Promotion }
  | { key: string; kind: "coupon"; tool: CouponTool; item: Coupon }
  | { key: string; kind: "flash_sale"; tool: "flash_sale"; item: FlashSaleCampaign };

type ItemRow = Row;

/** Tool filter: every tool, plus "คูปองทั้งหมด". */
export type ToolFilter = "all" | "coupons" | MarketingTool;
export const isToolFilter = (v: string | undefined): v is ToolFilter => v === "all" || v === "coupons" || isMarketingTool(v);

const SORT_OPTIONS = [
  { value: "start-desc", label: "วันที่เริ่ม ใหม่ไปเก่า" },
  { value: "start-asc", label: "วันที่เริ่ม เก่าไปใหม่" },
  { value: "end-asc", label: "วันสิ้นสุด ใกล้ที่สุด" },
  { value: "name-asc", label: "ชื่อ A-Z" },
  { value: "usage-desc", label: "ใช้แล้ว มากไปน้อย" },
];

const FLASH_SALE_PATH = "/admin/marketing/flash-sale";

export function MarketingManageList(props: { tool: ToolFilter; onToolChange: (tool: ToolFilter) => void }) {
  const marketing = useAdminMarketing();
  const productStore = useAdminProducts();
  const orderStore = useAdminOrders();
  const navigate = useNavigate();
  const productName = (id: string) => productStore.getById(id)?.name;

  const [search, setSearchRaw] = createSignal("");
  const [phaseFilter, setPhaseFilterRaw] = createSignal<"all" | MarketingPhase>("all");
  const [sort, setSortRaw] = createSignal("start-desc");
  const [page, setPage] = createSignal(1);
  const [pageSize, setPageSizeRaw] = createSignal(20);
  const [listStatus, setListStatus] = createSignal<AsyncStatus>("loading");
  const [selectedKeys, setSelectedKeys] = createSignal<Set<string>>(new Set());
  const [quickViewKey, setQuickViewKey] = createSignal<string | null>(null);
  const [confirmDelete, setConfirmDelete] = createSignal<ItemRow | null>(null);
  const [confirmToggle, setConfirmToggle] = createSignal<ItemRow | null>(null);
  const [confirmEndNow, setConfirmEndNow] = createSignal<ItemRow | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = createSignal(false);
  const [actionLoading, setActionLoading] = createSignal(false);

  const loadList = () => {
    setListStatus("loading");
    setTimeout(() => setListStatus(Math.random() < 0.08 ? "error" : "success"), 450);
  };
  onMount(loadList);

  const resetPage = () => setPage(1);
  const setSearch = (v: string) => { setSearchRaw(v); resetPage(); };
  const setPhaseFilter = (v: "all" | MarketingPhase) => { setPhaseFilterRaw(v); resetPage(); };
  const setSort = (v: string) => { setSortRaw(v); resetPage(); };
  const setPageSize = (v: number) => { setPageSizeRaw(v); resetPage(); };
  const setTool = (v: string) => {
    if (isToolFilter(v)) props.onToolChange(v);
    resetPage();
  };

  // ---- rows ---------------------------------------------------------------

  const rows = createMemo((): Row[] => [
    ...marketing.flashSales.items().map((item): Row => ({ key: `flash_sale:${item.id}`, kind: "flash_sale", tool: "flash_sale", item })),
    ...marketing.promotions.items().map((item): Row => ({ key: `promotion:${item.id}`, kind: "promotion", tool: promotionTool(item), item })),
    ...marketing.coupons.items().map((item): Row => ({ key: `coupon:${item.id}`, kind: "coupon", tool: couponTool(item), item })),
  ]);
  const itemRows = rows;
  const rowByKey = (key: string) => rows().find((r) => r.key === key);

  const phaseOf = (r: Row): MarketingPhase => (r.kind === "flash_sale" ? flashCampaignPhase(r.item) : marketingPhase(r.item));
  const nameOf = (r: Row) => (r.kind === "coupon" ? r.item.code : r.item.name);
  /** "ราคาแฟลชเซล ลดสูงสุด 40%": the deepest discount among the campaign's products. */
  const flashSummary = (c: FlashSaleCampaign) => {
    let best = 0;
    for (const i of c.items) {
      const p = productStore.getById(i.productId);
      if (!p) continue;
      for (const r of flashPricesOf(p, i.flash)) best = Math.max(best, getDiscountPercent({ price: r.flash, compareAtPrice: r.normal }) ?? 0);
    }
    return best > 0 ? `ราคาแฟลชเซล ลดสูงสุด ${best}%` : "ยังไม่ได้ตั้งราคาแฟลชเซล";
  };
  const usageOf = (r: Row) => (r.kind === "coupon" ? couponUsageCount(r.item.code, orderStore.orders()) : 0);
  const summaryOf = (r: Row) => {
    if (r.kind === "promotion") return formatPromotionDiscount(r.item, productName);
    if (r.kind === "coupon") return `${formatCouponDiscount(r.item)} ${formatCouponMinSpend(r.item)}`;
    return flashSummary(r.item);
  };
  const productsOf = (r: Row) => {
    if (r.kind === "flash_sale") return `${r.item.items.length.toLocaleString("th-TH")} สินค้า`;
    if (r.kind === "coupon") return r.item.productScope?.length ? `${r.item.productScope.length} สินค้า` : "ทั้งร้าน";
    const p = r.item;
    if (p.type === "bundle") return `${p.bundleItems?.length ?? 0} สินค้าในเซ็ต`;
    if (p.type === "buy_x_get_y") return `ซื้อ ${p.buyItems?.length ?? 0} แถม ${p.getItems?.length ?? 0} สินค้า`;
    return p.productIds.length === 0 ? "ทั้งร้าน" : `${p.productIds.length} สินค้า`;
  };
  const audienceOf = (r: Row) => formatAudience(r.item.audience);
  const periodOf = (r: Row) =>
    r.kind === "flash_sale" ? formatFlashSchedule(r.item) : `${formatMarketingDate(r.item.startDate)} - ${formatMarketingDate(r.item.endDate)}`;
  const combinableOf = (r: Row) => formatCombinable(r.item.combinableWith);
  const startOf = (r: Row) => r.item.startDate;
  const endOf = (r: Row) => r.item.endDate || "9999";
  const basePath = (r: ItemRow) => (r.kind === "promotion" ? "/admin/marketing/promotions" : r.kind === "coupon" ? "/admin/marketing/coupons" : FLASH_SALE_PATH);

  const matchesTool = (r: Row, t: ToolFilter) => t === "all" || (t === "coupons" ? r.kind === "coupon" : r.tool === t);

  const hasActiveFilters = () => search().trim() !== "" || phaseFilter() !== "all" || props.tool !== "all";
  const clearFilters = () => {
    setSearchRaw("");
    setPhaseFilterRaw("all");
    props.onToolChange("all");
    resetPage();
  };

  const toolScoped = createMemo(() => rows().filter((r) => matchesTool(r, props.tool)));

  const phaseCounts = createMemo(() => {
    const tally: Partial<Record<"all" | MarketingPhase, number>> = { all: toolScoped().length };
    for (const r of toolScoped()) tally[phaseOf(r)] = (tally[phaseOf(r)] ?? 0) + 1;
    return tally;
  });

  const filtered = createMemo(() => {
    const phase = phaseFilter();
    const q = search().trim().toLowerCase();
    return toolScoped().filter((r) => {
      if (phase !== "all" && phaseOf(r) !== phase) return false;
      if (q) {
        const hay = `${nameOf(r)} ${r.item.id}${r.kind === "flash_sale" ? " แฟลชเซล flash sale" : ""}`;
        if (!hay.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  });

  const sorted = createMemo(() => {
    const list = [...filtered()];
    switch (sort()) {
      case "start-asc":
        return list.sort((a, b) => startOf(a).localeCompare(startOf(b)));
      case "end-asc":
        return list.sort((a, b) => endOf(a).localeCompare(endOf(b)));
      case "name-asc":
        return list.sort((a, b) => nameOf(a).localeCompare(nameOf(b), "th"));
      case "usage-desc":
        return list.sort((a, b) => usageOf(b) - usageOf(a));
      default:
        return list.sort((a, b) => startOf(b).localeCompare(startOf(a)));
    }
  });

  const totalPages = createMemo(() => Math.max(1, Math.ceil(sorted().length / pageSize())));
  const currentPage = createMemo(() => Math.min(page(), totalPages()));
  const pageItems = createMemo(() => sorted().slice((currentPage() - 1) * pageSize(), currentPage() * pageSize()));
  const selectablePageItems = pageItems;

  // ---- selection ----------------------------------------------------------

  const allOnPageSelected = createMemo(() => selectablePageItems().length > 0 && selectablePageItems().every((r) => selectedKeys().has(r.key)));
  const toggleSelect = (key: string) =>
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  const toggleSelectAllOnPage = () =>
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected()) selectablePageItems().forEach((r) => next.delete(r.key));
      else selectablePageItems().forEach((r) => next.add(r.key));
      return next;
    });
  const clearSelection = () => setSelectedKeys(new Set<string>());
  const selectedRows = () => itemRows().filter((r) => selectedKeys().has(r.key));

  // ---- actions ------------------------------------------------------------

  // One store per kind; the casts only join their item types (each row's item belongs to its own store).
  const storeOf = (r: ItemRow) =>
    (r.kind === "promotion" ? marketing.promotions : r.kind === "coupon" ? marketing.coupons : marketing.flashSales) as unknown as Pick<
      typeof marketing.promotions,
      "setStatus" | "endNow" | "remove" | "duplicate"
    >;
  const nounOf = (r: ItemRow) => (r.kind === "promotion" ? "โปรโมชั่น" : r.kind === "coupon" ? "คูปอง" : "แฟลชเซล");
  const publishProblems = (r: ItemRow) =>
    r.kind === "promotion" ? promotionPublishProblems(r.item) : r.kind === "coupon" ? couponPublishProblems(r.item) : flashCampaignPublishProblems(r.item, productStore.getById);

  /** A แบบร่าง is published (full check first, names what's missing); never switched off. */
  const publishBlocked = (r: ItemRow): boolean => {
    if (r.item.status !== "draft") return false;
    const missing = publishProblems(r);
    if (missing.length === 0) return false;
    pushToast(`เผยแพร่ "${nameOf(r)}" ไม่ได้ ยังขาดข้อมูล ${missing.length} รายการ`, "error", missing.join(", "));
    return true;
  };
  const requestToggle = (r: ItemRow) => {
    if (!publishBlocked(r)) setConfirmToggle(r);
  };

  const confirmToggleAction = async () => {
    const r = confirmToggle();
    if (!r) return;
    const turnOn = r.item.status !== "active";
    setActionLoading(true);
    await storeOf(r).setStatus(r.item.id, turnOn ? "active" : "disabled");
    setActionLoading(false);
    setConfirmToggle(null);
    pushToast(turnOn ? (r.item.status === "draft" ? `เผยแพร่${nounOf(r)}แล้ว` : `เปิดใช้งาน${nounOf(r)}แล้ว`) : `ปิดใช้งาน${nounOf(r)}แล้ว`, "success");
  };

  const confirmEndNowAction = async () => {
    const r = confirmEndNow();
    if (!r) return;
    setActionLoading(true);
    await storeOf(r).endNow(r.item.id);
    setActionLoading(false);
    setConfirmEndNow(null);
    pushToast(`สิ้นสุด "${nameOf(r)}" แล้ว`, "success");
  };

  const confirmDeleteAction = async () => {
    const r = confirmDelete();
    if (!r) return;
    setActionLoading(true);
    await storeOf(r).remove(r.item.id);
    setActionLoading(false);
    setConfirmDelete(null);
    pushToast(`ลบ "${nameOf(r)}" เรียบร้อยแล้ว`, "error");
  };

  const handleDuplicate = async (r: ItemRow) => {
    const copy = await storeOf(r).duplicate(r.item.id);
    pushToast(`ทำสำเนา "${nameOf(r)}" เรียบร้อยแล้ว`, "success");
    navigate(`${basePath(r)}/${copy.id}/edit`);
  };

  const confirmBulkDeleteAction = async () => {
    const targets = selectedRows();
    setActionLoading(true);
    await Promise.all(targets.map((r) => storeOf(r).remove(r.item.id)));
    setActionLoading(false);
    setConfirmBulkDelete(false);
    clearSelection();
    pushToast(`ลบ ${targets.length} รายการเรียบร้อยแล้ว`, "error");
  };

  /**
   * เปิดใช้งาน: drafts must pass the full check first (incomplete ones are skipped).
   * ปิดใช้งาน: only ones already published; a แบบร่าง stays a draft.
   */
  const bulkSetStatus = async (status: "active" | "disabled") => {
    const targets = selectedRows();
    const skipped = targets.filter((r) => r.item.status === "draft" && (status === "disabled" || publishProblems(r).length > 0));
    const ok = targets.filter((r) => !skipped.includes(r));
    await Promise.all(ok.map((r) => storeOf(r).setStatus(r.item.id, status)));
    clearSelection();
    const done = status === "active" ? `เปิดใช้งาน ${ok.length} รายการแล้ว` : `ปิดใช้งาน ${ok.length} รายการแล้ว`;
    if (skipped.length === 0) pushToast(done, "success");
    else
      pushToast(
        done,
        "warning",
        status === "active"
          ? `ข้าม ${skipped.length} รายการที่เป็นแบบร่างและข้อมูลยังไม่ครบ: ${skipped.map(nameOf).join(", ")}`
          : `ข้าม ${skipped.length} รายการที่เป็นแบบร่าง`,
      );
  };

  const openRow = (r: Row) => (r.kind === "flash_sale" ? navigate(`${FLASH_SALE_PATH}/${r.item.id}/edit`) : setQuickViewKey(r.key));

  // ---- cells --------------------------------------------------------------

  const PhaseBadge = (p: { row: Row }) => {
    const meta = () => MARKETING_PHASE_META[phaseOf(p.row)];
    return <StatusBadge tone={meta().tone}>{meta().label}</StatusBadge>;
  };

  const ToolBadge = (p: { tool: MarketingTool }) => (
    <span class="inline-flex shrink-0 items-center gap-1 rounded-pill bg-surface-pink px-2 py-0.5 text-xs text-brand-pink">
      <MarketingToolIcon tool={p.tool} class="size-3.5" />
      {MARKETING_TOOL_META[p.tool].label}
    </span>
  );

  const RowMenu = (p: { row: Row; triggerClass?: string }) => (
    <MarketingRowActionsMenu
      id={p.row.item.id}
      name={nameOf(p.row)}
      entity=""
      basePath={basePath(p.row)}
      isDisabled={p.row.item.status === "disabled"}
      isDraft={p.row.item.status === "draft"}
      hideView={p.row.kind === "flash_sale"}
      onDuplicate={() => handleDuplicate(p.row)}
      onToggleStatus={() => requestToggle(p.row)}
      onEndNow={phaseOf(p.row) === "live" ? () => setConfirmEndNow(p.row) : undefined}
      onDelete={() => setConfirmDelete(p.row)}
      triggerClass={p.triggerClass}
    />
  );

  const SelectBox = (p: { row: Row; class?: string }) => (
    <input
      type="checkbox"
      aria-label={`เลือก ${nameOf(p.row)}`}
      checked={selectedKeys().has(p.row.key)}
      onClick={(e) => e.stopPropagation()}
      onChange={() => toggleSelect(p.row.key)}
      class={`size-4 rounded accent-brand-pink ${p.class ?? ""}`}
    />
  );

  const exportColumns: ExportColumn<Row>[] = [
    { header: "ชื่อ / โค้ด", value: nameOf },
    { header: "เครื่องมือ", value: (r) => MARKETING_TOOL_META[r.tool].label },
    { header: "เงื่อนไข", value: summaryOf },
    { header: "เริ่ม", value: (r) => (r.kind === "flash_sale" ? formatFlashSchedule(r.item) : formatMarketingDateTime(r.item.startDate, r.item.startTime)) },
    { header: "สิ้นสุด", value: (r) => (r.kind === "flash_sale" ? "-" : formatMarketingDateTime(r.item.endDate, r.item.endTime)) },
    { header: "สินค้า", value: productsOf },
    { header: "กลุ่มลูกค้า", value: audienceOf },
    { header: "ใช้ร่วมกับโปรอื่น", value: (r) => combinableOf(r) || "-" },
    { header: "สถานะ", value: (r) => MARKETING_PHASE_META[phaseOf(r)].label },
    { header: "ใช้ไปแล้ว", value: (r) => (r.kind === "coupon" ? formatCouponUsage(usageOf(r), r.item.usageLimit) : "-") },
  ];

  const columns: DataTableColumn<Row>[] = [
    {
      key: "select",
      label: "",
      renderHeader: () => <input type="checkbox" aria-label="เลือกทั้งหมดในหน้านี้" checked={allOnPageSelected()} onChange={toggleSelectAllOnPage} class="size-4 rounded accent-brand-pink" />,
      render: (row) => <SelectBox row={row} />,
    },
    {
      key: "name",
      label: "ชื่อโปรโมชั่น",
      render: (row) => (
        <div class="flex min-w-0 max-w-80 flex-col items-start gap-1">
          <p class="truncate text-sm font-medium text-ink">{nameOf(row)}</p>
          <ToolBadge tool={row.tool} />
          <p class="line-clamp-2 text-xs leading-5 text-ink-gray">{summaryOf(row)}</p>
          <Show when={combinableOf(row)}>
            <p class="text-xs text-ink-placeholder">{combinableOf(row)}</p>
          </Show>
        </div>
      ),
    },
    { key: "period", label: "ช่วงเวลา", render: (row) => <span class="whitespace-nowrap text-ink-gray">{periodOf(row)}</span> },
    { key: "products", label: "สินค้า", hideBelowXl: true, render: (row) => <span class="whitespace-nowrap text-ink-gray">{productsOf(row)}</span> },
    { key: "audience", label: "กลุ่มลูกค้า", hideBelowXl: true, render: (row) => <span class="whitespace-nowrap text-ink-gray">{audienceOf(row)}</span> },
    { key: "status", label: "สถานะ", render: (row) => <PhaseBadge row={row} /> },
    {
      key: "usage",
      label: "ใช้ไปแล้ว",
      hideBelowXl: true,
      render: (row) => <span class="whitespace-nowrap text-ink-gray">{row.kind === "coupon" ? formatCouponUsage(usageOf(row), row.item.usageLimit) : "-"}</span>,
    },
    { key: "actions", label: "", align: "right", render: (row) => <RowMenu row={row} /> },
  ];

  const quickRow = createMemo(() => (quickViewKey() ? rowByKey(quickViewKey()!) : undefined));
  const quickPromotion = () => {
    const r = quickRow();
    return r?.kind === "promotion" ? r.item : undefined;
  };
  const quickCoupon = () => {
    const r = quickRow();
    return r?.kind === "coupon" ? r.item : undefined;
  };

  const toolOptions = [
    { value: "all", label: "ทุกเครื่องมือ" },
    { value: "coupons", label: "คูปองทั้งหมด" },
    ...MARKETING_TOOLS.map((t) => ({ value: t, label: MARKETING_TOOL_META[t].label })),
  ];

  return (
    <div class="flex flex-col gap-6" classList={{ "pb-20": selectedKeys().size > 0 }}>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="min-w-0 flex-1">
          <MarketingStatusSummary tabs={MARKETING_PHASE_TABS} value={phaseFilter()} counts={phaseCounts()} onChange={setPhaseFilter} />
        </div>
        <ExportMenu filenameBase="promotions-report" columns={exportColumns} rows={sorted()} />
      </div>

      <FilterBar
        search={{ value: search(), onInput: setSearch, placeholder: "ค้นหาชื่อ ID หรือโค้ดคูปอง..." }}
        filters={[{ id: "tool", label: "เครื่องมือ", value: props.tool, options: toolOptions }]}
        onFilterChange={(id, value) => {
          if (id === "tool") setTool(value);
        }}
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
                description={hasActiveFilters() ? undefined : "เลือกเครื่องมือในแท็บเครื่องมือโปรโมชั่นเพื่อสร้างโปรแรก"}
                actionLabel={hasActiveFilters() ? "ล้างการค้นหา" : undefined}
                onAction={hasActiveFilters() ? clearFilters : undefined}
                class="bg-surface-card shadow-card"
              />
            }
          >
            <Show when={selectablePageItems().length > 0}>
              <div class="flex items-center gap-2 px-1 lg:hidden">
                <input type="checkbox" checked={allOnPageSelected()} onChange={toggleSelectAllOnPage} class="size-4 rounded accent-brand-pink" aria-label="เลือกทั้งหมดในหน้านี้" />
                <span class="text-sm text-ink-gray">เลือกทั้งหมดในหน้านี้</span>
              </div>
            </Show>

            <DataTable
              columns={columns}
              rows={pageItems()}
              getRowKey={(row) => row.key}
              onRowClick={openRow}
              renderMobileCard={(row) => (
                <div class="flex flex-col gap-3 rounded-card bg-surface-card p-3 shadow-card">
                  <div class="flex gap-3">
                    <SelectBox row={row} class="mt-1 shrink-0" />
                    <button type="button" onClick={() => openRow(row)} class="font-normal flex min-w-0 flex-1 flex-col items-start gap-1 text-left">
                      <p class="w-full truncate text-sm font-medium text-ink">{nameOf(row)}</p>
                      <ToolBadge tool={row.tool} />
                      <p class="line-clamp-2 text-sm font-semibold leading-[1.75] text-ink">{summaryOf(row)}</p>
                      <div class="flex flex-wrap items-center gap-1.5">
                        <PhaseBadge row={row} />
                      </div>
                      <p class="text-xs text-ink-gray">{periodOf(row)}</p>
                      <p class="text-xs text-ink-gray">
                        {productsOf(row)} กลุ่มลูกค้า {audienceOf(row)}
                        {row.kind === "coupon" ? ` ใช้แล้ว ${formatCouponUsage(usageOf(row), row.item.usageLimit)}` : ""}
                      </p>
                      <Show when={combinableOf(row)}>
                        <p class="text-xs text-ink-placeholder">{combinableOf(row)}</p>
                      </Show>
                    </button>
                    <div class="shrink-0 self-start">
                      <RowMenu row={row} triggerClass="flex size-9 shrink-0 items-center justify-center rounded-pill text-ink-gray hover:bg-surface-pink" />
                    </div>
                  </div>
                </div>
              )}
            />

            <Pagination page={currentPage()} totalPages={totalPages()} pageSize={pageSize()} onPageChange={setPage} onPageSizeChange={setPageSize} />
          </Show>
        </Show>
      </Show>

      <AdminBulkActionBar
        count={selectedKeys().size}
        onClear={clearSelection}
        actions={[
          { label: "เปิดใช้งาน", onClick: () => bulkSetStatus("active") },
          { label: "ปิดใช้งาน", onClick: () => bulkSetStatus("disabled") },
          { label: "ลบ", tone: "danger", onClick: () => setConfirmBulkDelete(true) },
        ]}
      />

      <QuickViewDrawer
        open={quickRow() !== undefined}
        onOpenChange={(open) => !open && setQuickViewKey(null)}
        title={quickRow() ? nameOf(quickRow()!) : ""}
        subtitle={quickRow() ? MARKETING_TOOL_META[quickRow()!.tool].label : undefined}
        onViewFull={() => {
          const r = quickRow();
          setQuickViewKey(null);
          if (r) navigate(`${basePath(r)}/${r.item.id}`);
        }}
      >
        <Show when={quickPromotion()}>{(p) => <PromotionQuickView promotion={p()} />}</Show>
        <Show when={quickCoupon()}>{(c) => <CouponQuickView coupon={c()} usageCount={couponUsageCount(c().code, orderStore.orders())} />}</Show>
      </QuickViewDrawer>

      <ConfirmDialog
        open={confirmDelete() !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title={`ลบ${confirmDelete() ? nounOf(confirmDelete()!) : ""}?`}
        description={`คุณต้องการลบ "${confirmDelete() ? nameOf(confirmDelete()!) : ""}" หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`}
        confirmLabel="ลบ"
        tone="danger"
        loading={actionLoading()}
        onConfirm={confirmDeleteAction}
      />

      <ConfirmDialog
        open={confirmToggle() !== null}
        onOpenChange={(open) => !open && setConfirmToggle(null)}
        title={confirmToggle()?.item.status === "draft" ? "เผยแพร่รายการนี้?" : confirmToggle()?.item.status === "disabled" ? "เปิดใช้งานรายการนี้?" : "ปิดใช้งานรายการนี้?"}
        description={
          confirmToggle()?.item.status !== "active"
            ? `"${confirmToggle() ? nameOf(confirmToggle()!) : ""}" จะมีผลที่หน้าร้านตามวันที่ที่ตั้งไว้`
            : `"${confirmToggle() ? nameOf(confirmToggle()!) : ""}" จะหยุดมีผลที่หน้าร้านทันที`
        }
        confirmLabel={confirmToggle()?.item.status === "draft" ? "เผยแพร่" : confirmToggle()?.item.status === "disabled" ? "เปิดใช้งาน" : "ปิดใช้งาน"}
        loading={actionLoading()}
        onConfirm={confirmToggleAction}
      />

      <ConfirmDialog
        open={confirmEndNow() !== null}
        onOpenChange={(open) => !open && setConfirmEndNow(null)}
        title="สิ้นสุดรายการนี้ตอนนี้?"
        description={`วันสิ้นสุดของ "${confirmEndNow() ? nameOf(confirmEndNow()!) : ""}" จะเปลี่ยนเป็นเวลานี้ และหยุดมีผลที่หน้าร้านทันที`}
        confirmLabel="สิ้นสุดตอนนี้"
        tone="danger"
        loading={actionLoading()}
        onConfirm={confirmEndNowAction}
      />

      <ConfirmDialog
        open={confirmBulkDelete()}
        onOpenChange={setConfirmBulkDelete}
        title="ลบรายการที่เลือก?"
        description={`คุณต้องการลบ ${selectedKeys().size} รายการที่เลือกหรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`}
        confirmLabel="ลบ"
        tone="danger"
        loading={actionLoading()}
        onConfirm={confirmBulkDeleteAction}
      />
    </div>
  );
}
