import { Dialog } from "@kobalte/core/dialog";
import { createSignal, Show } from "solid-js";
import { A } from "@solidjs/router";
import { useAuth } from "~/lib/auth";
import { pushToast } from "~/lib/toast";
import { PHONE_PATTERN } from "~/lib/validators";
import logo from "~/assets/icons/logo-charmiss-pink.svg";
import lineIcon from "~/assets/icons/social-line.svg";
import googleIcon from "~/assets/icons/social-google.svg";

/**
 * Figma node 157:20131 — same UI/copy/logic as the original full-page
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
export function AuthModal() {
  const auth = useAuth();

  const [pending, setPending] = createSignal<"line" | "google" | "phone" | null>(null);
  const [formError, setFormError] = createSignal<string>();
  const [phone, setPhone] = createSignal("");
  const [phoneError, setPhoneError] = createSignal<string>();

  const resetForm = () => {
    setPending(null);
    setFormError(undefined);
    setPhone("");
    setPhoneError(undefined);
  };

  const authenticate = async (method: "line" | "google" | "phone") => {
    if (pending()) return; // one in-flight request at a time, regardless of which method
    setPending(method);
    setFormError(undefined);
    try {
      await auth.login(); // Auth State is already updated by the time this resolves — see auth.tsx's login()
      pushToast("เข้าสู่ระบบสำเร็จ", "success", "ยินดีต้อนรับกลับมา 👋");
      resetForm();
      auth.closeAuthModal();
    } catch {
      setFormError("ไม่สามารถดำเนินการได้ กรุณาลองอีกครั้ง");
      setPending(null);
    }
  };

  const requestOtp = () => {
    const value = phone().trim();
    if (!value) {
      setPhoneError("กรุณากรอกเบอร์โทรศัพท์");
      document.getElementById("auth-modal-phone")?.focus();
      return;
    }
    if (!PHONE_PATTERN.test(value)) {
      setPhoneError("กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง");
      document.getElementById("auth-modal-phone")?.focus();
      return;
    }
    setPhoneError(undefined);
    void authenticate("phone");
  };

  return (
    <Dialog
      open={auth.isAuthModalOpen()}
      onOpenChange={(open) => {
        if (open) return;
        if (pending()) return; // don't let ESC/overlay-click close mid-submit
        auth.closeAuthModal();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay class="fixed inset-0 z-40 bg-black/50 motion-reduce:animate-none data-[expanded]:animate-overlay-in data-[closed]:animate-overlay-out" />
        <div class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
          <Dialog.Content
            aria-modal="true"
            class="relative flex max-h-[90vh] w-full max-w-[429px] flex-col items-center gap-6 overflow-y-auto rounded-[32px] bg-white p-6 shadow-card outline-none motion-reduce:animate-none data-[expanded]:animate-modal-in data-[closed]:animate-modal-out sm:p-10"
          >
            <Dialog.CloseButton
              aria-label="ปิด"
              class="absolute right-4 top-4 flex size-11 shrink-0 items-center justify-center rounded-pill text-ink-gray transition-colors duration-150 hover:bg-surface-gray"
            >
              <CloseIcon />
            </Dialog.CloseButton>

            <A href="/" class="shrink-0">
              <img src={logo} alt="Charmiss" class="h-8 w-auto" />
            </A>

            <div class="flex flex-col items-center gap-2 text-center">
              <Dialog.Title as="h1" class="text-2xl font-semibold text-ink">
                เข้าสู่ระบบ หรือสมัครสมาชิก
              </Dialog.Title>
              <p class="text-base text-ink">เพื่อสะสมแต้ม ติดตามคำสั่งซื้อ และรับสิทธิพิเศษเฉพาะสมาชิก</p>
            </div>

            <Show when={formError()}>
              <p class="w-full rounded-card bg-danger-soft px-4 py-2 text-center text-sm text-danger-strong" role="alert">
                {formError()}
              </p>
            </Show>

            <div class="flex w-full flex-col gap-2">
              <button
                type="button"
                onClick={() => authenticate("line")}
                disabled={pending() !== null}
                class="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-pill bg-[#06c755] px-4 py-2.5 text-base font-bold text-white transition-opacity duration-150 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Show when={pending() === "line"} fallback={<img src={lineIcon} alt="" class="size-5 shrink-0" />}>
                  <span class="loading loading-spinner loading-sm" aria-hidden="true" />
                </Show>
                ดำเนินการต่อด้วย LINE
              </button>

              <button
                type="button"
                onClick={() => authenticate("google")}
                disabled={pending() !== null}
                class="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-pill border border-surface-gray bg-white px-4 py-2.5 text-base font-semibold text-ink transition-colors duration-150 hover:bg-surface-gray disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Show when={pending() === "google"} fallback={<img src={googleIcon} alt="" class="size-5 shrink-0" />}>
                  <span class="loading loading-spinner loading-sm" aria-hidden="true" />
                </Show>
                ดำเนินการต่อด้วย Google
              </button>
            </div>

            <div class="flex w-full items-center gap-2">
              <div class="h-px flex-1 bg-surface-gray" aria-hidden="true" />
              <p class="text-sm text-ink">หรือ</p>
              <div class="h-px flex-1 bg-surface-gray" aria-hidden="true" />
            </div>

            <div class="flex w-full flex-col gap-2">
              <label for="auth-modal-phone" class="text-base font-medium text-ink">
                ดำเนินการด้วยเบอร์โทรศัพท์
              </label>
              <input
                id="auth-modal-phone"
                type="tel"
                inputMode="tel"
                autocomplete="tel"
                placeholder="08X-XXX-XXXX"
                value={phone()}
                onInput={(e) => {
                  setPhone(e.currentTarget.value);
                  if (phoneError()) setPhoneError(undefined);
                }}
                aria-invalid={!!phoneError()}
                aria-describedby={phoneError() ? "auth-modal-phone-error" : undefined}
                class={`h-[54px] w-full rounded-[16px] border bg-white px-[18px] text-base text-ink outline-none transition-colors duration-150 placeholder:text-ink-placeholder focus:border-brand-pink ${
                  phoneError() ? "border-system-red" : "border-surface-gray"
                }`}
              />
              <Show when={phoneError()}>
                <p id="auth-modal-phone-error" role="alert" class="text-sm text-system-red">
                  {phoneError()}
                </p>
              </Show>
              <button
                type="button"
                onClick={requestOtp}
                disabled={pending() !== null}
                class="flex min-h-[44px] w-full items-center justify-center rounded-pill bg-surface-gray px-4 py-2.5 text-base font-semibold text-ink-gray transition-opacity duration-150 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Show when={pending() === "phone"} fallback="ขอรหัส OTP">
                  <span class="loading loading-spinner loading-sm" aria-hidden="true" />
                  &nbsp;กำลังดำเนินการ...
                </Show>
              </button>
            </div>

            <div class="flex w-full flex-col items-center gap-2">
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
              <p class="flex items-center gap-1 rounded-lg bg-surface-pink px-4 py-2 text-xs text-ink">
                <InfoIcon />
                ยังไม่มีบัญชี? ระบบจะสร้างบัญชีให้โดยอัตโนมัติเมื่อเข้าสู่ระบบ
              </p>
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog>
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

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" class="size-3.5" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" stroke-linecap="round" />
    </svg>
  );
}
