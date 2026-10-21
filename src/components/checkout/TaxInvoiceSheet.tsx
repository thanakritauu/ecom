import { createEffect, createSignal, For, on, Show } from "solid-js";
import { SheetModal } from "../shared/SheetModal";
import { Button } from "../shared/Button";
import { AddressSection } from "./AddressSection";
import { draftFromTaxBuyer, emptyTaxInvoiceDraft, TaxInvoiceFields, TaxInvoiceSummary, taxBuyerFromDraft, validateTaxInvoiceDraft, type TaxInvoiceDraft, type TaxInvoiceErrors } from "./TaxInvoiceFields";
import { formatAddress, type Address } from "~/lib/checkoutData";
import { newTaxInvoiceProfileId, type TaxInvoiceProfile } from "~/lib/taxInvoiceProfiles";

export type TaxInvoiceSheetView = { kind: "list" } | { kind: "form"; editing?: TaxInvoiceProfile };

/**
 * Checkout's tax invoice popup (shared `SheetModal`). "list": the details used
 * before, tap one to use it (each with its own "แก้ไข"), plus
 * "+ เพิ่มข้อมูลใบกำกับภาษี". "form": ประเภท, ชื่อ, เลข 13 หลัก, สาขา,
 * อีเมล and ที่อยู่ออกใบกำกับภาษี (same as shipping, or a saved / new
 * address); บันทึก saves it to the list and picks it.
 */
export function TaxInvoiceSheet(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Where the popup opens: the list, or straight into a new / existing entry's form. */
  view: TaxInvoiceSheetView;
  profiles: TaxInvoiceProfile[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onSave: (profile: TaxInvoiceProfile) => void;
  addresses: Address[];
  shippingAddress?: Address;
  onSaveAddress: (address: Address, opts: { makeDefault: boolean }) => Promise<Address>;
  accountEmail: string;
}) {
  const [view, setView] = createSignal<TaxInvoiceSheetView>(props.view);
  const [draft, setDraft] = createSignal<TaxInvoiceDraft>(emptyTaxInvoiceDraft());
  const [sameAsShipping, setSameAsShipping] = createSignal(true);
  const [pickedAddressId, setPickedAddressId] = createSignal<string | undefined>();
  const [addressFormOpen, setAddressFormOpen] = createSignal(false);
  const [errors, setErrors] = createSignal<TaxInvoiceErrors & { address?: string }>({});
  let validateAddressForm: (() => boolean) | undefined;

  const openForm = (editing?: TaxInvoiceProfile) => {
    setErrors({});
    setAddressFormOpen(false);
    if (editing) {
      setDraft(draftFromTaxBuyer(editing));
      const saved = editing.addressId && props.addresses.some((a) => a.id === editing.addressId) ? editing.addressId : undefined;
      setSameAsShipping(!saved);
      setPickedAddressId(saved);
    } else {
      // New: a บุคคลธรรมดา usually bills themself, so start from the recipient's name and the account email.
      setDraft({ ...emptyTaxInvoiceDraft(props.shippingAddress?.recipientName ?? ""), email: props.accountEmail });
      setSameAsShipping(true);
      setPickedAddressId(undefined);
    }
    setView({ kind: "form", editing });
  };

  // Each opening starts where Checkout asked (list, or a form).
  createEffect(
    on(
      () => props.open,
      (isOpen) => {
        if (!isOpen) return;
        if (props.view.kind === "form") openForm(props.view.editing);
        else setView({ kind: "list" });
      },
    ),
  );

  const editing = () => {
    const v = view();
    return v.kind === "form" ? v.editing : undefined;
  };

  const edit = (patch: Partial<TaxInvoiceDraft>) => {
    const current = draft();
    // A company's invoice needs its registered address, often not where the parcel goes: นิติบุคคล starts with
    // "ใช้ที่อยู่เดียวกับที่อยู่จัดส่ง" unticked (still tickable), บุคคลธรรมดา ticked. The recipient's name fits a person only.
    if (patch.type && patch.type !== current.type) {
      setSameAsShipping(patch.type === "individual");
      const recipient = props.shippingAddress?.recipientName ?? "";
      if (patch.name === undefined) {
        if (patch.type === "company" && current.name === recipient) patch = { ...patch, name: "" };
        if (patch.type === "individual" && !current.name) patch = { ...patch, name: recipient };
      }
      setErrors({});
    }
    setDraft({ ...current, ...patch });
    setErrors(({ taxName, taxId, taxBranch, taxEmail, ...rest }) => ({
      ...rest,
      ...(patch.name === undefined && taxName ? { taxName } : {}),
      ...(patch.taxId === undefined && taxId ? { taxId } : {}),
      ...(patch.branchNo === undefined && patch.headOffice === undefined && taxBranch ? { taxBranch } : {}),
      ...(patch.email === undefined && taxEmail ? { taxEmail } : {}),
    }));
  };

  // "+ เพิ่มที่อยู่ใหม่" starts from the shipping address (a company's name in place of the recipient's).
  const addressPrefill = () => {
    const a = props.shippingAddress;
    if (!a) return undefined;
    const { id, label, isDefault, kind, ...fields } = a;
    return draft().type === "company" && draft().name.trim() ? { ...fields, recipientName: draft().name.trim() } : fields;
  };

  const save = () => {
    const e: TaxInvoiceErrors & { address?: string } = validateTaxInvoiceDraft(draft());
    if (!sameAsShipping()) {
      if (addressFormOpen()) e.address = validateAddressForm?.() ? 'กรุณากดบันทึกที่อยู่ หรือเลือก "ใช้ที่อยู่เดียวกับที่อยู่จัดส่ง"' : "กรุณากรอกที่อยู่ให้ครบตามช่องที่แจ้งไว้";
      else if (!pickedAddressId()) e.address = "กรุณาเลือกหรือเพิ่มที่อยู่ออกใบกำกับภาษี";
    }
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    props.onSave({
      ...taxBuyerFromDraft(draft()),
      id: editing()?.id ?? newTaxInvoiceProfileId(),
      addressId: sameAsShipping() ? undefined : pickedAddressId(),
      lastUsedAt: new Date().toISOString(),
    });
    props.onOpenChange(false);
  };

  const backFromForm = () => (props.profiles.length > 0 ? setView({ kind: "list" }) : props.onOpenChange(false));

  const addressOf = (p: TaxInvoiceProfile) => props.addresses.find((a) => a.id === p.addressId) ?? props.shippingAddress;

  return (
    <SheetModal
      open={props.open}
      onOpenChange={props.onOpenChange}
      title={view().kind === "list" ? "ข้อมูลใบกำกับภาษี" : editing() ? "แก้ไขข้อมูลใบกำกับภาษี" : "เพิ่มข้อมูลใบกำกับภาษี"}
      footer={
        <Show
          when={view().kind === "form"}
          fallback={
            <Button type="button" variant="outline" size="lg" class="w-full" onClick={() => openForm()}>
              + เพิ่มข้อมูลใบกำกับภาษี
            </Button>
          }
        >
          <div class="flex flex-col gap-2 sm:flex-row-reverse">
            <Button type="button" variant="primary" size="lg" class="w-full sm:flex-1" onClick={save}>
              บันทึก
            </Button>
            <Button type="button" variant="outline" size="lg" class="w-full sm:flex-1" onClick={backFromForm}>
              ยกเลิก
            </Button>
          </div>
        </Show>
      }
    >
      <Show
        when={view().kind === "form"}
        fallback={
          <div role="radiogroup" aria-label="ข้อมูลใบกำกับภาษี" class="flex flex-col gap-3">
            <For each={props.profiles}>
              {(p) => {
                const selected = () => props.selectedId === p.id;
                return (
                  <div
                    class="flex w-full items-start gap-3 rounded-card border p-4 transition-colors duration-150"
                    classList={{ "border-transparent bg-surface-pink": selected(), "border-surface-gray bg-white lg:hover:border-brand-pink/50": !selected() }}
                  >
                    <button
                      type="button"
                      role="radio"
                      aria-checked={selected()}
                      onClick={() => {
                        props.onSelect(p.id);
                        props.onOpenChange(false);
                      }}
                      class="flex min-w-0 flex-1 items-start gap-3 text-left text-sm font-normal"
                    >
                      <span
                        class="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-pill border"
                        classList={{ "border-brand-pink": selected(), "border-ink-placeholder": !selected() }}
                        aria-hidden="true"
                      >
                        <Show when={selected()}>
                          <span class="size-3 rounded-pill bg-brand-pink" />
                        </Show>
                      </span>
                      <TaxInvoiceSummary profile={p} address={addressOf(p)} />
                    </button>
                    <button type="button" onClick={() => openForm(p)} class="min-h-6 shrink-0 text-xs font-medium text-brand-pink underline" aria-label={`แก้ไข ${p.name}`}>
                      แก้ไข
                    </button>
                  </div>
                );
              }}
            </For>
          </div>
        }
      >
        <TaxInvoiceFields value={draft()} onChange={edit} errors={errors()} />
        <div class="flex flex-col">
          <p id="tax-invoice-address-heading" class="text-sm font-medium text-ink">
            ที่อยู่ออกใบกำกับภาษี
          </p>
          <label class="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-ink">
            <input
              type="checkbox"
              checked={sameAsShipping()}
              onChange={(e) => {
                setSameAsShipping(e.currentTarget.checked);
                setErrors(({ address, ...rest }) => rest);
              }}
              class="size-5 shrink-0 rounded accent-brand-pink"
            />
            ใช้ที่อยู่เดียวกับที่อยู่จัดส่ง
          </label>
          <Show
            when={!sameAsShipping()}
            fallback={
              <Show when={props.shippingAddress}>{(a) => <p class="rounded-card bg-surface-gray/60 px-4 py-3 text-sm text-ink">{formatAddress(a())}</p>}</Show>
            }
          >
            <div class="mt-2">
              <AddressSection
                embedded
                headingId="tax-invoice-address-heading"
                title="เลือกที่อยู่ออกใบกำกับภาษี"
                emptyTitle="เพิ่มที่อยู่ออกใบกำกับภาษี"
                newAddressLabel="ที่อยู่ออกใบกำกับภาษี"
                // บุคคลธรรมดา: plain ชื่อ + นามสกุล; only นิติบุคคล gets "ชื่อ หรือชื่อบริษัท".
                companyAllowed={draft().type === "company"}
                kind="billing"
                prefill={addressPrefill()}
                addresses={props.addresses}
                selectedId={pickedAddressId()}
                onSelect={(id) => {
                  setPickedAddressId(id);
                  setErrors(({ address, ...rest }) => rest);
                }}
                onSave={(address, opts) => props.onSaveAddress(address, opts)}
                onFormOpenChange={(open) => {
                  setAddressFormOpen(open);
                  if (!open) setErrors(({ address, ...rest }) => rest);
                }}
                onRegisterValidate={(fn) => (validateAddressForm = fn)}
                error={errors().address}
              />
            </div>
          </Show>
        </div>
      </Show>
    </SheetModal>
  );
}

