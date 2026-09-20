import { For } from "solid-js";
import { formatAdminCurrency, type SalesTrendPoint } from "~/lib/adminDashboard";
import { Skeleton } from "~/components/admin/Skeleton";

/**
 * Lightweight inline SVG bar chart — no charting library added (PART 7 asks
 * to avoid one if possible). Bars scale to the tallest point in the current
 * period's data; day/date labels render as regular DOM text below the SVG
 * rather than inside it, so they never need their own font-scaling logic.
 * `role="img"` + one summarizing `aria-label` on the figure is the
 * accessible-chart baseline (PART 28) — exposing every bar via ARIA is
 * unreliable across screen readers, so the summary carries the meaning.
 */
export function SalesTrendChart(props: { points: SalesTrendPoint[] }) {
  const max = () => Math.max(...props.points.map((p) => p.revenue), 1);
  const barCount = () => props.points.length;
  const barSlot = () => 100 / barCount();

  const summary = () => {
    const first = props.points[0];
    const last = props.points[props.points.length - 1];
    if (!first || !last) return "กราฟยอดขาย";
    return `กราฟยอดขายจาก ${first.label} ถึง ${last.label} สูงสุด ${formatAdminCurrency(max())}`;
  };

  return (
    <figure role="img" aria-label={summary()} class="w-full">
      <svg viewBox="0 0 300 100" preserveAspectRatio="none" class="h-40 w-full overflow-visible">
        <For each={props.points}>
          {(point, i) => {
            const barHeight = () => Math.max((point.revenue / max()) * 96, 2);
            const slotWidth = 300 / barCount();
            const barWidth = slotWidth * 0.55;
            const x = i() * slotWidth + (slotWidth - barWidth) / 2;
            return (
              <rect
                x={x}
                y={100 - barHeight()}
                width={barWidth}
                height={barHeight()}
                rx={3}
                class="fill-brand-pink transition-opacity duration-150 hover:opacity-80"
              >
                <title>
                  {point.label}: {formatAdminCurrency(point.revenue)}
                </title>
              </rect>
            );
          }}
        </For>
      </svg>
      <div class="mt-2 flex text-xs text-ink-gray" style={{ display: "grid", "grid-template-columns": `repeat(${barCount()}, minmax(0, 1fr))` }}>
        <For each={props.points}>{(point) => <span class="text-center">{point.label}</span>}</For>
      </div>
    </figure>
  );
}

export function SalesTrendChartSkeleton() {
  return (
    <div class="flex h-40 items-end gap-2 sm:gap-3">
      <For each={[45, 70, 55, 85, 100, 65, 50]}>{(h) => <Skeleton class="flex-1 rounded-t" style={{ height: `${h}%` }} />}</For>
    </div>
  );
}
