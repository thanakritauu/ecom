import { createMemo, Show } from "solid-js";
import { useParams, useSearchParams } from "@solidjs/router";
import { useAdminContent } from "~/lib/adminContentStore";
import { PromotionPageView, PromotionPageNotFound } from "~/components/promotion/PromotionPageView";
import { PreviewModeBar } from "~/components/admin/preview/PreviewModeBar";
import { readPreviewDraft } from "~/lib/adminPreviewDraft";
import type { PromotionPage } from "~/lib/adminContent";

/**
 * CMS Backoffice Polish §03 — Full Page Preview, opened in a new tab from
 * the Promotion Page editor/detail page. Renders through the exact same
 * `PromotionPageView` the real `/promotion/:slug` customer route uses (same
 * Header/Footer/HomepageSections/ProductCard — nothing re-implemented), the
 * only differences from the real route being: (1) the page is read straight
 * from the Admin draft store (`useAdminContent`) instead of the read-only
 * published-only storefront store, so Draft/Scheduled/Unpublished pages are
 * previewable too, and (2) no visibility/date-window gating — an admin
 * previewing their own draft always sees it regardless of status.
 *
 * REAL-TIME LIVE PREVIEW SYSTEM §11/§14 — a `?draft=` query param takes
 * priority over the saved store lookup, so Full Page Preview also works for
 * content that was never saved (Create mode) or has unsaved edits (Edit
 * mode) — the exact in-progress form state, written to `sessionStorage` by
 * the form itself (see `~/lib/adminPreviewDraft.ts`), not the last-saved
 * record.
 */
export default function AdminPromotionPagePreviewRoute() {
  const params = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const store = useAdminContent();
  /** `?embed=1`: shown inside the page builder's ดูตัวอย่าง frame, which has its own close button. */
  const embedded = () => searchParams.embed === "1";
  const draftId = () => (Array.isArray(searchParams.draft) ? searchParams.draft[0] : searchParams.draft);
  const page = createMemo<PromotionPage | undefined>(() => readPreviewDraft<PromotionPage>("promotion-page", draftId()) ?? store.getById(params.id));

  return (
    <>
      <Show when={!embedded()}>
        <PreviewModeBar label={page()?.name} />
      </Show>
      <Show when={page()} fallback={<PromotionPageNotFound slug={params.id} />}>
        {(p) => <PromotionPageView page={p()} />}
      </Show>
    </>
  );
}
