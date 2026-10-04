import { createUniqueId, Show } from "solid-js";
import { TextField } from "../shared/TextField";
import visaMark from "~/assets/icons/payment/visa.svg";
import mastercardMark from "~/assets/icons/payment/mastercard.svg";
import { detectCardBrand, formatCardNumber, formatExpiry, isExpiryValid, passesLuhn, type CardBrand } from "~/lib/payment";

export type CardInput = { number: string; expiry: string; cvv: string; name: string };
export type CardErrors = Partial<Record<keyof CardInput, string>>;

export const EMPTY_CARD: CardInput = { number: "", expiry: "", cvv: "", name: "" };

/** Messages say what to fix. Mock input only — nothing here is stored or sent. */
export function validateCard(card: CardInput): CardErrors {
  const errors: CardErrors = {};
  const digits = card.number.replace(/\D/g, "");
  if (!digits) errors.number = "กรุณากรอกหมายเลขบัตร 16 หลัก";
  else if (digits.length < 15 || !passesLuhn(digits)) errors.number = "หมายเลขบัตรไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง";
  const expiry = isExpiryValid(card.expiry);
  if (!card.expiry) errors.expiry = "กรุณากรอกวันหมดอายุ";
  else if (expiry === "format") errors.expiry = "กรอกเป็น เดือน/ปี เช่น 08/28";
  else if (expiry === "past") errors.expiry = "บัตรใบนี้หมดอายุแล้ว";
  if (!card.cvv) errors.cvv = "กรุณากรอก CVV";
  else if (!/^\d{3,4}$/.test(card.cvv)) errors.cvv = "CVV คือเลข 3 หลักด้านหลังบัตร";
  if (!card.name.trim()) errors.name = "กรุณากรอกชื่อตามที่ปรากฏบนบัตร";
  return errors;
}

const BRAND_LABEL: Record<CardBrand, string> = { visa: "VISA", mastercard: "Mastercard", jcb: "JCB", amex: "AMEX", unknown: "" };
/** Same marks as the payment-method row; other brands fall back to a short text badge. */
const BRAND_MARK: Partial<Record<CardBrand, string>> = { visa: visaMark, mastercard: mastercardMark };

export function CardPaymentForm(props: {
  card: CardInput;
  onChange: (card: CardInput) => void;
  /** Shown once a field is left or on submit. */
  errors: CardErrors;
  onBlurField: (key: keyof CardInput) => void;
  disabled?: boolean;
}) {
  const id = createUniqueId();
  const set = (key: keyof CardInput, value: string) => props.onChange({ ...props.card, [key]: value });
  const brand = () => detectCardBrand(props.card.number.replace(/\D/g, ""));

  return (
    <div class="flex flex-col gap-4">
      <div class="relative">
        <TextField
          id={`${id}-number`}
          label="หมายเลขบัตร"
          required
          inputMode="numeric"
          autocomplete="cc-number"
          placeholder="1234 5678 9012 3456"
          maxlength={19}
          // Room for the brand badge only once a brand is detected — otherwise the placeholder would be cut off on phones.
          class={`tracking-wider ${brand() !== "unknown" ? "pr-16" : ""}`}
          disabled={props.disabled}
          value={props.card.number}
          onInput={(e) => set("number", formatCardNumber(e.currentTarget.value))}
          onBlur={() => props.onBlurField("number")}
          error={props.errors.number}
        />
        <Show when={brand() !== "unknown"}>
          <Show
            when={BRAND_MARK[brand()]}
            fallback={
              <span class="pointer-events-none absolute right-3 top-[38px] rounded-md border border-surface-gray bg-white px-1.5 py-0.5 text-xs font-bold text-ink" aria-hidden="true">
                {BRAND_LABEL[brand()]}
              </span>
            }
          >
            {(src) => <img src={src()} alt="" aria-hidden="true" class="pointer-events-none absolute right-3 top-[38px] h-5 w-auto rounded-[3px]" />}
          </Show>
        </Show>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <TextField
          id={`${id}-expiry`}
          label="วันหมดอายุ"
          required
          inputMode="numeric"
          autocomplete="cc-exp"
          placeholder="MM/YY"
          maxlength={5}
          disabled={props.disabled}
          value={props.card.expiry}
          onInput={(e) => set("expiry", formatExpiry(e.currentTarget.value))}
          onBlur={() => props.onBlurField("expiry")}
          error={props.errors.expiry}
        />
        <TextField
          id={`${id}-cvv`}
          label="CVV"
          required
          type="password"
          inputMode="numeric"
          autocomplete="cc-csc"
          placeholder="•••"
          maxlength={4}
          disabled={props.disabled}
          value={props.card.cvv}
          onInput={(e) => set("cvv", e.currentTarget.value.replace(/\D/g, ""))}
          onBlur={() => props.onBlurField("cvv")}
          error={props.errors.cvv}
        />
      </div>
      <TextField
        id={`${id}-name`}
        label="ชื่อบนบัตร"
        required
        autocomplete="cc-name"
        placeholder="CHARMISS SHOPPER"
        class="uppercase"
        disabled={props.disabled}
        value={props.card.name}
        onInput={(e) => set("name", e.currentTarget.value.toUpperCase())}
        onBlur={() => props.onBlurField("name")}
        error={props.errors.name}
      />
    </div>
  );
}
