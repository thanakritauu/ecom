import { createMemo, For, Show } from "solid-js";
import { formatTHB } from "../shared/PriceDisplay";

/**
 * PromptPay QR. While the payment layer is the mock, the QR is a
 * deterministic pattern drawn from the session payload — not a real,
 * scannable PromptPay/EMV code (the real gateway will supply one).
 */
export function PromptPayPanel(props: {
  amount: number;
  qrPayload?: string;
  /** Seconds left before the QR expires. */
  secondsLeft: number;
  status: "creating" | "pending" | "confirming";
  notPaidYetHint?: boolean;
}) {
  const mmss = () => {
    const s = Math.max(0, props.secondsLeft);
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  };

  return (
    <div class="flex flex-col items-center gap-4 text-center">
      <div class="flex w-full max-w-[300px] flex-col items-center gap-3 rounded-card border border-surface-gray bg-white p-4 shadow-card">
        <div class="flex w-full items-center justify-between text-xs font-semibold">
          <span class="rounded-md bg-[#113566] px-2 py-1 text-white">PromptPay</span>
          <span class="text-ink-gray">สแกนด้วยแอปธนาคาร</span>
        </div>
        <div class="relative aspect-square w-full max-w-[220px]">
          <Show when={props.qrPayload && props.status !== "creating"} fallback={<div class="size-full animate-pulse rounded-lg bg-surface-gray" aria-label="กำลังสร้าง QR" />}>
            <MockQr payload={props.qrPayload!} />
          </Show>
          <Show when={props.status === "confirming"}>
            <div class="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-lg bg-white/90">
              <span class="loading loading-spinner loading-md text-brand-pink" aria-hidden="true" />
              <span class="text-sm font-medium text-ink">กำลังยืนยันการชำระเงิน...</span>
            </div>
          </Show>
        </div>
        <div>
          <p class="text-xs text-ink-gray">ยอดชำระ</p>
          <p class="text-2xl font-bold text-brand-pink">{formatTHB(props.amount)}</p>
        </div>
      </div>

      <div class="flex flex-col items-center gap-1" role="status" aria-live="polite">
        <p class="flex items-center gap-2 text-sm font-semibold text-ink">
          <span class="relative flex size-2.5">
            <span class="absolute inset-0 animate-ping rounded-pill bg-brand-yellow" />
            <span class="relative size-2.5 rounded-pill bg-brand-yellow" />
          </span>
          รอการชำระเงิน
        </p>
        <p class="text-sm text-ink-gray">
          QR หมดอายุใน <span class="font-semibold tabular-nums text-ink">{mmss()}</span> นาที
        </p>
        <Show when={props.notPaidYetHint}>
          <p class="text-sm text-system-red">ยังไม่พบการชำระเงิน กรุณาสแกน QR และชำระให้เสร็จก่อน</p>
        </Show>
      </div>

      <ol class="w-full max-w-[360px] list-decimal space-y-1 pl-5 text-left text-sm text-ink-gray">
        <li>เปิดแอปธนาคารแล้วเลือกสแกน QR</li>
        <li>ตรวจสอบยอดและยืนยันการชำระ</li>
        <li>หน้านี้จะอัปเดตเองเมื่อชำระสำเร็จ</li>
      </ol>

    </div>
  );
}

const SIZE = 25;

/** Seeded pseudo-random module grid with the three finder squares, so it reads as "a QR" without encoding anything payable. */
function MockQr(props: { payload: string }) {
  const cells = createMemo(() => {
    let seed = [...props.payload].reduce((h, c) => (Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0), 2166136261);
    const rand = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
    const inFinder = (x: number, y: number) => [[0, 0], [SIZE - 7, 0], [0, SIZE - 7]].some(([fx, fy]) => x >= fx - 1 && x <= fx + 7 && y >= fy - 1 && y <= fy + 7);
    const out: [number, number][] = [];
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) if (!inFinder(x, y) && rand() > 0.52) out.push([x, y]);
    return out;
  });
  const finders = [[0, 0], [SIZE - 7, 0], [0, SIZE - 7]];
  return (
    <svg viewBox={`-1 -1 ${SIZE + 2} ${SIZE + 2}`} class="size-full rounded-lg bg-white" shape-rendering="crispEdges" role="img" aria-label="QR Code สำหรับชำระเงินผ่านพร้อมเพย์">
      <For each={cells()}>{([x, y]) => <rect x={x} y={y} width="1" height="1" fill="#1f2937" />}</For>
      <For each={finders}>
        {([x, y]) => (
          <g>
            <rect x={x} y={y} width="7" height="7" fill="#1f2937" />
            <rect x={x + 1} y={y + 1} width="5" height="5" fill="#fff" />
            <rect x={x + 2} y={y + 2} width="3" height="3" fill="#1f2937" />
          </g>
        )}
      </For>
    </svg>
  );
}
