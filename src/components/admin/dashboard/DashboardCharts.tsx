import { createSignal, For, Show } from "solid-js";

/**
 * CMS Backoffice Polish §15-16 — Bar / Horizontal Bar / Donut chart
 * primitives for the Dashboard's new analytics sections. Same approach as
 * the existing `SalesTrendChart` (hand-rolled inline SVG, no charting
 * library — this codebase deliberately avoids adding one), same Charmiss
 * palette (`brand-pink`/`brand-purple`/`brand-yellow`), and the same native
 * `<title>` hover-tooltip pattern `SalesTrendChart` already established.
 */

const SERIES_COLORS = ["fill-brand-pink", "fill-brand-purple", "fill-brand-yellow", "fill-ink-gray"];

export type BarDatum = { label: string; value: number; formatValue?: (v: number) => string };

/** Small vertical bar chart — used by the period/dataset Comparison tool (2-4 bars, e.g. "Lip" vs "Eye"). */
export function BarChart(props: { data: BarDatum[] }) {
  const max = () => Math.max(...props.data.map((d) => d.value), 1);
  return (
    <figure role="img" aria-label={`กราฟเปรียบเทียบ ${props.data.map((d) => `${d.label} ${d.value}`).join(", ")}`} class="w-full">
      <svg viewBox="0 0 300 140" preserveAspectRatio="none" class="h-40 w-full overflow-visible">
        <For each={props.data}>
          {(d, i) => {
            const slotWidth = 300 / props.data.length;
            const barWidth = Math.min(slotWidth * 0.5, 70);
            const barHeight = () => Math.max((d.value / max()) * 120, 2);
            const x = i() * slotWidth + (slotWidth - barWidth) / 2;
            const fmt = d.formatValue ?? ((v: number) => v.toLocaleString("th-TH"));
            return (
              <g>
                <rect x={x} y={140 - barHeight() - 20} width={barWidth} height={barHeight()} rx={4} class={`${SERIES_COLORS[i() % SERIES_COLORS.length]} transition-opacity duration-150 hover:opacity-80`}>
                  <title>
                    {d.label}: {fmt(d.value)}
                  </title>
                </rect>
                <text x={x + barWidth / 2} y={140 - barHeight() - 26} text-anchor="middle" class="fill-ink text-[10px] font-semibold">
                  {fmt(d.value)}
                </text>
              </g>
            );
          }}
        </For>
      </svg>
      <div class="mt-2 grid gap-2 text-center text-xs text-ink-gray" style={{ "grid-template-columns": `repeat(${props.data.length}, minmax(0, 1fr))` }}>
        <For each={props.data}>{(d) => <span class="truncate">{d.label}</span>}</For>
      </div>
    </figure>
  );
}

export type HBarDatum = { id: string; label: string; value: number; href?: string };

/** Horizontal ranked bar list — used for Category/Brand/Promotion/Campaign/Coupon performance. */
export function HBarChart(props: { data: HBarDatum[]; formatValue?: (v: number) => string; emptyLabel?: string }) {
  const max = () => Math.max(...props.data.map((d) => d.value), 1);
  const fmt = () => props.formatValue ?? ((v: number) => v.toLocaleString("th-TH"));
  return (
    <Show when={props.data.length > 0} fallback={<p class="py-6 text-center text-sm text-ink-gray">{props.emptyLabel ?? "ยังไม่มีข้อมูล"}</p>}>
      <div class="flex flex-col gap-3">
        <For each={props.data}>
          {(d) => {
            const pct = () => Math.max((d.value / max()) * 100, 2);
            const Row = () => (
              <div class="flex flex-col gap-1">
                <div class="flex items-center justify-between gap-2 text-sm">
                  <span class="truncate text-ink">{d.label}</span>
                  <span class="shrink-0 font-medium text-ink">{fmt()(d.value)}</span>
                </div>
                <div class="h-2 w-full overflow-hidden rounded-pill bg-surface-gray">
                  <div class="h-full rounded-pill bg-brand-pink transition-all duration-300" style={{ width: `${pct()}%` }} title={`${d.label}: ${fmt()(d.value)}`} />
                </div>
              </div>
            );
            return d.href ? (
              <a href={d.href} class="rounded-card transition-opacity duration-150 hover:opacity-70">
                <Row />
              </a>
            ) : (
              <Row />
            );
          }}
        </For>
      </div>
    </Show>
  );
}

export type LineSeries = { key: string; label: string; colorClass: string; data: { day: number; value: number }[] };

/**
 * CMS Dashboard & Admin UX Refinement §01-02 — a real day-of-month Line
 * Chart (X-axis 1..N, Y-axis currency, grid, hover tooltip synced across
 * every series, legend when there's more than one series). Wrapped in its
 * own `overflow-x-auto` — same pattern the Period Comparison table already
 * uses — so a full 28-31-day axis never causes page-level horizontal
 * overflow on narrow viewports; the admin scrolls the chart itself instead.
 */
export function LineChart(props: { series: LineSeries[]; formatValue?: (v: number) => string }) {
  const fmt = () => props.formatValue ?? ((v: number) => v.toLocaleString("th-TH"));
  const points = () => props.series[0]?.data ?? [];
  const days = () => points().length;
  const maxValue = () => Math.max(...props.series.flatMap((s) => s.data.map((d) => d.value)), 1);
  const [hoveredDay, setHoveredDay] = createSignal<number | null>(null);

  const H = 220;
  const padTop = 14;
  const chartH = H - padTop - 6;
  const width = () => Math.max(days() * 22, 340);
  const slotWidth = () => width() / Math.max(days(), 1);
  const xFor = (day: number) => (day - 0.5) * slotWidth();
  const yFor = (value: number) => padTop + chartH - (value / maxValue()) * (chartH - 8);
  const GRID_FRACTIONS = [0, 0.25, 0.5, 0.75, 1];
  const pathFor = (data: { day: number; value: number }[]) => data.map((d, i) => `${i === 0 ? "M" : "L"} ${xFor(d.day)} ${yFor(d.value)}`).join(" ");
  const tooltipFor = (day: number) =>
    `วันที่ ${day}\n` + props.series.map((s) => `${s.label}: ${fmt()(s.data.find((d) => d.day === day)?.value ?? 0)}`).join("\n");

  return (
    <div class="flex flex-col gap-3">
      <Show when={props.series.length > 1}>
        <div class="flex flex-wrap items-center gap-4 text-xs">
          <For each={props.series}>
            {(s) => (
              <span class="flex items-center gap-1.5">
                <span class={`size-2.5 shrink-0 rounded-pill ${s.colorClass.replace("stroke-", "bg-")}`} />
                <span class="text-ink-gray">{s.label}</span>
              </span>
            )}
          </For>
        </div>
      </Show>

      <div class="overflow-x-auto">
        <div style={{ "min-width": `${width() + 46}px` }}>
          <div class="flex">
            <svg viewBox={`0 0 40 ${H}`} width="40" height={H} class="shrink-0 overflow-visible">
              <For each={GRID_FRACTIONS}>
                {(g) => (
                  <text x="38" y={padTop + chartH - g * (chartH - 8) + 3} text-anchor="end" class="fill-ink-placeholder text-[9px]">
                    {fmt()(Math.round(maxValue() * g))}
                  </text>
                )}
              </For>
            </svg>
            <svg viewBox={`0 0 ${width()} ${H}`} width={width()} height={H} class="flex-1 overflow-visible" aria-hidden="true">
              <For each={GRID_FRACTIONS}>
                {(g) => (
                  <line x1="0" y1={padTop + chartH - g * (chartH - 8)} x2={width()} y2={padTop + chartH - g * (chartH - 8)} class="stroke-surface-gray" stroke-width="1" />
                )}
              </For>
              <Show when={hoveredDay() !== null}>
                <line x1={xFor(hoveredDay()!)} y1={padTop} x2={xFor(hoveredDay()!)} y2={H - 6} class="stroke-ink-placeholder" stroke-width="1" stroke-dasharray="3 3" />
              </Show>
              <For each={props.series}>
                {(s) => (
                  <>
                    <path d={pathFor(s.data)} fill="none" class={s.colorClass} stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />
                    <For each={s.data}>
                      {(d) => (
                        <circle cx={xFor(d.day)} cy={yFor(d.value)} r={hoveredDay() === d.day ? 4 : 2.2} class={`${s.colorClass.replace("stroke-", "fill-")} transition-all duration-100`} />
                      )}
                    </For>
                  </>
                )}
              </For>
              <For each={points()}>
                {(d) => (
                  <rect
                    x={xFor(d.day) - slotWidth() / 2}
                    y={padTop}
                    width={slotWidth()}
                    height={chartH}
                    fill="transparent"
                    class="cursor-pointer"
                    onMouseEnter={() => setHoveredDay(d.day)}
                    onMouseLeave={() => setHoveredDay(null)}
                  >
                    <title>{tooltipFor(d.day)}</title>
                  </rect>
                )}
              </For>
            </svg>
          </div>
          <div class="ml-[40px] grid text-center text-[8px] text-ink-gray sm:text-[9px]" style={{ "grid-template-columns": `repeat(${days()}, minmax(0, 1fr))` }}>
            <For each={points()}>{(d) => <span>{d.day}</span>}</For>
          </div>
          <p class="ml-[40px] mt-1 text-center text-[10px] text-ink-placeholder">วันที่</p>
        </div>
      </div>

      <Show when={hoveredDay() !== null}>
        <div class="w-fit rounded-card bg-ink px-3 py-2 text-xs text-white">
          <p class="font-semibold">วันที่ {hoveredDay()}</p>
          <For each={props.series}>
            {(s) => {
              const point = () => s.data.find((d) => d.day === hoveredDay());
              return (
                <p class="text-white/90">
                  {s.label}: {point() ? fmt()(point()!.value) : "-"}
                </p>
              );
            }}
          </For>
        </div>
      </Show>
    </div>
  );
}

export type DonutSlice = { key: string; label: string; count: number; colorClass: string };

/** Donut chart with a hover-driven center readout — used for Order/Payment/Fulfillment status distribution. */
export function DonutChart(props: { slices: DonutSlice[] }) {
  const total = () => props.slices.reduce((sum, s) => sum + s.count, 0);
  const [hovered, setHovered] = createSignal<string | null>(null);
  const R = 40;
  const CIRC = 2 * Math.PI * R;

  const segments = () => {
    let offset = 0;
    return props.slices.map((s) => {
      const fraction = total() > 0 ? s.count / total() : 0;
      const seg = { ...s, dash: fraction * CIRC, offset };
      offset += fraction * CIRC;
      return seg;
    });
  };

  const activeSlice = () => props.slices.find((s) => s.key === hovered());

  return (
    <div class="flex items-center gap-5">
      <div class="relative shrink-0">
        <svg viewBox="0 0 100 100" class="size-28 -rotate-90">
          <circle cx="50" cy="50" r={R} fill="none" class="stroke-surface-gray" stroke-width="14" />
          <For each={segments()}>
            {(seg) => (
              <circle
                cx="50"
                cy="50"
                r={R}
                fill="none"
                class={`${seg.colorClass} transition-opacity duration-150 cursor-pointer`}
                classList={{ "opacity-40": hovered() !== null && hovered() !== seg.key }}
                stroke-width="14"
                stroke-dasharray={`${seg.dash} ${CIRC - seg.dash}`}
                stroke-dashoffset={-seg.offset}
                onMouseEnter={() => setHovered(seg.key)}
                onMouseLeave={() => setHovered(null)}
              >
                <title>
                  {seg.label}: {seg.count}
                </title>
              </circle>
            )}
          </For>
        </svg>
        <div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span class="text-lg font-bold text-ink">{activeSlice()?.count ?? total()}</span>
          <span class="max-w-16 truncate text-center text-[10px] text-ink-gray">{activeSlice()?.label ?? "ทั้งหมด"}</span>
        </div>
      </div>
      <div class="flex flex-1 flex-col gap-1.5">
        <For each={props.slices}>
          {(s) => (
            <button
              type="button"
              onMouseEnter={() => setHovered(s.key)}
              onMouseLeave={() => setHovered(null)}
              class="flex items-center justify-between gap-2 rounded-card px-1.5 py-0.5 text-left text-xs transition-colors duration-150 hover:bg-surface-gray/60"
            >
              <span class="flex items-center gap-1.5 truncate text-ink-gray">
                <span class={`size-2 shrink-0 rounded-pill ${s.colorClass.replace("stroke-", "bg-")}`} />
                {s.label}
              </span>
              <span class="shrink-0 font-medium text-ink">{s.count}</span>
            </button>
          )}
        </For>
      </div>
    </div>
  );
}
