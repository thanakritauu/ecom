import type { PaymentMethodId } from "./cartSelectors";

/**
 * Payment layer for the one-page Checkout (prototype) — card, PromptPay, TrueMoney Wallet.
 *
 * Payment is a hosted redirect: Checkout (and the account pay-later page)
 * only picks a method, then opens Beam's payment page in a new window with
 * the order ref, amount and method. Beam collects the card / shows the
 * PromptPay QR / asks for the TrueMoney wallet — none of that is on our
 * pages — and reports the result back. Today that page is our own mock
 * (`/payment/beam`): no Beam API, no keys, no merchant id, no webhook, no
 * verification. To go live, create the Beam checkout session server-side,
 * open its URL instead of `beamCheckoutUrl()`, and confirm the result from
 * Beam's webhook — never from the browser message alone.
 *
 * Card data never touches the storefront. (The card helpers at the bottom
 * are only for the account "saved cards" page's mock vault.)
 */

export type PaymentRequest = {
  orderNumber: string;
  /** THB, from Checkout's own `computeCheckoutTotals` — never recomputed here. */
  amount: number;
  method: PaymentMethodId;
};

export type CardBrand = "visa" | "mastercard" | "jcb" | "amex" | "unknown";

export type CardToken = { token: string; last4: string; brand: CardBrand };

export type PaymentFailureReason = "card_declined" | "insufficient_funds" | "expired" | "wallet_failed" | "network_error" | "cancelled";

export type PaymentResult =
  | { status: "succeeded"; reference: string; method: PaymentMethodId; detail?: string }
  | { status: "failed"; reason: PaymentFailureReason };

export const FAILURE_MESSAGES: Record<PaymentFailureReason, { title: string; body: string }> = {
  card_declined: { title: "ธนาคารปฏิเสธรายการ", body: "ลองตรวจสอบข้อมูลบัตรอีกครั้ง ใช้บัตรใบอื่น หรือเปลี่ยนเป็นช่องทางชำระเงินอื่น" },
  insufficient_funds: { title: "วงเงินหรือยอดเงินไม่เพียงพอ", body: "กรุณาใช้บัตรใบอื่นหรือเปลี่ยนเป็นช่องทางชำระเงินอื่น" },
  expired: { title: "QR Code หมดอายุแล้ว", body: "รายการยังไม่ถูกเรียกเก็บเงิน กดลองอีกครั้งเพื่อสร้าง QR ใหม่" },
  wallet_failed: { title: "TrueMoney Wallet ชำระไม่สำเร็จ", body: "ยอดเงินใน Wallet อาจไม่พอ หรือคำขอชำระหมดเวลา ลองอีกครั้งหรือเปลี่ยนช่องทางชำระเงิน" },
  network_error: { title: "การเชื่อมต่อขัดข้อง", body: "ยังไม่มีการเรียกเก็บเงิน กรุณาลองอีกครั้งในอีกสักครู่" },
  cancelled: { title: "ยกเลิกการชำระเงินแล้ว", body: "ยังไม่มีการเรียกเก็บเงิน กดลองอีกครั้งเพื่อเปิดหน้าชำระเงินของ Beam ใหม่ หรือเปลี่ยนช่องทางชำระเงิน" },
};

// ---------------------------------------------------------------------------
// Beam hosted payment page (mock today — `/payment/beam`)
// ---------------------------------------------------------------------------

/** `postMessage` type the Beam page sends its opener. */
export const BEAM_RESULT_TYPE = "charmiss:beam-result";
/** localStorage — same message, for same-tab mode (popup blocked) and if the opener lost its reference. */
export const BEAM_RESULT_KEY = "charmiss:beam-result";
/** sessionStorage — the payment a same-tab redirect left to pick up on return. */
const BEAM_PENDING_KEY = "charmiss:beam-pending";
const BEAM_WINDOW_NAME = "charmiss-beam";

export type BeamResultMessage = { type: typeof BEAM_RESULT_TYPE; orderRef: string; result: PaymentResult };
export type BeamPending = PaymentRequest & { returnPath: string };

/** Only order ref, amount, method and where to come back to — never anything personal. */
export function beamCheckoutUrl(request: PaymentRequest, returnPath: string): string {
  const q = new URLSearchParams({ ref: request.orderNumber, amount: request.amount.toFixed(2), method: request.method, return: returnPath });
  return `/payment/beam?${q}`;
}

/** Same-origin relative path only, so `?return=` can't send the shopper anywhere else. */
export const safeReturnPath = (path: string | undefined) => (path && path.startsWith("/") && !path.startsWith("//") ? path : "/checkout");

/**
 * Opens Beam in a new window — call it synchronously inside the click
 * handler, or popup blockers stop it. Blocked → same-tab navigation; the
 * pending payment is kept so the page can pick the result up on return.
 * Returns the window (popup mode) or `null` (navigating away).
 */
export function openBeamCheckout(request: PaymentRequest, returnPath: string): Window | null {
  const url = beamCheckoutUrl(request, returnPath);
  try {
    localStorage.removeItem(BEAM_RESULT_KEY);
  } catch {
    /* storage blocked — postMessage still works */
  }
  // No `noopener`: Beam's page needs `window.opener` to post the result back.
  const win = window.open(url, BEAM_WINDOW_NAME, "popup,width=480,height=760");
  if (win) return win;
  try {
    sessionStorage.setItem(BEAM_PENDING_KEY, JSON.stringify({ ...request, returnPath } satisfies BeamPending));
  } catch {
    /* without storage the result can't be picked up — the shopper retries */
  }
  window.location.assign(url);
  return null;
}

export function parseBeamMessage(data: unknown): BeamResultMessage | undefined {
  const m = data as BeamResultMessage | null;
  return m && typeof m === "object" && m.type === BEAM_RESULT_TYPE && typeof m.orderRef === "string" && m.result ? m : undefined;
}

export function readBeamResult(): BeamResultMessage | undefined {
  try {
    const raw = localStorage.getItem(BEAM_RESULT_KEY);
    return raw ? parseBeamMessage(JSON.parse(raw)) : undefined;
  } catch {
    return undefined;
  }
}

/** Same-tab return: the pending payment for this page (if any) and its result (if Beam already answered). */
export function takeBeamReturn(returnPath: string): { pending: BeamPending; message?: BeamResultMessage } | undefined {
  let pending: BeamPending | undefined;
  try {
    const raw = sessionStorage.getItem(BEAM_PENDING_KEY);
    pending = raw ? (JSON.parse(raw) as BeamPending) : undefined;
  } catch {
    return undefined;
  }
  if (!pending || pending.returnPath !== returnPath) return undefined;
  const message = readBeamResult();
  return { pending, message: message?.orderRef === pending.orderNumber ? message : undefined };
}

export function clearBeamState() {
  try {
    localStorage.removeItem(BEAM_RESULT_KEY);
    sessionStorage.removeItem(BEAM_PENDING_KEY);
  } catch {
    /* nothing to clear */
  }
}

/** Beam page side: localStorage first (fallback), then the opener if there is one. Returns whether it went to an opener. */
export function reportBeamResult(message: BeamResultMessage): boolean {
  try {
    localStorage.setItem(BEAM_RESULT_KEY, JSON.stringify(message));
  } catch {
    /* opener message below still carries it */
  }
  const opener = window.opener as Window | null;
  if (!opener || opener.closed) return false;
  opener.postMessage(message, window.location.origin);
  return true;
}

/** Mock tokenization — stands in for the gateway SDK. Keeps only last 4 + brand; the token is NOT derived from the full number. */
export function mockTokenizeCard(cardNumber: string): CardToken {
  const digits = cardNumber.replace(/\D/g, "");
  const last4 = digits.slice(-4);
  return { token: `mock_tok_${Math.random().toString(36).slice(2, 10)}_${last4}`, last4, brand: detectCardBrand(digits) };
}

// ---------------------------------------------------------------------------
// Card helpers (formatting + validation only)
// ---------------------------------------------------------------------------

export function detectCardBrand(digits: string): CardBrand {
  if (/^4/.test(digits)) return "visa";
  if (/^(5[1-5]|2[2-7])/.test(digits)) return "mastercard";
  if (/^35/.test(digits)) return "jcb";
  if (/^3[47]/.test(digits)) return "amex";
  return "unknown";
}

export const formatCardNumber = (value: string) =>
  value
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, "$1 ");

export function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}

/** Luhn checksum — catches typos before "submitting". */
export function passesLuhn(digits: string): boolean {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return digits.length > 0 && sum % 10 === 0;
}

export function isExpiryValid(expiry: string, now = new Date()): "ok" | "format" | "past" {
  const m = /^(\d{2})\/(\d{2})$/.exec(expiry);
  if (!m) return "format";
  const month = Number(m[1]);
  if (month < 1 || month > 12) return "format";
  const endOfMonth = new Date(2000 + Number(m[2]), month, 1);
  return endOfMonth > now ? "ok" : "past";
}
