import { createMemo, For } from "solid-js";
import { A } from "@solidjs/router";
import { useAdminProducts } from "~/lib/adminProductStore";
import { useAdminCategories } from "~/lib/adminCategoryStore";
import { useAdminBrands } from "~/lib/adminBrandStore";
import { useAdminContent } from "~/lib/adminContentStore";
import { useAdminMarketing } from "~/lib/adminMarketingStore";
import { formatAdminCurrency } from "~/lib/adminDashboard";
import { getCategoryPerformance, getBrandPerformance, getPromotionPagePerformance, getCouponUsage } from "~/lib/adminDashboardAnalytics";
import { HBarChart } from "./DashboardCharts";

/** §12/§16 — Category/Brand/Promotion performance + Coupon usage, each a ranked horizontal-bar list with a "ดูรายละเอียดทั้งหมด" link into the module the ranking is drawn from. */
export function PerformancePanels() {
  const products = useAdminProducts();
  const categories = useAdminCategories();
  const brands = useAdminBrands();
  const content = useAdminContent();
  const marketing = useAdminMarketing();

  const categoryData = createMemo(() =>
    getCategoryPerformance(categories.categories(), products.products())
      .slice(0, 6)
      .map((e) => ({ id: e.id, label: e.name, value: e.revenue, href: e.href })),
  );
  const brandData = createMemo(() =>
    getBrandPerformance(brands.brands(), products.products())
      .slice(0, 6)
      .map((e) => ({ id: e.id, label: e.name, value: e.revenue, href: e.href })),
  );
  const promotionData = createMemo(() =>
    getPromotionPagePerformance(content.pages(), products.products())
      .slice(0, 6)
      .map((e) => ({ id: e.id, label: e.name, value: e.revenue, href: e.href })),
  );
  const couponData = createMemo(() =>
    getCouponUsage(marketing.coupons.items())
      .slice(0, 6)
      .map((c) => ({ id: c.id, label: `${c.code} (${c.discountLabel})`, value: c.usageCount })),
  );

  return (
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Panel title="ยอดขายตามหมวดหมู่" href="/admin/categories">
        <HBarChart data={categoryData()} formatValue={formatAdminCurrency} emptyLabel="ยังไม่มีข้อมูลยอดขายตามหมวดหมู่" />
      </Panel>
      <Panel title="ยอดขายตามแบรนด์" href="/admin/brands">
        <HBarChart data={brandData()} formatValue={formatAdminCurrency} emptyLabel="ยังไม่มีข้อมูลยอดขายตามแบรนด์" />
      </Panel>
      <Panel title="ประสิทธิภาพ Promotion Page" href="/admin/promotion-pages">
        <HBarChart data={promotionData()} formatValue={formatAdminCurrency} emptyLabel="ยังไม่มีข้อมูลยอดขายจาก Promotion Page" />
      </Panel>
      <Panel title="การใช้งานคูปอง" href="/admin/marketing/coupons">
        <HBarChart data={couponData()} formatValue={(v) => `${v.toLocaleString("th-TH")} ครั้ง`} emptyLabel="ยังไม่มีการใช้งานคูปอง" />
      </Panel>
    </div>
  );
}

function Panel(props: { title: string; href: string; children: import("solid-js").JSX.Element }) {
  return (
    <div class="flex flex-col gap-4 rounded-card bg-surface-card p-4 shadow-card sm:p-5">
      <div class="flex items-center justify-between gap-2">
        <h3 class="text-sm font-semibold text-ink">{props.title}</h3>
        <A href={props.href} class="shrink-0 text-xs font-medium text-brand-pink hover:underline">
          ดูรายละเอียดทั้งหมด
        </A>
      </div>
      {props.children}
    </div>
  );
}
