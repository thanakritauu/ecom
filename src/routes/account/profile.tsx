import { createSignal, createUniqueId, For, Show } from "solid-js";
import { AccountShell, AccountPanel } from "~/components/account/AccountShell";
import { TextField } from "~/components/shared/TextField";
import { Button } from "~/components/shared/Button";
import { useAuth } from "~/lib/auth";
import { pushToast } from "~/lib/toast";
import { EMAIL_PATTERN, focusFirstInvalid, PHONE_PATTERN } from "~/lib/validators";
import type { User } from "~/lib/types";

const GENDERS: { value: NonNullable<User["gender"]>; label: string }[] = [
  { value: "female", label: "หญิง" },
  { value: "male", label: "ชาย" },
  { value: "unspecified", label: "ไม่ระบุ" },
];

type FieldKey = "firstName" | "lastName" | "email" | "phone";

/** ข้อมูลส่วนตัว — same TextField/Button set as Checkout's forms; saved through `auth.updateProfile` (mock, this browser only). */
export default function AccountProfilePage() {
  return (
    <AccountShell>
      <AccountPanel title="ข้อมูลส่วนตัว" headingId="account-profile-heading">
        <Show when={useAuth().user()} keyed>
          {(user) => <ProfileForm user={user} />}
        </Show>
      </AccountPanel>
    </AccountShell>
  );
}

function ProfileForm(props: { user: User }) {
  const auth = useAuth();
  const id = createUniqueId();
  const fieldId = (key: string) => `${id}-${key}`;
  const [first = "", ...rest] = props.user.name.trim().split(/\s+/);
  const [values, setValues] = createSignal<Record<FieldKey, string>>({ firstName: first, lastName: rest.join(" "), email: props.user.email, phone: props.user.phone });
  const [birthDate, setBirthDate] = createSignal(props.user.birthDate ?? "");
  const [gender, setGender] = createSignal<User["gender"]>(props.user.gender);
  const [touched, setTouched] = createSignal<Partial<Record<FieldKey, boolean>>>({});
  const [submitted, setSubmitted] = createSignal(false);
  const [saving, setSaving] = createSignal(false);

  const v = (key: FieldKey) => values()[key].trim();
  const set = (key: FieldKey, value: string) => setValues((prev) => ({ ...prev, [key]: value }));
  const touch = (key: FieldKey) => setTouched((prev) => ({ ...prev, [key]: true }));
  const errorFor = (key: FieldKey): string | undefined => {
    switch (key) {
      case "firstName":
        return v(key) ? undefined : "กรุณากรอกชื่อ";
      case "lastName":
        return undefined;
      case "email":
        if (!v(key)) return "กรุณากรอกอีเมล";
        return EMAIL_PATTERN.test(v(key)) ? undefined : "รูปแบบอีเมลไม่ถูกต้อง เช่น name@example.com";
      case "phone":
        if (!v(key)) return "กรุณากรอกเบอร์โทรศัพท์";
        return PHONE_PATTERN.test(v(key)) ? undefined : "เบอร์โทรต้องเป็นตัวเลข 9-10 หลัก ขึ้นต้นด้วย 0 เช่น 081-234-5678";
    }
  };
  const shownError = (key: FieldKey) => (submitted() || touched()[key] ? errorFor(key) : undefined);
  const today = new Date().toISOString().slice(0, 10);

  const submit = async (e: SubmitEvent) => {
    e.preventDefault();
    setSubmitted(true);
    // Every invalid field now shows its error at once; jump to the first.
    if ((["firstName", "email", "phone"] as FieldKey[]).some((k) => errorFor(k))) {
      focusFirstInvalid(e.currentTarget as HTMLFormElement);
      return;
    }
    setSaving(true);
    try {
      await auth.updateProfile({
        name: [v("firstName"), v("lastName")].filter(Boolean).join(" "),
        email: v("email"),
        phone: v("phone"),
        birthDate: birthDate() || undefined,
        gender: gender(),
      });
      pushToast("บันทึกข้อมูลส่วนตัวแล้ว");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} novalidate class="flex max-w-[640px] flex-col gap-4">
      <div class="grid grid-cols-2 gap-3 sm:gap-4">
        <TextField
          id={fieldId("firstName")}
          label="ชื่อ"
          required
          autocomplete="given-name"
          value={values().firstName}
          onInput={(e) => set("firstName", e.currentTarget.value)}
          onBlur={() => touch("firstName")}
          error={shownError("firstName")}
        />
        <TextField
          id={fieldId("lastName")}
          label="นามสกุล"
          autocomplete="family-name"
          value={values().lastName}
          onInput={(e) => set("lastName", e.currentTarget.value)}
        />
      </div>
      <TextField
        id={fieldId("email")}
        label="อีเมล"
        required
        type="email"
        inputMode="email"
        autocomplete="email"
        value={values().email}
        onInput={(e) => set("email", e.currentTarget.value)}
        onBlur={() => touch("email")}
        error={shownError("email")}
      />
      <TextField
        id={fieldId("phone")}
        label="เบอร์โทรศัพท์"
        required
        type="tel"
        inputMode="tel"
        autocomplete="tel"
        placeholder="08X-XXX-XXXX"
        maxlength={12}
        value={values().phone}
        onInput={(e) => set("phone", e.currentTarget.value.replace(/[^\d-]/g, ""))}
        onBlur={() => touch("phone")}
        error={shownError("phone")}
      />
      <p class="mt-2 border-t border-surface-gray pt-4 text-sm font-medium text-ink">ระบุวันเกิด และเพศ เพื่อรับสิทธิพิเศษจากเรา</p>
      <TextField
        id={fieldId("birthDate")}
        label="วันเกิด"
        type="date"
        max={today}
        autocomplete="bday"
        value={birthDate()}
        onInput={(e) => setBirthDate(e.currentTarget.value)}
      />
      <fieldset class="flex flex-col gap-1.5">
        <legend class="mb-1.5 text-sm font-medium text-ink">เพศ</legend>
        <div class="flex flex-wrap gap-2">
          <For each={GENDERS}>
            {(g) => (
              <label
                class="flex min-h-11 cursor-pointer items-center gap-2 rounded-pill border px-4 text-sm text-ink transition-colors duration-150"
                classList={{ "border-brand-pink bg-surface-pink": gender() === g.value, "border-surface-gray bg-white": gender() !== g.value }}
              >
                <input type="radio" name={fieldId("gender")} value={g.value} checked={gender() === g.value} onChange={() => setGender(g.value)} class="size-4 accent-brand-pink" />
                {g.label}
              </label>
            )}
          </For>
        </div>
      </fieldset>

      <Button type="submit" variant="primary" class="w-full sm:w-fit" loading={saving()}>
        บันทึกข้อมูล
      </Button>
    </form>
  );
}
