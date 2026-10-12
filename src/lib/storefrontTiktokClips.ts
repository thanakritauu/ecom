import { createSignal, onCleanup, onMount, type Accessor } from "solid-js";
import { readStoredTiktokClips, TIKTOK_CLIPS_CHANGED_EVENT, TIKTOK_CLIPS_STORAGE_KEY } from "./adminTiktokClips";
import { TIKTOK_REVIEW_CLIPS, type TikTokReviewClip } from "./tiktokReviews";

function readActiveClips(): TikTokReviewClip[] {
  return readStoredTiktokClips()
    // Drafts and hidden clips never reach the storefront.
    .filter((c) => c.active && !c.draft && c.videoId)
    .map((c) => ({
      videoId: c.videoId,
      author: c.author,
      title: c.title,
      productIds: c.productIds.length > 0 ? c.productIds : undefined,
      products: c.products && c.products.length > 0 ? c.products : undefined,
      coverUrl: c.coverUrl,
    }));
}

/**
 * The TikTok clips Admin manages, as the storefront rails show them (Home
 * #CharmissReviews, PDP): active clips in Admin's order. SSR and the first
 * paint use the seed list (no hydration mismatch); the saved Admin list is
 * read on mount and again whenever Admin saves.
 */
export function useStorefrontTiktokClips(): Accessor<TikTokReviewClip[]> {
  const [clips, setClips] = createSignal<TikTokReviewClip[]>(TIKTOK_REVIEW_CLIPS);
  onMount(() => {
    const refresh = () => setClips(readActiveClips());
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key.startsWith(TIKTOK_CLIPS_STORAGE_KEY)) refresh();
    };
    refresh();
    window.addEventListener("storage", onStorage);
    window.addEventListener(TIKTOK_CLIPS_CHANGED_EVENT, refresh);
    onCleanup(() => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(TIKTOK_CLIPS_CHANGED_EVENT, refresh);
    });
  });
  return clips;
}
