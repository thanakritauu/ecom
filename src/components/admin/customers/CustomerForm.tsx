import { createEffect, createResource, createSignal, For, Index, onMount, Show, type JSX } from "solid-js";
import { TextField } from "~/components/shared/TextField";
import { Button } from "~/components/shared/Button";
import { AdminFloatingBar } from "~/components/admin/AdminFloatingBar";
import { ChevronDownIcon, PlusIcon } from "~/components/admin/icons";
import { Toggle } from "~/components/admin/Toggle";
import { FormErrorSummary } from "~/components/admin/FormErrorSummary";
import { reportFormErrors, type FormErrors } from "~/lib/adminFormValidation";
import {
  GENDER_LABEL,
  isValidEmail,
  type Customer,
  type CustomerAddress,
  type CustomerFormValues,
  type CustomerGender,
} from "~/lib/adminCustomers";
import { isBangkok, THAI_PROVINCES } from "~/lib/checkoutData";
import { districtsOf, loadThaiAddressData, postalCodesOf, stripAreaPrefix, subDistrictsOf } from "~/lib/thaiAddress";

const GENDER_OPTIONS: { value: CustomerGender; label: string }[] = (Object.keys(GENDER_LABEL) as CustomerGender[]).map((value) => ({ value, label: GENDER_LABEL[value] }));

const BASE_LABELS: Record<string, string> = { firstName: "ชื่อ", lastName: "นามสกุล", email: "อีเมล", phone: "เบอร์โทรศัพท์" };
const ADDRESS_FIELD_LABELS: Record<string, string> = {
  recipientName: "ชื่อผู้รับ",
  phone: "เบอร์โทรศัพท์",
  addressLine: "ที่อยู่",
  province: "จังหวัด",
  district: "อำเภอ/เขต",
  subDistrict: "ตำบล/แขวง",
  postalCode: "รหัสไปรษณีย์",
};
/** `addr-0-phone` reads as "ที่อยู่ที่ 1 เบอร์โทรศัพท์". */
function customerLabel(key: string): string {
  const m = /^addr-(\d+)-(\w+)$/.exec(key);
  if (!m) return BASE_LABELS[key] ?? key;
  return `ที่อยู่ที่ ${Number(m[1]) + 1} ${ADDRESS_FIELD_LABELS[m[2]] ?? m[2]}`;
}
const labelsFor = (errors: FormErrors) => Object.fromEntries(Object.keys(errors).map((k) => [k, customerLabel(k)]));
/** Same rule as the storefront address form for any number (Thai or foreign): 6-12 digits. */
const isValidPhone = (value: string) => /^\+?[\d\s-]+$/.test(value) && value.replace(/\D/g, "").length >= 6 && value.replace(/\D/g, "").length <= 12;

let draftAddressId = 0;
const emptyAddress = (kind?: "billing"): CustomerAddress => ({
  id: `addr-admin-${Date.now()}-${draftAddressId++}`,
  label: kind === "billing" ? "ที่อยู่ออกใบกำกับภาษี" : "",
  recipientName: "",
  phone: "",
  addressLine: "",
  province: "",
  district: "",
  subDistrict: "",
  postalCode: "",
  kind,
});

/**
 * The customer edit form (customers are created by storefront sign-ups,
 * never in Admin). Profile fields mirror the storefront's "ข้อมูลส่วนตัว"
 * page (birth date + gender, same labels); the address book mirrors
 * `/account/address` (shipping addresses + ที่อยู่ออกใบกำกับภาษี, which may
 * be a company and never holds the default).
 */
export function CustomerForm(props: {
  initial?: Customer;
  submitLabel: string;
  isEmailTaken: (email: string) => boolean;
  isPhoneTaken: (phone: string) => boolean;
  onSubmit: (values: CustomerFormValues) => Promise<void>;
  onCancel: () => void;
}) {
  const [firstName, setFirstName] = createSignal(props.initial?.firstName ?? "");
  const [lastName, setLastName] = createSignal(props.initial?.lastName ?? "");
  const [email, setEmail] = createSignal(props.initial?.email ?? "");
  const [phone, setPhone] = createSignal(props.initial?.phone ?? "");
  const [birthDate, setBirthDate] = createSignal(props.initial?.birthDate ?? "");
  const [gender, setGender] = createSignal<CustomerGender | "">(props.initial?.gender ?? "");
  // Bare district/sub-district names, to match the lookup dataset (saved addresses may carry a เขต/แขวง prefix).
  const [addresses, setAddresses] = createSignal<CustomerAddress[]>(
    (props.initial?.addresses ?? []).map((a) => ({ ...a, district: stripAreaPrefix(a.district), subDistrict: stripAreaPrefix(a.subDistrict) })),
  );

  // Same cascade as the storefront address form (AddressSection): province → district → sub-district → postal
  // code, each level only offering what belongs to the one above. Lazy-loaded on the client (onMount), so SSR
  // and hydration render the same selects.
  const [loadGeo, setLoadGeo] = createSignal(false);
  onMount(() => setLoadGeo(true));
  const [geo] = createResource(loadGeo, (go) => (go ? loadThaiAddressData() : undefined));

  const patchAddress = (index: number, patch: Partial<CustomerAddress>) =>
    setAddresses((list) => list.map((a, i) => (i === index ? { ...a, ...patch } : patch.isDefault ? { ...a, isDefault: false } : a)));
  const removeAddress = (index: number) => setAddresses((list) => list.filter((_, i) => i !== index));
  const addAddress = (kind?: "billing") => setAddresses((list) => [...list, emptyAddress(kind)]);

  const [errors, setErrors] = createSignal<FormErrors>({});
  const [submitted, setSubmitted] = createSignal(false);
  const [saving, setSaving] = createSignal(false);
  const [submitError, setSubmitError] = createSignal<string>();

  const validate = (): Record<string, string> => {
    const next: Record<string, string> = {};
    if (!firstName().trim()) next.firstName = "กรุณากรอกชื่อ";
    if (!lastName().trim()) next.lastName = "กรุณากรอกนามสกุล";

    const cleanEmail = email().trim();
    if (!cleanEmail) next.email = "กรุณากรอกอีเมล";
    else if (!isValidEmail(cleanEmail)) next.email = "กรุณากรอกอีเมลที่ถูกต้อง";
    else if (props.isEmailTaken(cleanEmail)) next.email = "อีเมลนี้ถูกใช้งานแล้ว";

    const cleanPhone = phone().trim();
    if (!cleanPhone) next.phone = "กรุณากรอกเบอร์โทรศัพท์";
    else if (!isValidPhone(cleanPhone)) next.phone = "เบอร์โทรต้องเป็นตัวเลข 6-12 หลัก";
    else if (props.isPhoneTaken(cleanPhone)) next.phone = "เบอร์โทรศัพท์นี้ถูกใช้งานแล้ว";

    // Same required fields as the storefront address form.
    addresses().forEach((a, i) => {
      const billing = a.kind === "billing";
      if (!a.recipientName.trim()) next[`addr-${i}-recipientName`] = billing ? "กรุณากรอกชื่อ หรือชื่อบริษัท" : "กรุณากรอกชื่อผู้รับ";
      if (!a.phone.trim()) next[`addr-${i}-phone`] = "กรุณากรอกเบอร์โทรศัพท์";
      else if (!isValidPhone(a.phone.trim())) next[`addr-${i}-phone`] = "เบอร์โทรต้องเป็นตัวเลข 6-12 หลัก";
      if (!a.addressLine.trim()) next[`addr-${i}-addressLine`] = "กรุณากรอกที่อยู่";
      if (!a.province) next[`addr-${i}-province`] = "กรุณาเลือกจังหวัด";
      if (!a.district.trim()) next[`addr-${i}-district`] = isBangkok(a.province) ? "กรุณาเลือกเขต" : "กรุณาเลือกอำเภอ";
      if (!a.subDistrict.trim()) next[`addr-${i}-subDistrict`] = isBangkok(a.province) ? "กรุณาเลือกแขวง" : "กรุณาเลือกตำบล";
      if (!/^\d{5}$/.test(a.postalCode.trim())) next[`addr-${i}-postalCode`] = "กรุณาเลือกรหัสไปรษณีย์";
    });

    return next;
  };

  // After a failed save, drop each error as soon as its field is fixed (never adds new ones while typing).
  createEffect(() => {
    if (!submitted()) return;
    const now = validate();
    setErrors((prev) => Object.fromEntries(Object.keys(prev).filter((k) => k in now).map((k) => [k, now[k]])));
  });

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    setSubmitted(true);
    if (reportFormErrors(nextErrors, labelsFor(nextErrors))) return;

    const values: CustomerFormValues = {
      firstName: firstName().trim(),
      lastName: lastName().trim(),
      email: email().trim(),
      phone: phone().trim(),
      birthDate: birthDate() || undefined,
      gender: gender() || undefined,
      addresses: withDefault(
        addresses().map((a) => ({
          ...a,
          label: a.label.trim() || (a.kind === "billing" ? "ที่อยู่ออกใบกำกับภาษี" : "ที่อยู่"),
          recipientName: a.recipientName.trim(),
          phone: a.phone.trim(),
          addressLine: a.addressLine.trim(),
          district: a.district.trim(),
          subDistrict: a.subDistrict.trim(),
          postalCode: a.postalCode.trim(),
          // Billing never holds the default — same rule as the storefront.
          isDefault: a.kind === "billing" ? undefined : a.isDefault || undefined,
        })),
      ),
    };

    setSaving(true);
    setSubmitError(undefined);
    try {
      await props.onSubmit(values);
    } catch {
      setSubmitError("บันทึกลูกค้าไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate class="flex flex-col gap-6">
      <FormErrorSummary errors={errors()} labels={labelsFor(errors())} />
      <Section title="ข้อมูลส่วนตัว">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            label="ชื่อ"
            required
            placeholder="สมหญิง"
            value={firstName()}
            onInput={(e) => setFirstName(e.currentTarget.value)}
            data-field="firstName"
            error={errors().firstName}
            disabled={saving()}
          />
          <TextField
            label="นามสกุล"
            required
            placeholder="ใจดี"
            value={lastName()}
            onInput={(e) => setLastName(e.currentTarget.value)}
            data-field="lastName"
            error={errors().lastName}
            disabled={saving()}
          />
          <TextField
            label="อีเมล"
            required
            type="email"
            placeholder="customer@example.com"
            value={email()}
            onInput={(e) => setEmail(e.currentTarget.value)}
            data-field="email"
            error={errors().email}
            disabled={saving()}
          />
          <TextField
            label="เบอร์โทรศัพท์"
            required
            placeholder="081-234-5678"
            value={phone()}
            onInput={(e) => setPhone(e.currentTarget.value)}
            data-field="phone"
            error={errors().phone}
            disabled={saving()}
          />
          <TextField label="วันเกิด" type="date" value={birthDate()} onInput={(e) => setBirthDate(e.currentTarget.value)} disabled={saving()} />
          <SelectField label="เพศ" value={gender()} disabled={saving()} onChange={(v) => setGender(v as CustomerGender | "")}>
            <option value="">ไม่ระบุ</option>
            <For each={GENDER_OPTIONS}>{(opt) => <option value={opt.value}>{opt.label}</option>}</For>
          </SelectField>
        </div>
      </Section>

      <Section title="สมุดที่อยู่">
        <Show when={addresses().length > 0} fallback={<p class="text-sm text-ink-gray">ยังไม่มีที่อยู่ ลูกค้าเพิ่มเองได้ในหน้าบัญชีของฉัน หรือเพิ่มที่นี่</p>}>
          <div class="flex flex-col gap-4">
            <Index each={addresses()}>
              {(a, i) => {
                const err = (field: string) => errors()[`addr-${i}-${field}`];
                const billing = () => a().kind === "billing";
                const bkk = () => isBangkok(a().province);
                // A saved value missing from the dataset stays selectable instead of silently blanking the field.
                const withCurrent = (options: string[], current: string) => (current && !options.includes(current) ? [current, ...options] : options);
                const districtOptions = () => withCurrent(geo() ? districtsOf(geo()!, a().province) : [], a().district);
                const subDistrictOptions = () => withCurrent(geo() ? subDistrictsOf(geo()!, a().province, a().district) : [], a().subDistrict);
                const postalOptions = () => withCurrent(geo() && a().district ? postalCodesOf(geo()!, a().province, a().district, a().subDistrict) : [], a().postalCode);
                // Changing a level clears everything below it; a single possible postal code fills itself in.
                const pickSubDistrict = (value: string) => {
                  const codes = geo() ? postalCodesOf(geo()!, a().province, a().district, value) : [];
                  patchAddress(i, { subDistrict: value, postalCode: codes.length === 1 ? codes[0] : codes.includes(a().postalCode) ? a().postalCode : "" });
                };
                return (
                  <div class="flex flex-col gap-4 rounded-card border border-border p-4">
                    <div class="flex flex-wrap items-center justify-between gap-2">
                      <p class="text-sm font-semibold text-ink">{billing() ? "ที่อยู่ออกใบกำกับภาษี" : "ที่อยู่จัดส่ง"}</p>
                      <Button type="button" variant="outline" size="sm" onClick={() => removeAddress(i)} disabled={saving()}>
                        ลบที่อยู่
                      </Button>
                    </div>
                    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <TextField label="ชื่อที่อยู่" placeholder={billing() ? "ที่อยู่ออกใบกำกับภาษี" : "บ้าน, ที่ทำงาน"} value={a().label} onInput={(e) => patchAddress(i, { label: e.currentTarget.value })} disabled={saving()} />
                      <SelectField
                        label="ประเภท"
                        value={billing() ? "billing" : "shipping"}
                        disabled={saving()}
                        onChange={(v) => patchAddress(i, v === "billing" ? { kind: "billing", isDefault: false } : { kind: undefined })}
                      >
                        <option value="shipping">ที่อยู่จัดส่ง</option>
                        <option value="billing">ที่อยู่ออกใบกำกับภาษี</option>
                      </SelectField>
                      <TextField
                        label={billing() ? "ชื่อ หรือชื่อบริษัท" : "ชื่อผู้รับ"}
                        required
                        value={a().recipientName}
                        onInput={(e) => patchAddress(i, { recipientName: e.currentTarget.value })}
                        data-field={`addr-${i}-recipientName`}
                        error={err("recipientName")}
                        disabled={saving()}
                      />
                      <TextField label="เบอร์โทรศัพท์" required placeholder="081-234-5678" value={a().phone} onInput={(e) => patchAddress(i, { phone: e.currentTarget.value })} data-field={`addr-${i}-phone`} error={err("phone")} disabled={saving()} />
                      <div class="sm:col-span-2">
                        <TextField
                          label="บ้านเลขที่ อาคาร ซอย ถนน"
                          required
                          placeholder="88/12 ซอยสุขุมวิท 31"
                          value={a().addressLine}
                          onInput={(e) => patchAddress(i, { addressLine: e.currentTarget.value })}
                          data-field={`addr-${i}-addressLine`}
                          error={err("addressLine")}
                          disabled={saving()}
                        />
                      </div>
                      <SelectField
                        label="จังหวัด"
                        required
                        value={a().province}
                        field={`addr-${i}-province`} error={err("province")}
                        disabled={saving()}
                        onChange={(v) => patchAddress(i, { province: v, district: "", subDistrict: "", postalCode: "" })}
                      >
                        <option value="">เลือกจังหวัด</option>
                        <For each={THAI_PROVINCES}>{(p) => <option value={p} selected={p === a().province}>{p}</option>}</For>
                      </SelectField>
                      <SelectField
                        label={bkk() ? "เขต" : "อำเภอ"}
                        required
                        value={a().district}
                        field={`addr-${i}-district`} error={err("district")}
                        disabled={saving() || !a().province || !geo()}
                        onChange={(v) => patchAddress(i, { district: v, subDistrict: "", postalCode: "" })}
                      >
                        <option value="">{!a().province ? "-" : geo.loading ? "กำลังโหลด" : bkk() ? "เลือกเขต" : "เลือกอำเภอ"}</option>
                        <For each={districtOptions()}>{(d) => <option value={d} selected={d === a().district}>{d}</option>}</For>
                      </SelectField>
                      <SelectField label={bkk() ? "แขวง" : "ตำบล"} required value={a().subDistrict} field={`addr-${i}-subDistrict`} error={err("subDistrict")} disabled={saving() || !a().district} onChange={pickSubDistrict}>
                        <option value="">{!a().district ? "-" : bkk() ? "เลือกแขวง" : "เลือกตำบล"}</option>
                        <For each={subDistrictOptions()}>{(d) => <option value={d} selected={d === a().subDistrict}>{d}</option>}</For>
                      </SelectField>
                      <SelectField label="รหัสไปรษณีย์" required value={a().postalCode} field={`addr-${i}-postalCode`} error={err("postalCode")} disabled={saving() || !a().district} onChange={(v) => patchAddress(i, { postalCode: v })}>
                        <option value="">{!a().district ? "-" : "เลือกรหัสไปรษณีย์"}</option>
                        <For each={postalOptions()}>{(c) => <option value={c} selected={c === a().postalCode}>{c}</option>}</For>
                      </SelectField>
                    </div>
                    <Show when={!billing()}>
                      <div class="flex flex-col gap-1.5">
                        <span class="text-sm font-medium text-ink">ที่อยู่จัดส่งหลัก</span>
                        <Toggle checked={!!a().isDefault} disabled={saving()} onChange={(v) => patchAddress(i, { isDefault: v })} onLabel="เป็นที่อยู่หลัก" offLabel="ไม่ใช่ที่อยู่หลัก" />
                        <span class="text-xs text-ink-gray">หน้าชำระเงินจะเลือกที่อยู่นี้ให้ก่อน</span>
                      </div>
                    </Show>
                  </div>
                );
              }}
            </Index>
          </div>
        </Show>
        <div class="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => addAddress()} disabled={saving()}>
            <PlusIcon class="size-4" /> เพิ่มที่อยู่จัดส่ง
          </Button>
          <Button type="button" variant="outline" onClick={() => addAddress("billing")} disabled={saving()}>
            <PlusIcon class="size-4" /> เพิ่มที่อยู่ออกใบกำกับภาษี
          </Button>
        </div>
      </Section>

      <Show when={submitError()}>
        <p role="alert" class="rounded-card bg-danger-soft px-4 py-3 text-sm font-medium text-danger-strong">
          {submitError()}
        </p>
      </Show>

      <AdminFloatingBar>
        <div class="flex w-full justify-end gap-3">
          <Button type="button" variant="outline" onClick={props.onCancel} disabled={saving()}>
            ยกเลิก
          </Button>
          <Button type="submit" variant="primary" loading={saving()}>
            {saving() ? "กำลังบันทึก..." : props.submitLabel}
          </Button>
        </div>
      </AdminFloatingBar>
      <div class="h-16" aria-hidden="true" />
    </form>
  );
}

/** Exactly one shipping address is the default whenever any exists — the first one if none was ticked. */
function withDefault(list: CustomerAddress[]): CustomerAddress[] {
  const shipping = list.filter((a) => a.kind !== "billing");
  if (shipping.length === 0 || shipping.some((a) => a.isDefault)) return list;
  return list.map((a) => (a === shipping[0] ? { ...a, isDefault: true } : a));
}

/** Native select in the admin select style (DSL 6). */
function SelectField(props: { label: string; value: string; required?: boolean; error?: string; disabled?: boolean; field?: string; onChange: (value: string) => void; children: JSX.Element }) {
  return (
    <label data-field={props.field} class="flex flex-col gap-1.5">
      <span class="text-sm font-medium text-ink">
        {props.label}
        <Show when={props.required}>
          <span class="text-system-red" aria-hidden="true">
            {" "}
            *
          </span>
        </Show>
      </span>
      <div class="relative">
        <select
          value={props.value}
          disabled={props.disabled}
          aria-invalid={!!props.error}
          onChange={(e) => props.onChange(e.currentTarget.value)}
          class="h-11 w-full appearance-none rounded-card border bg-surface-card pl-4 pr-9 text-sm text-ink outline-none focus:border-brand-pink disabled:cursor-not-allowed disabled:bg-surface-gray"
          classList={{ "border-system-red": !!props.error, "border-border": !props.error }}
        >
          {props.children}
        </select>
        <ChevronDownIcon class="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-gray" />
      </div>
      <Show when={props.error}>
        <p role="alert" class="text-sm text-system-red">{props.error}</p>
      </Show>
    </label>
  );
}

function Section(props: { title: string; children: JSX.Element }) {
  return (
    <div class="flex flex-col gap-4 rounded-card bg-surface-card p-4 shadow-card sm:p-5">
      <h2 class="text-base font-semibold text-ink">{props.title}</h2>
      {props.children}
    </div>
  );
}
