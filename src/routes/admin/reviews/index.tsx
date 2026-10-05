import { createEffect, createMemo, createSignal, For, on, Show } from "solid-js";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { StatusBadge } from "~/components/admin/StatusBadge";
import { EmptyState } from "~/components/admin/EmptyState";
import { SearchInput } from "~/components/admin/SearchInput";
import { Pagination } from "~/components/admin/Pagination";
import { Toggle } from "~/components/admin/Toggle";
import { ChevronDownIcon, ReviewsIcon } from "~/components/admin/icons";
import { ReviewsTabs } from "~/components/admin/reviews/ReviewsTabs";
import { ReviewStars } from "~/components/admin/reviews/ReviewStars";
import { useAdminProducts, type AdminProduct } from "~/lib/adminProductStore";
import { useAdminProductReviews } from "~/lib/adminProductReviews";
import type { Review } from "~/lib/types";

const SELECT_CLASS =
  "h-11 w-full appearance-none rounded-card border border-border bg-surface-card pl-4 pr-9 text-sm text-ink outline-none focus:border-brand-pink";

type ReviewRow = { product: AdminProduct; review: Review; optionLabel: string };

/** Option name from this product's own options (the review's `variantId`) — same source the storefront labels come from; product-level otherwise. */
function optionLabelOf(product: AdminProduct, review: Review): string {
  const option = review.variantId ? product.variants?.find((v) => v.id === review.variantId) : undefined;
  return option?.label ?? (review.variantId ? (review.variantLabel ?? "ทั้งสินค้า") : "ทั้งสินค้า");
}

/**
 * "รีวิวสินค้า" — the reviews the PDP lists (5 at a time, under the TikTok
 * clips) and the Option Modal filters per option: every product's own
 * `reviews`, flattened into one list with the option each was written for.
 * Replaces the former "Featured Review" (social posts) page — the storefront
 * no longer has that section. Show/hide is a mock moderation toggle.
 */
export default function AdminProductReviewsPage() {
  const productsStore = useAdminProducts();
  const moderation = useAdminProductReviews();

  const rows = createMemo<ReviewRow[]>(() =>
    productsStore.products().flatMap((product) => (product.reviews ?? []).map((review) => ({ product, review, optionLabel: optionLabelOf(product, review) }))),
  );

  const [search, setSearch] = createSignal("");
  const [productId, setProductId] = createSignal("all");
  const [rating, setRating] = createSignal("all");
  const [visibility, setVisibility] = createSignal<"all" | "shown" | "hidden">("all");
  const [page, setPage] = createSignal(1);
  const [pageSize, setPageSize] = createSignal(20);
  createEffect(on([search, productId, rating, visibility, pageSize], () => setPage(1), { defer: true }));

  const productsWithReviews = createMemo(() => productsStore.products().filter((p) => (p.reviews?.length ?? 0) > 0));

  const filtered = createMemo(() => {
    const q = search().trim().toLowerCase();
    return rows().filter(({ product, review, optionLabel }) => {
      if (productId() !== "all" && product.id !== productId()) return false;
      if (rating() !== "all" && review.rating !== Number(rating())) return false;
      const hidden = moderation.isHidden(product.id, review.id);
      if (visibility() === "shown" && hidden) return false;
      if (visibility() === "hidden" && !hidden) return false;
      if (!q) return true;
      return [product.name, product.sku, review.name, review.text, optionLabel].some((s) => s?.toLowerCase().includes(q));
    });
  });
  const totalPages = () => Math.max(1, Math.ceil(filtered().length / pageSize()));
  const pageRows = () => filtered().slice((page() - 1) * pageSize(), page() * pageSize());

  return (
    <div class="flex flex-col gap-6">
      <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "รีวิว" }, { label: "รีวิวสินค้า" }]} />
      <PageHeader title="รีวิวสินค้า" description="รีวิวจากลูกค้าที่แสดงในหน้าสินค้า (PDP) ทีละ 5 รีวิว และในหน้าต่างเลือกตัวเลือกสินค้า แยกตามตัวเลือก" />
      <ReviewsTabs />

      <div class="flex flex-wrap gap-2">
        <StatusBadge tone="info">ทั้งหมด {rows().length} รีวิว</StatusBadge>
        <StatusBadge tone="neutral">ซ่อนอยู่ {moderation.hiddenCount()} รีวิว</StatusBadge>
        <StatusBadge tone="warning">Mock — หน้าร้านยังไม่อ่านสถานะซ่อน/แสดง</StatusBadge>
      </div>

      <section class="flex flex-col gap-4 rounded-card bg-surface-card p-4 shadow-card sm:p-5">
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SearchInput value={search()} onInput={setSearch} placeholder="ค้นหาสินค้า, ผู้รีวิว, ข้อความ, ตัวเลือก" />
          <Select label="สินค้า" value={productId()} onChange={setProductId}>
            <option value="all">ทุกสินค้า</option>
            <For each={productsWithReviews()}>
              {(p) => (
                <option value={p.id}>
                  {p.name} · {p.sku} ({p.reviews?.length ?? 0})
                </option>
              )}
            </For>
          </Select>
          <Select label="คะแนน" value={rating()} onChange={setRating}>
            <option value="all">ทุกคะแนน</option>
            <For each={[5, 4, 3, 2, 1]}>{(n) => <option value={String(n)}>{n} ดาว</option>}</For>
          </Select>
          <Select label="การแสดงผล" value={visibility()} onChange={(v) => setVisibility(v as "all" | "shown" | "hidden")}>
            <option value="all">ทั้งหมด</option>
            <option value="shown">แสดงอยู่</option>
            <option value="hidden">ซ่อนอยู่</option>
          </Select>
        </div>

        <Show
          when={pageRows().length > 0}
          fallback={<EmptyState icon={<ReviewsIcon />} title="ไม่พบรีวิว" description="ลองเปลี่ยนคำค้นหาหรือตัวกรอง" />}
        >
          <ul class="flex flex-col gap-2">
            <For each={pageRows()}>
              {(row) => {
                const hidden = () => moderation.isHidden(row.product.id, row.review.id);
                return (
                  <li class="flex flex-col gap-3 rounded-card border border-border bg-white p-3 sm:flex-row sm:items-start" classList={{ "opacity-60": hidden() }}>
                    <img src={row.product.mainImage ?? row.product.image} alt="" class="size-14 shrink-0 rounded-media object-cover" />
                    <div class="flex min-w-0 flex-1 flex-col gap-1">
                      <a href={`/admin/products/${row.product.id}`} class="truncate text-sm font-medium text-ink hover:text-brand-pink">
                        {row.product.name}
                      </a>
                      <div class="flex flex-wrap items-center gap-2 text-xs text-ink-gray">
                        <StatusBadge tone={row.review.variantId ? "info" : "neutral"}>{row.optionLabel}</StatusBadge>
                        <ReviewStars rating={row.review.rating} />
                        <span>{row.review.name}</span>
                        <span>· {row.review.date}</span>
                      </div>
                      <p class="line-clamp-2 text-sm text-ink-gray">{row.review.text}</p>
                      <Show when={(row.review.photos?.length ?? 0) > 0 || (row.review.videos?.length ?? 0) > 0}>
                        <div class="flex flex-wrap items-center gap-1.5 pt-1">
                          <For each={row.review.photos ?? []}>{(src) => <img src={src} alt="" loading="lazy" class="size-12 rounded-media object-cover" />}</For>
                          <Show when={row.review.videos?.length}>
                            <span class="rounded-pill bg-surface-gray px-2 py-0.5 text-xs text-ink-gray">วิดีโอ {row.review.videos!.length}</span>
                          </Show>
                        </div>
                      </Show>
                    </div>
                    <div class="shrink-0">
                      <Toggle
                        checked={!hidden()}
                        onChange={(on) => moderation.setHidden(row.product.id, row.review.id, !on)}
                        onLabel="แสดง"
                        offLabel="ซ่อน"
                      />
                    </div>
                  </li>
                );
              }}
            </For>
          </ul>
        </Show>

        <Pagination page={page()} totalPages={totalPages()} pageSize={pageSize()} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </section>
    </div>
  );
}

function Select(props: { label: string; value: string; onChange: (value: string) => void; children: import("solid-js").JSX.Element }) {
  return (
    <div class="relative">
      <select aria-label={props.label} value={props.value} onChange={(e) => props.onChange(e.currentTarget.value)} class={SELECT_CLASS}>
        {props.children}
      </select>
      <ChevronDownIcon class="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-gray" />
    </div>
  );
}
