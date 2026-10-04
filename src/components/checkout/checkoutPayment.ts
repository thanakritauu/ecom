import { createEffect, createSignal, on, onCleanup } from "solid-js";
import { PAYMENT_METHODS, type PaymentMethodId } from "~/lib/cartSelectors";
import { mockTokenizeCard, type MockPaymentProvider, type PaymentFailureReason, type PaymentProvider, type PromptPaySession } from "~/lib/payment";
import { PHONE_PATTERN } from "~/lib/validators";
import { EMPTY_CARD, validateCard, type CardErrors, type CardInput } from "../payment/CardPaymentForm";

export type PaidResult = { method: PaymentMethodId; methodLabel: string; reference: string; detail?: string };

/**
 * Payment state for the one-page Checkout — the form section (`PaymentSection`)
 * and the mobile floating bar both read/drive this, so there's one pay action.
 *
 * `pay()`: Checkout's own checks first (address, billing, stock — `validateOrder`),
 * then the chosen method:
 * - card → validate fields → charge
 * - PromptPay → first press creates the QR (shown in the form); the order
 *   completes when the (mock) bank confirms; pressing again = "ฉันชำระเงินแล้ว"
 * - TrueMoney → validate the wallet phone → request → customer approves in-app
 * All money calls go through `PaymentProvider` (mock today).
 */
export function createCheckoutPayment(opts: {
  provider: PaymentProvider | MockPaymentProvider;
  amount: () => number;
  /** Reserved on the first pay attempt so a retried payment stays on the same order. */
  orderNumber: () => string;
  validateOrder: () => boolean;
  onPaid: (result: PaidResult) => void;
}) {
  const [method, setMethodRaw] = createSignal<PaymentMethodId>("card");
  const [phase, setPhase] = createSignal<"form" | "processing" | "failed">("form");
  const [failure, setFailure] = createSignal<PaymentFailureReason>("card_declined");

  // Card
  const [card, setCard] = createSignal<CardInput>(EMPTY_CARD);
  const [cardTouched, setCardTouched] = createSignal<Partial<Record<keyof CardInput, boolean>>>({});
  const [submitted, setSubmitted] = createSignal(false);
  const cardErrors = (): CardErrors => {
    const all = validateCard(card());
    return Object.fromEntries(Object.entries(all).filter(([k]) => submitted() || cardTouched()[k as keyof CardInput])) as CardErrors;
  };

  // TrueMoney
  const [walletPhone, setWalletPhone] = createSignal("");
  const [walletTouched, setWalletTouched] = createSignal(false);
  const walletErrorRaw = () => {
    const v = walletPhone().trim();
    if (!v) return "กรุณากรอกเบอร์มือถือที่ผูกกับ TrueMoney Wallet";
    return PHONE_PATTERN.test(v) ? undefined : "เบอร์มือถือต้องเป็นตัวเลข 10 หลัก ขึ้นต้นด้วย 0 เช่น 081-234-5678";
  };
  const walletError = () => (submitted() || walletTouched() ? walletErrorRaw() : undefined);

  // PromptPay
  const [ppSession, setPpSession] = createSignal<PromptPaySession>();
  const [ppStatus, setPpStatus] = createSignal<"idle" | "creating" | "pending" | "confirming">("idle");
  const [now, setNow] = createSignal(Date.now());
  const [notPaidHint, setNotPaidHint] = createSignal(false);
  const secondsLeft = () => Math.ceil(((ppSession()?.expiresAt ?? now()) - now()) / 1000);
  const resetPromptPay = () => {
    setPpSession(undefined);
    setPpStatus("idle");
    setNotPaidHint(false);
  };

  const methodLabel = () => PAYMENT_METHODS.find((m) => m.id === method())!.label;
  const request = () => ({ orderNumber: opts.orderNumber(), amount: opts.amount(), method: method() });
  const scrollToPayment = () => document.getElementById("payment-method-heading")?.scrollIntoView({ behavior: "smooth", block: "start" });

  const fail = (reason: PaymentFailureReason) => {
    setFailure(reason);
    setPhase("failed");
    resetPromptPay();
    scrollToPayment();
  };

  const setMethod = (id: PaymentMethodId) => {
    if (phase() === "processing") return;
    setMethodRaw(id);
    setSubmitted(false);
    setPhase("form");
    resetPromptPay();
  };

  // A QR is for one amount — if the total changes (coupon/coins), it's discarded and re-created on the next press.
  createEffect(on(opts.amount, () => ppSession() && resetPromptPay(), { defer: true }));

  const startPromptPay = async () => {
    setPpStatus("creating");
    try {
      const session = await opts.provider.createPromptPaySession(request());
      setNow(Date.now()); // the clock only ticks while a QR shows — sync it first so the countdown starts at the real time left
      setPpSession(session);
      setPpStatus("pending");
    } catch {
      fail("network_error");
    }
  };

  const checkPromptPay = async (manual = false) => {
    const session = ppSession();
    if (!session || ppStatus() !== "pending") return;
    const status = await opts.provider.getPromptPayStatus(session.id);
    if (status === "succeeded") {
      setPpStatus("confirming");
      setTimeout(() => opts.onPaid({ method: "promptpay", methodLabel: methodLabel(), reference: session.id }), 1200);
    } else if (status === "expired") fail("expired");
    else if (manual) setNotPaidHint(true);
  };

  // While a QR is showing: tick the countdown and poll for the payment.
  createEffect(
    on(ppSession, (session) => {
      if (!session) return;
      const tick = setInterval(() => setNow(Date.now()), 1000);
      const poll = setInterval(() => void checkPromptPay(), 2500);
      onCleanup(() => {
        clearInterval(tick);
        clearInterval(poll);
      });
    }),
  );
  createEffect(() => {
    if (ppStatus() === "pending" && ppSession() && secondsLeft() <= 0) fail("expired");
  });

  const settle = (result: Awaited<ReturnType<PaymentProvider["chargeCard"]>>) => {
    if (result.status === "succeeded") opts.onPaid({ method: method(), methodLabel: methodLabel(), reference: result.reference, detail: result.detail });
    else fail(result.reason);
  };

  const retry = () => {
    // Card details stay except CVV (re-entered, as on real gateways).
    setCard((c) => ({ ...c, cvv: "" }));
    setCardTouched((t) => ({ ...t, cvv: false }));
    setSubmitted(false);
    setPhase("form");
  };

  const pay = async () => {
    if (phase() === "processing" || ppStatus() === "creating" || ppStatus() === "confirming") return;
    if (phase() === "failed") return retry();
    if (method() === "promptpay" && ppStatus() === "pending") return void checkPromptPay(true);
    if (!opts.validateOrder()) return;

    setSubmitted(true);
    if (method() === "card") {
      if (Object.keys(validateCard(card())).length > 0) return scrollToPayment();
      setPhase("processing");
      try {
        settle(await opts.provider.chargeCard(request(), mockTokenizeCard(card().number)));
      } catch {
        fail("network_error");
      }
    } else if (method() === "truemoney") {
      if (walletErrorRaw()) return scrollToPayment();
      setPhase("processing");
      try {
        settle(await opts.provider.chargeTrueMoney(request(), walletPhone()));
      } catch {
        fail("network_error");
      }
    } else {
      await startPromptPay();
    }
  };

  const ctaLabel = () => {
    if (phase() === "failed") return "ลองอีกครั้ง";
    if (method() === "promptpay" && ppStatus() === "pending") return "ฉันชำระเงินแล้ว";
    return "ชำระเงิน";
  };
  const ctaLoadingLabel = () => (method() === "truemoney" ? "รอยืนยันในแอป TrueMoney..." : "กำลังชำระเงิน...");
  const busy = () => phase() === "processing" || ppStatus() === "creating" || ppStatus() === "confirming";

  return {
    method,
    setMethod,
    methodLabel,
    phase,
    failure,
    card,
    setCard,
    cardErrors,
    touchCard: (k: keyof CardInput) => setCardTouched((t) => ({ ...t, [k]: true })),
    walletPhone,
    setWalletPhone,
    walletError,
    touchWallet: () => setWalletTouched(true),
    ppSession,
    ppStatus,
    secondsLeft,
    notPaidHint,
    pay,
    retry,
    changeMethod: () => {
      setPhase("form");
      setSubmitted(false);
      scrollToPayment();
    },
    ctaLabel,
    ctaLoadingLabel,
    busy,
  };
}

export type CheckoutPayment = ReturnType<typeof createCheckoutPayment>;
