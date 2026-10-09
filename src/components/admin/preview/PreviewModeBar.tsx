import { EyeIcon, CloseXIcon } from "~/components/admin/icons";

/**
 * CMS Backoffice Polish §03 — the one piece of chrome a Full Page Preview
 * adds on top of the real customer render, so whoever opened the tab always
 * knows it's a preview (possibly of draft/unpublished content) and not the
 * live site. Deliberately thin and fixed, not a redesign of anything below
 * it — everything under this bar is the real, unmodified customer page.
 */
export function PreviewModeBar(props: { label?: string }) {
  return (
    <div class="sticky top-0 z-[100] flex min-h-11 items-center justify-between gap-3 bg-ink px-4 text-sm text-white">
      <span class="flex items-center gap-2 truncate">
        <EyeIcon class="size-4 shrink-0" />
        ตัวอย่างหน้าเว็บ{props.label ? ` ${props.label}` : ""}
      </span>
      <button
        type="button"
        onClick={() => window.close()}
        class="flex shrink-0 items-center gap-1.5 rounded-pill bg-white/10 px-3 py-1.5 text-xs font-medium lg:hover:bg-white/20"
      >
        <CloseXIcon class="size-3" /> ปิดแท็บนี้
      </button>
    </div>
  );
}
