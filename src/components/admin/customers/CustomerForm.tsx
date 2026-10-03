import { createSignal, Show } from "solid-js";
import { TextField } from "~/components/shared/TextField";
import { Button } from "~/components/shared/Button";
import { AdminFloatingBar } from "~/components/admin/AdminFloatingBar";
import { ChevronDownIcon } from "~/components/admin/icons";
import { CUSTOMER_STATUS_META, isValidEmail, type Customer, type CustomerFormValues, type CustomerStatus } from "~/lib/adminCustomers";

const STATUS_OPTIONS: { value: CustomerStatus; label: string }[] = (Object.keys(CUSTOMER_STATUS_META) as CustomerStatus[]).map((value) => ({
  value,
  label: CUSTOMER_STATUS_META[value].label,
}));

/** One Create/Edit form shared by `/new` and `/:id/edit` — same shape as `CategoryForm`/`BrandForm`. */
export function CustomerForm(props: {
  initial?: Customer;
  mode: "create" | "edit";
  isEmailTaken: (email: string) => boolean;
  isPhoneTaken: (phone: string) => boolean;
  onSubmit: (values: CustomerFormValues) => Promise<void>;
  onCancel: () => void;
}) {
  const [firstName, setFirstName] = createSignal(props.initial?.firstName ?? "");
  const [lastName, setLastName] = createSignal(props.initial?.lastName ?? "");
  const [email, setEmail] = createSignal(props.initial?.email ?? "");
  const [phone, setPhone] = createSignal(props.initial?.phone ?? "");
  const [address, setAddress] = createSignal(props.initial?.address ?? "");
  const [status, setStatus] = createSignal<CustomerStatus>(props.initial?.status ?? "active");

  const [errors, setErrors] = createSignal<Record<string, string>>({});
  const [saving, setSaving] = createSignal(false);
  const [submitError, setSubmitError] = createSignal<string>();

  const validate = (): Record<string, string> => {
    const next: Record<string, string> = {};
    if (!firstName().trim()) next.firstName = "กรุณากรอกชื่อ";
    if (!lastName().trim()) next.lastName = "กรุณากรอกนามสกุล";

    const cleanEmail = email().trim();
    if (!cleanEmail) next.email = "กรุณากรอกอีเมล";
    else if (!isValidEmail(cleanEmail)) next.email = "รูปแบบอีเมลไม่ถูกต้อง";
    else if (props.isEmailTaken(cleanEmail)) next.email = "อีเมลนี้ถูกใช้งานแล้ว";

    const cleanPhone = phone().trim();
    if (!cleanPhone) next.phone = "กรุณากรอกเบอร์โทรศัพท์";
    else if (props.isPhoneTaken(cleanPhone)) next.phone = "เบอร์โทรศัพท์นี้ถูกใช้งานแล้ว";

    return next;
  };

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const values: CustomerFormValues = {
      firstName: firstName().trim(),
      lastName: lastName().trim(),
      email: email().trim(),
      phone: phone().trim(),
      status: status(),
      address: address().trim() || undefined,
    };

    setSaving(true);
    setSubmitError(undefined);
    try {
      await props.onSubmit(values);
    } catch {
      setSubmitError("บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} class="flex flex-col gap-6">
      <Section title="ข้อมูลลูกค้า">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            label="ชื่อ"
            required
            placeholder="Thanakrit"
            value={firstName()}
            onInput={(e) => setFirstName(e.currentTarget.value)}
            error={errors().firstName}
            disabled={saving()}
          />
          <TextField
            label="นามสกุล"
            required
            placeholder="P."
            value={lastName()}
            onInput={(e) => setLastName(e.currentTarget.value)}
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
            error={errors().email}
            disabled={saving()}
          />
          <TextField
            label="เบอร์โทรศัพท์"
            required
            placeholder="089-111-2222"
            value={phone()}
            onInput={(e) => setPhone(e.currentTarget.value)}
            error={errors().phone}
            disabled={saving()}
          />
          <label class="flex flex-col gap-1.5 sm:col-span-2">
            <span class="text-sm font-medium text-ink">ที่อยู่ (ไม่บังคับ)</span>
            <textarea
              value={address()}
              disabled={saving()}
              placeholder="88/12 ซอยสุขุมวิท 31 ..."
              onInput={(e) => setAddress(e.currentTarget.value)}
              rows={2}
              class="rounded-card border border-border bg-surface-card px-4 py-3 text-sm text-ink outline-none focus:border-brand-pink disabled:cursor-not-allowed disabled:bg-surface-gray"
            />
          </label>
          <label class="flex flex-col gap-1.5">
            <span class="text-sm font-medium text-ink">สถานะ</span>
            <div class="relative">
              <select
                value={status()}
                disabled={saving()}
                onChange={(e) => setStatus(e.currentTarget.value as CustomerStatus)}
                class="h-11 w-full appearance-none rounded-card border border-border bg-surface-card pl-4 pr-9 text-sm text-ink outline-none focus:border-brand-pink disabled:cursor-not-allowed disabled:bg-surface-gray"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <ChevronDownIcon class="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-gray" />
            </div>
          </label>
        </div>
      </Section>

      <Show when={submitError()}>
        <p role="alert" class="rounded-card bg-danger-soft px-4 py-3 text-sm font-medium text-danger-strong">
          {submitError()}
        </p>
      </Show>

      <AdminFloatingBar>
        <div class="flex w-full flex-wrap justify-end gap-3">
          <Button type="button" variant="outline" onClick={props.onCancel} disabled={saving()}>
            ยกเลิก
          </Button>
          <Button type="submit" variant="primary" loading={saving()}>
            {props.mode === "create" ? "สร้างลูกค้า" : "บันทึกการเปลี่ยนแปลง"}
          </Button>
        </div>
      </AdminFloatingBar>
      <div class="h-16" aria-hidden="true" />
    </form>
  );
}

function Section(props: { title: string; children: import("solid-js").JSX.Element }) {
  return (
    <div class="flex flex-col gap-4 rounded-card bg-surface-card p-4 shadow-card sm:p-5">
      <h2 class="text-base font-semibold text-ink">{props.title}</h2>
      {props.children}
    </div>
  );
}
