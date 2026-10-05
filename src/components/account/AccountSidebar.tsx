import { createSignal, onMount, Show } from "solid-js";
import { A, useNavigate } from "@solidjs/router";
import { useAuth } from "~/lib/auth";
import { pushToast } from "~/lib/toast";
import { createMockOrderRepository } from "~/lib/orderHistory";

/** Only "ประวัติการซื้อ" carries a counter. */
export type AccountCounts = { orders?: number };

/**
 * Shared Account Navigation — every account page renders it (via
 * `AccountShell`). Desktop (lg+): a vertical card beside the content.
 * Tablet/phone: one row of pills that scrolls sideways, the current page
 * scrolled into view. Only the order history shows a count — loaded from
 * the order repository unless the page passes its own live count.
 */
export function AccountSidebar(props: { counts?: AccountCounts }) {
  const auth = useAuth();
  const navigate = useNavigate();
  const [loadedOrders, setLoadedOrders] = createSignal<number>();
  let rail: HTMLUListElement | undefined;

  onMount(async () => {
    // Keep the current page's pill visible on narrow screens (horizontal only — never scrolls the page).
    const active = rail?.querySelector<HTMLElement>("[aria-current='page']");
    if (rail && active && rail.scrollWidth > rail.clientWidth)
      rail.scrollLeft += active.getBoundingClientRect().left - rail.getBoundingClientRect().left - 12; // 12 = the rail's own left padding

    setLoadedOrders((await createMockOrderRepository().list()).length);
  });
  const orderCount = () => props.counts?.orders ?? loadedOrders();

  const logout = () => {
    auth.logout(); // synchronous — Auth State is already cleared (and Header/this page already reactively guest) before the lines below run
    navigate("/account");
    pushToast("ออกจากระบบสำเร็จ", "success", "แล้วพบกันใหม่นะ 👋");
  };

  return (
    <nav aria-label="เมนูบัญชีของฉัน" class="w-full min-w-0 shrink-0 rounded-card bg-white shadow-card lg:w-[264px] lg:p-4">
      <ul ref={rail} class="no-scrollbar flex gap-2 overflow-x-auto p-3 lg:flex-col lg:gap-1 lg:overflow-visible lg:p-0">
        <NavItem href="/account" end label="ประวัติการซื้อ" count={orderCount()} />
        <NavItem href="/account/address" label="ที่อยู่จัดส่ง" />
        <NavItem href="/account/cards" label="บัตรเครดิต / เดบิต" />
        <NavItem href="/account/points" label="Charmiss Club" />
        <NavItem href="/account/wishlist" label="รายการโปรด" />
        <NavItem href="/account/profile" label="ข้อมูลส่วนตัว" />

        <li class="my-1 hidden h-px w-full bg-surface-gray lg:block" aria-hidden="true" />
        <li class="shrink-0">
          <button type="button" onClick={logout} class={`${ITEM_CLASS} text-danger-strong lg:hover:bg-danger-soft`}>
            <span class="flex-1 text-left">ออกจากระบบ</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}

// Pill on tablet/phone (a row that scrolls sideways), full-width row on desktop.
const ITEM_CLASS =
  "flex min-h-[44px] items-center gap-2 whitespace-nowrap rounded-pill border border-surface-gray px-4 py-2 text-sm font-medium transition-colors duration-150 lg:w-full lg:rounded-2xl lg:border-transparent lg:px-3";

function NavItem(props: { href: string; end?: boolean; label: string; count?: number }) {
  return (
    <li class="shrink-0">
      <A
        href={props.href}
        end={props.end}
        class={`group ${ITEM_CLASS}`}
        activeClass="!border-transparent bg-surface-pink text-brand-pink"
        inactiveClass="text-ink lg:hover:bg-surface-gray"
      >
        <span class="flex-1 text-left">{props.label}</span>
        <Show when={props.count !== undefined}>
          <span class="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-pill bg-surface-gray px-1.5 text-sm font-semibold text-ink-gray group-aria-[current=page]:bg-brand-pink group-aria-[current=page]:text-white">
            {props.count}
          </span>
        </Show>
      </A>
    </li>
  );
}
