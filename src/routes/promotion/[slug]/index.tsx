import { createMemo, Show } from "solid-js";
import { useParams } from "@solidjs/router";
import { usePromotionPages } from "~/lib/promotionPages";
import { isPromotionPageVisible } from "~/lib/adminContent";
import { PromotionPageView, PromotionPageLoading, PromotionPageNotFound } from "~/components/promotion/PromotionPageView";

/**
 * §14 — thin route wrapper, same convention as `product/[slug]/index.tsx`:
 * look up by slug, delegate the actual markup to a shared view component.
 * `ready()` gates on the client-only localStorage read finishing first (see
 * `promotionPages.tsx`) so SSR and the client's first paint render the same
 * loading shell — no hydration mismatch — before switching to the real page
 * or the not-found state. A page that exists but isn't currently visible
 * (Draft/Unpublished, or Scheduled before its start time) 404s the same as a
 * slug that doesn't exist at all — a link nobody should be able to use yet.
 */
export default function PromotionPageRoute() {
  const params = useParams();
  const store = usePromotionPages();
  const visiblePage = createMemo(() => {
    const found = store.getBySlug(params.slug ?? "");
    return found && isPromotionPageVisible(found) ? found : undefined;
  });

  return (
    <Show when={store.ready()} fallback={<PromotionPageLoading />}>
      <Show when={visiblePage()} fallback={<PromotionPageNotFound slug={params.slug ?? ""} />}>
        {(p) => <PromotionPageView page={p()} />}
      </Show>
    </Show>
  );
}
