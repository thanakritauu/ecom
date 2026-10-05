import { A } from "@solidjs/router";

/**
 * The two things the PDP's review area shows, top to bottom: TikTok clips,
 * then the product's own reviews (5 at a time). One switch shared by both
 * pages so each is reachable from the other without its own sidebar entry.
 */
const TABS = [
  { href: "/admin/reviews", label: "รีวิวสินค้า" },
  { href: "/admin/reviews/tiktok", label: "คลิปรีวิว TikTok" },
];

export function ReviewsTabs() {
  return (
    <nav aria-label="ประเภทรีวิว" class="inline-flex w-fit rounded-card border border-border bg-surface-card p-1">
      {TABS.map((tab) => (
        <A
          href={tab.href}
          end
          class="rounded-[10px] px-4 py-2 text-sm font-medium text-ink-gray transition-colors duration-150 hover:text-ink"
          activeClass="!bg-brand-pink !text-white"
        >
          {tab.label}
        </A>
      ))}
    </nav>
  );
}
