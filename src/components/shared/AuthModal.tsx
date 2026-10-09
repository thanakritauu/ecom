import { Dialog } from "@kobalte/core/dialog";
import { createEffect, createSignal, For, Match, onCleanup, Show, Switch, type JSX } from "solid-js";
import { A } from "@solidjs/router";
import { useAuth, type ProfileExtraField, type SignInResult } from "~/lib/auth";
import type { User } from "~/lib/types";
import { MOCK_GOOGLE_PROFILE, MOCK_LINE_PROFILE, type SignInIdentity } from "~/lib/crm";
import { ChevronIcon } from "./ChevronIcon";
import { pushToast } from "~/lib/toast";
import { PHONE_PATTERN } from "~/lib/validators";
import logo from "~/assets/icons/logo-charmiss-pink.svg";
import lineIcon from "~/assets/icons/social-line.svg";
import googleIcon from "~/assets/icons/social-google.svg";
import coinMark from "~/assets/icons/charmiss-coin.png";
import { CloseMark } from "./icons";
import { Button } from "./Button";
import { FieldError } from "./TextField";

/**
 * Login / Register (prototype). Steps: start (phone first, or email, LINE,
 * Google) → OTP for phone/email (any 6 digits pass) → Charmiss Club CRM check →
 * an existing member sees their old coins merged in; a new member is simply
 * signed in. LINE/Google skip the OTP. Fewest taps: the OTP submits itself on
 * the 6th digit, and a new member lands straight back on the page.
 * If the member's profile (CRM copy or what they saved before) lacks birth date
 * and/or gender, a "ข้อมูลเพิ่มเติม" step asks for just those — saved through
 * `auth.updateProfile`, so `/account/profile` shows them. The step is
 * required: no skip button, no × / ESC / overlay close while it's open.
 * A CRM member still gets the coin carry-over screen after it.
 *
 * Originally Figma node 157:20131 — same UI/copy/logic as the original full-page
 * `/login` route (see git history / routes/login.tsx), just relocated into
 * a Dialog. This is a genuinely unified Login/Register screen (no password,
 * no separate Register form — its own copy says an account is created
 * automatically on sign-in), so there is no Login↔Register mode to toggle
 * between; see the Auth Modal report's Issues section for why.
 *
 * Mounted once, globally, in Header.tsx (same pattern as CartDrawer) — open
 * it from anywhere with `useAuth().openAuthModal()`. There is no
 * `returnContext` concept: the modal opens on top of whatever page the
 * shopper is already on, so closing it (success or cancel) already leaves
 * them right back there. That's strictly simpler than the old
 * `?redirect=` mechanism, which only existed because Login used to be a
 * full page navigation.
 */
type Step = "start" | "otp" | "checking" | "more-info" | "welcome-back";
type Channel = "phone" | "email";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;
const MIN_AGE = 13;
const THAI_MONTHS = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
/** Same values/labels as `/account/profile`'s เพศ radio group. */
const GENDERS: { value: NonNullable<User["gender"]>; label: string }[] = [
  { value: "female", label: "หญิง" },
  { value: "male", label: "ชาย" },
  { value: "unspecified", label: "ไม่ระบุ" },
];

export function AuthModal() {
  const auth = useAuth();

  const [step, setStep] = createSignal<Step>("start");
  // Phone only for now (email sign-in is kept in the flow but not offered).
  const channel = (): Channel => "phone";
  const [contact, setContact] = createSignal("");
  // Errors show once the button was pressed, then follow the input live (and clear when fixed).
  const [contactTried, setContactTried] = createSignal(false);
  const [otp, setOtp] = createSignal("");
  const [otpTried, setOtpTried] = createSignal(false);
  const [resendIn, setResendIn] = createSignal(0);
  const [formError, setFormError] = createSignal<string>();
  const [result, setResult] = createSignal<SignInResult>();
  // "ข้อมูลเพิ่มเติม": day / month (1–12) / year (ค.ศ.; shown as พ.ศ.) → stored as ISO like the profile page's date field.
  const [birthDay, setBirthDay] = createSignal("");
  const [birthMonth, setBirthMonth] = createSignal("");
  const [birthYear, setBirthYear] = createSignal("");
  const [gender, setGender] = createSignal<User["gender"]>();
  const [moreInfoTried, setMoreInfoTried] = createSignal(false);
  const [savingMoreInfo, setSavingMoreInfo] = createSignal(false);

  let resendTimer: ReturnType<typeof setInterval> | undefined;
  const startResendTimer = () => {
    clearInterval(resendTimer);
    setResendIn(RESEND_SECONDS);
    resendTimer = setInterval(() => setResendIn((n) => (n <= 1 ? (clearInterval(resendTimer), 0) : n - 1)), 1000);
  };
  onCleanup(() => clearInterval(resendTimer));

  const contactValid = () => (channel() === "phone" ? PHONE_PATTERN.test(contact().trim()) && contact().replace(/\D/g, "").length === 10 : EMAIL_PATTERN.test(contact().trim()));
  const contactError = (): string | undefined => {
    if (!contactTried() || contactValid()) return undefined;
    const phone = channel() === "phone";
    if (!contact().trim()) return phone ? "กรุณากรอกเบอร์โทรศัพท์" : "กรุณากรอกอีเมล";
    return phone ? "กรุณากรอกเบอร์โทรศัพท์ 10 หลัก เช่น 081-234-5678" : "กรุณากรอกอีเมลให้ถูกต้อง เช่น name@example.com";
  };
  const otpError = () => (otpTried() && otp().length < OTP_LENGTH ? `กรุณากรอกรหัส OTP ให้ครบ ${OTP_LENGTH} หลัก` : undefined);
  const maskedContact = () => {
    const v = contact().trim();
    if (channel() === "email") return v.replace(/^(.{2}).*(@.*)$/, "$1•••$2");
    const d = v.replace(/\D/g, "");
    return `${d.slice(0, 3)}-•••-${d.slice(6)}`;
  };

  const reset = () => {
    clearInterval(resendTimer);
    setStep("start");
    setContact("");
    setContactTried(false);
    setOtp("");
    setOtpTried(false);
    setFormError(undefined);
    setResult(undefined);
    setBirthDay("");
    setBirthMonth("");
    setBirthYear("");
    setGender(undefined);
    setMoreInfoTried(false);
    setSavingMoreInfo(false);
  };
  const close = () => {
    auth.closeAuthModal();
    setTimeout(reset, 200); // after the close animation
  };

  const requestOtp = (e?: SubmitEvent) => {
    e?.preventDefault();
    setContactTried(true);
    if (!contactValid()) {
      document.getElementById("auth-modal-contact")?.focus();
      return;
    }
    setContactTried(false);
    setOtp("");
    setOtpTried(false);
    setStep("otp");
    startResendTimer();
    setTimeout(() => document.getElementById("auth-modal-otp")?.focus(), 50);
  };

  // One call for every method: CRM lookup → sign in (carry coins over) or sign up.
  const signIn = async (identity: SignInIdentity) => {
    setFormError(undefined);
    setStep("checking");
    try {
      const res = await auth.login(identity);
      setResult(res);
      if (res.missingProfile.length > 0) {
        setStep("more-info");
        setTimeout(() => document.getElementById(res.missingProfile.includes("birthDate") ? "auth-modal-birth-day" : "auth-modal-gender-female")?.focus(), 50);
      } else {
        finishSignIn();
      }
    } catch {
      setFormError("ไม่สามารถดำเนินการได้ กรุณาลองอีกครั้ง");
      setStep("start");
    }
  };

  // After sign-in (and the "ข้อมูลเพิ่มเติม" step, if any): a CRM member sees the coins carried over; a new member is done.
  const finishSignIn = () => {
    if (result()?.member === "crm") {
      setStep("welcome-back");
    } else {
      pushToast("สมัครสมาชิกสำเร็จ", "success", "ยินดีต้อนรับสู่ Charmiss Club");
      close();
    }
  };

  const asks = (field: ProfileExtraField) => !!result()?.missingProfile.includes(field);
  const thisYear = new Date().getFullYear();
  // Youngest selectable year already makes the member 13 this year; the exact day is checked in `birthError`.
  const years = Array.from({ length: 100 }, (_, i) => thisYear - MIN_AGE - i);
  const daysInMonth = () => new Date(Number(birthYear()) || 2000, Number(birthMonth()) || 1, 0).getDate(); // 2000: leap, so 29 ก.พ. is offered before a year is picked
  createEffect(() => {
    if (Number(birthDay()) > daysInMonth()) setBirthDay(""); // e.g. 31 then เดือน กุมภาพันธ์ — ask for the day again
  });
  const birthIso = () => `${birthYear()}-${birthMonth().padStart(2, "0")}-${birthDay().padStart(2, "0")}`;
  // Each dropdown has its own "missing" message; the date rules below only run once all three are picked.
  const dayError = () => (moreInfoTried() && asks("birthDate") && !birthDay() ? "กรุณาเลือกวัน" : undefined);
  const monthError = () => (moreInfoTried() && asks("birthDate") && !birthMonth() ? "กรุณาเลือกเดือน" : undefined);
  const yearError = () => (moreInfoTried() && asks("birthDate") && !birthYear() ? "กรุณาเลือกปี" : undefined);
  const birthError = (): string | undefined => {
    if (!asks("birthDate")) return undefined;
    if (!birthDay() || !birthMonth() || !birthYear()) return "กรุณาเลือกวัน เดือน และปีเกิดให้ครบ";
    const date = new Date(Number(birthYear()), Number(birthMonth()) - 1, Number(birthDay()));
    if (date.getDate() !== Number(birthDay())) return "วันเกิดไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง";
    const now = new Date();
    if (date > now) return "วันเกิดต้องไม่เป็นวันในอนาคต";
    const thirteenth = new Date(date.getFullYear() + MIN_AGE, date.getMonth(), date.getDate());
    if (thirteenth > now) return `ต้องมีอายุ ${MIN_AGE} ปีขึ้นไป`;
    return undefined;
  };
  // Wrong date / too young — only once day, month and year are all picked (the missing ones have their own messages).
  const dateRuleError = () => (moreInfoTried() && birthDay() && birthMonth() && birthYear() ? birthError() : undefined);
  const genderError = () => (asks("gender") && !gender() ? "กรุณาเลือกเพศ" : undefined);
  const moreInfoSubtitle = () =>
    asks("birthDate") && asks("gender") ? "ระบุวันเกิด และเพศ เพื่อรับสิทธิพิเศษจากเรา" : asks("birthDate") ? "ระบุวันเกิด เพื่อรับสิทธิพิเศษจากเรา" : "ระบุเพศ เพื่อรับสิทธิพิเศษจากเรา";

  const saveMoreInfo = async (e: SubmitEvent) => {
    e.preventDefault();
    setMoreInfoTried(true);
    if (birthError() || genderError()) {
      // Focus the first field that's wrong: day → month → year (a bad/too-young date goes back to the day) → gender.
      const first = !birthError() ? "auth-modal-gender-female" : birthDay() && !birthMonth() ? "auth-modal-birth-month" : birthDay() && birthMonth() && !birthYear() ? "auth-modal-birth-year" : "auth-modal-birth-day";
      document.getElementById(first)?.focus();
      return;
    }
    setSavingMoreInfo(true);
    try {
      await auth.updateProfile({ ...(asks("birthDate") && { birthDate: birthIso() }), ...(asks("gender") && { gender: gender() }) });
      finishSignIn();
    } catch {
      pushToast("บันทึกข้อมูลไม่สำเร็จ กรุณาลองอีกครั้ง", "error");
    } finally {
      setSavingMoreInfo(false);
    }
  };

  // Prototype OTP: any 6 digits pass. Submits on its own as soon as the 6th digit is in.
  const onOtpInput = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, OTP_LENGTH);
    setOtp(digits);
    if (digits.length === OTP_LENGTH) void signIn({ method: channel(), value: contact().trim() });
  };

  return (
    <Dialog
      open={auth.isAuthModalOpen()}
      onOpenChange={(open) => {
        if (open) return;
        if (step() === "checking") return; // don't let ESC/overlay-click close mid-check
        if (step() === "more-info") return; // birth date / gender are required — no skipping, so no ESC/overlay close either
        close();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay class="fixed inset-0 z-40 bg-black/50 motion-reduce:animate-none data-[expanded]:animate-overlay-in data-[closed]:animate-overlay-out" />
        <div class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
          <Dialog.Content
            aria-modal="true"
            class="relative flex max-h-[90vh] w-full max-w-[429px] flex-col sm:max-w-[500px] items-center gap-6 overflow-y-auto rounded-[32px] bg-white p-6 shadow-card outline-none motion-reduce:animate-none data-[expanded]:animate-modal-in data-[closed]:animate-modal-out sm:p-10"
          >
            <Show when={step() !== "checking" && step() !== "more-info"}>
              <Dialog.CloseButton
                aria-label="ปิด"
                class="group absolute right-3 top-3 flex size-11 shrink-0 items-center justify-center"
              >
                <CloseMark />
              </Dialog.CloseButton>
            </Show>

            <Switch>
              {/* 1 — choose how to continue: phone (first), email, LINE, Google */}
              <Match when={step() === "start"}>
                <A href="/" class="shrink-0">
                  <img src={logo} alt="Charmiss" class="h-8 w-auto" />
                </A>

                <div class="flex flex-col items-center gap-2 text-center">
                  <Dialog.Title as="h1" class="text-2xl font-semibold text-ink">
                    เข้าสู่ระบบ หรือสมัครสมาชิก
                  </Dialog.Title>
                  <p class="text-base text-ink">
                    <Phrases text="เพื่อเป็นสมาชิก Charmiss Club สะสมคอยน์ และรับสิทธิพิเศษอื่นๆ อีกมากมาย" />
                  </p>
                </div>

                <Show when={formError()}>
                  <p class="w-full rounded-card bg-danger-soft px-4 py-2 text-center text-sm text-danger-strong" role="alert">
                    {formError()}
                  </p>
                </Show>

                <form onSubmit={requestOtp} novalidate class="flex w-full flex-col gap-2">
                  <label for="auth-modal-contact" class="text-base font-medium text-ink">
                    {channel() === "phone" ? "กรอกเบอร์โทรศัพท์" : "กรอกอีเมล"}
                  </label>
                  <input
                    id="auth-modal-contact"
                    type={channel() === "phone" ? "tel" : "email"}
                    inputMode={channel() === "phone" ? "tel" : "email"}
                    autocomplete={channel() === "phone" ? "tel" : "email"}
                    placeholder={channel() === "phone" ? "08X-XXX-XXXX" : "name@example.com"}
                    maxlength={channel() === "phone" ? 12 : undefined}
                    value={contact()}
                    onInput={(e) => {
                      setContact(channel() === "phone" ? e.currentTarget.value.replace(/[^\d-]/g, "") : e.currentTarget.value);
                    }}
                    aria-invalid={!!contactError()}
                    aria-describedby={contactError() ? "auth-modal-contact-error" : undefined}
                    class={`h-[54px] w-full rounded-[16px] border bg-white px-[18px] text-base text-ink outline-none transition-colors duration-150 placeholder:text-ink-placeholder focus:border-brand-pink ${
                      contactError() ? "border-system-red" : "border-surface-gray"
                    }`}
                  />
                  <FieldError id="auth-modal-contact-error" message={contactError()} />
                  {/* Grey until the number/email is complete, then the brand pink. */}
                  <button
                    type="submit"
                    class="flex min-h-[44px] w-full items-center justify-center rounded-pill px-4 py-2.5 text-base font-medium transition-colors duration-150"
                    classList={{ "bg-brand-pink text-white lg:hover:bg-brand-pink/90": contactValid(), "bg-surface-gray text-ink-gray": !contactValid() }}
                  >
                    ขอรหัส OTP
                  </button>
                </form>

                <div class="flex w-full items-center gap-2">
                  <div class="h-px flex-1 bg-surface-gray" aria-hidden="true" />
                  <p class="text-sm text-ink">หรือ</p>
                  <div class="h-px flex-1 bg-surface-gray" aria-hidden="true" />
                </div>

                <div class="flex w-full flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => signIn({ method: "line", value: MOCK_LINE_PROFILE.lineUserId, name: MOCK_LINE_PROFILE.name })}
                    class="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-pill bg-[#06c755] px-4 py-2.5 text-base font-medium text-white transition-opacity duration-150"
                  >
                    <img src={lineIcon} alt="" class="size-5 shrink-0" />
                    ดำเนินการต่อด้วย LINE
                  </button>
                  <button
                    type="button"
                    onClick={() => signIn({ method: "google", value: MOCK_GOOGLE_PROFILE.email, name: MOCK_GOOGLE_PROFILE.name })}
                    class="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-pill border border-surface-gray bg-white px-4 py-2.5 text-base font-medium text-ink transition-colors duration-150 lg:hover:bg-surface-gray"
                  >
                    <img src={googleIcon} alt="" class="size-5 shrink-0" />
                    ดำเนินการต่อด้วย Google
                  </button>
                </div>

                <div class="flex w-full flex-col items-center gap-2">
                  <p class="flex items-center gap-1.5 rounded-lg bg-surface-pink px-4 py-2 text-xs text-ink sm:whitespace-nowrap">
                    <InfoIcon />
                    <span>
                      <Phrases text="สมาชิก Charmiss Club ระบบจะนำคอยน์เดิม มารวมให้อัตโนมัติ" />
                    </span>
                  </p>
                  <p class="text-center text-xs text-ink">
                    <A href="/legal/terms" class="text-brand-pink underline">
                      เงื่อนไขการใช้งาน
                    </A>{" "}
                    และ{" "}
                    <A href="/legal/privacy" class="text-brand-pink underline">
                      นโยบายความเป็นส่วนตัว
                    </A>{" "}
                    ของ Charmiss
                  </p>
                </div>
              </Match>

              {/* 2 — OTP (prototype: any 6 digits) */}
              <Match when={step() === "otp"}>
                <button
                  type="button"
                  onClick={() => setStep("start")}
                  class="absolute left-4 top-4 flex min-h-11 items-center gap-1 rounded-pill px-3 text-sm font-medium text-ink-gray transition-colors duration-150 hover:bg-surface-gray"
                >
                  <ChevronIcon direction="left" class="size-5" />
                  {channel() === "phone" ? "เปลี่ยนเบอร์" : "เปลี่ยนอีเมล"}
                </button>
                <div class="mt-8 flex flex-col items-center gap-2 text-center">
                  <Dialog.Title as="h1" class="text-2xl font-semibold text-ink">
                    กรอกรหัส OTP
                  </Dialog.Title>
                  <p class="text-base text-ink-gray">
                    เราส่งรหัส 6 หลักไปที่ <span class="font-medium text-ink">{maskedContact()}</span>
                  </p>
                </div>

                <label for="auth-modal-otp" class="relative block w-full">
                  <span class="sr-only">รหัส OTP 6 หลัก</span>
                  <div class="grid grid-cols-6 gap-2" aria-hidden="true">
                    <For each={Array.from({ length: OTP_LENGTH })}>
                      {(_, i) => (
                        <span
                          class="flex aspect-square items-center justify-center rounded-[14px] border text-2xl font-semibold text-ink transition-colors duration-150"
                          classList={{
                            "border-brand-pink bg-surface-pink/40": i() === Math.min(otp().length, OTP_LENGTH - 1),
                            "border-system-red": !!otpError() && i() !== Math.min(otp().length, OTP_LENGTH - 1),
                            "border-surface-gray": !otpError() && i() !== Math.min(otp().length, OTP_LENGTH - 1),
                          }}
                        >
                          {otp()[i()] ?? ""}
                        </span>
                      )}
                    </For>
                  </div>
                  <input
                    id="auth-modal-otp"
                    type="text"
                    inputMode="numeric"
                    autocomplete="one-time-code"
                    maxlength={OTP_LENGTH}
                    value={otp()}
                    onInput={(e) => onOtpInput(e.currentTarget.value)}
                    aria-invalid={!!otpError()}
                    aria-describedby={otpError() ? "auth-modal-otp-error" : undefined}
                    class="absolute inset-0 size-full cursor-text opacity-0"
                  />
                </label>
                <div class="-mt-4 w-full empty:hidden">
                  <FieldError id="auth-modal-otp-error" message={otpError()} />
                </div>

                {/* Grey until all 6 digits are in, but still pressable — an early press says what's missing. */}
                <button
                  type="button"
                  onClick={() => {
                    setOtpTried(true);
                    if (otp().length < OTP_LENGTH) return document.getElementById("auth-modal-otp")?.focus();
                    void signIn({ method: channel(), value: contact().trim() });
                  }}
                  class="flex min-h-[44px] w-full items-center justify-center rounded-pill px-4 py-2.5 text-base font-medium transition-colors duration-150"
                  classList={{ "bg-brand-pink text-white": otp().length === OTP_LENGTH, "bg-surface-gray text-ink-gray": otp().length < OTP_LENGTH }}
                >
                  ยืนยัน
                </button>
                <p class="text-sm text-ink-gray">
                  ไม่ได้รับรหัส?{" "}
                  <Show when={resendIn() === 0} fallback={<span>ส่งอีกครั้งได้ใน {resendIn()} วินาที</span>}>
                    <button
                      type="button"
                      onClick={() => {
                        startResendTimer();
                        pushToast("ส่งรหัส OTP ใหม่แล้ว");
                      }}
                      class="min-h-11 font-medium text-brand-pink underline"
                    >
                      ส่งรหัสอีกครั้ง
                    </button>
                  </Show>
                </p>
              </Match>

              {/* 3 — checking the Charmiss Club CRM */}
              <Match when={step() === "checking"}>
                <div class="flex flex-col items-center gap-4 py-10 text-center" role="status" aria-live="polite">
                  <span class="loading loading-spinner loading-lg text-brand-pink" aria-hidden="true" />
                  <Dialog.Title as="h1" class="text-lg font-semibold text-ink">
                    กำลังตรวจสอบบัญชี Charmiss Club...
                  </Dialog.Title>
                  <p class="text-sm text-ink-gray">
                    <Phrases text="หากคุณเคยเป็นสมาชิก เราจะนำคอยน์เดิมมารวมให้อัตโนมัติ" />
                  </p>
                </div>
              </Match>

              {/* 4 — "ข้อมูลเพิ่มเติม": only the birth date / gender the profile is missing */}
              <Match when={step() === "more-info"}>
                <div class="mt-4 flex flex-col items-center gap-2 text-center">
                  <Dialog.Title as="h1" class="text-2xl font-semibold text-ink">
                    ข้อมูลเพิ่มเติม
                  </Dialog.Title>
                  <p class="text-base leading-[1.75] text-ink-gray">
                    <Phrases text={moreInfoSubtitle()} />
                  </p>
                </div>

                <form onSubmit={saveMoreInfo} novalidate class="flex w-full flex-col gap-5">
                  <Show when={asks("birthDate")}>
                    <fieldset class="flex flex-col gap-1.5" aria-describedby={dateRuleError() ? "auth-modal-birth-error" : undefined}>
                      <legend class="mb-1.5 text-sm font-medium text-ink">วันเดือนปีเกิด</legend>
                      {/* Columns sized so at 375px each "กรุณาเลือก…" message stays on one line and "พฤศจิกายน" / "2556" aren't cut. */}
                      <div class="grid grid-cols-[minmax(0,21fr)_minmax(0,29fr)_minmax(0,19fr)] items-start gap-2">
                        <BirthSelect id="auth-modal-birth-day" label="วัน" value={birthDay()} onChange={setBirthDay} error={dayError()} invalid={!!dateRuleError()}>
                          <For each={Array.from({ length: daysInMonth() }, (_, i) => i + 1)}>{(d) => <option value={String(d)}>{d}</option>}</For>
                        </BirthSelect>
                        <BirthSelect id="auth-modal-birth-month" label="เดือน" value={birthMonth()} onChange={setBirthMonth} error={monthError()} invalid={!!dateRuleError()}>
                          <For each={THAI_MONTHS}>{(m, i) => <option value={String(i() + 1)}>{m}</option>}</For>
                        </BirthSelect>
                        <BirthSelect id="auth-modal-birth-year" label="ปี (พ.ศ.)" value={birthYear()} onChange={setBirthYear} error={yearError()} invalid={!!dateRuleError()}>
                          <For each={years}>{(y) => <option value={String(y)}>{y + 543}</option>}</For>
                        </BirthSelect>
                      </div>
                      <FieldError id="auth-modal-birth-error" message={dateRuleError()} />
                    </fieldset>
                  </Show>

                  <Show when={asks("gender")}>
                    <fieldset class="flex flex-col gap-1.5" aria-describedby={moreInfoTried() && genderError() ? "auth-modal-gender-error" : undefined}>
                      <legend class="mb-1.5 text-sm font-medium text-ink">เพศ</legend>
                      <div class="flex flex-wrap gap-2">
                        <For each={GENDERS}>
                          {(g) => (
                            <label
                              class="flex min-h-11 cursor-pointer items-center gap-2 rounded-pill border px-4 text-sm text-ink transition-colors duration-150"
                              classList={{
                                "border-brand-pink bg-surface-pink": gender() === g.value,
                                "border-system-red bg-white": gender() !== g.value && !!(moreInfoTried() && genderError()),
                                "border-surface-gray bg-white": gender() !== g.value && !(moreInfoTried() && genderError()),
                              }}
                            >
                              <input
                                id={`auth-modal-gender-${g.value}`}
                                type="radio"
                                name="auth-modal-gender"
                                value={g.value}
                                checked={gender() === g.value}
                                onChange={() => setGender(g.value)}
                                aria-invalid={!!(moreInfoTried() && genderError())}
                                class="size-4 accent-brand-pink"
                              />
                              {g.label}
                            </label>
                          )}
                        </For>
                      </div>
                      <FieldError id="auth-modal-gender-error" message={moreInfoTried() ? genderError() : undefined} />
                    </fieldset>
                  </Show>

                  <div class="flex w-full flex-col gap-2">
                    <Button type="submit" variant="primary" class="w-full" loading={savingMoreInfo()}>
                      บันทึก
                    </Button>
                  </div>
                </form>
              </Match>

              {/* 5 — existing CRM member: coins carried over */}
              <Match when={step() === "welcome-back" && result()}>
                {(res) => (
                  <div class="flex w-full flex-col items-center gap-5 text-center" role="status">
                    <img src={coinMark} alt="" class="size-20" />
                    <div class="flex flex-col gap-1">
                      <Dialog.Title as="h1" class="text-2xl font-semibold text-ink">
                        ยินดีต้อนรับกลับสู่ Charmiss Club
                      </Dialog.Title>
                      <p class="text-base text-ink-gray">คุณ{res().name}</p>
                    </div>
                    <div class="flex w-full flex-col items-center gap-1 rounded-card bg-surface-pink px-4 py-5">
                      <p class="text-sm text-ink-gray">คอยน์จากบัญชีเดิมของคุณ</p>
                      <p class="text-3xl font-bold text-brand-pink">+{res().coinsTransferred.toLocaleString("th-TH")} คอยน์</p>
                      <p class="mt-1 text-sm text-ink">
                        <Phrases text="เรานำคอยน์ Charmiss Club เดิมมารวมไว้ในบัญชีเว็บไซต์ ให้เรียบร้อยแล้ว" />
                      </p>
                    </div>
                    <div class="flex w-full flex-col gap-2">
                      <button
                        type="button"
                        onClick={close}
                        class="flex min-h-[44px] w-full items-center justify-center rounded-pill bg-brand-pink px-4 py-2.5 text-base font-medium text-white transition-colors duration-150 lg:hover:bg-brand-pink/90"
                      >
                        เริ่มช้อปเลย
                      </button>
                      <A href="/account/points" onClick={close} class="flex min-h-11 items-center justify-center text-sm font-medium text-brand-pink underline">
                        ดูคอยน์ของฉัน
                      </A>
                    </div>
                  </div>
                )}
              </Match>
            </Switch>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog>
  );
}

/** One of the birth date's day / month / year dropdowns — the TextField box look, with the shared chevron. */
function BirthSelect(props: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** This dropdown's own "missing" message, shown right under it. */
  error?: string;
  /** Red border without a message of its own (the whole date breaks a rule). */
  invalid: boolean;
  children: JSX.Element;
}) {
  const errorId = `${props.id}-error`;
  return (
    <div class="flex min-w-0 flex-col gap-1.5">
      <div class="relative">
        <label for={props.id} class="sr-only">
          {props.label}
        </label>
        <select
          id={props.id}
          value={props.value}
          onChange={(e) => props.onChange(e.currentTarget.value)}
          aria-invalid={!!props.error || props.invalid}
          aria-describedby={props.error ? errorId : props.invalid ? "auth-modal-birth-error" : undefined}
          class={`h-11 w-full appearance-none rounded-card border bg-surface-card pl-2.5 pr-7 text-base outline-none transition-colors duration-150 focus:border-brand-pink ${
            props.error || props.invalid ? "border-system-red" : "border-border"
          } ${props.value ? "text-ink" : "text-ink-placeholder"}`}
        >
          <option value="" disabled>
            {props.label}
          </option>
          {props.children}
        </select>
        <ChevronIcon direction="down" class="pointer-events-none absolute right-2 top-1/2 size-5 -translate-y-1/2 text-ink-gray" />
      </div>
      <FieldError id={errorId} message={props.error} />
    </div>
  );
}

/**
 * Thai has no spaces between words, so the browser may break a line inside a word ("คอย|น์").
 * Each space-separated phrase stays whole; lines only break at the spaces.
 */
function Phrases(props: { text: string }) {
  return (
    <For each={props.text.split(" ")}>
      {(phrase, i) => (
        <>
          {i() > 0 ? " " : ""}
          <span class="inline-block">{phrase}</span>
        </>
      )}
    </For>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" class="size-3.5 shrink-0" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5M12 8v.01" stroke-linecap="round" />
    </svg>
  );
}
