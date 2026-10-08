import { For, Match, Show, Switch } from "solid-js";
import { getPaymentKind, PAYMENT_KIND_LABEL, type PaymentKind } from "~/lib/accountData";
import { MASTERCARD_ICON, PROMPTPAY_ICON, TRUEMONEY_ICON, VISA_ICON } from "~/components/checkout/paymentMarks";
import dhlLogo from "~/assets/icons/dhl-logo-circle.png";
import starGold from "~/assets/icons/star-gold-4.svg";

/**
 * Mobile banking is "โมบายล์แบงก์กิ้ง" (orders store the label text) — older orders' "โอนเงินผ่านแอปธนาคาร" /
 * "โมบายแบงก์กิ้ง" are matched too and printed with the current name.
 */
const resolvePaymentKind = (method: string): PaymentKind | undefined => (method.includes("แอปธนาคาร") || method.includes("แบงก์กิ้ง") ? "mobile_banking" : getPaymentKind(method));
const paymentKindLabel = (kind: PaymentKind) => (kind === "mobile_banking" ? "โมบายล์แบงก์กิ้ง" : PAYMENT_KIND_LABEL[kind]);

/** Payment method with its logo in front (same marks as Checkout's method tiles). Bank app and unknown methods: the label only, no logo. */
export function PaymentMethodLabel(props: { method: string }) {
  const kind = () => resolvePaymentKind(props.method);
  return (
    <span class="inline-flex items-center justify-end gap-2">
      <Switch>
        <Match when={kind() === "card"}>
          <span class="flex shrink-0 items-center gap-1" aria-hidden="true">
            <img src={VISA_ICON} alt="" class="size-5" />
            <img src={MASTERCARD_ICON} alt="" class="size-5" />
          </span>
        </Match>
        <Match when={kind() === "promptpay"}>
          <img src={PROMPTPAY_ICON} alt="" class="size-5 shrink-0" />
        </Match>
        <Match when={kind() === "truemoney"}>
          <img src={TRUEMONEY_ICON} alt="" class="size-5 shrink-0" />
        </Match>
      </Switch>
      <span>{kind() ? paymentKindLabel(kind()!) : props.method}</span>
    </span>
  );
}

/** "จัดส่งมาตรฐาน (DHL)" with DHL's circular mark in front. */
export function ShippingMethodLabel(props: { method: string }) {
  return (
    <span class="inline-flex items-center justify-end gap-2">
      <img src={dhlLogo} alt="" class="size-5 shrink-0" />
      <span>{props.method} (DHL)</span>
    </span>
  );
}

/** The shopper's own stars (same gold star as ReviewList); `rating` may be an average — rounded to whole stars, the number beside it keeps one decimal. */
export function ReviewStars(props: { rating: number; class?: string; showValue?: boolean }) {
  const rounded = () => Math.round(props.rating);
  const value = () => (Number.isInteger(props.rating) ? String(props.rating) : props.rating.toFixed(1));
  return (
    <span class="inline-flex items-center gap-1" role="img" aria-label={`ให้คะแนน ${value()} จาก 5 ดาว`}>
      <span class="flex gap-0.5" aria-hidden="true">
        <For each={[0, 1, 2, 3, 4]}>{(i) => <img src={starGold} alt="" class={props.class ?? "size-3.5"} classList={{ "opacity-25 grayscale": i >= rounded() }} />}</For>
      </span>
      <Show when={props.showValue}>
        <span aria-hidden="true">{value()}</span>
      </Show>
    </span>
  );
}

/** Cancel / return aren't self-serve — one note pointing to LINE Official instead. */
export function LineContactNote(props: { class?: string }) {
  return (
    <p class={`text-center text-sm text-ink-gray ${props.class ?? ""}`}>
      หากพบปัญหา ติดต่อ LINE Official:{" "}
      <a href="https://line.me/R/ti/p/@charmiss" target="_blank" rel="noopener noreferrer" class="font-medium text-brand-pink underline lg:hover:no-underline">
        @Charmiss Cosmetics
      </a>
    </p>
  );
}
