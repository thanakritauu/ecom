import { Show, Suspense } from "solid-js";
import { createAsync } from "@solidjs/router";
import { getTikTokPosters } from "~/lib/tiktokPosters";
import type { AdminTiktokClip } from "~/lib/adminTiktokClips";
import tiktokLogo from "~/assets/icons/social-tiktok.svg";

/**
 * 9:16 cover thumbnail for an admin TikTok clip: the uploaded `coverUrl`,
 * else the cover TikTok returns (fetched server-side), else a titled dark tile — same fallback
 * order as TikTokReviewRail.
 */
export function TiktokClipCover(props: { clip: AdminTiktokClip; class?: string }) {
  const posters = createAsync(() => getTikTokPosters(props.clip.coverUrl || !props.clip.videoId ? [] : [{ videoId: props.clip.videoId, author: props.clip.author }]));
  const fallbackTile = (
    <span class="absolute inset-0 flex items-end bg-gradient-to-b from-ink/80 to-ink p-1.5 text-left" aria-hidden="true">
      <span class="line-clamp-3 text-[10px] leading-[1.75] text-white/90">{props.clip.title}</span>
    </span>
  );
  return (
    <div class={`relative aspect-[9/16] shrink-0 overflow-hidden rounded-media bg-ink ${props.class ?? "w-16"}`}>
      <Show
        when={props.clip.coverUrl}
        fallback={
          <Suspense fallback={fallbackTile}>
            <Show when={posters()?.[props.clip.videoId]} fallback={fallbackTile}>
              {(src) => <img src={src()} alt="" loading="lazy" referrerpolicy="no-referrer" class="absolute inset-0 size-full object-cover" />}
            </Show>
          </Suspense>
        }
      >
        {(src) => <img src={src()} alt="" loading="lazy" class="absolute inset-0 size-full object-cover" />}
      </Show>
      <img src={tiktokLogo} alt="" class="absolute right-1 top-1 h-3 w-auto drop-shadow" aria-hidden="true" />
    </div>
  );
}
