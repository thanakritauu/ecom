import { createEffect, createSignal, createUniqueId, For, on, Show } from "solid-js";
import { SheetModal } from "../shared/SheetModal";
import { Button } from "../shared/Button";
import { AddressCard, AddressForm } from "./AddressSection";
import type { Address } from "~/lib/checkoutData";

export type ShippingAddressSheetView = { kind: "list" } | { kind: "form"; editing?: Address };

/**
 * Checkout's shipping address popup, the same flow as `TaxInvoiceSheet`:
 * "list" = saved addresses (tap one to use it, each with แก้ไข and
 * ตั้งเป็นค่าเริ่มต้น) plus "+ เพิ่มที่อยู่ใหม่"; "form" = add / edit, saved
 * from the pinned footer, then picked.
 */
export function ShippingAddressSheet(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  view: ShippingAddressSheetView;
  addresses: Address[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onSave: (address: Address, opts: { makeDefault: boolean }) => Promise<Address>;
  onSetDefault: (id: string) => Promise<void>;
}) {
  const formId = `shipping-address-form-${createUniqueId()}`;
  const [view, setView] = createSignal<ShippingAddressSheetView>(props.view);
  const [saving, setSaving] = createSignal(false);

  // Each opening starts where Checkout asked (list, or a form).
  createEffect(
    on(
      () => props.open,
      (isOpen) => isOpen && setView(props.view),
    ),
  );

  const editing = () => {
    const v = view();
    return v.kind === "form" ? v.editing : undefined;
  };
  const backFromForm = () => (props.addresses.length > 0 ? setView({ kind: "list" }) : props.onOpenChange(false));

  return (
    <SheetModal
      open={props.open}
      onOpenChange={props.onOpenChange}
      title={view().kind === "list" ? "ที่อยู่จัดส่ง" : editing() ? "แก้ไขที่อยู่จัดส่ง" : "เพิ่มที่อยู่จัดส่ง"}
      footer={
        <Show
          when={view().kind === "form"}
          fallback={
            <Button type="button" variant="outline" size="lg" class="w-full" onClick={() => setView({ kind: "form" })}>
              + เพิ่มที่อยู่ใหม่
            </Button>
          }
        >
          <div class="flex flex-col gap-2 sm:flex-row-reverse">
            <Button type="submit" form={formId} variant="primary" size="lg" class="w-full sm:flex-1" loading={saving()}>
              บันทึก
            </Button>
            <Button type="button" variant="outline" size="lg" class="w-full sm:flex-1" onClick={backFromForm} disabled={saving()}>
              ยกเลิก
            </Button>
          </div>
        </Show>
      }
    >
      <Show
        when={view().kind === "form"}
        fallback={
          <div role="radiogroup" aria-label="ที่อยู่จัดส่ง" class="flex flex-col gap-3">
            <For each={props.addresses}>
              {(address) => (
                <AddressCard
                  address={address}
                  selectable
                  selected={props.selectedId === address.id}
                  onSelect={() => {
                    props.onSelect(address.id);
                    props.onOpenChange(false);
                  }}
                  onEdit={() => setView({ kind: "form", editing: address })}
                  onSetDefault={address.isDefault ? undefined : () => props.onSetDefault(address.id)}
                />
              )}
            </For>
          </div>
        }
      >
        {/* Keyed by the address being edited, so switching entries starts a fresh form. */}
        <For each={[editing()?.id ?? "new"]}>
          {() => (
            <>
              <Show when={props.addresses.length === 0}>
                <p class="-mt-1 text-sm text-ink-gray">กรอกเพียงครั้งเดียว ครั้งหน้าระบบจะใช้ที่อยู่นี้ให้อัตโนมัติ</p>
              </Show>
              <AddressForm
                formId={formId}
                initial={editing()}
                newAddressLabel="ที่อยู่ใหม่"
                showDefaultOption
                forceDefault={props.addresses.length === 0}
                canCancel={false}
                onCancel={backFromForm}
                onSavingChange={setSaving}
                onSubmit={async (address, makeDefault) => {
                  const saved = await props.onSave(address, { makeDefault });
                  props.onSelect(saved.id);
                  props.onOpenChange(false);
                }}
              />
            </>
          )}
        </For>
      </Show>
    </SheetModal>
  );
}
