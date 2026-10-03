import { A } from "@solidjs/router";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { MarketingIcon, InventoryIcon, LoyaltyIcon, ReviewsIcon } from "~/components/admin/icons";
import { useAdminMarketing } from "~/lib/adminMarketingStore";

/**
 * Phase 07 #3 — real overview replacing the old `AdminPlaceholder` stand-in
 * now that the four sections underneath it are real: one quick-link card
 * per entity with a live "active" count, so the overview is actually useful
 * instead of a static "coming soon" notice.
 */
export default function AdminMarketingOverviewPage() {
  const store = useAdminMarketing();

  const cards = [
    { title: "โปรโมชั่น", href: "/admin/marketing/promotions", icon: MarketingIcon, count: () => store.promotions.items().filter((p) => p.status === "active").length },
    { title: "คูปอง", href: "/admin/marketing/coupons", icon: InventoryIcon, count: () => store.coupons.items().filter((c) => c.status === "active").length },
    { title: "แฟลชเซล", href: "/admin/marketing/flash-sale", icon: LoyaltyIcon, count: () => store.flashSales.items().filter((f) => f.status === "active").length },
    { title: "บันเดิล / เซ็ต", href: "/admin/marketing/bundles", icon: ReviewsIcon, count: () => store.bundles.items().filter((b) => b.status === "active").length },
  ];

  return (
    <div class="flex flex-col gap-6">
      <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "การตลาด" }]} />
      <PageHeader title="การตลาด" description="จัดการโปรโมชั่น คูปอง แฟลชเซล และบันเดิลสินค้า" />

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <A
            href={card.href}
            class="flex flex-col gap-3 rounded-card bg-surface-card p-5 shadow-card transition-transform duration-150 hover:-translate-y-0.5"
          >
            <span class="flex size-11 items-center justify-center rounded-pill bg-surface-pink text-brand-pink">
              <card.icon class="size-5" />
            </span>
            <div>
              <p class="text-base font-semibold text-ink">{card.title}</p>
              <p class="text-sm text-ink-gray">{card.count()} กำลังใช้งาน</p>
            </div>
          </A>
        ))}
      </div>
    </div>
  );
}
