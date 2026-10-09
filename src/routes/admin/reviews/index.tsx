import { createMemo, createSignal, For, onMount, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { StatusBadge } from "~/components/admin/StatusBadge";
import { EmptyState } from "~/components/admin/EmptyState";
import { FilterBar } from "~/components/admin/FilterBar";
import { DataTable, type DataTableColumn } from "~/components/admin/DataTable";
import { Pagination } from "~/components/admin/Pagination";
import { Skeleton } from "~/components/admin/Skeleton";
import { QuickViewDrawer } from "~/components/admin/QuickViewDrawer";
import { ExportMenu } from "~/components/admin/ExportMenu";
import { Toggle } from "~/components/admin/Toggle";
import { RefreshIcon, ReviewsIcon } from "~/components/admin/icons";
import { ReviewStars } from "~/components/admin/reviews/ReviewStars";
import { useAdminProducts, type AdminProduct } from "~/lib/adminProductStore";
import { reviewKey, useAdminProductReviews } from "~/lib/adminProductReviews";
import type { ExportColumn } from "~/lib/adminExport";
import { pushToast } from "~/lib/toast";
import type { AsyncStatus, Review } from "~/lib/types";

type ReviewRow = { key: string; product: AdminProduct; review: Review; optionLabel: string };
type VisibilityTab = "all" | "shown" | "hidden";
const VISIBILITY_TABS: { value: VisibilityTab; label: string }[] = [
  { value: "all", label: "ทั้งหมด" },
  { value: "shown", label: "แสดงอยู่" },
  { value: "hidden", label: "ซ่อนอยู่" },
];

const SORT_OPTIONS = [
  { value: "date-desc", label: "วันที่ ใหม่ไปเก่า" },
  { value: "date-asc", label: "วันที่ เก่าไปใหม่" },
  { value: "rating-desc", label: "คะแนน สูงไปต่ำ" },
  { value: "rating-asc", label: "คะแนน ต่ำไปสูง" },
];

const THAI_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
/** "12 ส.ค. 2569" to a sortable number (0 when it can't be read). */
function reviewDateValue(date: string): number {
  const [d, m, y] = date.trim().split(/\s+/);
  const month = THAI_MONTHS.indexOf(m ?? "");
  if (month < 0) return 0;
  return Number(y) * 10000 + month * 100 + Number(d);
}

/** Option name from this product's own options (the review's `variantId`), product-level otherwise. */
function optionLabelOf(product: AdminProduct, review: Review): string {
  const option = review.variantId ? product.variants?.find((v) => v.id === review.variantId) : undefined;
  return option?.label ?? (review.variantId ? (review.variantLabel ?? "ทั้งสินค้า") : "ทั้งสินค้า");
}

/**
 * "รีวิวสินค้า": every product's own `reviews` (what the PDP lists 5 at a
 * time and the Option Modal shows), with a show/hide switch the storefront
 * honors (`productCatalog.tsx` drops hidden reviews).
 */
export default function AdminProductReviewsPage() {
  const productsStore = useAdminProducts();
  const moderation = useAdminProductReviews();
  const navigate = useNavigate();

  const rows = createMemo<ReviewRow[]>(() =>
    productsStore
      .products()
      .flatMap((product) => (product.reviews ?? []).map((review) => ({ key: reviewKey(product.id, review.id), product, review, optionLabel: optionLabelOf(product, review) }))),
  );

  const [search, setSearchRaw] = createSignal("");
  const [productId, setProductIdRaw] = createSignal("all");
  const [rating, setRatingRaw] = createSignal("all");
  const [visibility, setVisibilityRaw] = createSignal<VisibilityTab>("all");
  const [sort, setSortRaw] = createSignal("date-desc");
  const [page, setPage] = createSignal(1);
  const [pageSize, setPageSizeRaw] = createSignal(20);
  const [listStatus, setListStatus] = createSignal<AsyncStatus>("loading");
  const [quickViewKey, setQuickViewKey] = createSignal<string | null>(null);
  const quickViewRow = createMemo(() => rows().find((r) => r.key === quickViewKey()));

  const loadList = () => {
    setListStatus("loading");
    setTimeout(() => setListStatus(Math.random() < 0.08 ? "error" : "success"), 500);
  };
  onMount(loadList);

  const resetPage = () => setPage(1);
  const setSearch = (v: string) => { setSearchRaw(v); resetPage(); };
  const setVisibility = (v: VisibilityTab) => { setVisibilityRaw(v); resetPage(); };
  const setSort = (v: string) => { setSortRaw(v); resetPage(); };
  const setPageSize = (v: number) => { setPageSizeRaw(v); resetPage(); };

  const hasActiveFilters = () => search().trim() !== "" || productId() !== "all" || rating() !== "all" || visibility() !== "all";
  const clearFilters = () => {
    setSearchRaw("");
    setProductIdRaw("all");
    setRatingRaw("all");
    setVisibilityRaw("all");
    resetPage();
  };

  const productsWithReviews = createMemo(() => productsStore.products().filter((p) => (p.reviews?.length ?? 0) > 0));
  const isHidden = (row: ReviewRow) => moderation.isHidden(row.product.id, row.review.id);

  const searched = createMemo(() => {
    const q = search().trim().toLowerCase();
    return rows().filter(({ product, review, optionLabel }) => {
      if (productId() !== "all" && product.id !== productId()) return false;
      if (rating() !== "all" && review.rating !== Number(rating())) return false;
      if (!q) return true;
      return [product.name, product.sku, review.name, review.text, optionLabel].some((s) => s?.toLowerCase().includes(q));
    });
  });
  const tabCount = (tab: VisibilityTab) =>
    tab === "all" ? searched().length : searched().filter((r) => (tab === "hidden" ? isHidden(r) : !isHidden(r))).length;

  const sorted = createMemo(() => {
    const tab = visibility();
    const list = searched().filter((r) => tab === "all" || (tab === "hidden" ? isHidden(r) : !isHidden(r)));
    switch (sort()) {
      case "date-asc":
        return list.sort((a, b) => reviewDateValue(a.review.date) - reviewDateValue(b.review.date));
      case "rating-desc":
        return list.sort((a, b) => b.review.rating - a.review.rating);
      case "rating-asc":
        return list.sort((a, b) => a.review.rating - b.review.rating);
      default:
        return list.sort((a, b) => reviewDateValue(b.review.date) - reviewDateValue(a.review.date));
    }
  });
  const totalPages = createMemo(() => Math.max(1, Math.ceil(sorted().length / pageSize())));
  const currentPage = createMemo(() => Math.min(page(), totalPages()));
  const pageItems = createMemo(() => sorted().slice((currentPage() - 1) * pageSize(), currentPage() * pageSize()));

  const setShown = (row: ReviewRow, shown: boolean) => {
    moderation.setHidden(row.product.id, row.review.id, !shown);
    pushToast(shown ? "แสดงรีวิวแล้ว" : "ซ่อนรีวิวแล้ว", "success");
  };

  const exportColumns: ExportColumn<ReviewRow>[] = [
    { header: "สินค้า", value: (r) => r.product.name },
    { header: "SKU", value: (r) => r.product.sku },
    { header: "ตัวเลือก", value: (r) => r.optionLabel },
    { header: "ผู้รีวิว", value: (r) => r.review.name },
    { header: "คะแนน", value: (r) => r.review.rating },
    { header: "วันที่", value: (r) => r.review.date },
    { header: "ข้อความ", value: (r) => r.review.text },
    { header: "การแสดงผล", value: (r) => (isHidden(r) ? "ซ่อนอยู่" : "แสดงอยู่") },
  ];

  const visibilityToggle = (row: ReviewRow) => (
    <span onClick={(e) => e.stopPropagation()} class="inline-flex">
      <Toggle checked={!isHidden(row)} onChange={(on) => setShown(row, on)} onLabel="แสดง" offLabel="ซ่อน" />
    </span>
  );

  const columns: DataTableColumn<ReviewRow>[] = [
    {
      key: "product",
      label: "สินค้า",
      render: (row) => (
        <div class="flex items-center gap-3" classList={{ "opacity-60": isHidden(row) }}>
          <img src={row.product.mainImage ?? row.product.image} alt="" class="size-11 shrink-0 rounded-media object-cover" />
          <div class="min-w-0">
            <p class="truncate text-sm font-medium text-ink">{row.product.name}</p>
            <p class="truncate text-xs text-ink-gray">{row.optionLabel}</p>
          </div>
        </div>
      ),
    },
    {
      key: "review",
      label: "รีวิว",
      render: (row) => (
        <div class="flex max-w-md flex-col gap-1" classList={{ "opacity-60": isHidden(row) }}>
          <ReviewStars rating={row.review.rating} />
          <p class="line-clamp-2 text-sm text-ink-gray">{row.review.text}</p>
        </div>
      ),
    },
    { key: "author", label: "ผู้รีวิว", hideBelowXl: true, render: (row) => <span class="text-ink-gray">{row.review.name}</span> },
    {
      key: "media",
      label: "รูปและวิดีโอ",
      hideBelowXl: true,
      render: (row) => <span class="whitespace-nowrap text-ink-gray">{mediaLabel(row.review)}</span>,
    },
    { key: "date", label: "วันที่", hideBelowXl: true, render: (row) => <span class="whitespace-nowrap text-ink-gray">{row.review.date}</span> },
    { key: "visible", label: "แสดงบนหน้าร้าน", align: "right", render: (row) => visibilityToggle(row) },
  ];

  return (
    <div class="flex flex-col gap-6">
      <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "รีวิวสินค้า" }]} />
      <PageHeader
        title="รีวิวสินค้า"
        description="ซ่อนหรือแสดงรีวิวที่ลูกค้าเห็นในหน้าสินค้า"
        actions={
          <div class="flex flex-wrap items-center gap-2">
            <ExportMenu filenameBase="reviews-report" columns={exportColumns} rows={sorted()} />
          </div>
        }
      />

      <div class="scroll-rail !mx-0 !px-0">
        <For each={VISIBILITY_TABS}>
          {(tab) => {
            const active = () => visibility() === tab.value;
            return (
              <button
                type="button"
                aria-pressed={active()}
                onClick={() => setVisibility(tab.value)}
                class={`flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-pill px-4 text-sm font-medium transition-colors duration-150 ${
                  active() ? "bg-brand-pink text-white" : "border border-border bg-surface-card text-ink-gray lg:hover:bg-surface-pink/40"
                }`}
              >
                {tab.label}
                <span class={`rounded-pill px-1.5 py-0.5 text-xs ${active() ? "bg-white/20" : "bg-surface-gray text-ink-gray"}`}>{tabCount(tab.value)}</span>
              </button>
            );
          }}
        </For>
      </div>

      <FilterBar
        search={{ value: search(), onInput: setSearch, placeholder: "ค้นหาชื่อสินค้า, ผู้รีวิว, ข้อความ..." }}
        filters={[
          {
            id: "product",
            label: "สินค้า",
            value: productId(),
            options: [{ value: "all", label: "ทุกสินค้า" }, ...productsWithReviews().map((p) => ({ value: p.id, label: p.name }))],
          },
          {
            id: "rating",
            label: "คะแนน",
            value: rating(),
            options: [{ value: "all", label: "ทุกคะแนน" }, ...[5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${n} ดาว` }))],
          },
        ]}
        onFilterChange={(id, value) => {
          if (id === "product") setProductIdRaw(value);
          if (id === "rating") setRatingRaw(value);
          resetPage();
        }}
        sort={{ value: sort(), options: SORT_OPTIONS, onChange: setSort }}
      />

      <Show when={listStatus() !== "loading"} fallback={<ListSkeleton />}>
        <Show
          when={listStatus() === "success"}
          fallback={
            <EmptyState tone="error" icon={<RefreshIcon />} title="ไม่สามารถโหลดรายการรีวิวได้" description="เกิดข้อผิดพลาดชั่วคราว ลองโหลดข้อมูลอีกครั้ง" actionLabel="ลองอีกครั้ง" onAction={loadList} class="bg-surface-card shadow-card" />
          }
        >
          <Show
            when={sorted().length > 0}
            fallback={
              <EmptyState
                icon={<ReviewsIcon />}
                title={hasActiveFilters() ? "ไม่พบรีวิวที่ตรงกับการค้นหา" : "ยังไม่มีรีวิว"}
                description={hasActiveFilters() ? undefined : "รีวิวจากลูกค้าจะแสดงที่นี่"}
                actionLabel={hasActiveFilters() ? "ล้างการค้นหา" : undefined}
                onAction={hasActiveFilters() ? clearFilters : undefined}
                class="bg-surface-card shadow-card"
              />
            }
          >
            <DataTable
              columns={columns}
              rows={pageItems()}
              getRowKey={(row) => row.key}
              onRowClick={(row) => setQuickViewKey(row.key)}
              renderMobileCard={(row) => (
                <div class="flex gap-3 rounded-card bg-surface-card p-3 shadow-card">
                  <button type="button" onClick={() => setQuickViewKey(row.key)} class="font-normal flex min-w-0 flex-1 gap-3 text-left" classList={{ "opacity-60": isHidden(row) }}>
                    <img src={row.product.mainImage ?? row.product.image} alt="" class="size-16 shrink-0 rounded-media object-cover" />
                    <div class="min-w-0 flex-1">
                      <p class="truncate text-sm font-medium text-ink">{row.product.name}</p>
                      <p class="truncate text-xs text-ink-gray">{row.optionLabel}</p>
                      <div class="mt-1">
                        <ReviewStars rating={row.review.rating} />
                      </div>
                      <p class="mt-1 line-clamp-2 text-sm text-ink-gray">{row.review.text}</p>
                      <p class="mt-1 text-xs text-ink-placeholder">
                        {row.review.name} {row.review.date}
                      </p>
                    </div>
                  </button>
                  <div class="shrink-0 self-start">{visibilityToggle(row)}</div>
                </div>
              )}
            />
            <Pagination page={currentPage()} totalPages={totalPages()} pageSize={pageSize()} onPageChange={setPage} onPageSizeChange={setPageSize} />
          </Show>
        </Show>
      </Show>

      <QuickViewDrawer
        open={quickViewRow() !== undefined}
        onOpenChange={(open) => !open && setQuickViewKey(null)}
        title={quickViewRow()?.product.name ?? ""}
        subtitle={quickViewRow()?.optionLabel}
        onViewFull={() => {
          const row = quickViewRow();
          setQuickViewKey(null);
          if (row) navigate(`/admin/products/${row.product.id}`);
        }}
      >
        <Show when={quickViewRow()}>
          {(row) => (
            <div class="flex flex-col gap-4">
              <div class="flex flex-wrap items-center gap-2">
                <ReviewStars rating={row().review.rating} />
                <StatusBadge tone={isHidden(row()) ? "neutral" : "success"}>{isHidden(row()) ? "ซ่อนอยู่" : "แสดงอยู่"}</StatusBadge>
              </div>
              <div class="grid grid-cols-2 gap-3 rounded-card bg-surface-gray/60 p-3 text-sm">
                <Field label="ผู้รีวิว" value={row().review.name} />
                <Field label="วันที่" value={row().review.date} />
                <Field label="ตัวเลือก" value={row().optionLabel} />
                <Field label="รูปและวิดีโอ" value={mediaLabel(row().review)} />
              </div>
              <p class="text-sm text-ink-gray">{row().review.text}</p>
              <Show when={(row().review.photos?.length ?? 0) > 0}>
                <div class="flex flex-wrap gap-2">
                  <For each={row().review.photos ?? []}>{(src) => <img src={src} alt="" loading="lazy" class="size-20 rounded-media object-cover" />}</For>
                </div>
              </Show>
              <label class="flex flex-col gap-1.5">
                <span class="text-sm font-medium text-ink">แสดงบนหน้าร้าน</span>
                <Toggle checked={!isHidden(row())} onChange={(on) => setShown(row(), on)} onLabel="แสดง" offLabel="ซ่อน" />
                <span class="text-xs text-ink-gray">รีวิวที่ซ่อนจะไม่แสดงในหน้าสินค้าและหน้าต่างเลือกตัวเลือก</span>
              </label>
            </div>
          )}
        </Show>
      </QuickViewDrawer>
    </div>
  );
}

function mediaLabel(review: Review): string {
  const photos = review.photos?.length ?? 0;
  const videos = review.videos?.length ?? 0;
  if (!photos && !videos) return "-";
  return [photos ? `รูป ${photos}` : "", videos ? `วิดีโอ ${videos}` : ""].filter(Boolean).join(", ");
}

function Field(props: { label: string; value: string }) {
  return (
    <div>
      <p class="text-xs text-ink-placeholder">{props.label}</p>
      <p class="font-medium text-ink">{props.value}</p>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div class="flex flex-col gap-3">
      <Skeleton class="h-11 w-full rounded-pill" />
      <For each={[0, 1, 2, 3, 4, 5]}>
        {() => (
          <div class="flex items-center gap-3 rounded-card bg-surface-card p-3 shadow-card">
            <Skeleton class="size-11 shrink-0 rounded-media" />
            <div class="flex flex-1 flex-col gap-1.5">
              <Skeleton class="h-4 w-1/2" />
              <Skeleton class="h-3 w-1/4" />
            </div>
            <Skeleton class="h-8 w-16 rounded-pill" />
          </div>
        )}
      </For>
    </div>
  );
}
