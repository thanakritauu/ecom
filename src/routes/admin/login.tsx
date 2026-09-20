import { createSignal, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { useAdminAuth } from "~/lib/adminAuth";
import { pushToast } from "~/lib/toast";
import { Button } from "~/components/shared/Button";
import { TextField } from "~/components/shared/TextField";
// Same pink wordmark file the customer AuthModal already uses for its own
// login UI (Global UI Correction #2) — no separate admin logo asset exists
// or should be created.
import logo from "~/assets/icons/logo-charmiss-pink.svg";

/**
 * Prototype-only sign-in for `/admin/*` (PART 10/11 of the spec) — there is
 * no real admin backend, so any email/password signs in as the one mock
 * admin persona (adminAuth.tsx). Kept as a real page (not just a modal like
 * the customer side's Auth Modal) since an admin backend is normally its own
 * standalone entry point, and it's the one `/admin` page that intentionally
 * has no sidebar/topbar chrome around it.
 */
export default function AdminLoginPage() {
  const admin = useAdminAuth();
  const navigate = useNavigate();

  const [email, setEmail] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [submitting, setSubmitting] = createSignal(false);
  const [error, setError] = createSignal<string>();

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(undefined);
    try {
      await admin.login(email(), password());
      pushToast("เข้าสู่ระบบสำเร็จ", "success", `ยินดีต้อนรับกลับมา`);
      navigate("/admin", { replace: true });
    } catch {
      setError("เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div class="flex min-h-screen items-center justify-center bg-surface-gray/60 px-4 py-10">
      <div class="w-full max-w-sm rounded-card bg-white p-6 text-center shadow-card sm:p-8">
        <img src={logo} alt="Charmiss" class="mx-auto h-8 w-auto" />
        <h1 class="mt-5 text-lg font-semibold text-ink">เข้าสู่ระบบผู้ดูแลระบบ</h1>
        <p class="mt-1 text-sm text-ink-gray">กรอกอีเมล์และรหัสผ่านเพื่อเข้าสู่ระบบ</p>

        <form class="mt-6 flex flex-col gap-4 text-left" onSubmit={handleSubmit}>
          <TextField
            label="อีเมล"
            type="email"
            autocomplete="username"
            required
            value={email()}
            onInput={(e) => setEmail(e.currentTarget.value)}
          />
          <TextField
            label="รหัสผ่าน"
            type="password"
            autocomplete="current-password"
            required
            value={password()}
            onInput={(e) => setPassword(e.currentTarget.value)}
          />

          <Show when={error()}>
            <p role="alert" class="text-sm text-system-red">
              {error()}
            </p>
          </Show>

          <Button type="submit" variant="primary" class="mt-2 w-full" loading={submitting()}>
            เข้าสู่ระบบ
          </Button>
        </form>

        <p class="mt-4 text-xs text-ink-placeholder">Prototype เท่านั้น — กรอกอีเมล/รหัสผ่านใดก็ได้เพื่อทดสอบ</p>
      </div>
    </div>
  );
}
