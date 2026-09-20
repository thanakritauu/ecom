import { Show } from "solid-js";
import { Header } from "~/components/shared/Header";
import { Footer } from "~/components/shared/Footer";
import { Container } from "~/components/shared/Container";
import { Button } from "~/components/shared/Button";
import { ProfileHeaderCard } from "~/components/account/ProfileHeaderCard";
import { AccountSidebar } from "~/components/account/AccountSidebar";
import { OrderHistoryPanel } from "~/components/account/OrderHistoryPanel";
import { useAuth } from "~/lib/auth";

/**
 * Figma node 159:20695. Only the logged-in "Order History" view is designed
 * there. A guest here stays on `/account` (no navigation) and sees a
 * minimal prompt whose button opens the shared Auth Modal — Login no longer
 * navigates anywhere, so there's nowhere to redirect *to* anymore; success
 * just closes the modal and reveals this same page, now authenticated.
 */
export default function AccountPage() {
  const auth = useAuth();

  return (
    <>
      <Header />
      <main class="flex flex-col overflow-x-hidden bg-surface-gray/60 py-6">
        <Container width="wide">
          <Show when={auth.isAuthenticated()} fallback={<GuestPrompt />}>
            <div class="flex flex-col gap-4">
              <ProfileHeaderCard user={auth.user()!} />
              <div class="flex flex-col gap-4 lg:flex-row lg:items-start">
                <AccountSidebar />
                <OrderHistoryPanel />
              </div>
            </div>
          </Show>
        </Container>
      </main>
      <Footer />
    </>
  );
}

function GuestPrompt() {
  const auth = useAuth();
  return (
    <div class="flex flex-col items-center justify-center gap-4 rounded-card bg-white px-6 py-20 text-center shadow-card">
      <h1 class="text-2xl font-bold text-ink">เข้าสู่ระบบเพื่อดูบัญชีของคุณ</h1>
      <p class="max-w-sm text-ink-gray">เข้าสู่ระบบเพื่อดูประวัติคำสั่งซื้อ ที่อยู่จัดส่ง รายการโปรด และคะแนนสะสมของคุณ</p>
      <Button type="button" variant="primary" onClick={() => auth.openAuthModal()}>
        เข้าสู่ระบบ
      </Button>
    </div>
  );
}
