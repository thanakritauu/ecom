import { createEffect, createSignal, on, onCleanup, onMount } from "solid-js";
import { PAYMENT_METHODS, type PaymentMethodId } from "~/lib/cartSelectors";
import {
  clearBeamState,
  openBeamCheckout,
  parseBeamMessage,
  readBeamResult,
  takeBeamReturn,
  BEAM_RESULT_KEY,
  type BeamResultMessage,
  type PaymentFailureReason,
  type PaymentRequest,
} from "~/lib/payment";

export type PaidResult = { method: PaymentMethodId; methodLabel: string; reference: string; detail?: string; orderNumber: string; amount: number };

/**
 * Payment state for the one-page Checkout and the account pay-later page —
 * the form section (`PaymentSection`) and the mobile floating bar both
 * read/drive this, so there's one pay action.
 *
 * `pay()`: the page's own checks first (address, billing, stock —
 * `validateOrder`), then Beam's payment page opens in a new window
 * (synchronously, inside the click — popup blockers allow that; blocked →
 * same tab). This page waits for Beam's result (`postMessage` from the
 * window, or the localStorage fallback), then `onPaid` or the failed panel.
 */
export function createCheckoutPayment(opts: {
  amount: () => number;
  /** Reserved on the first pay attempt so a retried payment stays on the same order. */
  orderNumber: () => string;
  validateOrder: () => boolean;
  onPaid: (result: PaidResult) => void;
  /** This page's path — where Beam sends the shopper back in same-tab mode. */
  returnPath: () => string;
}) {
  const [method, setMethodRaw] = createSignal<PaymentMethodId>("card");
  const [phase, setPhase] = createSignal<"form" | "waiting" | "failed">("form");
  const [failure, setFailure] = createSignal<PaymentFailureReason>("cancelled");
  const [request, setRequest] = createSignal<PaymentRequest>();
  /** The Beam window was closed without a result (shopper closed it themselves). */
  const [windowClosed, setWindowClosed] = createSignal(false);
  let beamWindow: Window | null = null;

  const methodLabel = () => PAYMENT_METHODS.find((m) => m.id === method())!.label;
  const scrollToPayment = () => document.getElementById("payment-method-heading")?.scrollIntoView({ behavior: "smooth", block: "start" });

  const closeBeamWindow = () => {
    if (beamWindow && !beamWindow.closed) beamWindow.close();
    beamWindow = null;
  };

  const fail = (reason: PaymentFailureReason) => {
    closeBeamWindow();
    setFailure(reason);
    setPhase("failed");
    scrollToPayment();
  };

  const settle = (message: BeamResultMessage) => {
    const req = request();
    if (phase() !== "waiting" || !req || message.orderRef !== req.orderNumber) return;
    clearBeamState();
    beamWindow = null;
    const { result } = message;
    if (result.status === "succeeded")
      opts.onPaid({ method: req.method, methodLabel: methodLabel(), reference: result.reference, detail: result.detail, orderNumber: req.orderNumber, amount: req.amount });
    else fail(result.reason);
  };

  /** Opens (or re-opens) Beam for the current request — must run inside a click handler. */
  const openBeam = (req: PaymentRequest) => {
    setRequest(req);
    setWindowClosed(false);
    setPhase("waiting");
    beamWindow = openBeamCheckout(req, opts.returnPath());
    beamWindow?.focus();
  };

  const pay = () => {
    if (phase() === "waiting") return reopen();
    if (phase() !== "failed" && !opts.validateOrder()) return;
    // Same order on every attempt — also after a same-tab return, where the page's own reservation was lost.
    openBeam({ orderNumber: request()?.orderNumber ?? opts.orderNumber(), amount: opts.amount(), method: method() });
  };

  const reopen = () => {
    const req = request();
    if (req) openBeam(req);
  };

  const cancelWaiting = () => {
    closeBeamWindow();
    clearBeamState();
    setPhase("form");
  };

  const setMethod = (id: PaymentMethodId) => {
    if (phase() === "waiting") return;
    setMethodRaw(id);
    setPhase("form");
  };

  // Beam was opened for one amount — if the total changes (coupon/coins) while waiting, that payment is dropped.
  createEffect(on(opts.amount, () => phase() === "waiting" && cancelWaiting(), { defer: true }));

  onMount(() => {
    // Same-tab mode: back from Beam — pick up where the redirect left off.
    const back = takeBeamReturn(opts.returnPath());
    if (back) {
      setMethodRaw(back.pending.method);
      setRequest(back.pending);
      setPhase("waiting");
      if (back.message) settle(back.message);
    }

    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const m = parseBeamMessage(e.data);
      if (m) settle(m);
    };
    // Fallback channel: the Beam window's localStorage write fires `storage` here.
    const onStorage = (e: StorageEvent) => {
      if (e.key !== BEAM_RESULT_KEY || !e.newValue) return;
      const m = readBeamResult();
      if (m) settle(m);
    };
    const closedPoll = setInterval(() => {
      if (phase() === "waiting" && beamWindow?.closed) setWindowClosed(true);
    }, 1000);
    window.addEventListener("message", onMessage);
    window.addEventListener("storage", onStorage);
    onCleanup(() => {
      window.removeEventListener("message", onMessage);
      window.removeEventListener("storage", onStorage);
      clearInterval(closedPoll);
    });
  });

  return {
    method,
    setMethod,
    methodLabel,
    phase,
    failure,
    windowClosed,
    pay,
    reopen,
    cancelWaiting,
    /** Failed panel: open Beam again for the same order. */
    retry: pay,
    changeMethod: () => {
      setPhase("form");
      scrollToPayment();
    },
    ctaLabel: () => (phase() === "failed" ? "ลองอีกครั้ง" : phase() === "waiting" ? "เปิดหน้าชำระเงินอีกครั้ง" : "ชำระเงิน"),
    waiting: () => phase() === "waiting",
  };
}

export type CheckoutPayment = ReturnType<typeof createCheckoutPayment>;
