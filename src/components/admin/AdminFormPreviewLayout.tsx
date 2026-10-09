import type { JSX } from "solid-js";

/**
 * CHARMISS CMS — REAL-TIME LIVE PREVIEW SYSTEM §2/§18 — the one reusable
 * two-column shell every Create/Edit form with a Live Preview uses: Form on
 * the left, Live Preview on the right on desktop (the preview column is
 * sticky so it stays in view while a long form scrolls past it), stacked
 * (Form above Preview) below the `xl` breakpoint. This component only ever
 * provides layout — the preview's contents are always real Frontend
 * components passed in by the caller, never rendered here.
 */
export function AdminFormPreviewLayout(props: { form: JSX.Element; preview: JSX.Element; previewLabel?: string }) {
  return (
    <div class="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
      <div class="flex min-w-0 flex-col gap-6">{props.form}</div>
      <div class="flex flex-col gap-3 xl:sticky xl:top-6">
        <p class="shrink-0 text-xs font-semibold uppercase tracking-wide text-ink-placeholder">
          {props.previewLabel ?? "ตัวอย่างบนหน้าร้าน"}
        </p>
        <div class="overflow-hidden rounded-card bg-surface-card shadow-card">{props.preview}</div>
      </div>
    </div>
  );
}
