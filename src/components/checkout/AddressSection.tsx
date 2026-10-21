import { createEffect, createResource, createSignal, createUniqueId, For, on, onMount, Show } from "solid-js";
import { DEFAULT_PHONE_COUNTRY_CODE, formatAddress, formatAddressPhone, isBangkok, THAI_PROVINCES, type Address } from "~/lib/checkoutData";
import { findCountryCode, PHONE_COUNTRY_CODES, type CountryCode } from "~/lib/countryCodes";
import { focusFirstInvalid, isValidationFocus, PHONE_PATTERN } from "~/lib/validators";
import { districtsOf, loadThaiAddressData, postalCodesOf, stripAreaPrefix, subDistrictsOf } from "~/lib/thaiAddress";
import { FieldError, FieldLabel, fieldBorderClass, TextField } from "../shared/TextField";
import { Button } from "../shared/Button";
import { Badge } from "../shared/Badge";
import { ChevronIcon } from "../shared/ChevronIcon";

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
  /** Billing may be a company: the first-name field also takes a company name and the last name becomes optional. */
  companyAllowed?: boolean;
  error?: string;
  /** Lets Checkout know an unsaved form is open (so "ยืนยัน" can ask to save it first). */
  onFormOpenChange?: (open: boolean) => void;
  /** Rendered inside another section (billing) — skips the outer heading. */
  embedded?: boolean;
  /** Kind given to addresses added here. */
  kind?: Address["kind"];
  /** Starting values for "+ เพิ่มที่อยู่ใหม่" (billing: the shipping address, to review and adjust). */
  prefill?: Partial<Address>;
  /** Checkout's pay button checks an open form through this (see `AddressForm`'s `onRegisterValidate`). */
  onRegisterValidate?: (validate: () => boolean) => void;
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
          prefill={mode() === "add" ? props.prefill : undefined}
          newAddressLabel={props.newAddressLabel}
          companyAllowed={props.companyAllowed}
          kind={props.kind}
          showDefaultOption={props.showDefaultOption}
          forceDefault={props.showDefaultOption && isFirstAddress()}
          canCancel={!isFirstAddress()}
          onCancel={closeForm}
          onRegisterValidate={props.onRegisterValidate}
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

/** Also the account's address book (`/account/address`): there `selected` marks the default card and `onDelete` adds "ลบ". */
export function AddressCard(props: {
  address: Address;
  selectable?: boolean;
  /** Pink-tinted card. Defaults to on for a non-selectable (summary) card. */
  selected?: boolean;
  onSelect?: () => void;
  onEdit: () => void;
  onSetDefault?: () => Promise<void>;
  onDelete?: () => void;
}) {
  const tinted = () => props.selected ?? !props.selectable;
  const [settingDefault, setSettingDefault] = createSignal(false);
  const body = (
    <span class="flex min-w-0 flex-1 flex-col gap-0.5">
      <span class="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span class="font-semibold text-ink">{props.address.recipientName}</span>
        <span class="text-sm text-ink-gray">{formatAddressPhone(props.address)}</span>
        <Show when={props.address.isDefault}>
          <Badge tone="success">ค่าเริ่มต้น</Badge>
        </Show>
      </span>
      <span class="text-sm text-ink">{formatAddress(props.address)}</span>
    </span>
  );

  return (
    <div
      class="flex w-full items-start gap-3 rounded-card border p-4 transition-colors duration-150"
      // No pink outline — the chosen address is the pink-tinted card (+ its radio dot in the list).
      classList={{
        "border-transparent bg-surface-pink": tinted(),
        "border-surface-gray bg-white": !tinted(),
        "lg:hover:border-brand-pink/50": props.selectable && !tinted(),
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
        <Show when={props.onDelete}>
          <button
            type="button"
            onClick={props.onDelete}
            class="min-h-6 text-xs text-ink-gray underline lg:hover:text-system-red"
            aria-label={`ลบที่อยู่ของ ${props.address.recipientName}`}
          >
            ลบ
          </button>
        </Show>
      </div>
    </div>
  );
}

type FieldKey = "firstName" | "lastName" | "phone" | "addressLine" | "province" | "district" | "subDistrict" | "postalCode";
const FIELD_ORDER: FieldKey[] = ["firstName", "lastName", "phone", "addressLine", "province", "district", "subDistrict", "postalCode"];

/** The saved model keeps one `recipientName`; the form edits it as first + last name ("กมลชนก ใจดี" → "กมลชนก" / "ใจดี"). */
function splitName(full: string | undefined): { first: string; last: string } {
  const [first = "", ...rest] = (full ?? "").trim().split(/\s+/);
  return { first, last: rest.join(" ") };
}
const POSTAL_PATTERN = /^\d{5}$/;
/** Outside +66 we don't know each country's numbering plan — just 6–12 digits. */
const FOREIGN_PHONE_PATTERN = /^(?=(?:\D*\d){6,12}\D*$)\d[\d-]*$/;

export function AddressForm(props: {
  initial?: Address;
  /** A new address's starting values (e.g. the shipping address copied into the billing form); still saved as a new address. */
  prefill?: Partial<Address>;
  newAddressLabel: string;
  companyAllowed?: boolean;
  showDefaultOption?: boolean;
  /** First saved shipping address always becomes the default. */
  forceDefault?: boolean;
  canCancel: boolean;
  onCancel: () => void;
  onSubmit: (address: Address, makeDefault: boolean) => Promise<void>;
  /** Overrides the new-address button label ("ใช้ที่อยู่นี้" is checkout wording). */
  submitLabel?: string;
  /** Kind given to a new address ("billing" from a billing form). */
  kind?: Address["kind"];
  /**
   * Hands the parent a "validate as if submitted" check — Checkout's "ชำระเงิน" runs it on an open,
   * unsaved form so every empty/invalid field shows its error too (true = all fields valid).
   */
  onRegisterValidate?: (validate: () => boolean) => void;
}) {
  const formId = createUniqueId();
  const fieldId = (key: FieldKey) => `${formId}-${key}`;
  // Editing shows the address itself; a new one may start from `prefill`.
  const seed = props.initial ?? props.prefill;
  // A prefilled company name stays whole in "ชื่อ หรือชื่อบริษัท" instead of being split at its first space.
  const initialName = props.companyAllowed && !props.initial && props.prefill?.recipientName ? { first: props.prefill.recipientName, last: "" } : splitName(seed?.recipientName);
  const [values, setValues] = createSignal<Record<FieldKey, string>>({
    firstName: initialName.first,
    lastName: initialName.last,
    phone: seed?.phone ?? "",
    addressLine: seed?.addressLine ?? "",
    province: seed?.province ?? "",
    district: stripAreaPrefix(seed?.district ?? ""),
    subDistrict: stripAreaPrefix(seed?.subDistrict ?? ""),
    postalCode: seed?.postalCode ?? "",
  });
  const [phoneCode, setPhoneCode] = createSignal(seed?.phoneCountryCode ?? DEFAULT_PHONE_COUNTRY_CODE);
  const thaiPhone = () => phoneCode() === DEFAULT_PHONE_COUNTRY_CODE;
  const [makeDefault, setMakeDefault] = createSignal(props.forceDefault || !!props.initial?.isDefault);
  const [touched, setTouched] = createSignal<Partial<Record<FieldKey, boolean>>>({});
  const [submitted, setSubmitted] = createSignal(false);
  const [status, setStatus] = createSignal<"idle" | "saving" | "error">("idle");

  const v = (key: FieldKey) => values()[key];
  const touch = (key: FieldKey) => setTouched((prev) => ({ ...prev, [key]: true }));
  const set = (key: FieldKey, value: string) => setValues((prev) => ({ ...prev, [key]: value }));
  const bkk = () => isBangkok(v("province"));
  const districtLabel = () => (bkk() ? "เขต" : "อำเภอ");
  const subDistrictLabel = () => (bkk() ? "แขวง" : "ตำบล");

  // Cascading lookup — each level only offers what belongs to the one above it.
  // Loaded lazily on the client (onMount), so SSR and hydration render the same empty selects.
  const [loadData, setLoadData] = createSignal(false);
  onMount(() => setLoadData(true));
  const [geo] = createResource(loadData, (go) => (go ? loadThaiAddressData() : undefined));
  const districtOptions = () => (geo() ? districtsOf(geo()!, v("province")) : []);
  const subDistrictOptions = () => (geo() ? subDistrictsOf(geo()!, v("province"), v("district")) : []);
  const postalOptions = () => (geo() && v("district") ? postalCodesOf(geo()!, v("province"), v("district"), v("subDistrict")) : []);

  // Changing a level clears everything below it — and un-touches those fields, so a just-cleared
  // dropdown doesn't greet the shopper with an error before they've had a chance to pick.
  // A single possible postal code fills itself in.
  const untouch = (...keys: FieldKey[]) => setTouched((prev) => ({ ...prev, ...Object.fromEntries(keys.map((k) => [k, false])) }));
  const pickProvince = (value: string) => {
    setValues((prev) => ({ ...prev, province: value, district: "", subDistrict: "", postalCode: "" }));
    untouch("district", "subDistrict", "postalCode");
    touch("province");
  };
  const pickDistrict = (value: string) => {
    setValues((prev) => ({ ...prev, district: value, subDistrict: "", postalCode: "" }));
    untouch("subDistrict", "postalCode");
    touch("district");
  };
  const pickSubDistrict = (value: string) => {
    setValues((prev) => ({ ...prev, subDistrict: value }));
    const codes = postalOptions();
    set("postalCode", codes.length === 1 ? codes[0] : codes.includes(v("postalCode")) ? v("postalCode") : "");
    touch("subDistrict");
  };

  // Messages say what to fix, not just that something's wrong.
  const errorFor = (key: FieldKey): string | undefined => {
    const value = v(key).trim();
    switch (key) {
      case "firstName":
        return value ? undefined : props.companyAllowed ? "กรุณากรอกชื่อ หรือชื่อบริษัท" : "กรุณากรอกชื่อ";
      case "lastName":
        return value || props.companyAllowed ? undefined : "กรุณากรอกนามสกุล";
      case "phone":
        if (!value) return "กรุณากรอกเบอร์โทรศัพท์";
        if (!thaiPhone()) return FOREIGN_PHONE_PATTERN.test(value) ? undefined : "เบอร์โทรต้องเป็นตัวเลข 6-12 หลัก";
        return PHONE_PATTERN.test(value) ? undefined : "เบอร์โทรต้องเป็นตัวเลข 9-10 หลัก ขึ้นต้นด้วย 0 เช่น 081-234-5678";
      case "addressLine":
        return value ? undefined : "กรุณากรอกที่อยู่ (บ้านเลขที่ ถนน)";
      case "province":
        return value ? undefined : "กรุณาเลือกจังหวัด";
      case "district":
        return value ? undefined : `กรุณาเลือก${districtLabel()}`;
      case "subDistrict":
        return value ? undefined : `กรุณาเลือก${subDistrictLabel()}`;
      case "postalCode":
        if (!value) return "กรุณาเลือกรหัสไปรษณีย์";
        return POSTAL_PATTERN.test(value) ? undefined : "รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก เช่น 10110";
    }
  };
  // Errors appear once a field is left (blur) or on submit — not while typing the first time.
  // After a submit attempt every field shows its error at once and updates live as it's fixed.
  const shownError = (key: FieldKey) => (submitted() || touched()[key] ? errorFor(key) : undefined);
  const validateAll = () => {
    setSubmitted(true);
    return !FIELD_ORDER.some((key) => errorFor(key));
  };
  props.onRegisterValidate?.(validateAll);

  // Mobile: keep the focused field clear of the on-screen keyboard and the fixed order-summary bar.
  const onFocusIn = (e: FocusEvent) => {
    const el = e.target as HTMLElement;
    if (window.innerWidth >= 1024 || isValidationFocus() || !(el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement)) return;
    setTimeout(() => el.scrollIntoView({ block: "center", behavior: "smooth" }), 300);
  };

  const submit = async (e: SubmitEvent) => {
    e.preventDefault();
    if (!validateAll()) {
      focusFirstInvalid(e.currentTarget as HTMLFormElement);
      return;
    }
    setStatus("saving");
    try {
      const t = (k: FieldKey) => v(k).trim();
      await props.onSubmit(
        {
          id: props.initial?.id ?? `addr-${Date.now()}`,
          label: props.initial?.label ?? props.newAddressLabel,
          recipientName: [t("firstName"), t("lastName")].filter(Boolean).join(" "),
          phone: t("phone"),
          phoneCountryCode: phoneCode(),
          addressLine: t("addressLine"),
          province: t("province"),
          district: t("district"),
          subDistrict: t("subDistrict"),
          postalCode: t("postalCode"),
          isDefault: props.initial?.isDefault,
          kind: props.initial?.kind ?? props.kind,
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
      {/* ชื่อ | นามสกุล — always side by side. */}
      <div class="grid grid-cols-2 gap-3 sm:gap-4">
        <TextField
          id={fieldId("firstName")}
          label={props.companyAllowed ? "ชื่อ หรือชื่อบริษัท" : "ชื่อ"}
          required
          autocomplete={props.companyAllowed ? "name" : "given-name"}
          enterkeyhint="next"
          value={v("firstName")}
          onInput={(e) => set("firstName", e.currentTarget.value)}
          onBlur={() => touch("firstName")}
          error={shownError("firstName")}
        />
        <TextField
          id={fieldId("lastName")}
          label="นามสกุล"
          required={!props.companyAllowed}
          autocomplete="family-name"
          enterkeyhint="next"
          value={v("lastName")}
          onInput={(e) => set("lastName", e.currentTarget.value)}
          onBlur={() => touch("lastName")}
          error={shownError("lastName")}
        />
      </div>
      {/* Order: name → phone → address line (full row) → จังหวัด | อำเภอ/เขต → ตำบล/แขวง | รหัสไปรษณีย์ — same on every width. */}
      <PhoneField
        id={fieldId("phone")}
        code={phoneCode()}
        onCodeChange={(code) => {
          setPhoneCode(code);
          touch("phone");
        }}
        thai={thaiPhone()}
        value={v("phone")}
        onInput={(value) => set("phone", value)}
        onBlur={() => touch("phone")}
        error={shownError("phone")}
      />

      <AddressLineField
        id={fieldId("addressLine")}
        value={v("addressLine")}
        onInput={(value) => set("addressLine", value)}
        onBlur={() => touch("addressLine")}
        error={shownError("addressLine")}
      />

      {/* Two selects per row on every width — the cascade reads left→right, top→bottom. Compact on phones (tighter padding). */}
      <div class="grid grid-cols-2 gap-3 sm:gap-4">
        <SelectField
          compact
          id={fieldId("province")}
          label="จังหวัด"
          placeholder="เลือก"
          autocomplete="address-level1"
          options={THAI_PROVINCES}
          value={v("province")}
          onChange={pickProvince}
          error={shownError("province")}
        />
        <SelectField
          compact
          id={fieldId("district")}
          label={districtLabel()}
          placeholder={!v("province") ? "-" : geo.loading ? "..." : "เลือก"}
          autocomplete="address-level2"
          options={districtOptions()}
          disabled={!v("province") || !geo()}
          value={v("district")}
          onChange={pickDistrict}
          error={shownError("district")}
        />
      </div>
      <div class="grid grid-cols-2 gap-3 sm:gap-4">
        <SelectField
          compact
          id={fieldId("subDistrict")}
          label={subDistrictLabel()}
          placeholder={!v("district") ? "-" : "เลือก"}
          autocomplete="address-level3"
          options={subDistrictOptions()}
          disabled={!v("district")}
          value={v("subDistrict")}
          onChange={pickSubDistrict}
          error={shownError("subDistrict")}
        />
        <SelectField
          compact
          id={fieldId("postalCode")}
          label="รหัสไปรษณีย์"
          placeholder={!v("district") ? "-" : "เลือก"}
          autocomplete="postal-code"
          options={postalOptions()}
          disabled={!v("district")}
          value={v("postalCode")}
          onChange={(value) => {
            set("postalCode", value);
            touch("postalCode");
          }}
          error={shownError("postalCode")}
        />
      </div>
      {/* Phones: the half-width selects can truncate long names ("ป้อมปราบศัตรูพ่าย") — spell the pick out in full. */}
      <Show when={v("district")}>
        <p class="-mt-2 text-xs leading-[1.75] text-ink-gray sm:hidden" aria-live="polite">
          {[`${districtLabel()}${v("district")}`, v("subDistrict") && `${subDistrictLabel()}${v("subDistrict")}`, v("province"), v("postalCode")].filter(Boolean).join(" ")}
        </p>
      </Show>

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
          {props.initial ? "บันทึกการแก้ไข" : (props.submitLabel ?? "ใช้ที่อยู่นี้")}
        </Button>
      </div>
    </form>
  );
}

/**
 * ที่อยู่ (บ้านเลขที่ ถนน) — full row on every width, and a 2-line box (same border/label/error
 * treatment as `TextField`) so long Thai addresses wrap instead of scrolling sideways. Grows with
 * its text (`field-sizing: content`, else the input handler); still one line of data — Enter and
 * pasted line breaks become nothing / a space.
 */
function AddressLineField(props: { id: string; value: string; onInput: (value: string) => void; onBlur: () => void; error?: string }) {
  const errorId = `${props.id}-error`;
  const grow = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  };
  return (
    <div class="flex flex-col gap-1.5">
      <FieldLabel for={props.id} label="ที่อยู่ (บ้านเลขที่ ถนน)" required />
      <textarea
        id={props.id}
        rows={2}
        autocomplete="street-address"
        enterkeyhint="next"
        placeholder="บ้านเลขที่ หมู่บ้าน/อาคาร ซอย ถนน"
        aria-required="true"
        aria-invalid={!!props.error}
        aria-describedby={props.error ? errorId : undefined}
        value={props.value}
        onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
        onInput={(e) => {
          const el = e.currentTarget;
          const clean = el.value.replace(/\s*\n\s*/g, " ");
          if (clean !== el.value) el.value = clean;
          props.onInput(clean);
          grow(el);
        }}
        onBlur={props.onBlur}
        class={`min-h-[84px] w-full resize-none rounded-card border bg-surface-card px-4 py-2.5 text-base leading-[1.75] text-ink outline-none transition-colors duration-150 [field-sizing:content] placeholder:text-ink-placeholder focus:border-brand-pink ${fieldBorderClass(props.error)}`}
      />
      <FieldError id={errorId} message={props.error} />
    </div>
  );
}

/**
 * เบอร์โทรศัพท์ with a country-code prefix — one bordered box like `TextField`: a compact
 * "🇹🇭 +66 ⌄" segment (a transparent native `<select>` laid over it, so phones get the OS
 * picker and the list reads "+66 ประเทศไทย") in front of the number input.
 */
function PhoneField(props: {
  id: string;
  code: string;
  onCodeChange: (code: string) => void;
  /** +66 — Thai number format (leading 0, 9–10 digits). */
  thai: boolean;
  value: string;
  onInput: (value: string) => void;
  onBlur: () => void;
  error?: string;
}) {
  const errorId = `${props.id}-error`;
  // The row the shopper picked — keeps e.g. Canada's flag for "+1" (shared with the US); otherwise the code's first row.
  const [picked, setPicked] = createSignal<CountryCode>();
  const current = () => (picked()?.code === props.code ? picked()! : findCountryCode(props.code));
  return (
    <div class="flex flex-col gap-1.5">
      <FieldLabel for={props.id} label="เบอร์โทรศัพท์" required />
      <div
        class={`flex h-11 rounded-card border bg-surface-card transition-colors duration-150 focus-within:border-brand-pink ${fieldBorderClass(props.error)}`}
      >
        <div class="relative flex shrink-0 items-center gap-1 border-r border-border pl-3 pr-2 text-base text-ink">
          <span aria-hidden="true">{current().flag}</span>
          <span aria-hidden="true">{current().code}</span>
          <ChevronIcon direction="down" class="size-4 text-ink-gray" />
          <select
            aria-label="รหัสประเทศ"
            autocomplete="tel-country-code"
            value={String(PHONE_COUNTRY_CODES.indexOf(current()))}
            onChange={(e) => {
              const row = PHONE_COUNTRY_CODES[Number(e.currentTarget.value)];
              setPicked(row);
              props.onCodeChange(row.code);
            }}
            class="absolute inset-0 size-full cursor-pointer appearance-none opacity-0"
          >
            <For each={PHONE_COUNTRY_CODES}>
              {(c, i) => (
                <option value={String(i())} selected={c === current()}>
                  {`${c.flag} ${c.country} (${c.code})`}
                </option>
              )}
            </For>
          </select>
        </div>
        <input
          id={props.id}
          type="tel"
          inputMode="tel"
          autocomplete="tel-national"
          enterkeyhint="next"
          placeholder={props.thai ? "08X-XXX-XXXX" : "เบอร์โทรศัพท์"}
          maxlength={props.thai ? 12 : 15}
          aria-required="true"
          aria-invalid={!!props.error}
          aria-describedby={props.error ? errorId : undefined}
          value={props.value}
          onInput={(e) => props.onInput(e.currentTarget.value.replace(/[^\d-]/g, ""))}
          onBlur={props.onBlur}
          class="min-w-0 flex-1 rounded-r-card bg-transparent px-3 text-base text-ink outline-none placeholder:text-ink-placeholder sm:px-4"
        />
      </div>
      <FieldError id={errorId} message={props.error} />
    </div>
  );
}

/**
 * Same visual/label/error treatment as `TextField`, for the address pick-lists
 * (จังหวัด → เขต/อำเภอ → แขวง/ตำบล → รหัสไปรษณีย์). Native `<select>` on purpose:
 * on phones it opens the OS picker, which handles long lists best.
 */
function SelectField(props: {
  id: string;
  label: string;
  placeholder: string;
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
  autocomplete?: string;
  disabled?: boolean;
  error?: string;
  /** Half-width column on phones: tighter side padding + smaller chevron. */
  compact?: boolean;
}) {
  const errorId = `${props.id}-error`;
  return (
    <div class="flex flex-col gap-1.5">
      <FieldLabel for={props.id} label={props.label} required />
      <div class="relative">
        <select
          id={props.id}
          value={props.value}
          autocomplete={props.autocomplete}
          disabled={props.disabled}
          aria-required="true"
          aria-invalid={!!props.error}
          aria-describedby={props.error ? errorId : undefined}
          onChange={(e) => props.onChange(e.currentTarget.value)}
          class={`h-11 w-full appearance-none truncate rounded-card border bg-surface-card text-base outline-none ${props.compact ? "pl-3 pr-6 sm:pl-4 sm:pr-10" : "pl-4 pr-10"} transition-colors duration-150 focus:border-brand-pink disabled:cursor-not-allowed disabled:bg-surface-gray/60 ${fieldBorderClass(props.error)} ${props.value ? "text-ink" : "text-ink-placeholder"}`}
        >
          <option value="" disabled selected={!props.value}>
            {props.placeholder}
          </option>
          <For each={props.options}>{(option) => <option value={option} selected={option === props.value}>{option}</option>}</For>
        </select>
        <span
          class={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-ink-gray ${props.compact ? "right-2 sm:right-4" : "right-4"}`}
          aria-hidden="true"
        >
          <ChevronIcon direction="down" class={props.compact ? "size-3.5 sm:size-5" : "size-5"} />
        </span>
      </div>
      <FieldError id={errorId} message={props.error} />
    </div>
  );
}
