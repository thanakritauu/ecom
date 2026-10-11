import { createMemo, createSignal, onMount, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { DropdownMenu } from "@kobalte/core/dropdown-menu";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { Button } from "~/components/shared/Button";
import { FilterBar } from "~/components/admin/FilterBar";
import { Pagination } from "~/components/admin/Pagination";
import { DataTable, type DataTableColumn } from "~/components/admin/DataTable";
import { StatusBadge, type StatusTone } from "~/components/admin/StatusBadge";
import { EmptyState } from "~/components/admin/EmptyState";
import { ConfirmDialog } from "~/components/admin/ConfirmDialog";
import { AdminBulkActionBar } from "~/components/admin/AdminBulkActionBar";
import { ExportMenu } from "~/components/admin/ExportMenu";
import { MarketingStatusSummary, type StatusTab } from "~/components/admin/marketing/MarketingStatusSummary";
import { MarketingListSkeleton } from "~/components/admin/marketing/MarketingListSkeleton";
import { FlashSaleDialog, type FlashSaleTiming } from "~/components/admin/marketing/FlashSaleDialog";
import { RefreshIcon, FlashBoltIcon, PlusIcon, MoreIcon } from "~/components/admin/icons";
import { formatAdminCurrency } from "~/lib/adminDashboard";
import { useAdminProducts, type AdminProduct } from "~/lib/adminProductStore";
import { flashSaleRoundEndsAt, getDiscountPercent, isFlashSaleUpcoming } from "~/lib/products";
import type { ExportColumn } from "~/lib/adminExport";
import { pushToast } from "~/lib/toast";
import type { AsyncStatus } from "~/lib/types";

/**
 * Flash Sale = products that carry the flash-sale fields (`flashSaleEndsAt`,
 * `flashSaleDaily`). The Home Flash Sale rail shows exactly these, at the
 * product's own price / compare-at price, with the stock bar from
 * `stockLeft` / `stockTotal`. This page lists them and edits only those two
 * fields on the product; price and stock stay on the product page.
 */
type FlashState = "live" | "upcoming" | "soldout" | "ended" | "hidden";

const FLASH_STATE_META: Record<FlashState, { label: string; tone: StatusTone }> = {
  live: { label: "กำลังแสดง", tone: "success" },
  upcoming: { label: "รอเริ่ม", tone: "info" },
  soldout: { label: "สินค้าหมด", tone: "danger" },
  ended: { label: "หมดเวลา", tone: "warning" },
  hidden: { label: "ไม่ได้เปิดขาย", tone: "neutral" },
};

const TABS: StatusTab<"all" | FlashState>[] = [
  { value: "all", label: "ทั้งหมด" },
  ...(["live", "upcoming", "soldout", "ended", "hidden"] as const).map((s) => ({ value: s, label: FLASH_STATE_META[s].label })),
];

const SORT_OPTIONS = [
  { value: "ends-asc", label: "เวลาจบ ใกล้ที่สุด" },
  { value: "name-asc", label: "ชื่อสินค้า A-Z" },
  { value: "stock-asc", label: "สต๊อก น้อยไปมาก" },
  { value: "discount-desc", label: "ส่วนลด มากไปน้อย" },
];

const inFlashSale = (p: AdminProduct) => p.flashSaleEndsAt !== undefined || !!p.flashSaleDaily;
const endsAtOf = (p: AdminProduct) => (p.flashSaleDaily ? flashSaleRoundEndsAt() : p.flashSaleEndsAt ?? 0);

function flashState(p: AdminProduct, now = Date.now()): FlashState {
  if (p.status !== "active") return "hidden";
  if (!p.flashSaleDaily && endsAtOf(p) <= now) return "ended";
  if (isFlashSaleUpcoming(p, now)) return "upcoming";
  if ((p.stockLeft ?? 0) <= 0) return "soldout";
  return "live";
}

const timeFormatter = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
const roundLabel = (p: AdminProduct) =>
  p.flashSaleDaily
    ? "รายวัน จบเที่ยงคืน"
    : p.flashSaleStartsAt
      ? `${timeFormatter.format(p.flashSaleStartsAt)} น. ถึง ${timeFormatter.format(endsAtOf(p))} น.`
      : `จบ ${timeFormatter.format(endsAtOf(p))} น.`;

export default function AdminFlashSalePage() {
  const productStore = useAdminProducts();
  const navigate = useNavigate();

  const [search, setSearchRaw] = createSignal("");
  const [stateFilter, setStateFilterRaw] = createSignal<"all" | FlashState>("all");
  const [sort, setSortRaw] = createSignal("ends-asc");
  const [page, setPage] = createSignal(1);
  const [pageSize, setPageSizeRaw] = createSignal(20);
  const [listStatus, setListStatus] = createSignal<AsyncStatus>("loading");
  const [selectedIds, setSelectedIds] = createSignal<Set<string>>(new Set());
  const [dialog, setDialog] = createSignal<{ productIds?: string[]; initial?: { daily: boolean; startsAt?: number; endsAt?: number } } | null>(null);
  const [confirmRemove, setConfirmRemove] = createSignal<AdminProduct[] | null>(null);
  const [actionLoading, setActionLoading] = createSignal(false);

  const loadList = () => {
    setListStatus("loading");
    setTimeout(() => setListStatus(Math.random() < 0.08 ? "error" : "success"), 450);
  };
  onMount(loadList);

  const resetPage = () => setPage(1);
  const setSearch = (v: string) => { setSearchRaw(v); resetPage(); };
  const setStateFilter = (v: "all" | FlashState) => { setStateFilterRaw(v); resetPage(); };
  const setSort = (v: string) => { setSortRaw(v); resetPage(); };
  const setPageSize = (v: number) => { setPageSizeRaw(v); resetPage(); };

  const hasActiveFilters = () => search().trim() !== "" || stateFilter() !== "all";
  const clearFilters = () => {
    setSearchRaw("");
    setStateFilterRaw("all");
    resetPage();
  };

  const items = createMemo(() => productStore.products().filter(inFlashSale));

  const stateCounts = createMemo(() => {
    const tally: Partial<Record<"all" | FlashState, number>> = { all: items().length };
    for (const p of items()) tally[flashState(p)] = (tally[flashState(p)] ?? 0) + 1;
    return tally;
  });

  const filtered = createMemo(() => {
    const state = stateFilter();
    const q = search().trim().toLowerCase();
    return items().filter((p) => {
      if (state !== "all" && flashState(p) !== state) return false;
      if (q && !`${p.name} ${p.sku}`.toLowerCase().includes(q)) return false;
      return true;
    });
  });

  const sorted = createMemo(() => {
    const list = [...filtered()];
    switch (sort()) {
      case "name-asc":
        return list.sort((a, b) => a.name.localeCompare(b.name, "th"));
      case "stock-asc":
        return list.sort((a, b) => (a.stockLeft ?? 0) - (b.stockLeft ?? 0));
      case "discount-desc":
        return list.sort((a, b) => (getDiscountPercent(b) ?? 0) - (getDiscountPercent(a) ?? 0));
      default:
        return list.sort((a, b) => endsAtOf(a) - endsAtOf(b));
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

  /** Writes only the flash-sale fields of each product; returns how many saves failed. */
  const writeFlashSale = async (ids: string[], fields: { flashSaleEndsAt?: number; flashSaleStartsAt?: number; flashSaleDaily?: boolean }) => {
    const results = await Promise.allSettled(
      ids.map((id) => productStore.patchProduct(id, fields)),
    );
    return results.filter((r) => r.status === "rejected").length;
  };

  const saveTiming = async (ids: string[], timing: FlashSaleTiming) => {
    const failed = await writeFlashSale(ids, timing.daily
        ? { flashSaleDaily: true, flashSaleEndsAt: flashSaleRoundEndsAt(), flashSaleStartsAt: undefined }
        : { flashSaleDaily: undefined, flashSaleStartsAt: timing.startsAt, flashSaleEndsAt: timing.endsAt });
    const adding = dialog()?.productIds === undefined;
    if (failed === 0) pushToast(adding ? `เพิ่ม ${ids.length} สินค้าในแฟลชเซลแล้ว` : "บันทึกเวลาแฟลชเซลเรียบร้อยแล้ว", "success");
    else pushToast(`บันทึกไม่สำเร็จ ${failed} รายการ กรุณาลองใหม่อีกครั้ง`, "error");
    clearSelection();
  };

  const confirmRemoveAction = async () => {
    const list = confirmRemove();
    if (!list) return;
    setActionLoading(true);
    const failed = await writeFlashSale(
      list.map((p) => p.id),
      { flashSaleDaily: undefined, flashSaleEndsAt: undefined, flashSaleStartsAt: undefined },
    );
    setActionLoading(false);
    setConfirmRemove(null);
    clearSelection();
    if (failed === 0) pushToast(list.length === 1 ? `นำ "${list[0].name}" ออกจากแฟลชเซลแล้ว` : `นำ ${list.length} สินค้าออกจากแฟลชเซลแล้ว`, "error");
    else pushToast(`นำออกไม่สำเร็จ ${failed} รายการ กรุณาลองใหม่อีกครั้ง`, "error");
  };

  const editTiming = (ids: string[]) => {
    const first = productStore.getById(ids[0]);
    setDialog({
      productIds: ids,
      initial: {
        daily: !!first?.flashSaleDaily,
        startsAt: first?.flashSaleDaily ? undefined : first?.flashSaleStartsAt,
        endsAt: first?.flashSaleDaily ? undefined : first?.flashSaleEndsAt,
      },
    });
  };

  const selectedProducts = () => [...selectedIds()].map((id) => productStore.getById(id)).filter((p): p is AdminProduct => !!p);

  const exportColumns: ExportColumn<AdminProduct>[] = [
    { header: "SKU", value: (p) => p.sku },
    { header: "ชื่อสินค้า", value: (p) => p.name },
    { header: "ราคา", value: (p) => p.price },
    { header: "ราคาก่อนลด", value: (p) => p.compareAtPrice ?? "" },
    { header: "สต๊อกคงเหลือ", value: (p) => p.stockLeft ?? 0 },
    { header: "สต๊อกทั้งหมด", value: (p) => p.stockTotal ?? 0 },
    { header: "รอบ", value: (p) => roundLabel(p) },
    { header: "สถานะ", value: (p) => FLASH_STATE_META[flashState(p)].label },
  ];

  const StateBadge = (props: { row: AdminProduct }) => {
    const meta = () => FLASH_STATE_META[flashState(props.row)];
    return <StatusBadge tone={meta().tone}>{meta().label}</StatusBadge>;
  };

  const Price = (props: { row: AdminProduct }) => (
    <div class="flex flex-col items-end gap-0.5 whitespace-nowrap">
      <span class="font-medium text-ink">{formatAdminCurrency(props.row.price)}</span>
      <Show when={props.row.compareAtPrice && props.row.compareAtPrice > props.row.price}>
        <span class="text-xs text-ink-gray">
          <s>{formatAdminCurrency(props.row.compareAtPrice!)}</s> ลด {getDiscountPercent(props.row)}%
        </span>
      </Show>
    </div>
  );

  const stockText = (p: AdminProduct) => `${(p.stockLeft ?? 0).toLocaleString("th-TH")} / ${(p.stockTotal ?? p.stockLeft ?? 0).toLocaleString("th-TH")}`;

  const RowMenu = (props: { row: AdminProduct; triggerClass?: string }) => (
    <DropdownMenu placement="bottom-end" gutter={4}>
      <DropdownMenu.Trigger
        aria-label={`จัดการ ${props.row.name}`}
        onClick={(e: MouseEvent) => e.stopPropagation()}
        class={props.triggerClass ?? "flex size-9 shrink-0 items-center justify-center rounded-pill text-ink-gray transition-colors duration-150 hover:bg-surface-pink"}
      >
        <MoreIcon class="size-5" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content class="z-50 w-52 rounded-card border border-border bg-surface-card p-2 shadow-card outline-none motion-reduce:animate-none data-[expanded]:animate-modal-in data-[closed]:animate-modal-out">
          <DropdownMenu.Item onSelect={() => editTiming([props.row.id])} class={MENU_ITEM}>
            ตั้งเวลาแฟลชเซล
          </DropdownMenu.Item>
          <DropdownMenu.Item onSelect={() => navigate(`/admin/products/${props.row.id}/edit`)} class={MENU_ITEM}>
            แก้ไขสินค้า
          </DropdownMenu.Item>
          <DropdownMenu.Separator class="my-1 h-px bg-border" />
          <DropdownMenu.Item
            onSelect={() => setConfirmRemove([props.row])}
            class="flex min-h-11 cursor-pointer items-center rounded-card px-3 text-sm font-medium text-system-red outline-none transition-colors duration-150 hover:bg-danger-soft data-[highlighted]:bg-danger-soft"
          >
            นำออกจากแฟลชเซล
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu>
  );

  const columns: DataTableColumn<AdminProduct>[] = [
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
      key: "product",
      label: "สินค้า",
      render: (row) => (
        <div class="flex min-w-0 items-center gap-3">
          <img src={row.image} alt="" class="size-11 shrink-0 rounded-media object-cover" />
          <div class="min-w-0">
            <p class="truncate text-sm font-medium text-ink">{row.name}</p>
            <p class="text-xs text-ink-gray">{row.sku}</p>
          </div>
        </div>
      ),
    },
    { key: "price", label: "ราคา", align: "right", render: (row) => <Price row={row} /> },
    { key: "stock", label: "สต๊อก", align: "right", render: (row) => <span class="whitespace-nowrap text-ink">{stockText(row)}</span> },
    { key: "round", label: "รอบ", hideBelowXl: true, render: (row) => <span class="whitespace-nowrap text-ink-gray">{roundLabel(row)}</span> },
    { key: "status", label: "สถานะ", render: (row) => <StateBadge row={row} /> },
    { key: "actions", label: "", align: "right", render: (row) => <RowMenu row={row} /> },
  ];

  return (
    <div class="flex flex-col gap-6" classList={{ "pb-20": selectedIds().size > 0 }}>
      <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "การตลาด" }, { label: "แฟลชเซล" }]} />
      <PageHeader
        title="แฟลชเซล"
        description="เลือกสินค้าที่ขึ้นในแฟลชเซลหน้าแรก และตั้งเวลาเริ่มและจบ"
        actions={
          <div class="flex flex-wrap items-center gap-2">
            <ExportMenu filenameBase="flash-sale-report" columns={exportColumns} rows={sorted()} />
            <Button variant="primary" onClick={() => setDialog({})}>
              <PlusIcon class="size-4" /> เพิ่มสินค้า
            </Button>
          </div>
        }
      />

      <MarketingStatusSummary tabs={TABS} value={stateFilter()} counts={stateCounts()} onChange={setStateFilter} />

      <FilterBar
        search={{ value: search(), onInput: setSearch, placeholder: "ค้นหาชื่อสินค้า, SKU..." }}
        filters={[]}
        onFilterChange={() => {}}
        sort={{ value: sort(), options: SORT_OPTIONS, onChange: setSort }}
      />

      <Show when={listStatus() !== "loading"} fallback={<MarketingListSkeleton />}>
        <Show
          when={listStatus() === "success"}
          fallback={
            <EmptyState tone="error" icon={<RefreshIcon />} title="ไม่สามารถโหลดรายการแฟลชเซลได้" description="เกิดข้อผิดพลาดชั่วคราว ลองโหลดข้อมูลอีกครั้ง" actionLabel="ลองอีกครั้ง" onAction={loadList} class="bg-surface-card shadow-card" />
          }
        >
          <Show
            when={sorted().length > 0}
            fallback={
              <EmptyState
                icon={<FlashBoltIcon />}
                title={hasActiveFilters() ? "ไม่พบสินค้าที่ตรงกับการค้นหา" : "ยังไม่มีสินค้าในแฟลชเซล"}
                description={hasActiveFilters() ? undefined : "ส่วนแฟลชเซลจะซ่อนจากหน้าแรกจนกว่าจะมีสินค้า"}
                actionLabel={hasActiveFilters() ? "ล้างการค้นหา" : "+ เพิ่มสินค้า"}
                onAction={hasActiveFilters() ? clearFilters : () => setDialog({})}
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
              onRowClick={(row) => editTiming([row.id])}
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
                  <button type="button" onClick={() => editTiming([row.id])} class="font-normal flex min-w-0 flex-1 gap-3 text-left">
                    <img src={row.image} alt="" class="size-16 shrink-0 rounded-media object-cover" />
                    <div class="min-w-0 flex-1">
                      <p class="truncate text-sm font-medium text-ink">{row.name}</p>
                      <p class="truncate text-xs text-ink-gray">{row.sku}</p>
                      <p class="mt-1 text-sm font-semibold text-ink">
                        {formatAdminCurrency(row.price)}
                        <Show when={row.compareAtPrice && row.compareAtPrice > row.price}>
                          <span class="ml-1.5 text-xs font-normal text-ink-gray">ลด {getDiscountPercent(row)}%</span>
                        </Show>
                      </p>
                      <div class="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <span class="whitespace-nowrap text-sm text-ink-gray">สต๊อก {stockText(row)}</span>
                        <StateBadge row={row} />
                      </div>
                      <p class="mt-1 text-xs text-ink-placeholder">{roundLabel(row)}</p>
                    </div>
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
          { label: "ตั้งเวลา", onClick: () => editTiming([...selectedIds()]) },
          { label: "นำออก", tone: "danger", onClick: () => setConfirmRemove(selectedProducts()) },
        ]}
      />

      <FlashSaleDialog
        open={dialog() !== null}
        onOpenChange={(open) => !open && setDialog(null)}
        productIds={dialog()?.productIds}
        initial={dialog()?.initial}
        onSave={saveTiming}
      />

      <ConfirmDialog
        open={confirmRemove() !== null}
        onOpenChange={(open) => !open && setConfirmRemove(null)}
        title="นำออกจากแฟลชเซล?"
        description={
          (confirmRemove()?.length ?? 0) === 1
            ? `"${confirmRemove()![0].name}" จะหายจากส่วนแฟลชเซลหน้าแรก สินค้ายังขายตามปกติ`
            : `${confirmRemove()?.length ?? 0} สินค้าที่เลือกจะหายจากส่วนแฟลชเซลหน้าแรก สินค้ายังขายตามปกติ`
        }
        confirmLabel="นำออก"
        tone="danger"
        loading={actionLoading()}
        onConfirm={confirmRemoveAction}
      />
    </div>
  );
}

const MENU_ITEM =
  "flex min-h-11 cursor-pointer items-center rounded-card px-3 text-sm text-ink outline-none transition-colors duration-150 hover:bg-surface-pink data-[highlighted]:bg-surface-pink";
