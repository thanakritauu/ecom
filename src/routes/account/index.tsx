import { Show } from "solid-js";
import { useSearchParams } from "@solidjs/router";
import { Header } from "~/components/shared/Header";
import { Footer } from "~/components/shared/Footer";
import { Container } from "~/components/shared/Container";
import { ProfileHeaderCard } from "~/components/account/ProfileHeaderCard";
import { AccountSidebar } from "~/components/account/AccountSidebar";
import { OrderHistoryPanel } from "~/components/account/OrderHistoryPanel";
import { AccountGuestPrompt } from "~/components/account/AccountGuestPrompt";
import { useAuth } from "~/lib/auth";
import { createMockOrderRepository, createOrderHistory } from "~/lib/orderHistory";

/**
 * Figma node 159:20695 — the account page, whose main view is the
 * Purchase History ("ประวัติการซื้อ"). A guest stays on `/account` and sees
 * a prompt that opens the shared Auth Modal; success reveals this same page.
 */
export default function AccountPage() {
  const auth = useAuth();
  const [searchParams] = useSearchParams();
  const history = createOrderHistory(() => createMockOrderRepository({ empty: searchParams.orders === "empty" }));

  return (
    <>
      <Header />
      <main class="flex flex-col overflow-x-hidden bg-surface-gray/60 py-6">
        <Container width="wide">
          <Show when={auth.isAuthenticated()} fallback={<AccountGuestPrompt />}>
            <div class="flex flex-col gap-4">
              <ProfileHeaderCard user={auth.user()!} />
              <div class="flex flex-col gap-4 lg:flex-row lg:items-start">
                <AccountSidebar orderCount={history.ready() ? history.orders().length : undefined} />
                <OrderHistoryPanel orders={history.orders()} ready={history.ready()} />
              </div>
            </div>
          </Show>
        </Container>
      </main>
      <Footer />
    </>
  );
}
