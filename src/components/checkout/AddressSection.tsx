import { createEffect, createSignal, createUniqueId, For, on, Show } from "solid-js";
import { formatAddress, isBangkok, THAI_PROVINCES, type Address } from "~/lib/checkoutData";
import { PHONE_PATTERN } from "~/lib/validators";
import { TextField } from "../shared/TextField";
import { Button } from "../shared/Button";

type Mode = "summary" | "list" | "add" | "edit";

/**
 * Checkout address picker — used for both the shipping and the billing
 * address (same `Address` model, same form).
 *
 * Phase 04 first-time UX:
 *   - no saved address → the form opens straight away (nothing to pick yet)
 *   - has an address → only the selected one shows as a card, with
 *     "เปลี่ยนที่อยู่" to reveal the others (Figma node 146:8484's radio
 *     cards + "แก้ไข") and "+ เพิ่มที่อยู่ใหม่" to add one
 *   - add and edit share one form
 */
export function AddressSection(props: {
  headingId: string;
  title: string;
  /** Title shown above the form when there's nothing saved yet. */
  emptyTitle: string;
  addresses: Address[];
  selectedId: string | undefined;
  onSelect: (id: string) => void;
  onSave: (address: Address, opts: { makeDefault: boolean }) => Promise<Address>;
  onSetDefault?: (id: string) => Promise<void>;
  /** Shipping only — billing addresses don't carry a checkout default. */
  showDefaultOption?: boolean;
  newAddressLabel: string;
  /** Name field label — billing may be a company, not a "recipient". */
  nameLabel?: string;
  error?: string;
  /** Lets Checkout know an unsaved form is open (so "ยืนยัน" can ask to save it first). */
  onFormOpenChange?: (open: boolean) => void;
  /** Rendered inside another section (billing) — skips the outer heading. */
  embedded?: boolean;
}) {
  const initialMode = (): Mode => (props.addresses.length === 0 ? "add" : props.selectedId ? "summary" : "list");
  const [mode, setMode] = createSignal<Mode>(initialMode());
  const [editingId, setEditingId] = createSignal<string | undefined>();

  // The address list loads asynchronously (and can empty/fill on a mock-state switch) — re-derive the mode when it does.
  createEffect(
    on(
      () => props.addresses.length === 0,
      (empty) => {
        if (empty) setMode("add");
        else if (mode() === "add" && !editingId()) setMode(props.selectedId ? "summary" : "list");
      },
      { defer: true },
    ),
  );
  createEffect(() => props.onFormOpenChange?.(mode() === "add" || mode() === "edit"));

  const selected = () => props.addresses.find((a) => a.id === props.selectedId);
  const editingAddress = () => props.addresses.find((a) => a.id === editingId());
  const isFirstAddress = () => props.addresses.length === 0;

  const openAdd = () => {
    setEditingId(undefined);
    setMode("add");
  };
  const openEdit = (id: string) => {
    setEditingId(id);
    setMode("edit");
  };
  const closeForm = () => {
    setEditingId(undefined);
    setMode(props.selectedId ? "summary" : "list");
  };

  const Heading = () => (
    <h2 id={props.headingId} class="text-lg font-semibold text-ink">
      {isFirstAddress() ? props.emptyTitle : props.title}
    </h2>
  );

  return (
    <section aria-labelledby={props.embedded ? undefined : props.headingId} class="flex w-full flex-col gap-3">
      <Show when={!props.embedded}>
        <Heading />
      </Show>

      <Show when={mode() === "add" || mode() === "edit"}>
        <Show when={isFirstAddress() && !props.embedded}>
          <p class="-mt-1 text-sm text-ink-gray">กรอกเพียงครั้งเดียว ครั้งหน้าระบบจะใช้ที่อยู่นี้ให้อัตโนมัติ</p>
        </Show>
        <AddressForm
          initial={mode() === "edit" ? editingAddress() : undefined}
          newAddressLabel={props.newAddressLabel}
          nameLabel={props.nameLabel ?? "ชื่อ-นามสกุลผู้รับ"}
          showDefaultOption={props.showDefaultOption}
          forceDefault={props.showDefaultOption && isFirstAddress()}
          canCancel={!isFirstAddress()}
          onCancel={closeForm}
          onSubmit={async (address, makeDefault) => {
            const saved = await props.onSave(address, { makeDefault });
            props.onSelect(saved.id);
            setEditingId(undefined);
            setMode("summary");
          }}
        />
      </Show>

      <Show when={mode() === "summary" && selected()}>
        {(address) => (
          <div class="flex flex-col gap-3">
            <AddressCard address={address()} onEdit={() => openEdit(address().id)} />
            <div class="flex flex-wrap gap-2">
              <Show when={props.addresses.length > 1}>
                <Button type="button" variant="outline" size="sm" onClick={() => setMode("list")}>
                  เปลี่ยนที่อยู่
                </Button>
              </Show>
              <Button type="button" variant="outline" size="sm" onClick={openAdd}>
                + เพิ่มที่อยู่ใหม่
              </Button>
            </div>
          </div>
        )}
      </Show>

      <Show when={mode() === "list"}>
        <div role="radiogroup" aria-label={props.title} class="flex flex-col gap-3">
          <For each={props.addresses}>
            {(address) => (
              <AddressCard
                address={address}
                selectable
                selected={props.selectedId === address.id}
                onSelect={() => {
                  props.onSelect(address.id);
                  setMode("summary");
                }}
                onEdit={() => openEdit(address.id)}
                onSetDefault={props.showDefaultOption && props.onSetDefault && !address.isDefault ? () => props.onSetDefault!(address.id) : undefined}
              />
            )}
          </For>
          <div class="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={openAdd}>
              + เพิ่มที่อยู่ใหม่
            </Button>
            <Show when={selected()}>
              <Button type="button" variant="outline" size="sm" onClick={() => setMode("summary")}>
                ยกเลิก
              </Button>
            </Show>
          </div>
        </div>
      </Show>

      <Show when={props.error}>
        <p class="text-sm text-system-red" role="alert">
          {props.error}
        </p>
      </Show>
    </section>
  );
}

function AddressCard(props: {
  address: Address;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  onEdit: () => void;
  onSetDefault?: () => Promise<void>;
}) {
  const [settingDefault, setSettingDefault] = createSignal(false);
  const body = (
    <span class="flex min-w-0 flex-1 flex-col gap-0.5">
      <span class="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span class="font-semibold text-ink">{props.address.recipientName}</span>
        <span class="text-sm text-ink-gray">{props.address.phone}</span>
        <Show when={props.address.isDefault}>
          <span class="rounded-pill bg-brand-purple px-2 py-0.5 text-[10px] font-medium text-white">ค่าเริ่มต้น</span>
        </Show>
      </span>
      <span class="text-sm text-ink">{formatAddress(props.address)}</span>
    </span>
  );

  return (
    <div
      class="flex w-full items-start gap-3 rounded-card border p-4 transition-colors duration-150"
      classList={{
        "border-brand-pink bg-surface-pink": !props.selectable || props.selected,
        "border-surface-gray bg-white hover:border-brand-pink/50": props.selectable && !props.selected,
      }}
    >
      <Show when={props.selectable} fallback={body}>
        <button type="button" role="radio" aria-checked={props.selected} onClick={props.onSelect} class="flex min-w-0 flex-1 items-start gap-3 text-left">
          <span
            class="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-pill border"
            classList={{ "border-brand-pink": props.selected, "border-ink-placeholder": !props.selected }}
            aria-hidden="true"
          >
            <Show when={props.selected}>
              <span class="size-3 rounded-pill bg-brand-pink" />
            </Show>
          </span>
          {body}
        </button>
      </Show>
      <div class="flex shrink-0 flex-col items-end gap-2">
        <button type="button" onClick={props.onEdit} class="min-h-6 text-xs font-medium text-brand-pink underline" aria-label={`แก้ไขที่อยู่ของ ${props.address.recipientName}`}>
          แก้ไข
        </button>
        <Show when={props.onSetDefault}>
          <button
            type="button"
            disabled={settingDefault()}
            onClick={async () => {
              setSettingDefault(true);
              try {
                await props.onSetDefault!();
              } finally {
                setSettingDefault(false);
              }
            }}
            class="min-h-6 whitespace-nowrap text-xs text-ink-gray underline hover:text-brand-pink disabled:opacity-50"
          >
            ตั้งเป็นค่าเริ่มต้น
          </button>
        </Show>
      </div>
    </div>
  );
}

type FieldKey = "recipientName" | "phone" | "addressLine" | "province" | "district" | "subDistrict" | "postalCode";
const FIELD_ORDER: FieldKey[] = ["recipientName", "phone", "addressLine", "province", "district", "subDistrict", "postalCode"];
const POSTAL_PATTERN = /^\d{5}$/;

function AddressForm(props: {
  initial?: Address;
  newAddressLabel: string;
  nameLabel: string;
  showDefaultOption?: boolean;
  /** First saved shipping address always becomes the default. */
  forceDefault?: boolean;
  canCancel: boolean;
  onCancel: () => void;
  onSubmit: (address: Address, makeDefault: boolean) => Promise<void>;
}) {
  const formId = createUniqueId();
  const fieldId = (key: FieldKey) => `${formId}-${key}`;
  const [values, setValues] = createSignal<Record<FieldKey, string>>({
    recipientName: props.initial?.recipientName ?? "",
    phone: props.initial?.phone ?? "",
    addressLine: props.initial?.addressLine ?? "",
    province: props.initial?.province ?? "",
    district: props.initial?.district ?? "",
    subDistrict: props.initial?.subDistrict ?? "",
    postalCode: props.initial?.postalCode ?? "",
  });
  const [makeDefault, setMakeDefault] = createSignal(props.forceDefault || !!props.initial?.isDefault);
  const [touched, setTouched] = createSignal<Partial<Record<FieldKey, boolean>>>({});
  const [submitted, setSubmitted] = createSignal(false);
  const [status, setStatus] = createSignal<"idle" | "saving" | "error">("idle");

  const v = (key: FieldKey) => values()[key];
  const set = (key: FieldKey, value: string) => setValues((prev) => ({ ...prev, [key]: value }));
  const bkk = () => isBangkok(v("province"));
  const districtLabel = () => (bkk() ? "เขต" : "อำเภอ");
  const subDistrictLabel = () => (bkk() ? "แขวง" : "ตำบล");

  // Messages say what to fix, not just that something's wrong.
  const errorFor = (key: FieldKey): string | undefined => {
    const value = v(key).trim();
    switch (key) {
      case "recipientName":
        return value ? undefined : `กรุณากรอก${props.nameLabel}`;
      case "phone":
        if (!value) return "กรุณากรอกเบอร์โทรศัพท์ผู้รับ";
        return PHONE_PATTERN.test(value) ? undefined : "เบอร์โทรต้องเป็นตัวเลข 9–10 หลัก ขึ้นต้นด้วย 0 เช่น 081-234-5678";
      case "addressLine":
        return value ? undefined : "กรุณากรอกบ้านเลขที่ หมู่บ้าน/อาคาร ซอย ถนน";
      case "province":
        return value ? undefined : "กรุณาเลือกจังหวัด";
      case "district":
        return value ? undefined : `กรุณากรอก${districtLabel()}`;
      case "subDistrict":
        return value ? undefined : `กรุณากรอก${subDistrictLabel()}`;
      case "postalCode":
        if (!value) return "กรุณากรอกรหัสไปรษณีย์";
        return POSTAL_PATTERN.test(value) ? undefined : "รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก เช่น 10110";
    }
  };
  // Errors appear once a field is left (blur) or on submit — not while typing the first time.
  const shownError = (key: FieldKey) => (submitted() || touched()[key] ? errorFor(key) : undefined);
  const touch = (key: FieldKey) => setTouched((prev) => ({ ...prev, [key]: true }));

  // Mobile: keep the focused field clear of the on-screen keyboard and the fixed order-summary bar.
  const onFocusIn = (e: FocusEvent) => {
    const el = e.target as HTMLElement;
    if (window.innerWidth >= 1024 || !(el instanceof HTMLInputElement || el instanceof HTMLSelectElement)) return;
    setTimeout(() => el.scrollIntoView({ block: "center", behavior: "smooth" }), 300);
  };

  const submit = async (e: SubmitEvent) => {
    e.preventDefault();
    setSubmitted(true);
    const firstInvalid = FIELD_ORDER.find((key) => errorFor(key));
    if (firstInvalid) {
      document.getElementById(fieldId(firstInvalid))?.focus();
      return;
    }
    setStatus("saving");
    try {
      const trimmed = Object.fromEntries(FIELD_ORDER.map((k) => [k, v(k).trim()])) as Record<FieldKey, string>;
      await props.onSubmit(
        {
          id: props.initial?.id ?? `addr-${Date.now()}`,
          label: props.initial?.label ?? props.newAddressLabel,
          ...trimmed,
          isDefault: props.initial?.isDefault,
        },
        props.showDefaultOption ? makeDefault() : false,
      );
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  };

  return (
    <form onSubmit={submit} onFocusIn={onFocusIn} novalidate class="flex flex-col gap-4 rounded-card border border-surface-gray p-4">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          id={fieldId("recipientName")}
          label={props.nameLabel}
          required
          autocomplete="name"
          enterkeyhint="next"
          value={v("recipientName")}
          onInput={(e) => set("recipientName", e.currentTarget.value)}
          onBlur={() => touch("recipientName")}
          error={shownError("recipientName")}
        />
        <TextField
          id={fieldId("phone")}
          label="เบอร์โทรศัพท์"
          required
          type="tel"
          inputMode="tel"
          autocomplete="tel"
          enterkeyhint="next"
          placeholder="08X-XXX-XXXX"
          maxlength={12}
          value={v("phone")}
          onInput={(e) => set("phone", e.currentTarget.value.replace(/[^\d-]/g, ""))}
          onBlur={() => touch("phone")}
          error={shownError("phone")}
        />
      </div>

      <TextField
        id={fieldId("addressLine")}
        label="ที่อยู่"
        required
        autocomplete="street-address"
        enterkeyhint="next"
        placeholder="บ้านเลขที่ หมู่บ้าน/อาคาร ซอย ถนน"
        value={v("addressLine")}
        onInput={(e) => set("addressLine", e.currentTarget.value)}
        onBlur={() => touch("addressLine")}
        error={shownError("addressLine")}
      />

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ProvinceSelect
          id={fieldId("province")}
          value={v("province")}
          onChange={(value) => {
            set("province", value);
            touch("province");
          }}
          error={shownError("province")}
        />
        <TextField
          id={fieldId("district")}
          label={`${districtLabel()}`}
          required
          autocomplete="address-level2"
          enterkeyhint="next"
          placeholder={bkk() ? "เช่น วัฒนา" : "เช่น เมืองเชียงใหม่"}
          value={v("district")}
          onInput={(e) => set("district", e.currentTarget.value)}
          onBlur={() => touch("district")}
          error={shownError("district")}
        />
        <TextField
          id={fieldId("subDistrict")}
          label={`${subDistrictLabel()}`}
          required
          autocomplete="address-level3"
          enterkeyhint="next"
          placeholder={bkk() ? "เช่น คลองตันเหนือ" : "เช่น สุเทพ"}
          value={v("subDistrict")}
          onInput={(e) => set("subDistrict", e.currentTarget.value)}
          onBlur={() => touch("subDistrict")}
          error={shownError("subDistrict")}
        />
        <TextField
          id={fieldId("postalCode")}
          label="รหัสไปรษณีย์"
          required
          inputMode="numeric"
          autocomplete="postal-code"
          enterkeyhint="done"
          maxlength={5}
          placeholder="5 หลัก"
          value={v("postalCode")}
          onInput={(e) => set("postalCode", e.currentTarget.value.replace(/\D/g, ""))}
          onBlur={() => touch("postalCode")}
          error={shownError("postalCode")}
        />
      </div>

      <Show when={props.showDefaultOption}>
        <label class="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-ink" classList={{ "cursor-default": props.forceDefault }}>
          <input
            type="checkbox"
            checked={makeDefault()}
            disabled={props.forceDefault || (props.initial?.isDefault ?? false)}
            onChange={(e) => setMakeDefault(e.currentTarget.checked)}
            class="size-5 shrink-0 rounded accent-brand-pink"
          />
          <span>
            บันทึกเป็นที่อยู่เริ่มต้น
            <Show when={props.forceDefault}>
              <span class="block text-xs text-ink-gray">ที่อยู่แรกจะถูกตั้งเป็นค่าเริ่มต้นอัตโนมัติ</span>
            </Show>
          </span>
        </label>
      </Show>

      <Show when={status() === "error"}>
        <p class="text-sm text-system-red" role="alert">
          บันทึกที่อยู่ไม่สำเร็จ กรุณาลองอีกครั้ง
        </p>
      </Show>

      <div class="flex flex-col-reverse gap-3 sm:flex-row">
        <Show when={props.canCancel}>
          <Button type="button" variant="outline" class="w-full sm:w-auto" onClick={props.onCancel} disabled={status() === "saving"}>
            ยกเลิก
          </Button>
        </Show>
        <Button type="submit" variant="primary" class="w-full sm:w-auto" loading={status() === "saving"}>
          {props.initial ? "บันทึกการแก้ไข" : "ใช้ที่อยู่นี้"}
        </Button>
      </div>
    </form>
  );
}

/** Same visual/label/error treatment as `TextField`, for the one field that's a pick-list. */
function ProvinceSelect(props: { id: string; value: string; onChange: (value: string) => void; error?: string }) {
  const errorId = `${props.id}-error`;
  return (
    <div class="flex flex-col gap-1.5">
      <label for={props.id} class="text-sm font-medium text-ink">
        จังหวัด
        <span class="text-system-red" aria-hidden="true">
          {" "}
          *
        </span>
      </label>
      <div class="relative">
        <select
          id={props.id}
          value={props.value}
          autocomplete="address-level1"
          aria-invalid={!!props.error}
          aria-describedby={props.error ? errorId : undefined}
          onChange={(e) => props.onChange(e.currentTarget.value)}
          class={`h-11 w-full appearance-none rounded-card border bg-surface-card pl-4 pr-10 text-base outline-none transition-colors duration-150 focus:border-brand-pink ${
            props.error ? "border-system-red" : "border-border"
          } ${props.value ? "text-ink" : "text-ink-placeholder"}`}
        >
          <option value="" disabled>
            เลือกจังหวัด
          </option>
          <For each={THAI_PROVINCES}>{(p) => <option value={p}>{p}</option>}</For>
        </select>
        <span class="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink-gray" aria-hidden="true">
          ▾
        </span>
      </div>
      <Show when={props.error}>
        <p id={errorId} role="alert" class="text-sm text-system-red">
          {props.error}
        </p>
      </Show>
    </div>
  );
}
