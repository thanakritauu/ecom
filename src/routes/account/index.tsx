import { useSearchParams } from "@solidjs/router";
import { AccountShell } from "~/components/account/AccountShell";
import { OrderHistoryPanel } from "~/components/account/OrderHistoryPanel";
import { createMockOrderRepository, createOrderHistory } from "~/lib/orderHistory";
import { useAuth } from "~/lib/auth";

/**
 * Figma node 159:20695 — the account page, whose main view is the
 * Purchase History ("ประวัติการซื้อ"). A guest stays on `/account` and sees
 * a prompt that opens the shared Auth Modal; success reveals this same page.
 */
export default function AccountPage() {
  const [searchParams] = useSearchParams();
  const history = createOrderHistory(() => createMockOrderRepository({ empty: searchParams.orders === "empty" }));
  const auth = useAuth();
  // "ยืนยันรับสินค้า": the order's คะแนน go into the balance at once.
  const confirmReceived = async (orderId: string) => {
    const order = await history.confirmReceived(orderId);
    auth.creditPoints(history.pointsFor(order));
    return order;
  };

  return (
    <AccountShell counts={{ orders: history.ready() ? history.orders().length : undefined }}>
      <OrderHistoryPanel orders={history.orders()} ready={history.ready()} pointsFor={history.pointsFor} onConfirmReceived={confirmReceived} />
    </AccountShell>
  );
}
