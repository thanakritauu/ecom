import { For, Show } from "solid-js";
import { TextField } from "../shared/TextField";
import { TAX_INVOICE_TYPE_LABEL, taxIdLabel, taxNameLabel, type TaxInvoiceType } from "~/lib/taxInvoice";

/** Checkout's form state; `headOffice` false = a branch (`branchNo` then required). */
export type TaxInvoiceDraft = { type: TaxInvoiceType; name: string; taxId: string; headOffice: boolean; branchNo: string; email: string };

export type TaxInvoiceErrors = { taxName?: string; taxId?: string; taxBranch?: string; taxEmail?: string };

export const emptyTaxInvoiceDraft = (name = ""): TaxInvoiceDraft => ({ type: "individual", name, taxId: "", headOffice: true, branchNo: "", email: "" });

const TYPES: TaxInvoiceType[] = ["individual", "company"];

/**
 * The buyer block of "ขอใบกำกับภาษี": บุคคลธรรมดา / นิติบุคคล, then the name
 * and the 13-digit number (plus สาขา for a company), and the email the
 * invoice is sent to. Radio cards use the
 * address picker's look: pink-tinted card + pink dot when chosen.
 */
export function TaxInvoiceFields(props: { value: TaxInvoiceDraft; onChange: (patch: Partial<TaxInvoiceDraft>) => void; errors: TaxInvoiceErrors }) {
  const digits = (v: string, max: number) => v.replace(/\D/g, "").slice(0, max);
  return (
    <div class="flex flex-col gap-4">
      <RadioCards
        label="ประเภทผู้ขอใบกำกับภาษี"
        options={TYPES.map((t) => ({ value: t, label: TAX_INVOICE_TYPE_LABEL[t] }))}
        value={props.value.type}
        onChange={(type) => props.onChange({ type })}
      />
      {/* Name and number side by side, like the address form's ชื่อ / นามสกุล row. */}
      <div class="grid grid-cols-2 items-start gap-3">
        <TextField
          label={taxNameLabel(props.value.type)}
          required
          autocomplete={props.value.type === "company" ? "organization" : "name"}
          value={props.value.name}
          onInput={(e) => props.onChange({ name: e.currentTarget.value })}
          error={props.errors.taxName}
        />
        <TextField
          label={taxIdLabel(props.value.type)}
          required
          inputMode="numeric"
          placeholder="13 หลัก"
          value={props.value.taxId}
          onInput={(e) => {
            const v = digits(e.currentTarget.value, 13);
            e.currentTarget.value = v;
            props.onChange({ taxId: v });
          }}
          error={props.errors.taxId}
        />
      </div>
      <Show when={props.value.type === "company"}>
        <RadioCards
          label="สาขา"
          options={[
            { value: "head", label: "สำนักงานใหญ่" },
            { value: "branch", label: "สาขา" },
          ]}
          value={props.value.headOffice ? "head" : "branch"}
          onChange={(v) => props.onChange({ headOffice: v === "head" })}
        />
        <Show when={!props.value.headOffice}>
          <TextField
            label="สาขาเลขที่"
            required
            inputMode="numeric"
            placeholder="เช่น 00001"
            value={props.value.branchNo}
            onInput={(e) => {
              const v = digits(e.currentTarget.value, 5);
              e.currentTarget.value = v;
              props.onChange({ branchNo: v });
            }}
            error={props.errors.taxBranch}
          />
        </Show>
      </Show>
      <div class="flex flex-col gap-1">
        <TextField
          label="อีเมลสำหรับรับใบกำกับภาษี"
          required
          type="email"
          inputMode="email"
          autocomplete="email"
          placeholder="name@example.com"
          value={props.value.email}
          onInput={(e) => props.onChange({ email: e.currentTarget.value })}
          error={props.errors.taxEmail}
        />
        <Show when={!props.errors.taxEmail}>
          <p class="text-xs text-ink-gray">ร้านจะส่งใบกำกับภาษีไปที่อีเมลนี้</p>
        </Show>
      </div>
    </div>
  );
}

function RadioCards<T extends string>(props: { label: string; options: { value: T; label: string }[]; value: T; onChange: (value: T) => void }) {
  return (
    <div class="flex flex-col gap-1.5">
      <span class="text-sm font-medium text-ink">{props.label}</span>
      <div role="radiogroup" aria-label={props.label} class="grid grid-cols-2 gap-3">
        <For each={props.options}>
          {(option) => {
            const selected = () => props.value === option.value;
            return (
              <button
                type="button"
                role="radio"
                aria-checked={selected()}
                onClick={() => props.onChange(option.value)}
                class="flex min-h-11 items-center gap-3 rounded-card border px-4 py-2.5 text-left text-sm font-normal text-ink transition-colors duration-150"
                classList={{
                  "border-transparent bg-surface-pink": selected(),
                  "border-surface-gray bg-white lg:hover:border-brand-pink/50": !selected(),
                }}
              >
                <span
                  class="flex size-5 shrink-0 items-center justify-center rounded-pill border"
                  classList={{ "border-brand-pink": selected(), "border-ink-placeholder": !selected() }}
                  aria-hidden="true"
                >
                  <Show when={selected()}>
                    <span class="size-3 rounded-pill bg-brand-pink" />
                  </Show>
                </span>
                {option.label}
              </button>
            );
          }}
        </For>
      </div>
    </div>
  );
}
