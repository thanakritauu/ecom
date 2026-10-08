import { createMemo, Show } from "solid-js";
import { Navigate, useParams } from "@solidjs/router";
import { usePromotionPages } from "~/lib/promotionPages";
import { isPromotionPageVisible, LEGACY_PROMOTION_SLUGS } from "~/lib/adminContent";
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
 *
 * §18/§35 — the Homepage's own `PromotionPage` record never resolves here
 * even if its slug happens to match, so `/promotion/:slug` can never become
 * a second URL for `/` — Homepage is reached only via `/`.
 *
 * A retired slug (`LEGACY_PROMOTION_SLUGS`) redirects to its current one —
 * a 302 on the server render, a replace-navigation on the client.
 */
export default function PromotionPageRoute() {
  const params = useParams();
  const legacyTarget = () => LEGACY_PROMOTION_SLUGS[params.slug ?? ""];
  return (
    <Show when={legacyTarget()} fallback={<PromotionPageBySlug slug={params.slug ?? ""} />}>
      {(slug) => <Navigate href={`/promotion/${slug()}`} />}
    </Show>
  );
}

function PromotionPageBySlug(props: { slug: string }) {
  const store = usePromotionPages();
  const visiblePage = createMemo(() => {
    const found = store.getBySlug(props.slug);
    return found && !found.isHomepage && isPromotionPageVisible(found) ? found : undefined;
  });

  return (
    <Show when={store.ready()} fallback={<PromotionPageLoading />}>
      <Show when={visiblePage()} fallback={<PromotionPageNotFound slug={props.slug} />}>
        {(p) => <PromotionPageView page={p()} />}
      </Show>
    </Show>
  );
}
