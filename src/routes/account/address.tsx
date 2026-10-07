import { createSignal, For, Show } from "solid-js";
import { clientOnly } from "@solidjs/start";
import { AccountShell, AccountPanel } from "~/components/account/AccountShell";
import { AddressCard, AddressForm } from "~/components/checkout/AddressSection";
import { Button } from "~/components/shared/Button";
import { createAddressBook, createLocalAddressRepository, type AddressBook } from "~/lib/addressBook";
import { pushToast } from "~/lib/toast";
import type { Address } from "~/lib/checkoutData";

// Same Kobalte Dialog SSR/hydration workaround as the order detail page.
const ConfirmRemoveDialog = clientOnly(() => import("~/components/account/OrderActionDialogs").then((m) => ({ default: m.ConfirmRemoveDialog })));

/**
 * ที่อยู่จัดส่ง + ที่อยู่ออกใบเสร็จรับเงิน — the same saved addresses Checkout
 * picks from (same repository, same `AddressCard` + `AddressForm`), managed
 * here: add, edit, set the default shipping address, delete. Billing
 * addresses are the ones saved with `kind: "billing"` (may be a company).
 */
export default function AccountAddressPage() {
  const book = createAddressBook(() => createLocalAddressRepository("existing"));
  const [removing, setRemoving] = createSignal<Address | undefined>();

  return (
    <AccountShell>
      <AddressListPanel
        book={book}
        kind="shipping"
        title="ที่อยู่จัดส่ง"
        headingId="account-address-heading"
        addresses={book.addresses().filter((a) => a.kind !== "billing")}
        onRemove={setRemoving}
      />
      <AddressListPanel
        book={book}
        kind="billing"
        title="ที่อยู่ออกใบเสร็จรับเงิน"
        headingId="account-billing-heading"
        addresses={book.addresses().filter((a) => a.kind === "billing")}
        onRemove={setRemoving}
      />

      <ConfirmRemoveDialog
        open={!!removing()}
        onOpenChange={(open) => !open && setRemoving(undefined)}
        title="ลบที่อยู่นี้?"
        description={removing() ? `${removing()!.recipientName} · ${removing()!.addressLine}` : ""}
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
  kind: "shipping" | "billing";
  title: string;
  headingId: string;
  addresses: Address[];
  onRemove: (address: Address) => void;
}) {
  const billing = () => props.kind === "billing";
  // undefined = list only; "new" = add form; otherwise the id being edited.
  const [formFor, setFormFor] = createSignal<string | undefined>();
  const editing = () => props.addresses.find((a) => a.id === formFor());
  const empty = () => props.book.ready() && props.addresses.length === 0;
  // No shipping address yet → the form opens straight away (nothing else to do here). Billing is optional, so it waits for "+ เพิ่ม".
  const formOpen = () => formFor() !== undefined || (empty() && !billing());

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
            <p class="text-sm font-medium text-ink">{editing() ? "แก้ไขที่อยู่" : empty() && !billing() ? "เพิ่มที่อยู่จัดส่งแรกของคุณ" : "เพิ่มที่อยู่ใหม่"}</p>
            {/* Keyed so switching between addresses remounts the form with the right values. */}
            <Show when={formFor() ?? "new"} keyed>
              {(_key) => (
                <AddressForm
                  initial={editing()}
                  newAddressLabel={billing() ? "ที่อยู่ออกใบเสร็จรับเงิน" : "ที่อยู่ใหม่"}
                  kind={billing() ? "billing" : undefined}
                  companyAllowed={billing()}
                  showDefaultOption={!billing()}
                  forceDefault={!billing() && empty()}
                  canCancel={billing() || !empty()}
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
                    onSetDefault={billing() || address.isDefault ? undefined : () => props.book.setDefault(address.id)}
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
        <p class="text-xs text-ink-gray">
          {billing()
            ? empty()
              ? "ยังไม่มีที่อยู่ออกใบเสร็จ"
              : "เลือกใช้ได้ตอนชำระเงิน เมื่อยกเลิก “ใช้ที่อยู่เดียวกับที่อยู่จัดส่ง”"
            : "ที่อยู่เริ่มต้นจะถูกเลือกให้อัตโนมัติตอนชำระเงิน"}
        </p>
      </Show>
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
