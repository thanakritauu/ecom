import { For, Show } from "solid-js";
import { HOMEPAGE_FAQ_ITEMS, HOMEPAGE_FIXED_SECTIONS, type HomepageSection } from "~/lib/adminHomepage";
import { TIKTOK_REVIEW_CLIPS } from "~/lib/tiktokReviews";

/**
 * Storefront sync — the live Homepage (`routes/index.tsx`) top to bottom:
 * the two slots this page's own sections fill (Hero carousel, then the
 * generic sections), and every fixed, code-only section after them in its
 * real order. Read-only — "ส่วนคงที่" cards can't be edited, hidden or
 * reordered here; they exist so Admin sees the whole page, not only the
 * editable part. FAQ shows the exact live questions.
 */
export function HomepageFixedSectionsPanel(props: { sections: HomepageSection[] }) {
  const enabledHero = () => props.sections.filter((s) => s.type === "hero" && s.enabled);
  const heroSlideCount = () => enabledHero().reduce((n, s) => n + Math.max(s.assets.length, 1), 0);
  const otherEnabled = () => props.sections.filter((s) => s.type !== "hero" && s.enabled).length;

  const editableSummary = (id: string) => {
    if (id === "hero") return enabledHero().length > 0 ? `${heroSlideCount()} สไลด์จาก Section Hero` : "ไม่มี Hero ที่เปิดอยู่ — หน้าร้านใช้ 3 สไลด์เริ่มต้น";
    return `${otherEnabled()} Section ที่เปิดอยู่`;
  };

  return (
    <div class="flex flex-col gap-3">
      <p class="text-sm text-ink-gray">ลำดับเดียวกับหน้าแรกบนหน้าร้าน — “แก้ไขได้” จัดการใน “ส่วนประกอบของหน้า” ด้านล่าง ส่วน “ส่วนคงที่” เป็นเนื้อหาในโค้ดของหน้าร้าน แก้ไขจากหน้านี้ไม่ได้</p>
      <ol class="flex flex-col gap-2">
        <For each={HOMEPAGE_FIXED_SECTIONS}>
          {(item, index) => (
            <li class="flex flex-col gap-2 rounded-card border border-border p-3" classList={{ "bg-surface-gray/40": !item.editable, "bg-surface-pink/40": item.editable }}>
              <div class="flex items-start gap-3">
                <span class="flex size-6 shrink-0 items-center justify-center rounded-pill bg-surface-card text-xs font-semibold text-ink-gray">{index() + 1}</span>
                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <p class="text-sm font-semibold text-ink">{item.label}</p>
                    <span
                      class="rounded-pill px-2 py-0.5 text-[11px] font-medium"
                      classList={{ "bg-surface-card text-ink-gray": !item.editable, "bg-brand-pink text-white": !!item.editable }}
                    >
                      {item.editable ? "แก้ไขได้" : "ส่วนคงที่"}
                    </span>
                  </div>
                  <p class="mt-0.5 text-xs text-ink-gray">
                    {item.note}
                    <Show when={item.id === "reviews"}> ({TIKTOK_REVIEW_CLIPS.length} คลิป)</Show>
                  </p>
                  <Show when={item.editable}>
                    <p class="mt-0.5 text-xs font-medium text-brand-pink">{editableSummary(item.id)}</p>
                  </Show>
                  <Show when={item.href}>
                    <p class="mt-0.5 text-xs text-ink-gray">ดูทั้งหมด → {item.href}</p>
                  </Show>
                </div>
              </div>
              <Show when={item.id === "faq"}>
                <ul class="ml-9 flex flex-col gap-1.5">
                  <For each={HOMEPAGE_FAQ_ITEMS}>
                    {(faq) => (
                      <li class="rounded-media bg-surface-card px-3 py-2">
                        <p class="text-xs font-medium text-ink">{faq.question}</p>
                        <p class="mt-0.5 text-xs text-ink-gray">{faq.answer}</p>
                      </li>
                    )}
                  </For>
                </ul>
              </Show>
            </li>
          )}
        </For>
      </ol>
    </div>
  );
}
