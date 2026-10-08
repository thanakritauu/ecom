import type { PaymentMethodId } from "~/lib/cartSelectors";
import promptPaySquare from "~/assets/icons/payment/square/promptpay.png";
import trueMoneySquare from "~/assets/icons/payment/square/truemoney.png";
import visaSquare from "~/assets/icons/payment/square/visa.png";
import mastercardSquare from "~/assets/icons/payment/square/mastercard.png";
import ktbLogo from "~/assets/icons/payment/square/ktb.png";
import scbLogo from "~/assets/icons/payment/square/scb.png";
import krungsriLogo from "~/assets/icons/payment/square/krungsri.png";
import kplusLogo from "~/assets/icons/payment/square/kplus.png";
import makeLogo from "~/assets/icons/payment/square/make.png";

/**
 * Square payment-app icons (Checkout tiles, Beam page, order meta) — the official
 * 80×80 files provided by the client, rounded corners already baked in (no extra
 * `rounded-*` needed). The bank-app method has no icon of its own — its supported banks stand for it.
 */
export const PROMPTPAY_ICON = promptPaySquare;
export const TRUEMONEY_ICON = trueMoneySquare;
export const VISA_ICON = visaSquare;
export const MASTERCARD_ICON = mastercardSquare;

/** Banks shown with "โมบายล์แบงก์กิ้ง" — display order. `name` is the alt/tooltip text. */
export const PAYMENT_BANKS = [
  { id: "ktb", name: "KTB", src: ktbLogo },
  { id: "scb", name: "SCB EASY", src: scbLogo },
  { id: "krungsri", name: "KMA-Krungsri", src: krungsriLogo },
  { id: "kplus", name: "K PLUS", src: kplusLogo },
  { id: "make", name: "MAKE by KBank", src: makeLogo },
] as const;

/** Each method's square icon(s), in display order — card shows Visa + Mastercard; bank app = its banks' icons (the Checkout tile prints those under its label instead). */
export const METHOD_ICONS: Record<PaymentMethodId, readonly string[]> = {
  promptpay: [promptPaySquare],
  mobilebanking: PAYMENT_BANKS.map((b) => b.src),
  card: [visaSquare, mastercardSquare],
  truemoney: [trueMoneySquare],
};
