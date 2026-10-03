import { createEffect, createMemo, createSignal, For, Show } from "solid-js";
import { useAdminProducts } from "~/lib/adminProductStore";
import { useAdminCategories } from "~/lib/adminCategoryStore";
import { useAdminBrands } from "~/lib/adminBrandStore";
import { useAdminCollections } from "~/lib/adminCollectionStore";
import { useAdminContent } from "~/lib/adminContentStore";
import { useAdminCampaigns } from "~/lib/adminCampaignStore";
import { formatAdminCurrency } from "~/lib/adminDashboard";
import { getDailySeries, getMonthOptions, monthKey, type DailyPoint } from "~/lib/adminDashboardDaily";
import {
  getCategoryPerformance,
  getBrandPerformance,
  getCollectionPerformance,
  getPromotionPagePerformance,
  getCampaignPerformance,
  getTopProductEntries,
  type PerformanceEntry,
} from "~/lib/adminDashboardAnalytics";
import { ChevronDownIcon } from "~/components/admin/icons";
import { LineChart } from "./DashboardCharts";

type CompareDimension = "category" | "brand" | "collection" | "promotion" | "campaign" | "product";

const DIMENSION_OPTIONS: { value: CompareDimension; label: string }[] = [
  { value: "category", label: "หมวดหมู่ (Category)" },
  { value: "brand", label: "แบรนด์ (Brand)" },
  { value: "collection", label: "คอลเลกชัน (Collection)" },
  { value: "promotion", label: "หน้าโปรโมชั่น" },
  { value: "campaign", label: "แคมเปญ (Campaign)" },
  { value: "product", label: "สินค้า (Product)" },
];

type Metric = "revenue" | "units";

const MONTH_OPTIONS = getMonthOptions();
const SELECT_CLASS = "h-11 w-full appearance-none rounded-card border border-border bg-surface-card pl-4 pr-9 text-sm text-ink outline-none focus:border-brand-pink";

/** A short, deterministic hash of an entity id — used purely to give each entity its own distinct-but-stable daily curve shape (see `getDailySeries`'s `seed` param), never persisted, never random. */
function hashSeed(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 1000;
  return h;
}

/** Spreads an entity's real aggregate metric (from `PerformanceEntry`, computed from the live Product/Order-derived stores) across the days of the selected month using a deterministic per-entity curve shape, so the two lines' *totals* are real data — only their day-to-day shape is a stand-in for a per-entity time series this prototype has no backend to produce. */
function entityDailySeries(entry: PerformanceEntry | undefined, year: number, month: number, metric: Metric): DailyPoint[] {
  const raw = getDailySeries(year, month, entry ? hashSeed(entry.id) : 0);
  if (!entry) return raw.map((p) => ({ day: p.day, value: 0 }));
  const target = metric === "revenue" ? entry.revenue : entry.unitsSold;
  const rawSum = raw.reduce((sum, p) => sum + p.value, 0) || 1;
  const scale = target / rawSum;
  return raw.map((p) => ({ day: p.day, value: Math.round(p.value * scale) }));
}

/**
 * §02 — "เปรียบเทียบข้อมูล": pick a dataset dimension, a metric, a month,
 * then two items from that dimension (e.g. "ปาก" vs "ตา") to compare as two
 * lines on one day-of-month chart — replaces the previous 2-bar Table
 * Comparison with a real Line Chart (grid/tooltip/legend/data points),
 * keeping the same Compare-by/Metric/dataset-picker controls.
 */
export function ComparisonPanel() {
  const products = useAdminProducts();
  const categories = useAdminCategories();
  const brands = useAdminBrands();
  const collections = useAdminCollections();
  const content = useAdminContent();
  const campaigns = useAdminCampaigns();

  const [dimension, setDimension] = createSignal<CompareDimension>("category");
  const [metric, setMetric] = createSignal<Metric>("revenue");
  const [monthSel, setMonthSel] = createSignal(monthKey(MONTH_OPTIONS[0].year, MONTH_OPTIONS[0].month));
  const [itemAId, setItemAId] = createSignal<string>("");
  const [itemBId, setItemBId] = createSignal<string>("");

  const activeMonth = createMemo(() => MONTH_OPTIONS.find((m) => monthKey(m.year, m.month) === monthSel()) ?? MONTH_OPTIONS[0]);

  const entries = createMemo<PerformanceEntry[]>(() => {
    switch (dimension()) {
      case "category":
        return getCategoryPerformance(categories.categories(), products.products());
      case "brand":
        return getBrandPerformance(brands.brands(), products.products());
      case "collection":
        return getCollectionPerformance(collections.collections(), products.products());
      case "promotion":
        return getPromotionPagePerformance(content.pages(), products.products());
      case "campaign":
        return getCampaignPerformance(campaigns.campaigns(), products.products());
      case "product":
        return getTopProductEntries(products.products());
    }
  });

  // Whenever the dimension changes (or the current picks no longer exist in
  // the new list), default to the first two entries so the panel never shows
  // an empty comparison.
  createEffect(() => {
    const list = entries();
    if (!list.some((e) => e.id === itemAId())) setItemAId(list[0]?.id ?? "");
    if (!list.some((e) => e.id === itemBId())) setItemBId(list[1]?.id ?? list[0]?.id ?? "");
  });

  const entryA = () => entries().find((e) => e.id === itemAId());
  const entryB = () => entries().find((e) => e.id === itemBId());
  const formatValue = (v: number) => (metric() === "revenue" ? formatAdminCurrency(v) : `${Math.round(v).toLocaleString("th-TH")} ชิ้น`);

  const series = createMemo(() => [
    {
      key: "a",
      label: entryA()?.name ?? "-",
      colorClass: "stroke-brand-pink",
      data: entityDailySeries(entryA(), activeMonth().year, activeMonth().month, metric()),
    },
    {
      key: "b",
      label: entryB()?.name ?? "-",
      colorClass: "stroke-brand-purple",
      data: entityDailySeries(entryB(), activeMonth().year, activeMonth().month, metric()),
    },
  ]);

  return (
    <div class="flex flex-col gap-4 rounded-card bg-surface-card p-4 shadow-card sm:p-5">
      <h3 class="text-base font-semibold text-ink">เปรียบเทียบข้อมูล</h3>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label class="flex flex-col gap-1.5 text-sm">
          <span class="font-medium text-ink">Compare by</span>
          <div class="relative">
            <select class={SELECT_CLASS} value={dimension()} onChange={(e) => setDimension(e.currentTarget.value as CompareDimension)}>
              <For each={DIMENSION_OPTIONS}>{(opt) => <option value={opt.value}>{opt.label}</option>}</For>
            </select>
            <ChevronDownIcon class="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-gray" />
          </div>
        </label>
        <label class="flex flex-col gap-1.5 text-sm">
          <span class="font-medium text-ink">Metric</span>
          <div class="relative">
            <select class={SELECT_CLASS} value={metric()} onChange={(e) => setMetric(e.currentTarget.value as Metric)}>
              <option value="revenue">ยอดขาย (Revenue)</option>
              <option value="units">จำนวนที่ขายได้ (Units Sold)</option>
            </select>
            <ChevronDownIcon class="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-gray" />
          </div>
        </label>
        <label class="flex flex-col gap-1.5 text-sm">
          <span class="font-medium text-ink">Date range</span>
          <div class="relative">
            <select class={SELECT_CLASS} value={monthSel()} onChange={(e) => setMonthSel(e.currentTarget.value)}>
              <For each={MONTH_OPTIONS}>{(m) => <option value={monthKey(m.year, m.month)}>{m.label}</option>}</For>
            </select>
            <ChevronDownIcon class="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-gray" />
          </div>
        </label>
      </div>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label class="flex flex-col gap-1.5 text-sm">
          <span class="font-medium text-ink">Dataset A</span>
          <div class="relative">
            <select class={SELECT_CLASS} value={itemAId()} onChange={(e) => setItemAId(e.currentTarget.value)}>
              <For each={entries()}>{(e) => <option value={e.id}>{e.name}</option>}</For>
            </select>
            <ChevronDownIcon class="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-gray" />
          </div>
        </label>
        <label class="flex flex-col gap-1.5 text-sm">
          <span class="font-medium text-ink">Dataset B</span>
          <div class="relative">
            <select class={SELECT_CLASS} value={itemBId()} onChange={(e) => setItemBId(e.currentTarget.value)}>
              <For each={entries()}>{(e) => <option value={e.id}>{e.name}</option>}</For>
            </select>
            <ChevronDownIcon class="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-gray" />
          </div>
        </label>
      </div>

      <Show when={entries().length > 0} fallback={<p class="py-6 text-center text-sm text-ink-gray">ยังไม่มีข้อมูลสำหรับมิตินี้</p>}>
        <LineChart series={series()} formatValue={formatValue} />
      </Show>
    </div>
  );
}
