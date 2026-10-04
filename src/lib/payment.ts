import type { PaymentMethodId } from "./cartSelectors";

/**
 * Payment layer for the one-page Checkout (prototype) — card, PromptPay, TrueMoney Wallet.
 *
 * Checkout and the payment UI only talk to `PaymentProvider`; nothing
 * Beam-specific lives anywhere else. Today's provider is a mock: no Beam
 * API, no keys, no merchant id, no webhook, no verification. To go live,
 * implement `PaymentProvider` against Beam (charges/QR sessions created
 * server-side, card data tokenized by Beam's own client SDK — never by us)
 * and swap `getPaymentProvider()`'s return value.
 *
 * Card data: the UI hands the provider only a mock token + last 4 digits +
 * brand. Full card numbers/CVV live only in the form's in-memory signals
 * and are never stored or sent anywhere.
 */

export type PaymentRequest = {
  orderNumber: string;
  /** THB, from Checkout's own `computeCheckoutTotals` — never recomputed here. */
  amount: number;
  method: PaymentMethodId;
};

export type CardBrand = "visa" | "mastercard" | "jcb" | "amex" | "unknown";

export type CardToken = { token: string; last4: string; brand: CardBrand };

export type PaymentFailureReason = "card_declined" | "insufficient_funds" | "expired" | "wallet_failed" | "network_error";

export type PaymentResult =
  | { status: "succeeded"; reference: string; method: PaymentMethodId; detail?: string }
  | { status: "failed"; reason: PaymentFailureReason };

export type PromptPaySession = {
  id: string;
  /** Opaque string the QR encodes. Mock today — NOT a real PromptPay/EMV payload. */
  qrPayload: string;
  /** Epoch ms. */
  expiresAt: number;
};

export type PromptPayStatus = "pending" | "succeeded" | "expired";

export interface PaymentProvider {
  chargeCard(request: PaymentRequest, card: CardToken): Promise<PaymentResult>;
  createPromptPaySession(request: PaymentRequest): Promise<PromptPaySession>;
  getPromptPayStatus(sessionId: string): Promise<PromptPayStatus>;
  /** TrueMoney Wallet — the gateway sends a payment request to the wallet linked to this phone; resolves once the customer approves (or it fails/times out). */
  chargeTrueMoney(request: PaymentRequest, phone: string): Promise<PaymentResult>;
}

export const FAILURE_MESSAGES: Record<PaymentFailureReason, { title: string; body: string }> = {
  card_declined: { title: "ธนาคารปฏิเสธรายการ", body: "ลองตรวจสอบข้อมูลบัตรอีกครั้ง ใช้บัตรใบอื่น หรือเปลี่ยนเป็นช่องทางชำระเงินอื่น" },
  insufficient_funds: { title: "วงเงินหรือยอดเงินไม่เพียงพอ", body: "กรุณาใช้บัตรใบอื่นหรือเปลี่ยนเป็นช่องทางชำระเงินอื่น" },
  expired: { title: "QR Code หมดอายุแล้ว", body: "รายการยังไม่ถูกเรียกเก็บเงิน กดลองอีกครั้งเพื่อสร้าง QR ใหม่" },
  wallet_failed: { title: "TrueMoney Wallet ชำระไม่สำเร็จ", body: "ยอดเงินใน Wallet อาจไม่พอ หรือคำขอชำระหมดเวลา ลองอีกครั้งหรือเปลี่ยนช่องทางชำระเงิน" },
  network_error: { title: "การเชื่อมต่อขัดข้อง", body: "ยังไม่มีการเรียกเก็บเงิน กรุณาลองอีกครั้งในอีกสักครู่" },
};

// ---------------------------------------------------------------------------
// Mock provider (prototype only)
// ---------------------------------------------------------------------------

/** Test cards for UX review — same idea as a gateway's sandbox test numbers. */
export const MOCK_TEST_CARDS = {
  success: "4242 4242 4242 4242",
  declined: "4000 0000 0000 0002",
  insufficientFunds: "4000 0000 0000 9995",
} as const;

/** TrueMoney test numbers: any valid mobile number succeeds; one ending in 0000 fails. */
export const MOCK_TRUEMONEY_FAIL_SUFFIX = "0000";

export type MockPaymentOptions = {
  /** Forces every payment to fail (`?mockPayment=fail`). */
  forceFail?: boolean;
  /** Short QR lifetime to review the expired state (`?mockPayment=expire`). */
  shortQrExpiry?: boolean;
};

export type MockPaymentProvider = PaymentProvider;

/** Mock only: a PromptPay QR counts as "scanned and paid" this long after it's created (no on-screen test control). */
const MOCK_PROMPTPAY_AUTO_PAID_MS = 8000;

export function createMockPaymentProvider(opts: MockPaymentOptions = {}): MockPaymentProvider {
  const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
  const ref = () => `MOCK-${Date.now().toString(36).toUpperCase()}`;
  const sessions = new Map<string, { expiresAt: number; paidAt: number }>();

  return {
    async chargeCard(request, card) {
      await delay(1800);
      if (opts.forceFail || card.token.endsWith("0002")) return { status: "failed", reason: "card_declined" };
      if (card.token.endsWith("9995")) return { status: "failed", reason: "insufficient_funds" };
      return { status: "succeeded", reference: ref(), method: request.method, detail: `${card.brand.toUpperCase()} •••• ${card.last4}` };
    },
    async createPromptPaySession(request) {
      await delay(600);
      const id = `pp_${Date.now().toString(36)}`;
      const expiresAt = Date.now() + (opts.shortQrExpiry ? 20_000 : 10 * 60_000);
      sessions.set(id, { expiresAt, paidAt: Date.now() + MOCK_PROMPTPAY_AUTO_PAID_MS });
      return { id, expiresAt, qrPayload: `MOCK|CHARMISS|${request.orderNumber}|${request.amount.toFixed(2)}` };
    },
    async getPromptPayStatus(sessionId) {
      const s = sessions.get(sessionId);
      if (!s) return "expired";
      if (Date.now() >= s.expiresAt) return "expired";
      if (opts.shortQrExpiry) return "pending"; // `?mockPayment=expire`: let the QR run out
      if (Date.now() >= s.paidAt) return opts.forceFail ? "expired" : "succeeded";
      return "pending";
    },
    async chargeTrueMoney(request, phone) {
      await delay(2200);
      const digits = phone.replace(/\D/g, "");
      if (opts.forceFail || digits.endsWith(MOCK_TRUEMONEY_FAIL_SUFFIX)) return { status: "failed", reason: "wallet_failed" };
      return { status: "succeeded", reference: ref(), method: request.method, detail: `TrueMoney •••• ${digits.slice(-4)}` };
    },
  };
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
