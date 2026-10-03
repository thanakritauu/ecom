import { Button } from "../shared/Button";
import { useAuth } from "~/lib/auth";

/** Shown on account pages to a guest — opens the shared Auth Modal; success reveals the same page, now signed in. */
export function AccountGuestPrompt() {
  const auth = useAuth();
  return (
    <div class="flex flex-col items-center justify-center gap-4 rounded-card bg-white px-6 py-20 text-center shadow-card">
      <h1 class="text-2xl font-bold text-ink">เข้าสู่ระบบเพื่อดูบัญชีของคุณ</h1>
      <p class="max-w-sm text-ink-gray">เข้าสู่ระบบเพื่อดูประวัติการซื้อ ติดตามพัสดุ ที่อยู่จัดส่ง รายการโปรด และคะแนนสะสมของคุณ</p>
      <Button type="button" variant="primary" onClick={() => auth.openAuthModal()}>
        เข้าสู่ระบบ
      </Button>
    </div>
  );
}
