import { createSignal, For, Show } from "solid-js";
import type { Address } from "~/lib/checkoutData";
import { PHONE_PATTERN } from "~/lib/validators";
import { TextField } from "../shared/TextField";
import { Button } from "../shared/Button";

/**
 * Figma (node 146:8484) shows a picker over pre-saved addresses — a radio
 * card per address, each with an inline "แก้ไข" (edit) link, plus a
 * "+ เพิ่มที่อยู่ใหม่" button — not a single always-visible address form.
 * The add/edit form (PART 5/7's field list) only appears once one of those
 * is pressed, and the same form serves both add and edit rather than being
 * built twice.
 */
export function AddressSection(props: {
  addresses: Address[];
  selectedId: string | undefined;
  onSelect: (id: string) => void;
  onSave: (address: Address) => void;
  error?: string;
}) {
  const [formMode, setFormMode] = createSignal<"closed" | "add" | "edit">("closed");
  const [editingId, setEditingId] = createSignal<string | undefined>();

  const openAdd = () => {
    setEditingId(undefined);
    setFormMode("add");
  };
  const openEdit = (id: string) => {
    setEditingId(id);
    setFormMode("edit");
  };
  const closeForm = () => setFormMode("closed");

  const editingAddress = () => props.addresses.find((a) => a.id === editingId());

  return (
    <section aria-labelledby="shipping-address-heading" class="flex w-full flex-col gap-3 rounded-card">
      <h2 id="shipping-address-heading" class="text-lg font-semibold text-ink">
        ข้อมูลจัดส่ง
      </h2>

      <Show
        when={formMode() === "closed"}
        fallback={
          <AddressForm
            initial={editingAddress()}
            onCancel={closeForm}
            onSubmit={(address) => {
              props.onSave(address);
              closeForm();
            }}
          />
        }
      >
        <div role="radiogroup" aria-label="เลือกที่อยู่จัดส่ง" class="flex flex-col items-center justify-center gap-4">
          <For each={props.addresses}>
            {(address) => (
              <button
                type="button"
                role="radio"
                aria-checked={props.selectedId === address.id}
                onClick={() => props.onSelect(address.id)}
                class="flex w-full items-center gap-4 rounded-card border p-4 text-left transition-colors duration-150"
                classList={{
                  "border-brand-pink bg-surface-pink": props.selectedId === address.id,
                  "border-surface-gray bg-white hover:border-brand-pink/50": props.selectedId !== address.id,
                }}
              >
                <span
                  class="flex size-5 shrink-0 items-center justify-center rounded-pill border"
                  classList={{ "border-brand-pink": props.selectedId === address.id, "border-ink-placeholder": props.selectedId !== address.id }}
                  aria-hidden="true"
                >
                  <Show when={props.selectedId === address.id}>
                    <span class="size-3 rounded-pill bg-brand-pink" />
                  </Show>
                </span>
                <span class="flex min-w-0 flex-1 flex-col">
                  <span class="flex flex-wrap items-center gap-2">
                    <span class="font-semibold text-ink">{address.recipientName}</span>
                    <span class="text-xs text-ink">{address.phone}</span>
                    <Show when={address.isDefault}>
                      <span class="rounded-pill bg-brand-purple px-2 py-0.5 text-[10px] font-medium text-white">ค่าเริ่มต้น</span>
                    </Show>
                  </span>
                  <span class="text-sm text-ink">
                    {/* `addressLine` already carries the sub-district/district text for these two
                        seed addresses (matching Figma's own single combined string) — only
                        province + postal code are ever genuinely separate here. */}
                    {address.addressLine} {address.province} {address.postalCode}
                  </span>
                </span>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    openEdit(address.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.stopPropagation();
                      openEdit(address.id);
                    }
                  }}
                  class="shrink-0 self-start text-xs font-medium text-brand-pink underline"
                >
                  แก้ไข
                </span>
              </button>
            )}
          </For>

          <button
            type="button"
            onClick={openAdd}
            class="flex min-h-11 items-center justify-center rounded-pill border border-surface-gray bg-white px-4 text-sm font-semibold text-ink transition-colors duration-150 hover:border-brand-pink"
          >
            + เพิ่มที่อยู่ใหม่
          </button>
        </div>

        <Show when={props.error}>
          <p class="text-sm text-system-red" role="alert">
            {props.error}
          </p>
        </Show>
      </Show>
    </section>
  );
}

function AddressForm(props: { initial?: Address; onCancel: () => void; onSubmit: (address: Address) => void }) {
  const [recipientName, setRecipientName] = createSignal(props.initial?.recipientName ?? "");
  const [phone, setPhone] = createSignal(props.initial?.phone ?? "");
  const [addressLine, setAddressLine] = createSignal(props.initial?.addressLine ?? "");
  const [province, setProvince] = createSignal(props.initial?.province ?? "");
  const [district, setDistrict] = createSignal(props.initial?.district ?? "");
  const [subDistrict, setSubDistrict] = createSignal(props.initial?.subDistrict ?? "");
  const [postalCode, setPostalCode] = createSignal(props.initial?.postalCode ?? "");
  const [errors, setErrors] = createSignal<Record<string, string>>({});

  const POSTAL_PATTERN = /^\d{5}$/;

  const validate = () => {
    const next: Record<string, string> = {};
    if (!recipientName().trim()) next.recipientName = "กรุณากรอกชื่อผู้รับ";
    if (!phone().trim()) next.phone = "กรุณากรอกเบอร์โทรศัพท์";
    else if (!PHONE_PATTERN.test(phone().trim())) next.phone = "รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง";
    if (!addressLine().trim()) next.addressLine = "กรุณากรอกที่อยู่";
    if (!province().trim()) next.province = "กรุณากรอกจังหวัด";
    if (!district().trim()) next.district = "กรุณากรอกอำเภอ/เขต";
    if (!subDistrict().trim()) next.subDistrict = "กรุณากรอกตำบล/แขวง";
    if (!postalCode().trim()) next.postalCode = "กรุณากรอกรหัสไปรษณีย์";
    else if (!POSTAL_PATTERN.test(postalCode().trim())) next.postalCode = "รหัสไปรษณีย์ต้องมี 5 หลัก";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = (e: SubmitEvent) => {
    e.preventDefault();
    if (!validate()) return;
    props.onSubmit({
      id: props.initial?.id ?? `addr-${Date.now()}`,
      label: props.initial?.label ?? "ที่อยู่ใหม่",
      recipientName: recipientName().trim(),
      phone: phone().trim(),
      addressLine: addressLine().trim(),
      province: province().trim(),
      district: district().trim(),
      subDistrict: subDistrict().trim(),
      postalCode: postalCode().trim(),
      isDefault: props.initial?.isDefault,
    });
  };

  return (
    <form onSubmit={submit} class="flex flex-col gap-4 rounded-card border border-surface-gray p-4">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField label="ชื่อผู้รับ" required value={recipientName()} onInput={(e) => setRecipientName(e.currentTarget.value)} error={errors().recipientName} />
        <TextField label="เบอร์โทรศัพท์" required placeholder="08X-XXX-XXXX" value={phone()} onInput={(e) => setPhone(e.currentTarget.value)} error={errors().phone} />
      </div>
      <TextField label="ที่อยู่" required value={addressLine()} onInput={(e) => setAddressLine(e.currentTarget.value)} error={errors().addressLine} />
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <TextField label="จังหวัด" required value={province()} onInput={(e) => setProvince(e.currentTarget.value)} error={errors().province} />
        <TextField label="อำเภอ / เขต" required value={district()} onInput={(e) => setDistrict(e.currentTarget.value)} error={errors().district} />
        <TextField label="ตำบล / แขวง" required value={subDistrict()} onInput={(e) => setSubDistrict(e.currentTarget.value)} error={errors().subDistrict} />
      </div>
      <TextField
        label="รหัสไปรษณีย์"
        required
        inputMode="numeric"
        maxlength={5}
        class="max-w-[200px]"
        value={postalCode()}
        onInput={(e) => setPostalCode(e.currentTarget.value)}
        error={errors().postalCode}
      />
      <div class="flex gap-3">
        <Button type="submit" variant="primary">
          บันทึกที่อยู่
        </Button>
        <Button type="button" variant="outline" onClick={props.onCancel}>
          ยกเลิก
        </Button>
      </div>
    </form>
  );
}
