import { useSearchParams } from "@solidjs/router";
import { AccountShell } from "~/components/account/AccountShell";
import { OrderHistoryPanel } from "~/components/account/OrderHistoryPanel";
import { createMockOrderRepository, createOrderHistory } from "~/lib/orderHistory";

/**
 * Figma node 159:20695 — the account page, whose main view is the
 * Purchase History ("ประวัติการซื้อ"). A guest stays on `/account` and sees
 * a prompt that opens the shared Auth Modal; success reveals this same page.
 */
export default function AccountPage() {
  const [searchParams] = useSearchParams();
  const history = createOrderHistory(() => createMockOrderRepository({ empty: searchParams.orders === "empty" }));

  return (
    <AccountShell counts={{ orders: history.ready() ? history.orders().length : undefined }}>
      <OrderHistoryPanel orders={history.orders()} ready={history.ready()} />
    </AccountShell>
  );
}
