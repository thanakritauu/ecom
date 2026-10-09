import { createEffect, createSignal, on, Show, type JSX } from "solid-js";
import { COIN_REDEMPTION_STEP, COIN_TO_BAHT_RATE } from "~/lib/cartSelectors";
import { SheetModal } from "../shared/SheetModal";
import { Button } from "../shared/Button";
import { formatTHB } from "../shared/PriceDisplay";
import { pushToast } from "~/lib/toast";
import coinMark from "~/assets/icons/charmiss-coin.png";

/**
 * "ใช้คอยน์" — pick how many Charmiss Coins this order uses (shared `SheetModal`, same as the
 * coupon picker). Steps of `COIN_REDEMPTION_STEP`; the cap is `maxRedeemableCoins` (balance,
 * `MAX_COIN_REDEMPTION`, products-after-coupon). "ยืนยันการใช้คอยน์" applies the typed amount; once coins
 * are in use the footer also offers "ยกเลิกใช้คอยน์".
 */
export function CoinRedeemSheet(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  balance: number;
  /** Most coins this order can take (`maxRedeemableCoins`). */
  max: number;
  applied: number;
  onApply: (coins: number) => void;
}) {
  const [draft, setDraft] = createSignal("");
  // Opening starts from what's applied, or the max when nothing is yet.
  createEffect(on(() => props.open, (open) => open && setDraft(String(props.applied || props.max))));

  const coins = () => (draft().trim() === "" ? NaN : Number(draft()));
  const error = (): string | undefined => {
    const n = coins();
    if (!Number.isFinite(n)) return "กรุณากรอกจำนวนคอยน์";
    if (n <= 0) return "กรุณากรอกจำนวนคอยน์มากกว่า 0";
    if (n % COIN_REDEMPTION_STEP !== 0) return `ใช้คอยน์ได้ครั้งละ ${COIN_REDEMPTION_STEP} คอยน์ (เช่น 10, 20, 30)`;
    if (n > props.balance) return `คุณมีคอยน์ ${props.balance.toLocaleString("th-TH")} คอยน์`;
    if (n > props.max) return `คำสั่งซื้อนี้ใช้คอยน์ได้สูงสุด ${props.max.toLocaleString("th-TH")} คอยน์`;
    return undefined;
  };
  const discount = () => (error() ? 0 : Math.round(coins() * COIN_TO_BAHT_RATE));

  const stepBy = (delta: number) => {
    const n = Number.isFinite(coins()) ? coins() : 0;
    const snapped = Math.round(n / COIN_REDEMPTION_STEP) * COIN_REDEMPTION_STEP;
    setDraft(String(Math.min(props.max, Math.max(0, snapped + delta))));
  };

  const apply = () => {
    if (error()) return document.getElementById("coin-redeem-amount")?.focus(); // the message is already under the input
    props.onApply(coins());
    props.onOpenChange(false);
    pushToast("ใช้คอยน์แล้ว", "success", `${coins().toLocaleString("th-TH")} คอยน์ ลด ${formatTHB(discount())}`);
  };
  const remove = () => {
    props.onApply(0);
    props.onOpenChange(false);
  };

  return (
    <SheetModal
      open={props.open}
      onOpenChange={props.onOpenChange}
      height="auto"
      title="ใช้ Charmiss Coin แลกส่วนลด"
      // The per-order cap isn't printed up front — only the validation message names it, when exceeded.
      description={<span class="whitespace-nowrap">ทุก {Math.round(1 / COIN_TO_BAHT_RATE)} คอยน์ = ส่วนลด ฿1</span>}
      footer={
        <>
          <Button type="submit" form="coin-redeem-form" variant="primary" size="lg" class="w-full" disabled={props.max === 0}>
            ยืนยันการใช้คอยน์
          </Button>
          <Show when={props.applied > 0}>
            <Button type="button" variant="outline" size="lg" class="w-full" onClick={remove}>
              ยกเลิกใช้คอยน์
            </Button>
          </Show>
        </>
      }
    >
      <div class="flex items-center gap-3 rounded-card bg-surface-pink p-4">
        <img src={coinMark} alt="" class="size-10 shrink-0" aria-hidden="true" />
        <div class="flex min-w-0 flex-1 flex-col leading-[1.75]">
          <p class="text-sm text-ink-gray">คอยน์ของคุณ</p>
          <p class="text-lg font-semibold text-ink">{props.balance.toLocaleString("th-TH")} คอยน์</p>
        </div>
      </div>

      <Show
        when={props.max > 0}
        fallback={<p class="rounded-card bg-surface-gray/60 p-4 text-center text-sm leading-[1.75] text-ink-gray">คำสั่งซื้อนี้ยังใช้คอยน์ไม่ได้</p>}
      >
        <form
          id="coin-redeem-form"
          novalidate
          class="flex flex-col gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            apply();
          }}
        >
          <label for="coin-redeem-amount" class="text-sm font-medium text-ink">
            จำนวนคอยน์ที่ต้องการใช้
          </label>
          <div class="flex items-center gap-2">
            <StepButton label="ลดคอยน์" disabled={!(coins() > 0)} onClick={() => stepBy(-COIN_REDEMPTION_STEP)}>
              <path d="M5 12h14" stroke-linecap="round" />
            </StepButton>
            <input
              id="coin-redeem-amount"
              type="number"
              inputMode="numeric"
              min={0}
              max={props.max}
              step={COIN_REDEMPTION_STEP}
              enterkeyhint="done"
              aria-invalid={!!error()}
              aria-describedby="coin-redeem-feedback"
              value={draft()}
              onInput={(e) => setDraft(e.currentTarget.value.replace(/[^\d]/g, ""))}
              class={`h-11 min-w-0 flex-1 rounded-card border bg-surface-card px-4 text-center text-base font-semibold text-ink outline-none transition-colors duration-150 [appearance:textfield] focus:border-brand-pink [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
                error() ? "border-system-red" : "border-border"
              }`}
            />
            <StepButton label="เพิ่มคอยน์" disabled={Number.isFinite(coins()) && coins() >= props.max} onClick={() => stepBy(COIN_REDEMPTION_STEP)}>
              <path d="M12 5v14M5 12h14" stroke-linecap="round" />
            </StepButton>
            <button
              type="button"
              onClick={() => setDraft(String(props.max))}
              class="min-h-11 shrink-0 whitespace-nowrap rounded-pill border border-brand-pink px-3 text-sm font-medium text-brand-pink transition-colors duration-150 lg:hover:bg-surface-pink"
            >
              ใช้คอยน์สูงสุด
            </button>
          </div>
          <div id="coin-redeem-feedback" aria-live="polite">
            <Show
              when={!error()}
              fallback={
                <p role="alert" class="text-sm leading-[1.75] text-system-red">
                  {error()}
                </p>
              }
            >
              <p class="text-sm leading-[1.75] text-ink">
                ได้ส่วนลด <span class="font-semibold text-success">{formatTHB(discount())}</span>
              </p>
            </Show>
          </div>
        </form>
      </Show>
    </SheetModal>
  );
}

function StepButton(props: { label: string; disabled: boolean; onClick: () => void; children: JSX.Element }) {
  return (
    <button
      type="button"
      aria-label={props.label}
      disabled={props.disabled}
      onClick={props.onClick}
      class="flex size-11 shrink-0 items-center justify-center rounded-pill bg-surface-pink text-brand-pink transition-colors duration-150 disabled:cursor-not-allowed disabled:bg-surface-gray disabled:text-ink-gray disabled:opacity-60 lg:hover:bg-surface-pink/70"
    >
      <svg viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
        {props.children}
      </svg>
    </button>
  );
}
