import { createEffect, createSignal, For, on, onCleanup, Show } from "solid-js";
import { PAYMENT_METHODS, type CheckoutTotals, type Coupon, type PaymentMethodId, type ResolvedCartLine } from "~/lib/cartSelectors";
import { FAILURE_MESSAGES, mockTokenizeCard, type MockPaymentProvider, type PaymentFailureReason, type PaymentProvider, type PromptPaySession } from "~/lib/payment";
import { Button } from "../shared/Button";
import { FloatingOrderSummary } from "../shared/FloatingOrderSummary";
import { formatTHB } from "../shared/PriceDisplay";
import { CardPaymentForm, EMPTY_CARD, validateCard, type CardErrors, type CardInput } from "./CardPaymentForm";
import { PromptPayPanel } from "./PromptPayPanel";

export type PaidResult = { method: PaymentMethodId; methodLabel: string; reference: string; detail?: string };

const INSTALLMENT_TERMS = [3, 6, 10] as const;

type Phase = "form" | "processing" | "failed";

/**
 * Phase 06 — Beam-style payment step (prototype). Sits after Checkout:
 * one clean card with the amount up top, the payment methods Checkout
 * already offers, the selected method's UI, and a single sticky pay CTA
 * (the same FloatingOrderSummary Checkout uses). All money comes from
 * Checkout's own `totals` — nothing is recomputed here — and every payment
 * call goes through `PaymentProvider`, so Beam can replace the mock without
 * touching this component or Checkout.
 */
export function PaymentStep(props: {
  orderNumber: string;
  lines: ResolvedCartLine[];
  totals: CheckoutTotals;
  coupon?: Coupon;
  initialMethod: PaymentMethodId;
  provider: PaymentProvider | MockPaymentProvider;
  onPaid: (result: PaidResult) => void;
  onBack: () => void;
  /** Keeps Checkout's own selection in sync if the shopper goes back. */
  onMethodChange?: (method: PaymentMethodId) => void;
}) {
  const [method, setMethod] = createSignal<PaymentMethodId>(props.initialMethod);
  const [phase, setPhase] = createSignal<Phase>("form");
  const [failure, setFailure] = createSignal<PaymentFailureReason>("card_declined");

  // Card / installment
  const [card, setCard] = createSignal<CardInput>(EMPTY_CARD);
  const [touched, setTouched] = createSignal<Partial<Record<keyof CardInput, boolean>>>({});
  const [submitted, setSubmitted] = createSignal(false);
  const [term, setTerm] = createSignal<(typeof INSTALLMENT_TERMS)[number]>(3);
  const cardErrors = (): CardErrors => {
    const all = validateCard(card());
    return Object.fromEntries(Object.entries(all).filter(([k]) => submitted() || touched()[k as keyof CardInput])) as CardErrors;
  };

  // PromptPay
  const [ppSession, setPpSession] = createSignal<PromptPaySession>();
  const [ppStatus, setPpStatus] = createSignal<"creating" | "pending" | "confirming">("creating");
  const [now, setNow] = createSignal(Date.now());
  const [notPaidHint, setNotPaidHint] = createSignal(false);
  const secondsLeft = () => Math.ceil(((ppSession()?.expiresAt ?? now()) - now()) / 1000);

  const methodMeta = () => PAYMENT_METHODS.find((m) => m.id === method())!;
  const amount = () => props.totals.total;
  const request = () => ({ orderNumber: props.orderNumber, amount: amount(), method: method() });

  const fail = (reason: PaymentFailureReason) => {
    setFailure(reason);
    setPhase("failed");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const startPromptPay = async () => {
    setPpStatus("creating");
    setNotPaidHint(false);
    setPpSession(undefined);
    try {
      setPpSession(await props.provider.createPromptPaySession(request()));
      setPpStatus("pending");
    } catch {
      fail("network_error");
    }
  };

  const checkPromptPay = async (manual = false) => {
    const session = ppSession();
    if (!session || ppStatus() !== "pending") return;
    const status = await props.provider.getPromptPayStatus(session.id);
    if (status === "succeeded") {
      setPpStatus("confirming");
      setTimeout(() => props.onPaid({ method: "promptpay", methodLabel: methodMeta().label, reference: session.id }), 1200);
    } else if (status === "expired") fail("expired");
    else if (manual) setNotPaidHint(true);
  };

  // A fresh QR whenever PromptPay becomes the active form; ticks + polls only while it's showing.
  createEffect(
    on([method, phase], ([m, p]) => {
      if (m !== "promptpay" || p !== "form") return;
      void startPromptPay();
      const tick = setInterval(() => setNow(Date.now()), 1000);
      const poll = setInterval(() => void checkPromptPay(), 2500);
      onCleanup(() => {
        clearInterval(tick);
        clearInterval(poll);
      });
    }),
  );
  createEffect(() => {
    if (method() === "promptpay" && ppStatus() === "pending" && ppSession() && secondsLeft() <= 0) fail("expired");
  });

  const payByCard = async () => {
    setSubmitted(true);
    if (Object.keys(validateCard(card())).length > 0) return;
    setPhase("processing");
    try {
      const result = await props.provider.chargeCard(request(), mockTokenizeCard(card().number), {
        installmentMonths: method() === "installment" ? term() : undefined,
      });
      if (result.status === "succeeded") {
        const detail = method() === "installment" ? `${result.detail ?? ""} · ผ่อน ${term()} เดือน` : result.detail;
        props.onPaid({ method: method(), methodLabel: methodMeta().label, reference: result.reference, detail });
      } else fail(result.reason);
    } catch {
      fail("network_error");
    }
  };

  const confirmCod = async () => {
    setPhase("processing");
    try {
      const result = await props.provider.confirmCashOnDelivery(request());
      if (result.status === "succeeded") props.onPaid({ method: "cod", methodLabel: methodMeta().label, reference: result.reference });
      else fail(result.reason);
    } catch {
      fail("network_error");
    }
  };

  const onCta = () => {
    if (phase() === "processing") return;
    if (phase() === "failed") return retry();
    if (method() === "card" || method() === "installment") return void payByCard();
    if (method() === "promptpay") return void checkPromptPay(true);
    return void confirmCod();
  };

  /** Back to the same method's form. Card details stay except CVV (re-entered, as on real gateways). */
  const retry = () => {
    setCard((c) => ({ ...c, cvv: "" }));
    setTouched((t) => ({ ...t, cvv: false }));
    setSubmitted(false);
    setPhase("form");
  };

  const changeMethod = () => {
    setPhase("form");
    setSubmitted(false);
    queueMicrotask(() => document.getElementById("payment-methods")?.scrollIntoView({ behavior: "smooth", block: "center" }));
  };

  const ctaLabel = () => {
    if (phase() === "failed") return "ลองอีกครั้ง";
    if (method() === "promptpay") return "ฉันชำระเงินแล้ว";
    if (method() === "cod") return "ยืนยันคำสั่งซื้อ";
    return "ชำระเงิน";
  };

  return (
    <>
      <div class="mx-auto grid w-full max-w-[1040px] gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <section aria-labelledby="payment-heading" class="relative flex flex-col gap-6 rounded-card bg-white p-4 shadow-card sm:p-6">
          <button type="button" onClick={props.onBack} disabled={phase() === "processing"} class="-ml-1 flex min-h-11 w-fit items-center gap-1 text-sm font-medium text-ink-gray hover:text-brand-pink disabled:opacity-40">
            ← แก้ไขคำสั่งซื้อ
          </button>

          {/* 1. Amount first */}
          <div class="flex flex-col gap-1 rounded-card bg-surface-pink px-5 py-4">
            <div class="flex items-center justify-between gap-2 text-sm text-ink-gray">
              <span>Charmiss · คำสั่งซื้อ #{props.orderNumber}</span>
              <span class="rounded-pill bg-white px-2 py-0.5 text-[10px] font-semibold text-ink-gray">Prototype</span>
            </div>
            <h1 id="payment-heading" class="text-sm font-medium text-ink">
              ยอดที่ต้องชำระ
            </h1>
            <p class="text-3xl font-bold text-brand-pink">{formatTHB(amount())}</p>
          </div>

          <Show
            when={phase() !== "failed"}
            fallback={<FailedPanel reason={failure()} methodLabel={methodMeta().label} onRetry={retry} onChangeMethod={changeMethod} />}
          >
            {/* 2. Method */}
            <div id="payment-methods" class="flex flex-col gap-3">
              <h2 class="text-base font-semibold text-ink">เลือกช่องทางชำระเงิน</h2>
              <div role="radiogroup" aria-label="ช่องทางชำระเงิน" class="grid grid-cols-2 gap-3 md:grid-cols-4">
                <For each={PAYMENT_METHODS}>
                  {(m) => (
                    <button
                      type="button"
                      role="radio"
                      aria-checked={method() === m.id}
                      disabled={phase() === "processing"}
                      onClick={() => {
                        setMethod(m.id);
                        setSubmitted(false);
                        props.onMethodChange?.(m.id);
                      }}
                      class="font-normal relative flex min-h-[84px] flex-col items-start justify-between gap-2 rounded-card border-2 p-3 text-left transition-colors duration-150 disabled:opacity-60"
                      classList={{
                        "border-brand-pink bg-surface-pink": method() === m.id,
                        "border-surface-gray bg-white hover:border-brand-pink/40": method() !== m.id,
                      }}
                    >
                      <MethodIcon id={m.id} active={method() === m.id} />
                      <span class="text-sm font-semibold leading-tight text-ink">{m.label}</span>
                      <Show when={method() === m.id}>
                        <span class="absolute right-2 top-2 flex size-5 items-center justify-center rounded-pill bg-brand-pink text-[11px] font-bold text-white" aria-hidden="true">
                          ✓
                        </span>
                      </Show>
                    </button>
                  )}
                </For>
              </div>
            </div>

            {/* 3. Method UI */}
            <div class="flex flex-col gap-4">
              <Show when={method() === "card" || method() === "installment"}>
                <Show when={method() === "installment"}>
                  <fieldset class="flex flex-col gap-2">
                    <legend class="mb-1 text-sm font-medium text-ink">เลือกระยะเวลาผ่อน 0%</legend>
                    <div class="grid grid-cols-3 gap-2">
                      <For each={INSTALLMENT_TERMS}>
                        {(t) => (
                          <button
                            type="button"
                            aria-pressed={term() === t}
                            onClick={() => setTerm(t)}
                            class="font-normal flex min-h-[60px] flex-col items-center justify-center rounded-card border-2 px-2 text-center"
                            classList={{ "border-brand-pink bg-surface-pink": term() === t, "border-surface-gray": term() !== t }}
                          >
                            <span class="text-sm font-semibold text-ink">{t} เดือน</span>
                            <span class="text-xs text-ink-gray">{formatTHB(amount() / t)}/เดือน</span>
                          </button>
                        )}
                      </For>
                    </div>
                  </fieldset>
                </Show>
                <CardPaymentForm
                  card={card()}
                  onChange={setCard}
                  errors={cardErrors()}
                  onBlurField={(k) => setTouched((t) => ({ ...t, [k]: true }))}
                  disabled={phase() === "processing"}
                />
                <TestCardsHint />
              </Show>

              <Show when={method() === "promptpay"}>
                <PromptPayPanel
                  amount={amount()}
                  qrPayload={ppSession()?.qrPayload}
                  secondsLeft={secondsLeft()}
                  status={ppStatus()}
                  notPaidYetHint={notPaidHint()}
                  onSimulatePaid={() => {
                    const session = ppSession();
                    if (session && "simulatePromptPayPaid" in props.provider) props.provider.simulatePromptPayPaid(session.id);
                    void checkPromptPay();
                  }}
                />
              </Show>

              <Show when={method() === "cod"}>
                <div class="flex flex-col gap-2 rounded-card border border-surface-gray p-4 text-sm text-ink">
                  <p class="font-semibold">ชำระเงินสดเมื่อได้รับสินค้า</p>
                  <p class="text-ink-gray">
                    เตรียมเงิน <span class="font-semibold text-ink">{formatTHB(amount())}</span> ให้พนักงาน DHL เมื่อได้รับพัสดุ
                  </p>
                </div>
              </Show>
            </div>
          </Show>

          <p class="flex items-center justify-center gap-1.5 text-center text-xs text-ink-gray">
            <LockIcon /> ชำระเงินอย่างปลอดภัย · Prototype — ไม่มีการเรียกเก็บเงินจริง
          </p>

          {/* Processing — locks the card until the (mock) gateway answers */}
          <Show when={phase() === "processing"}>
            <div class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-card bg-white/90 px-6 text-center" role="status" aria-live="assertive">
              <span class="loading loading-spinner loading-lg text-brand-pink" aria-hidden="true" />
              <p class="text-lg font-semibold text-ink">{method() === "cod" ? "กำลังยืนยันคำสั่งซื้อ..." : "กำลังดำเนินการชำระเงิน..."}</p>
              <p class="text-sm text-ink-gray">กรุณาอย่าปิดหรือรีเฟรชหน้านี้</p>
            </div>
          </Show>
        </section>

        <PaymentOrderSummary lines={props.lines} totals={props.totals} coupon={props.coupon} />
      </div>

      <FloatingOrderSummary
        itemCount={props.lines.reduce((n, l) => n + l.line.qty, 0)}
        discount={props.totals.couponDiscount + props.totals.coinDiscount}
        shippingFee={props.totals.shippingFee}
        total={amount()}
        ctaLabel={ctaLabel()}
        ctaLoadingLabel={method() === "cod" ? "กำลังยืนยัน..." : "กำลังชำระเงิน..."}
        onCta={onCta}
        ctaLoading={phase() === "processing"}
        ctaDisabled={method() === "promptpay" && phase() === "form" && ppStatus() !== "pending"}
      />
    </>
  );
}

function FailedPanel(props: { reason: PaymentFailureReason; methodLabel: string; onRetry: () => void; onChangeMethod: () => void }) {
  const msg = () => FAILURE_MESSAGES[props.reason];
  return (
    <div class="flex flex-col items-center gap-3 py-4 text-center" role="alert">
      <span class="flex size-14 items-center justify-center rounded-pill bg-danger-soft text-2xl font-bold text-danger-strong" aria-hidden="true">
        !
      </span>
      <h2 class="text-xl font-bold text-ink">ไม่สามารถชำระเงินได้</h2>
      <p class="font-semibold text-ink">{msg().title}</p>
      <p class="max-w-sm text-sm text-ink-gray">{msg().body}</p>
      <p class="text-xs text-ink-gray">ช่องทาง: {props.methodLabel} · ยังไม่มีการตัดเงินจากรายการนี้</p>
      <div class="mt-2 flex w-full max-w-sm flex-col gap-2">
        <Button type="button" variant="primary" size="lg" class="w-full" onClick={props.onRetry}>
          ลองอีกครั้ง
        </Button>
        <Button type="button" variant="outline" size="lg" class="w-full" onClick={props.onChangeMethod}>
          เปลี่ยนช่องทางชำระเงิน
        </Button>
      </div>
    </div>
  );
}

/** Read-only recap of Checkout's own lines/totals — same numbers, no recalculation. */
function PaymentOrderSummary(props: { lines: ResolvedCartLine[]; totals: CheckoutTotals; coupon?: Coupon }) {
  const [open, setOpen] = createSignal(false);
  return (
    <aside aria-label="สรุปคำสั่งซื้อ" class="flex flex-col rounded-card bg-white shadow-card lg:sticky lg:top-6">
      <button type="button" aria-expanded={open()} onClick={() => setOpen((v) => !v)} class="font-normal flex min-h-[52px] items-center justify-between px-4 text-left lg:pointer-events-none">
        <span class="font-semibold text-ink">สรุปคำสั่งซื้อ ({props.lines.reduce((n, l) => n + l.line.qty, 0)} ชิ้น)</span>
        <span class="text-sm text-ink-gray lg:hidden" aria-hidden="true">
          {open() ? "ซ่อน ▴" : "ดู ▾"}
        </span>
      </button>
      <div class="flex-col gap-3 border-t border-surface-gray p-4 lg:flex" classList={{ flex: open(), hidden: !open() }}>
        <ul class="flex flex-col gap-3">
          <For each={props.lines}>
            {({ line, product, variant, unitPrice }) => (
              <li class="flex items-center gap-2">
                <img src={variant?.image ?? product.image} alt="" class="size-12 shrink-0 rounded-media border border-surface-gray object-cover" loading="lazy" />
                <div class="min-w-0 flex-1">
                  <p class="line-clamp-1 text-sm leading-[1.75] text-ink">{product.name}</p>
                  <p class="text-xs text-ink-gray">
                    {variant ? `${variant.label} · ` : ""}x{line.qty}
                  </p>
                </div>
                <span class="shrink-0 text-sm font-semibold text-ink">{formatTHB(unitPrice * line.qty)}</span>
              </li>
            )}
          </For>
        </ul>
        <div class="flex flex-col gap-1.5 border-t border-surface-gray pt-3 text-sm">
          <SummaryRow label="ราคาสินค้า" value={formatTHB(props.totals.subtotal)} />
          <Show when={props.totals.couponDiscount > 0}>
            <SummaryRow label={`คูปอง${props.coupon ? ` ${props.coupon.code}` : ""}`} value={`-${formatTHB(props.totals.couponDiscount)}`} accent />
          </Show>
          <Show when={props.totals.coinDiscount > 0}>
            <SummaryRow label="Charmiss Coin" value={`-${formatTHB(props.totals.coinDiscount)}`} accent />
          </Show>
          <SummaryRow label="ค่าจัดส่ง" value={props.totals.shippingFee ? formatTHB(props.totals.shippingFee) : "ฟรี"} />
          <div class="mt-1 flex items-center justify-between border-t border-surface-gray pt-2">
            <span class="font-semibold text-ink">ยอดชำระทั้งหมด</span>
            <span class="text-lg font-bold text-brand-pink">{formatTHB(props.totals.total)}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

function SummaryRow(props: { label: string; value: string; accent?: boolean }) {
  return (
    <div class="flex justify-between gap-3">
      <span class="text-ink-gray">{props.label}</span>
      <span classList={{ "text-success": props.accent, "text-ink": !props.accent }}>{props.value}</span>
    </div>
  );
}

function TestCardsHint() {
  return (
    <details class="rounded-card border border-dashed border-ink-placeholder px-3 py-2 text-xs text-ink-gray">
      <summary class="cursor-pointer py-1">บัตรทดสอบ (Prototype)</summary>
      <ul class="mt-1 space-y-0.5 pb-1">
        <li>สำเร็จ: 4242 4242 4242 4242</li>
        <li>ถูกปฏิเสธ: 4000 0000 0000 0002</li>
        <li>วงเงินไม่พอ: 4000 0000 0000 9995</li>
        <li>วันหมดอายุในอนาคต · CVV 3 หลักใดก็ได้</li>
      </ul>
    </details>
  );
}

function MethodIcon(props: { id: PaymentMethodId; active: boolean }) {
  const cls = () => `size-6 ${props.active ? "text-brand-pink" : "text-ink-gray"}`;
  return (
    <svg viewBox="0 0 24 24" class={cls()} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      {props.id === "card" && (
        <>
          <rect x="2.5" y="5" width="19" height="14" rx="2" />
          <path d="M2.5 9.5h19M6 15h4" stroke-linecap="round" />
        </>
      )}
      {props.id === "promptpay" && (
        <>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <path d="M14 14h3v3h-3zM20 14v1M14 20h1M18 18h3v3" stroke-linecap="round" />
        </>
      )}
      {props.id === "cod" && (
        <>
          <rect x="2.5" y="6" width="19" height="12" rx="2" />
          <circle cx="12" cy="12" r="2.5" />
        </>
      )}
      {props.id === "installment" && (
        <>
          <rect x="3" y="4.5" width="18" height="16" rx="2" />
          <path d="M3 9h18M8 2.5v4M16 2.5v4M8 13h2M14 13h2M8 16.5h2" stroke-linecap="round" />
        </>
      )}
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" class="size-3.5 shrink-0" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
