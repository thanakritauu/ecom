import { createSignal, For, onMount, Show } from "solid-js";
import { clientOnly } from "@solidjs/start";
import { AccountShell, AccountPanel } from "~/components/account/AccountShell";
import { AddressCard, AddressForm } from "~/components/checkout/AddressSection";
import { Button } from "~/components/shared/Button";
import { EmptyState } from "~/components/shared/EmptyState";
import { PinIcon } from "~/components/shared/icons";
import { createAddressBook, createLocalAddressRepository, type AddressBook } from "~/lib/addressBook";
import { pushToast } from "~/lib/toast";
import { useAuth } from "~/lib/auth";
import { TaxInvoiceSummary } from "~/components/checkout/TaxInvoiceFields";
import type { TaxInvoiceSheetView } from "~/components/checkout/TaxInvoiceSheet";
import {
  readTaxInvoiceProfiles,
  removeTaxInvoiceProfile,
  setDefaultTaxInvoiceProfile,
  upsertTaxInvoiceProfile,
  type TaxInvoiceProfile,
} from "~/lib/taxInvoiceProfiles";
import type { Address } from "~/lib/checkoutData";

// Same Kobalte Dialog SSR/hydration workaround as the order detail page.
const ConfirmRemoveDialog = clientOnly(() => import("~/components/account/OrderActionDialogs").then((m) => ({ default: m.ConfirmRemoveDialog })));
const TaxInvoiceSheet = clientOnly(() => import("~/components/checkout/TaxInvoiceSheet").then((m) => ({ default: m.TaxInvoiceSheet })));

/**
 * ที่อยู่จัดส่ง + ข้อมูลใบกำกับภาษี — the same saved data Checkout picks
 * from (same address repository and `taxInvoiceProfiles`, same cards and
 * forms), managed here: add, edit, set the default, delete.
 */
export default function AccountAddressPage() {
  const book = createAddressBook(() => createLocalAddressRepository("existing"));
  const [removing, setRemoving] = createSignal<Address | undefined>();

  return (
    <AccountShell>
      <AddressListPanel
        book={book}
        title="ที่อยู่จัดส่ง"
        headingId="account-address-heading"
        addresses={book.addresses().filter((a) => a.kind !== "billing")}
        onRemove={setRemoving}
      />
      <TaxInvoicePanel book={book} />

      <ConfirmRemoveDialog
        open={!!removing()}
        onOpenChange={(open) => !open && setRemoving(undefined)}
        title="ลบที่อยู่นี้?"
        description={removing() ? `${removing()!.recipientName} ${removing()!.addressLine}` : ""}
        confirmLabel="ลบที่อยู่"
        onConfirm={async () => {
          await book.remove(removing()!.id);
          pushToast("ลบที่อยู่แล้ว");
        }}
      />
    </AccountShell>
  );
}

function AddressListPanel(props: {
  book: AddressBook;
  title: string;
  headingId: string;
  addresses: Address[];
  onRemove: (address: Address) => void;
}) {
  // undefined = list only; "new" = add form; otherwise the id being edited.
  const [formFor, setFormFor] = createSignal<string | undefined>();
  const editing = () => props.addresses.find((a) => a.id === formFor());
  const empty = () => props.book.ready() && props.addresses.length === 0;
  // No shipping address yet → the form opens straight away (nothing else to do here).
  const formOpen = () => formFor() !== undefined || empty();

  const save = async (address: Address, makeDefault: boolean) => {
    const isNew = !editing();
    await props.book.save(address, { makeDefault });
    setFormFor(undefined);
    pushToast(isNew ? "เพิ่มที่อยู่แล้ว" : "บันทึกการแก้ไขแล้ว");
  };

  return (
    <AccountPanel
      title={props.title}
      headingId={props.headingId}
      action={
        <Show when={props.book.ready() && !formOpen()}>
          <Button type="button" variant="outline" size="sm" onClick={() => setFormFor("new")}>
            + เพิ่มที่อยู่ใหม่
          </Button>
        </Show>
      }
    >
      <Show when={props.book.ready()} fallback={<ListSkeleton />}>
        <Show when={formOpen()}>
          <div class="flex flex-col gap-2">
            <p class="text-sm font-medium text-ink">{editing() ? "แก้ไขที่อยู่" : empty() ? "เพิ่มที่อยู่จัดส่งแรกของคุณ" : "เพิ่มที่อยู่ใหม่"}</p>
            {/* Keyed so switching between addresses remounts the form with the right values. */}
            <Show when={formFor() ?? "new"} keyed>
              {(_key) => (
                <AddressForm
                  initial={editing()}
                  newAddressLabel="ที่อยู่ใหม่"
                  showDefaultOption
                  forceDefault={empty()}
                  canCancel={!empty()}
                  onCancel={() => setFormFor(undefined)}
                  onSubmit={save}
                  submitLabel="บันทึกที่อยู่"
                />
              )}
            </Show>
          </div>
        </Show>

        <Show when={props.addresses.length > 0}>
          <ul class="flex flex-col gap-3">
            <For each={props.addresses}>
              {(address) => (
                <li>
                  <AddressCard
                    address={address}
                    selected={!!address.isDefault}
                    onEdit={() => setFormFor(address.id)}
                    onSetDefault={address.isDefault ? undefined : () => props.book.setDefault(address.id)}
                    onDelete={() => {
                      if (formFor() === address.id) setFormFor(undefined);
                      props.onRemove(address);
                    }}
                  />
                </li>
              )}
            </For>
          </ul>
        </Show>
        <Show when={props.addresses.length > 0}>
          <p class="text-xs text-ink-gray">ที่อยู่เริ่มต้นจะถูกเลือกให้อัตโนมัติตอนชำระเงิน</p>
        </Show>
      </Show>
    </AccountPanel>
  );
}

/**
 * ข้อมูลใบกำกับภาษี: the entries Checkout's tax invoice popup saves and
 * offers, with the same summary as there; add / edit open that popup's form.
 */
function TaxInvoicePanel(props: { book: AddressBook }) {
  const auth = useAuth();
  // Client only (localStorage), like the address book.
  const [profiles, setProfiles] = createSignal<TaxInvoiceProfile[]>([]);
  const [ready, setReady] = createSignal(false);
  onMount(() => {
    setProfiles(readTaxInvoiceProfiles("existing"));
    setReady(true);
  });
  const [sheetOpen, setSheetOpen] = createSignal(false);
  const [sheetView, setSheetView] = createSignal<TaxInvoiceSheetView>({ kind: "form" });
  const [removing, setRemoving] = createSignal<TaxInvoiceProfile | undefined>();
  const openForm = (editing?: TaxInvoiceProfile) => {
    setSheetView({ kind: "form", editing });
    setSheetOpen(true);
  };
  const shippingDefault = () => props.book.addresses().find((a) => a.kind !== "billing" && a.isDefault);
  const addressOf = (p: TaxInvoiceProfile) => props.book.addresses().find((a) => a.id === p.addressId) ?? shippingDefault();

  return (
    <AccountPanel
      title="ข้อมูลใบกำกับภาษี"
      headingId="account-tax-invoice-heading"
      action={
        <Show when={ready()}>
          <Button type="button" variant="outline" size="sm" onClick={() => openForm()}>
            + เพิ่มข้อมูลใบกำกับภาษี
          </Button>
        </Show>
      }
    >
      <Show when={ready() && props.book.ready()} fallback={<ListSkeleton />}>
        <Show
          when={profiles().length > 0}
          fallback={
            <EmptyState size="compact" icon={PinIcon} title="ยังไม่มีข้อมูลใบกำกับภาษี" description="เพิ่มไว้ใช้ตอนต้องการใบกำกับภาษีในนามบุคคลหรือบริษัท" />
          }
        >
          <ul class="flex flex-col gap-3">
            <For each={profiles()}>
              {(p) => (
                <li
                  class="flex items-start gap-3 rounded-card border p-4"
                  classList={{ "border-transparent bg-surface-pink": !!p.isDefault, "border-surface-gray bg-white": !p.isDefault }}
                >
                  <div class="min-w-0 flex-1">
                    <TaxInvoiceSummary profile={p} address={addressOf(p)} />
                  </div>
                  {/* Same actions column as the address cards. */}
                  <div class="flex shrink-0 flex-col items-end gap-2">
                    <button type="button" onClick={() => openForm(p)} class="min-h-6 text-xs font-medium text-brand-pink underline" aria-label={`แก้ไข ${p.name}`}>
                      แก้ไข
                    </button>
                    <Show when={!p.isDefault}>
                      <button
                        type="button"
                        onClick={() => setProfiles(setDefaultTaxInvoiceProfile("existing", p.id))}
                        class="min-h-6 whitespace-nowrap text-xs text-ink-gray underline lg:hover:text-brand-pink"
                        aria-label={`ตั้ง ${p.name} เป็นค่าเริ่มต้น`}
                      >
                        ตั้งเป็นค่าเริ่มต้น
                      </button>
                    </Show>
                    <button type="button" onClick={() => setRemoving(p)} class="min-h-6 text-xs text-ink-gray underline lg:hover:text-system-red" aria-label={`ลบ ${p.name}`}>
                      ลบ
                    </button>
                  </div>
                </li>
              )}
            </For>
          </ul>
          <p class="text-xs text-ink-gray">ข้อมูลเริ่มต้นจะถูกเลือกให้อัตโนมัติเมื่อขอใบกำกับภาษีตอนชำระเงิน</p>
        </Show>
      </Show>

      <TaxInvoiceSheet
        open={sheetOpen()}
        onOpenChange={setSheetOpen}
        view={sheetView()}
        formOnly
        profiles={profiles()}
        onSelect={() => {}}
        onSave={(profile, opts) => {
          const isNew = !profiles().some((x) => x.id === profile.id);
          setProfiles(upsertTaxInvoiceProfile("existing", profile, opts.makeDefault));
          pushToast(isNew ? "เพิ่มข้อมูลใบกำกับภาษีแล้ว" : "บันทึกการแก้ไขแล้ว");
        }}
        onSetDefault={(id) => setProfiles(setDefaultTaxInvoiceProfile("existing", id))}
        addresses={props.book.addresses()}
        shippingAddress={shippingDefault()}
        onSaveAddress={(address, opts) => props.book.save(address, opts)}
        accountEmail={auth.user()?.email ?? ""}
      />
      <ConfirmRemoveDialog
        open={!!removing()}
        onOpenChange={(open) => !open && setRemoving(undefined)}
        title="ลบข้อมูลใบกำกับภาษีนี้?"
        description={removing()?.name ?? ""}
        confirmLabel="ลบข้อมูล"
        onConfirm={async () => {
          setProfiles(removeTaxInvoiceProfile("existing", removing()!.id));
          pushToast("ลบข้อมูลใบกำกับภาษีแล้ว");
        }}
      />
    </AccountPanel>
  );
}

function ListSkeleton() {
  return (
    <div class="flex flex-col gap-3" aria-hidden="true">
      {Array.from({ length: 2 }).map(() => (
        <div class="h-24 animate-pulse rounded-card bg-surface-gray" />
      ))}
    </div>
  );
}
