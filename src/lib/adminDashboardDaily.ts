/**
 * CMS Dashboard & Admin UX Refinement §01-02 — deterministic "sales by day
 * of month" data (X-axis 1..N, N = however many days that month actually
 * has), for the Sales Chart and the dataset-comparison Line Chart. A pure
 * function of (year, month, seed) — never `Math.random()` — so refreshing
 * the page, or picking the same month twice, always draws the same line.
 */

export type DailyPoint = { day: number; value: number };

export type MonthOption = { year: number; month: number; label: string };

const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

/** This prototype's mock "today" is 18 ก.ย. 2569 (18 Sep 2026) everywhere else (adminContent.ts, adminHomepage.ts, ...) — reused here so the month picker's default/latest option lines up with the rest of the mock data instead of the browser's real current date. */
export const MOCK_TODAY = { year: 2026, month: 9, day: 18 };

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** Last 6 months ending at `MOCK_TODAY`, newest first — enough range to be useful without a full date-range picker. */
export function getMonthOptions(count = 6): MonthOption[] {
  const options: MonthOption[] = [];
  let { year, month } = MOCK_TODAY;
  for (let i = 0; i < count; i++) {
    options.push({ year, month, label: `${THAI_MONTHS[month - 1]} ${year + 543}` });
    month -= 1;
    if (month === 0) {
      month = 12;
      year -= 1;
    }
  }
  return options;
}

export function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** A tiny deterministic PRNG (sine-based) — same (year, month, day, seed) always produces the same [0,1) value, unlike `Math.random()`. */
function seededUnit(n: number): number {
  const x = Math.sin(n) * 10000;
  return x - Math.floor(x);
}

/**
 * One deterministic revenue curve per (year, month, seed) — `seed` lets the
 * Comparison chart draw two visibly different-but-still-realistic lines for
 * the same entity dimension (e.g. Product A vs Product B) without a second
 * real per-entity time series existing anywhere in this mock data.
 */
export function getDailySeries(year: number, month: number, seed = 0): DailyPoint[] {
  const days = daysInMonth(year, month);
  const base = 9000 + ((month * 677 + seed * 911) % 6000);
  const points: DailyPoint[] = [];
  for (let day = 1; day <= days; day++) {
    const weekday = new Date(year, month - 1, day).getDay();
    const weekendBoost = weekday === 0 || weekday === 6 ? 1.3 : 1;
    const noise = seededUnit(year * 100000 + month * 1000 + day * 13 + seed * 97);
    const wave = Math.sin((day / days) * Math.PI * 2 + seed) * 2400;
    const value = Math.max(800, Math.round(((base + noise * 7000 + wave) * weekendBoost) / 50) * 50);
    points.push({ day, value });
  }
  return points;
}
