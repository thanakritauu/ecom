import { createEffect, createMemo, createSignal, For, on, onMount, Show, type JSX } from "solid-js";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { Button } from "~/components/shared/Button";
import { StatusBadge } from "~/components/admin/StatusBadge";
import { EmptyState } from "~/components/admin/EmptyState";
import { Skeleton } from "~/components/admin/Skeleton";
import { ConfirmDialog } from "~/components/admin/ConfirmDialog";
import { ArrowDownIcon, ArrowUpIcon, RefreshIcon, ReviewsIcon, TrashIcon } from "~/components/admin/icons";
import { useAdminProducts } from "~/lib/adminProductStore";
import { useAdminFeaturedReviews } from "~/lib/adminFeaturedReviewStore";
import { fetchAllSocialReviews, SOCIAL_PROVIDER_META, type ProviderFetchResult, type SocialProvider, type SocialReview } from "~/lib/socialReviews";
import { pushToast } from "~/lib/toast";
import iconInstagram from "~/assets/icons/social-instagram.svg";
import iconTiktok from "~/assets/icons/social-tiktok.svg";

const PROVIDER_ICON = { instagram: iconInstagram, tiktok: iconTiktok } as const;
const SELECT_CLASS =
  "h-11 w-full appearance-none rounded-card border border-border bg-surface-card pl-4 pr-9 text-sm text-ink outline-none focus:border-brand-pink disabled:cursor-not-allowed disabled:bg-surface-gray";

/**
 * Phase 03 — Featured Review management (replaces this route's former
 * "coming soon" placeholder). Flow: pick a Product → browse normalized
 * Instagram/TikTok content from the provider layer → feature / unfeature /
 * reorder → Save. Saved selections feed the PDP's "รีวิวเด่นจากโซเชียล".
 */
export default function AdminReviewsPage() {
  const productsStore = useAdminProducts();
  const featuredStore = useAdminFeaturedReviews();

  const products = () => productsStore.products();
  const [productId, setProductId] = createSignal(featuredStore.assignments()[0]?.productId ?? products()[0]?.id ?? "");
  const product = () => productsStore.getById(productId());
  const productName = (id?: string) => (id ? productsStore.getById(id)?.name : undefined);

  const [draft, setDraft] = createSignal<SocialReview[]>([]);
  const [saving, setSaving] = createSignal(false);
  const [pendingProductId, setPendingProductId] = createSignal<string | null>(null);

  const saved = () => featuredStore.getForProduct(productId());
  const dirty = createMemo(() => draft().map((r) => r.id).join("|") !== saved().map((r) => r.id).join("|"));
  createEffect(on([productId, () => featuredStore.assignments()], () => setDraft(saved())));

  // Provider content — fetched once per page visit (and on retry), never per row.
  const [loadStatus, setLoadStatus] = createSignal<"loading" | "done">("loading");
  const [results, setResults] = createSignal<ProviderFetchResult[]>([]);
  const load = async () => {
    setLoadStatus("loading");
    setResults(await fetchAllSocialReviews());
    setLoadStatus("done");
  };
  onMount(load);

  const allContent = () => results().flatMap((r) => r.reviews);
  const failedProviders = () => results().filter((r) => r.status === "error");
  /** A featured post its provider no longer returns (deleted/hidden on the platform) — only knowable when that provider loaded OK. */
  const isMissingAtSource = (review: SocialReview) => {
    const res = results().find((r) => r.provider === review.provider);
    return res?.status === "success" && !res.reviews.some((r) => r.id === review.id);
  };

  const [platform, setPlatform] = createSignal<"all" | SocialProvider>("all");
  const [scope, setScope] = createSignal<"product" | "all">("product");
  const isFeatured = (id: string) => draft().some((r) => r.id === id);
  const visibleContent = createMemo(() =>
    allContent()
      .filter((r) => platform() === "all" || r.provider === platform())
      .filter((r) => scope() === "all" || r.productId === productId() || isFeatured(r.id)),
  );

  const feature = (review: SocialReview) => setDraft((list) => (list.some((r) => r.id === review.id) ? list : [...list, { ...review, productId: productId() }]));
  const unfeature = (id: string) => setDraft((list) => list.filter((r) => r.id !== id));
  const move = (index: number, delta: number) =>
    setDraft((list) => {
      const target = index + delta;
      if (target < 0 || target >= list.length) return list;
      const next = [...list];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const save = async () => {
    setSaving(true);
    try {
      // Refresh each snapshot from the latest provider data when available, so the PDP shows current content.
      const fresh = draft().map((r) => ({ ...(allContent().find((c) => c.id === r.id) ?? r), productId: productId() }));
      await featuredStore.saveForProduct(productId(), fresh);
      pushToast("บันทึก Featured Review แล้ว");
    } catch {
      pushToast("บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง", "error");
    } finally {
      setSaving(false);
    }
  };

  const requestProductChange = (id: string) => {
    if (id === productId()) return;
    if (dirty()) setPendingProductId(id);
    else setProductId(id);
  };

  return (
    <div class="flex flex-col gap-6">
      <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "รีวิว" }]} />
      <PageHeader title="Featured Review" description="เลือกรีวิวจาก Instagram / TikTok เพื่อแสดงในหน้าสินค้า (PDP)" />

      {/* Provider status — makes it explicit when content is mock data */}
      <div class="flex flex-wrap gap-2">
        <For each={results()}>
          {(r) => (
            <StatusBadge tone={r.status === "error" ? "danger" : r.configured ? "success" : "warning"}>
              {SOCIAL_PROVIDER_META[r.provider].label}: {r.status === "error" ? "โหลดไม่สำเร็จ" : r.configured ? "เชื่อมต่อแล้ว" : "Mock data (ยังไม่ได้ตั้งค่า API)"}
            </StatusBadge>
          )}
        </For>
      </div>

      <div class="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        {/* Product + its featured list */}
        <section class="flex flex-col gap-4 self-start rounded-card bg-surface-card p-4 shadow-card sm:p-5">
          <label class="flex flex-col gap-1.5">
            <span class="text-sm font-medium text-ink">สินค้า</span>
            <select value={productId()} onChange={(e) => requestProductChange(e.currentTarget.value)} disabled={saving()} class={SELECT_CLASS}>
              <For each={products()}>
                {(p) => (
                  <option value={p.id}>
                    {p.name} · {p.sku}
                    {featuredStore.getForProduct(p.id).length ? ` (${featuredStore.getForProduct(p.id).length} Featured)` : ""}
                  </option>
                )}
              </For>
            </select>
          </label>

          <div class="flex items-center justify-between gap-2">
            <h2 class="text-base font-semibold text-ink">Featured ของสินค้านี้ ({draft().length})</h2>
            <Show when={dirty()}>
              <StatusBadge tone="warning">ยังไม่บันทึก</StatusBadge>
            </Show>
          </div>

          <Show
            when={draft().length > 0}
            fallback={<p class="rounded-card border border-dashed border-border px-4 py-6 text-center text-sm text-ink-gray">ยังไม่มี Featured Review — PDP จะซ่อนส่วนนี้</p>}
          >
            <ol class="flex flex-col gap-2">
              <For each={draft()}>
                {(review, i) => (
                  <li class="flex items-center gap-3 rounded-card border border-border bg-white p-2">
                    <span class="w-5 shrink-0 text-center text-sm font-semibold text-ink-gray">{i() + 1}</span>
                    <Thumb review={review} />
                    <div class="min-w-0 flex-1">
                      <p class="truncate text-sm font-medium text-ink">{review.author}</p>
                      <p class="line-clamp-1 text-xs text-ink-gray">{review.content}</p>
                      <Show when={isMissingAtSource(review)}>
                        <StatusBadge tone="danger" class="mt-1">ไม่พบคอนเทนต์ต้นทาง</StatusBadge>
                      </Show>
                    </div>
                    <div class="flex shrink-0 items-center gap-1">
                      <IconButton label="เลื่อนขึ้น" disabled={i() === 0 || saving()} onClick={() => move(i(), -1)}>
                        <ArrowUpIcon />
                      </IconButton>
                      <IconButton label="เลื่อนลง" disabled={i() === draft().length - 1 || saving()} onClick={() => move(i(), 1)}>
                        <ArrowDownIcon />
                      </IconButton>
                      <IconButton label="นำออกจาก Featured" disabled={saving()} onClick={() => unfeature(review.id)}>
                        <TrashIcon />
                      </IconButton>
                    </div>
                  </li>
                )}
              </For>
            </ol>
          </Show>

          <div class="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" disabled={!dirty() || saving()} onClick={() => setDraft(saved())}>
              ยกเลิกการเปลี่ยนแปลง
            </Button>
            <Button type="button" variant="primary" disabled={!dirty() || !product()} loading={saving()} onClick={save}>
              บันทึก
            </Button>
          </div>
        </section>

        {/* Available social content */}
        <section class="flex flex-col gap-4 rounded-card bg-surface-card p-4 shadow-card sm:p-5">
          <div class="flex flex-wrap items-end gap-3">
            <h2 class="mr-auto text-base font-semibold text-ink">คอนเทนต์จากโซเชียล</h2>
            <select value={platform()} onChange={(e) => setPlatform(e.currentTarget.value as "all" | SocialProvider)} class={`${SELECT_CLASS} !w-auto`} aria-label="แพลตฟอร์ม">
              <option value="all">ทุกแพลตฟอร์ม</option>
              <option value="instagram">Instagram</option>
              <option value="tiktok">TikTok</option>
            </select>
            <select value={scope()} onChange={(e) => setScope(e.currentTarget.value as "product" | "all")} class={`${SELECT_CLASS} !w-auto`} aria-label="ขอบเขต">
              <option value="product">ผูกกับสินค้านี้</option>
              <option value="all">ทั้งหมด</option>
            </select>
          </div>

          <Show when={failedProviders().length > 0}>
            <div class="flex flex-wrap items-center justify-between gap-2 rounded-card bg-danger-soft px-4 py-3 text-sm text-danger-strong">
              โหลดคอนเทนต์จาก {failedProviders().map((r) => SOCIAL_PROVIDER_META[r.provider].label).join(", ")} ไม่สำเร็จ
              <Button type="button" variant="outline" size="sm" onClick={load}>
                ลองอีกครั้ง
              </Button>
            </div>
          </Show>

          <Show when={loadStatus() === "done"} fallback={<ContentSkeleton />}>
            <Show
              when={visibleContent().length > 0}
              fallback={
                <EmptyState
                  icon={<ReviewsIcon />}
                  title="ไม่พบคอนเทนต์"
                  description={scope() === "product" ? "ยังไม่มีคอนเทนต์ที่ผูกกับสินค้านี้ — เลือก “ทั้งหมด” เพื่อเลือกจากคอนเทนต์อื่น" : "ยังไม่มีคอนเทนต์จากแพลตฟอร์มที่เลือก"}
                  actionLabel={scope() === "product" ? "ดูทั้งหมด" : "โหลดใหม่"}
                  onAction={scope() === "product" ? () => setScope("all") : load}
                />
              }
            >
              <ul class="flex flex-col gap-2">
                <For each={visibleContent()}>
                  {(review) => (
                    <li class="flex items-start gap-3 rounded-card border border-border bg-white p-3">
                      <Thumb review={review} size="lg" />
                      <div class="flex min-w-0 flex-1 flex-col gap-1">
                        <div class="flex flex-wrap items-center gap-2">
                          <PlatformBadge provider={review.provider} />
                          <span class="truncate text-sm font-medium text-ink">{review.author}</span>
                          <Show when={isFeatured(review.id)}>
                            <StatusBadge tone="success">Featured</StatusBadge>
                          </Show>
                        </div>
                        <p class="line-clamp-2 text-sm text-ink-gray">{review.content}</p>
                        <p class="text-xs text-ink-gray">
                          สินค้า:{" "}
                          <Show when={productName(review.productId)} fallback={<span class="text-system-red">ยังไม่ผูกสินค้า</span>}>
                            {(n) => <span class="text-ink">{n()}</span>}
                          </Show>
                        </p>
                      </div>
                      <Show
                        when={isFeatured(review.id)}
                        fallback={
                          <Button type="button" variant="outline" size="sm" class="shrink-0" disabled={saving() || !product()} onClick={() => feature(review)}>
                            เลือก Featured
                          </Button>
                        }
                      >
                        <Button type="button" variant="outline" size="sm" class="shrink-0" disabled={saving()} onClick={() => unfeature(review.id)}>
                          นำออก
                        </Button>
                      </Show>
                    </li>
                  )}
                </For>
              </ul>
            </Show>
          </Show>
        </section>
      </div>

      <ConfirmDialog
        open={pendingProductId() !== null}
        onOpenChange={(open) => !open && setPendingProductId(null)}
        title="ยังไม่ได้บันทึกการเปลี่ยนแปลง"
        description="ถ้าเปลี่ยนสินค้าตอนนี้ การเลือก Featured ที่ยังไม่บันทึกจะหายไป"
        confirmLabel="เปลี่ยนสินค้า"
        tone="danger"
        onConfirm={() => {
          setProductId(pendingProductId()!);
          setPendingProductId(null);
        }}
      />
    </div>
  );
}

function PlatformBadge(props: { provider: SocialProvider }) {
  return (
    <span class="inline-flex items-center gap-1 rounded-pill bg-ink px-2 py-0.5 text-xs font-medium text-white">
      <img src={PROVIDER_ICON[props.provider]} alt="" class="h-3 w-auto" />
      {SOCIAL_PROVIDER_META[props.provider].label}
    </span>
  );
}

function Thumb(props: { review: SocialReview; size?: "md" | "lg" }) {
  const [failed, setFailed] = createSignal(false);
  const src = () => props.review.thumbnailUrl ?? (props.review.mediaType === "image" ? props.review.mediaUrl : undefined);
  return (
    <div
      class="relative shrink-0 overflow-hidden rounded-media border border-border bg-surface-pink"
      classList={{ "size-12": props.size !== "lg", "size-16": props.size === "lg" }}
    >
      <Show when={src() && !failed()} fallback={<span class="flex size-full items-center justify-center text-[10px] text-ink-gray">ไม่มีรูป</span>}>
        <img src={src()} alt="" loading="lazy" class="size-full object-cover" onError={() => setFailed(true)} />
      </Show>
      <Show when={props.review.mediaType === "video"}>
        <span class="absolute inset-0 flex items-center justify-center text-xs text-white drop-shadow" aria-hidden="true">
          ▶
        </span>
      </Show>
    </div>
  );
}

function IconButton(props: { label: string; disabled?: boolean; onClick: () => void; children: JSX.Element }) {
  return (
    <button
      type="button"
      aria-label={props.label}
      title={props.label}
      disabled={props.disabled}
      onClick={props.onClick}
      class="flex size-9 items-center justify-center rounded-pill text-ink-gray transition-colors hover:bg-surface-pink hover:text-brand-pink disabled:cursor-not-allowed disabled:opacity-40"
    >
      {props.children}
    </button>
  );
}

function ContentSkeleton() {
  return (
    <div class="flex flex-col gap-2">
      {Array.from({ length: 4 }).map(() => (
        <div class="flex items-center gap-3 rounded-card border border-border bg-white p-3">
          <Skeleton class="size-16 shrink-0 rounded-media" />
          <div class="flex flex-1 flex-col gap-1.5">
            <Skeleton class="h-4 w-1/3" />
            <Skeleton class="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
