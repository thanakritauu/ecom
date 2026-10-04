import { createSignal, For, onCleanup, onMount, Show, Suspense } from "solid-js";
import { createAsync } from "@solidjs/router";
import { ChevronIcon } from "~/components/shared/ChevronIcon";
import { tiktokPlayerUrl, tiktokVideoUrl, type TikTokReviewClip } from "~/lib/tiktokReviews";
import { getTikTokPosters } from "~/lib/tiktokPosters";
import tiktokLogo from "~/assets/icons/social-tiktok.svg";

/**
 * TikTok review clips as official embeds in a native scroll-snap rail
 * (swipe on touch, prev/next arrows everywhere). Each clip starts as its
 * cover image (fetched server-side, lib/tiktokPosters.ts) with a play
 * button; TikTok's player loads only for the clip that's tapped, and only
 * one at a time — opening another clip unloads the previous player. A page
 * view therefore makes no request to TikTok's player until someone plays.
 *
 * `default` (Home #CharmissReviews): ~1.4 clips on mobile, ~2.4 on tablet,
 * 4 on desktop. `compact` (PDP): smaller clips, ~2.3 / ~3.3 / 5 visible.
 */
const SIZES = {
  default: {
    card: "w-[68%] max-w-[300px] sm:w-[40%] lg:w-[calc((100%-72px)/4)] lg:max-w-none",
    track: "lg:mx-0 lg:scroll-px-0 lg:gap-6 lg:px-0",
    arrow: "size-10 sm:size-11",
    chevron: "size-5 sm:size-6",
    left: "lg:-left-5",
    right: "lg:-right-5",
  },
  compact: {
    card: "w-[42%] max-w-[190px] sm:w-[29%] lg:w-[calc((100%-64px)/5)] lg:max-w-none",
    track: "lg:mx-0 lg:scroll-px-0 lg:px-0",
    arrow: "size-9",
    chevron: "size-5",
    left: "lg:-left-4",
    right: "lg:-right-4",
  },
} as const;

export function TikTokReviewRail(props: { clips: TikTokReviewClip[]; label: string; size?: keyof typeof SIZES }) {
  const size = () => SIZES[props.size ?? "default"];
  let trackRef: HTMLDivElement | undefined;
  const posters = createAsync(() => getTikTokPosters());
  const [playing, setPlaying] = createSignal<string | null>(null);
  const [atStart, setAtStart] = createSignal(true);
  const [atEnd, setAtEnd] = createSignal(false);

  const sync = () => {
    if (!trackRef) return;
    setAtStart(trackRef.scrollLeft <= 4);
    setAtEnd(trackRef.scrollLeft + trackRef.clientWidth >= trackRef.scrollWidth - 4);
  };
  const step = (dir: 1 | -1) => {
    if (!trackRef) return;
    const card = trackRef.firstElementChild as HTMLElement | null;
    const gap = parseFloat(getComputedStyle(trackRef).columnGap) || 0;
    trackRef.scrollBy({ left: dir * ((card?.offsetWidth ?? trackRef.clientWidth) + gap), behavior: "smooth" });
  };

  onMount(() => {
    sync();
    window.addEventListener("resize", sync);
    onCleanup(() => window.removeEventListener("resize", sync));
  });

  return (
    <div class="relative w-full" role="region" aria-roledescription="carousel" aria-label={props.label}>
      <div ref={trackRef} onScroll={sync} class={`scroll-rail -mb-3 -mt-2 pb-3 pt-2 ${size().track}`}>
        <For each={props.clips}>
          {(clip) => (
            <figure class={`flex flex-col gap-2 ${size().card}`}>
              <div class="relative aspect-[9/16] w-full overflow-hidden rounded-2xl bg-ink shadow-card">
                <Show
                  when={playing() === clip.videoId}
                  fallback={
                    <button
                      type="button"
                      onClick={() => setPlaying(clip.videoId)}
                      aria-label={`เล่นคลิป: ${clip.title}`}
                      class="group/clip absolute inset-0 flex items-center justify-center"
                    >
                      {/* Own boundary: covers stream in after the page — a slow TikTok lookup never holds up the PDP/Home render. */}
                      <Suspense fallback={<span class="absolute inset-0 bg-gradient-to-b from-ink/80 to-ink" aria-hidden="true" />}>
                        <Show
                          when={posters()?.[clip.videoId]}
                          fallback={
                            // No cover (lookup failed / not cached yet): a titled tile, never an empty box.
                            <span class="absolute inset-0 flex items-end bg-gradient-to-b from-ink/80 to-ink p-3 pb-4 text-left" aria-hidden="true">
                              <span class="line-clamp-4 text-xs font-medium leading-[1.75] text-white/90 sm:text-sm">{clip.title}</span>
                            </span>
                          }
                        >
                          {(src) => (
                            <img
                              src={src()}
                              alt=""
                              loading="lazy"
                              referrerpolicy="no-referrer"
                              class="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover/clip:scale-105"
                            />
                          )}
                        </Show>
                      </Suspense>
                      <span class="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10" aria-hidden="true" />
                      <img src={tiktokLogo} alt="" class="absolute right-2.5 top-2.5 h-4 w-auto drop-shadow" aria-hidden="true" />
                      <span
                        class="relative flex size-12 items-center justify-center rounded-pill bg-white/80 text-ink shadow-card backdrop-blur-sm transition-transform duration-150 group-hover/clip:scale-110"
                        aria-hidden="true"
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor" class="ml-0.5 size-6">
                          <path d="M8 5.14v13.72a1 1 0 0 0 1.52.85l11.03-6.86a1 1 0 0 0 0-1.7L9.52 4.29A1 1 0 0 0 8 5.14Z" />
                        </svg>
                      </span>
                    </button>
                  }
                >
                  <iframe
                    src={tiktokPlayerUrl(clip.videoId)}
                    title={`TikTok: ${clip.title}`}
                    allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                    class="size-full border-0"
                  />
                </Show>
              </div>
              {/* Always-available fallback: the original post on TikTok. */}
              <figcaption class="truncate px-1 text-xs text-ink-gray sm:text-sm">
                <a href={tiktokVideoUrl(clip)} target="_blank" rel="noopener noreferrer" class="font-medium text-ink hover:text-brand-pink">
                  @{clip.author}
                </a>
              </figcaption>
            </figure>
          )}
        </For>
      </div>

      <button
        type="button"
        onClick={() => step(-1)}
        disabled={atStart()}
        aria-label="คลิปก่อนหน้า"
        class={`absolute left-0 top-[calc(50%-14px)] flex -translate-y-1/2 items-center justify-center rounded-pill bg-white/50 text-ink shadow-card backdrop-blur-sm transition-opacity hover:bg-white/80 disabled:pointer-events-none disabled:opacity-0 ${size().arrow} ${size().left}`}
      >
        <ChevronIcon direction="left" class={size().chevron} />
      </button>
      <button
        type="button"
        onClick={() => step(1)}
        disabled={atEnd()}
        aria-label="คลิปถัดไป"
        class={`absolute right-0 top-[calc(50%-14px)] flex -translate-y-1/2 items-center justify-center rounded-pill bg-white/50 text-ink shadow-card backdrop-blur-sm transition-opacity hover:bg-white/80 disabled:pointer-events-none disabled:opacity-0 ${size().arrow} ${size().right}`}
      >
        <ChevronIcon direction="right" class={size().chevron} />
      </button>
    </div>
  );
}
