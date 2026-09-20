import { A } from "@solidjs/router";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { ContentIcon } from "~/components/admin/icons";
import { useAdminContent } from "~/lib/adminContentStore";

/**
 * Phase 10 #1 — real overview replacing the old `AdminPlaceholder` stand-in
 * now that Landing Pages exists underneath it, same "one quick-link card per
 * real module" shape `adminMarketingOverviewPage` already established. This
 * card is a known, pre-existing gap this migration did not expand the scope
 * of: Homepage/Banners/Campaigns/Product Collections were all built in
 * later phases and still have no quick-link card here — see the Landing
 * Page migration's Known Issues.
 */
export default function AdminContentOverviewPage() {
  const store = useAdminContent();
  const publishedCount = () => store.pages().filter((p) => p.status === "published").length;

  return (
    <div class="flex flex-col gap-6">
      <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "เนื้อหา" }]} />
      <PageHeader title="เนื้อหา" description="จัดการหน้าแรก แบนเนอร์ และแคมเปญของเว็บไซต์" />

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <A
          href="/admin/content/landing-pages"
          class="flex flex-col gap-3 rounded-card bg-white p-5 shadow-card transition-transform duration-150 hover:-translate-y-0.5"
        >
          <span class="flex size-11 items-center justify-center rounded-pill bg-surface-pink text-brand-pink">
            <ContentIcon class="size-5" />
          </span>
          <div>
            <p class="text-base font-semibold text-ink">Landing Pages</p>
            <p class="text-sm text-ink-gray">{publishedCount()} เผยแพร่แล้ว</p>
          </div>
        </A>
      </div>
    </div>
  );
}
