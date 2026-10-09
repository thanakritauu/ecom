import { createMemo, For } from "solid-js";
import { Button } from "~/components/shared/Button";
import { useAdminProducts } from "~/lib/adminProductStore";
import { useAdminCategories } from "~/lib/adminCategoryStore";
import { useAdminContent } from "~/lib/adminContentStore";
import { useAdminOrders } from "~/lib/adminOrderStore";
import { formatAdminCurrency } from "~/lib/adminDashboard";
import { getCategoryPerformance, getPromotionPagePerformance, getCouponUsageFromOrders } from "~/lib/adminDashboardAnalytics";
import { HBarChart } from "./DashboardCharts";

/** Category/Promotion page sales (catalog sold figures) + coupon codes used in orders, each a ranked bar list with a link into its module. */
export function PerformancePanels() {
  const products = useAdminProducts();
  const categories = useAdminCategories();
  const content = useAdminContent();
  const orders = useAdminOrders();

  const categoryData = createMemo(() =>
    getCategoryPerformance(categories.categories(), products.products())
      .slice(0, 6)
      .map((e) => ({ id: e.id, label: e.name, value: e.revenue, href: e.href })),
  );
  const promotionData = createMemo(() =>
    getPromotionPagePerformance(content.pages(), products.products())
      .slice(0, 6)
      .map((e) => ({ id: e.id, label: e.name, value: e.revenue, href: e.href })),
  );
  const couponData = createMemo(() =>
    getCouponUsageFromOrders(orders.orders())
      .slice(0, 6)
      .map((c) => ({ id: c.code, label: c.code, value: c.uses })),
  );

  return (
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Panel title="ยอดขายตามหมวดหมู่" href="/admin/categories">
        <HBarChart data={categoryData()} formatValue={formatAdminCurrency} emptyLabel="ยังไม่มีข้อมูลยอดขายตามหมวดหมู่" />
      </Panel>
      <Panel title="ยอดขายตามหน้าแคมเปญ" href="/admin/promotion-pages">
        <HBarChart data={promotionData()} formatValue={formatAdminCurrency} emptyLabel="ยังไม่มีข้อมูลยอดขายจากหน้าแคมเปญ" />
      </Panel>
      <Panel title="คูปองที่ถูกใช้ในคำสั่งซื้อ" href="/admin/marketing/coupons">
        <HBarChart data={couponData()} formatValue={(v) => `${v.toLocaleString("th-TH")} ครั้ง`} emptyLabel="ยังไม่มีคำสั่งซื้อที่ใช้คูปอง" />
      </Panel>
    </div>
  );
}

function Panel(props: { title: string; href: string; children: import("solid-js").JSX.Element }) {
  return (
    <section class="flex flex-col gap-3 rounded-card bg-surface-card p-4 shadow-card sm:p-5">
      <div class="flex items-center justify-between gap-2">
        <h2 class="text-base font-semibold text-ink">{props.title}</h2>
        <Button variant="outline" size="sm" href={props.href}>
          ดูทั้งหมด
        </Button>
      </div>
      {props.children}
    </section>
  );
}
