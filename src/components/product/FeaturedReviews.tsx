import { createSignal, ErrorBoundary, For, Show } from "solid-js";
import { A } from "@solidjs/router";
import type { Product } from "~/lib/types";
import { SOCIAL_PROVIDER_META, type SocialReview } from "~/lib/socialReviews";
import { useFeaturedReviewContent } from "~/lib/featuredReviewContent";
import { useProductCatalog } from "~/lib/productCatalog";
import iconInstagram from "~/assets/icons/social-instagram.svg";
import iconTiktok from "~/assets/icons/social-tiktok.svg";

const PROVIDER_ICON = { instagram: iconInstagram, tiktok: iconTiktok } as const;

/**
 * Phase 03 — PDP Featured Review: the Instagram/TikTok posts Admin pinned to
 * this product (Admin → รีวิว). Reads only normalized `SocialReview` data from
 * the Featured Review mirror — no provider-specific logic and no social API
 * calls from here. Hidden entirely when there's nothing featured, and
 * wrapped in an ErrorBoundary so a bad entry can never take the PDP down.
 */
export function FeaturedReviews(props: { product: Product }) {
  const featured = useFeaturedReviewContent();
  const reviews = () => featured.getForProduct(props.product.id);

  return (
    <ErrorBoundary fallback={null}>
      <Show when={reviews().length > 0}>
        <section aria-labelledby="featured-reviews-heading" class="flex flex-col gap-4">
          <div class="flex flex-col gap-1">
            <h2 id="featured-reviews-heading" class="text-2xl font-bold text-ink lg:text-3xl">
              รีวิวเด่นจากโซเชียล
            </h2>
            <p class="text-sm text-ink-gray">คัดสรรจาก Instagram และ TikTok ของผู้ใช้จริง</p>
          </div>
          <div class="scroll-rail pb-2 pt-1">
            <For each={reviews()}>
              {(review) => (
                <div class="w-[78%] sm:w-[46%] lg:w-[calc((100%-2rem)/3)]">
                  <SocialReviewCard review={review} />
                </div>
              )}
            </For>
          </div>
        </section>
      </Show>
    </ErrorBoundary>
  );
}

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) || d.getTime() === 0
    ? ""
    : d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
};

export function SocialReviewCard(props: { review: SocialReview }) {
  const catalog = useProductCatalog();
  const product = () => (props.review.productId ? catalog.getById(props.review.productId) : undefined);
  const meta = () => SOCIAL_PROVIDER_META[props.review.provider];
  const [mediaFailed, setMediaFailed] = createSignal(false);
  const [playing, setPlaying] = createSignal(false);

  const isVideo = () => props.review.mediaType === "video";
  // Inline playback only where the provider hands us a playable media URL
  // (Instagram video). TikTok doesn't — it's thumbnail + link to the original,
  // never a custom player. The video file loads only after the tap.
  const canPlayInline = () => isVideo() && props.review.provider === "instagram" && !!props.review.mediaUrl;
  const poster = () => props.review.thumbnailUrl ?? (isVideo() ? undefined : props.review.mediaUrl);
  const originalLabel = () => `ดูโพสต์ต้นฉบับบน ${meta().label}`;

  const MediaFallback = () => (
    <div class="flex size-full flex-col items-center justify-center gap-2 bg-surface-pink text-sm text-ink-gray">
      <span class="flex size-10 items-center justify-center rounded-pill bg-ink/80">
        <img src={PROVIDER_ICON[props.review.provider]} alt="" class="h-5 w-auto" />
      </span>
      ไม่สามารถแสดงสื่อได้
    </div>
  );

  const PlayBadge = () => (
    <span class="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
      <span class="flex size-14 items-center justify-center rounded-pill bg-ink/60 text-2xl text-white backdrop-blur-sm">▶</span>
    </span>
  );

  return (
    <article class="flex h-full flex-col overflow-hidden rounded-card border border-surface-gray bg-white shadow-card">
      <div class="relative aspect-[4/5] w-full overflow-hidden bg-surface-pink">
        <Show
          when={playing() && canPlayInline()}
          fallback={
            <Show when={poster() && !mediaFailed()} fallback={<MediaFallback />}>
              <img
                src={poster()}
                alt={`${meta().label} โดย ${props.review.author}`}
                loading="lazy"
                class="size-full object-cover"
                onError={() => setMediaFailed(true)}
              />
            </Show>
          }
        >
          <video src={props.review.mediaUrl} poster={poster()} controls autoplay playsinline class="size-full bg-black object-contain" />
        </Show>

        {/* Media tap target: play inline when allowed, else open the original post */}
        <Show when={isVideo() && !playing()}>
          <Show
            when={canPlayInline()}
            fallback={
              <Show when={props.review.permalink} fallback={<PlayBadge />}>
                <a href={props.review.permalink} target="_blank" rel="noopener noreferrer" aria-label={originalLabel()} class="absolute inset-0">
                  <PlayBadge />
                </a>
              </Show>
            }
          >
            <button type="button" aria-label="เล่นวิดีโอ" onClick={() => setPlaying(true)} class="absolute inset-0">
              <PlayBadge />
            </button>
          </Show>
        </Show>

        <span class="pointer-events-none absolute left-3 top-3 flex items-center gap-1.5 rounded-pill bg-ink/75 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
          <img src={PROVIDER_ICON[props.review.provider]} alt="" class="h-3.5 w-auto" />
          {meta().label}
        </span>
      </div>

      <div class="flex flex-1 flex-col gap-3 p-4">
        <div class="flex items-center gap-3">
          <Show
            when={props.review.avatarUrl}
            fallback={
              <span class="flex size-9 shrink-0 items-center justify-center rounded-pill bg-brand-pink/20 text-sm font-semibold text-brand-pink" aria-hidden="true">
                {props.review.author.trim().charAt(0)}
              </span>
            }
          >
            {(src) => <img src={src()} alt="" class="size-9 shrink-0 rounded-pill object-cover" loading="lazy" />}
          </Show>
          <div class="min-w-0">
            <p class="truncate text-sm font-semibold text-ink">{props.review.author}</p>
            <p class="text-xs text-ink-gray">
              {formatDate(props.review.publishedAt)}
              <Show when={props.review.rating}>
                {(r) => <span class="ml-1.5 text-brand-yellow" aria-label={`${r()} จาก 5 ดาว`}>{"★".repeat(Math.round(r()))}</span>}
              </Show>
            </p>
          </div>
        </div>

        <Show when={props.review.content}>
          <p class="line-clamp-4 text-sm text-ink">{props.review.content}</p>
        </Show>

        <div class="mt-auto flex flex-col gap-2 border-t border-surface-gray pt-3">
          <Show when={product()}>
            {(p) => (
              <A href={`/product/${p().slug}`} class="flex items-center gap-2 text-xs text-ink-gray hover:text-brand-pink">
                <img src={p().mainImage ?? p().image} alt="" class="size-8 shrink-0 rounded-media border border-surface-gray object-cover" loading="lazy" />
                <span class="line-clamp-1">{p().name}</span>
              </A>
            )}
          </Show>
          <Show when={props.review.permalink}>
            <a href={props.review.permalink} target="_blank" rel="noopener noreferrer" class="text-sm font-medium text-brand-pink hover:underline">
              {originalLabel()} ↗
            </a>
          </Show>
        </div>
      </div>
    </article>
  );
}
