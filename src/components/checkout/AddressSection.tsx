import { createEffect, createResource, createSignal, createUniqueId, For, on, onMount, Show } from "solid-js";
import { formatAddress, isBangkok, THAI_PROVINCES, type Address } from "~/lib/checkoutData";
import { PHONE_PATTERN } from "~/lib/validators";
import { districtsOf, loadThaiAddressData, postalCodesOf, stripAreaPrefix, subDistrictsOf } from "~/lib/thaiAddress";
import { TextField } from "../shared/TextField";
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
          companyAllowed={props.companyAllowed}
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
        "border-transparent bg-surface-pink": !props.selectable || props.selected,
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

type FieldKey = "firstName" | "lastName" | "phone" | "addressLine" | "province" | "district" | "subDistrict" | "postalCode";
const FIELD_ORDER: FieldKey[] = ["firstName", "lastName", "phone", "addressLine", "province", "district", "subDistrict", "postalCode"];

/** The saved model keeps one `recipientName`; the form edits it as first + last name ("กมลชนก ใจดี" → "กมลชนก" / "ใจดี"). */
function splitName(full: string | undefined): { first: string; last: string } {
  const [first = "", ...rest] = (full ?? "").trim().split(/\s+/);
  return { first, last: rest.join(" ") };
}
const POSTAL_PATTERN = /^\d{5}$/;

function AddressForm(props: {
  initial?: Address;
  newAddressLabel: string;
  companyAllowed?: boolean;
  showDefaultOption?: boolean;
  /** First saved shipping address always becomes the default. */
  forceDefault?: boolean;
  canCancel: boolean;
  onCancel: () => void;
  onSubmit: (address: Address, makeDefault: boolean) => Promise<void>;
}) {
  const formId = createUniqueId();
  const fieldId = (key: FieldKey) => `${formId}-${key}`;
  const initialName = splitName(props.initial?.recipientName);
  const [values, setValues] = createSignal<Record<FieldKey, string>>({
    firstName: initialName.first,
    lastName: initialName.last,
    phone: props.initial?.phone ?? "",
    addressLine: props.initial?.addressLine ?? "",
    province: props.initial?.province ?? "",
    district: stripAreaPrefix(props.initial?.district ?? ""),
    subDistrict: stripAreaPrefix(props.initial?.subDistrict ?? ""),
    postalCode: props.initial?.postalCode ?? "",
  });
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
        if (!value) return "กรุณากรอกเบอร์โทรศัพท์ผู้รับ";
        return PHONE_PATTERN.test(value) ? undefined : "เบอร์โทรต้องเป็นตัวเลข 9–10 หลัก ขึ้นต้นด้วย 0 เช่น 081-234-5678";
      case "addressLine":
        return value ? undefined : "กรุณากรอกบ้านเลขที่ หมู่บ้าน/อาคาร ซอย ถนน";
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
  const shownError = (key: FieldKey) => (submitted() || touched()[key] ? errorFor(key) : undefined);
  
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
      const t = (k: FieldKey) => v(k).trim();
      await props.onSubmit(
        {
          id: props.initial?.id ?? `addr-${Date.now()}`,
          label: props.initial?.label ?? props.newAddressLabel,
          recipientName: [t("firstName"), t("lastName")].filter(Boolean).join(" "),
          phone: t("phone"),
          addressLine: t("addressLine"),
          province: t("province"),
          district: t("district"),
          subDistrict: t("subDistrict"),
          postalCode: t("postalCode"),
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

      <SelectField
        id={fieldId("province")}
        label="จังหวัด"
        placeholder="เลือกจังหวัด"
        autocomplete="address-level1"
        options={THAI_PROVINCES}
        value={v("province")}
        onChange={pickProvince}
        error={shownError("province")}
      />
      {/* เขต/อำเภอ | แขวง/ตำบล | รหัสไปรษณีย์ — always one row (compact selects; labels name each field, so placeholders stay short). */}
      {/* Postal column fixed at 88px on phones so all 5 digits always show; the two name columns share the rest. */}
      <div class="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_88px] gap-2 sm:grid-cols-3 sm:gap-4">
        <SelectField
          compact
          id={fieldId("district")}
          label={districtLabel()}
          placeholder={!v("province") ? "—" : geo.loading ? "…" : "เลือก"}
          autocomplete="address-level2"
          options={districtOptions()}
          disabled={!v("province") || !geo()}
          value={v("district")}
          onChange={pickDistrict}
          error={shownError("district")}
        />
        <SelectField
          compact
          id={fieldId("subDistrict")}
          label={subDistrictLabel()}
          placeholder={!v("district") ? "—" : "เลือก"}
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
          placeholder={!v("district") ? "—" : "เลือก"}
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
      {/* Phones: the three narrow selects truncate long names ("ป้อมปราบศัตรูพ่าย") — spell the pick out in full. */}
      <Show when={v("district")}>
        <p class="-mt-2 text-xs text-ink-gray sm:hidden" aria-live="polite">
          {[`${districtLabel()}${v("district")}`, v("subDistrict") && `${subDistrictLabel()}${v("subDistrict")}`, v("postalCode")].filter(Boolean).join(" ")}
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
          {props.initial ? "บันทึกการแก้ไข" : "ใช้ที่อยู่นี้"}
        </Button>
      </div>
    </form>
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
  /** Narrow column (3 per row on phones): tighter side padding + smaller chevron. */
  compact?: boolean;
}) {
  const errorId = `${props.id}-error`;
  return (
    <div class="flex flex-col gap-1.5">
      <label for={props.id} class="text-sm font-medium text-ink">
        {props.label}
        <span class="text-system-red" aria-hidden="true">
          {" "}
          *
        </span>
      </label>
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
          class={`h-11 w-full appearance-none truncate rounded-card border bg-surface-card text-base outline-none ${props.compact ? "pl-3 pr-6 sm:pl-4 sm:pr-10" : "pl-4 pr-10"} transition-colors duration-150 focus:border-brand-pink disabled:cursor-not-allowed disabled:bg-surface-gray/60 ${
            props.error ? "border-system-red" : "border-border"
          } ${props.value ? "text-ink" : "text-ink-placeholder"}`}
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
      <Show when={props.error}>
        <p id={errorId} role="alert" class="text-sm text-system-red">
          {props.error}
        </p>
      </Show>
    </div>
  );
}
