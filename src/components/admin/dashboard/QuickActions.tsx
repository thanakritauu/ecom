import { For } from "solid-js";
import { A } from "@solidjs/router";
import { PlusIcon, MarketingIcon, OrdersIcon, InventoryIcon } from "~/components/admin/icons";

const ACTIONS = [
  { label: "เพิ่มสินค้า", href: "/admin/products/new", icon: PlusIcon },
  { label: "เพิ่มโปรโมชั่น", href: "/admin/marketing/promotions?tab=tools", icon: MarketingIcon },
  { label: "เพิ่มคูปอง", href: "/admin/marketing/coupons/new", icon: MarketingIcon },
  { label: "ดูคำสั่งซื้อ", href: "/admin/orders", icon: OrdersIcon },
  { label: "จัดการสต๊อก", href: "/admin/inventory", icon: InventoryIcon },
] as const;

/** Shortcuts into the tasks staff do most. */
export function QuickActions() {
  return (
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <For each={ACTIONS}>
        {(action) => (
          <A
            href={action.href}
            class="font-normal flex min-h-11 flex-col items-center justify-center gap-2 rounded-card border border-border bg-surface-card px-3 py-4 text-center transition-colors duration-150 lg:hover:border-brand-pink lg:hover:bg-surface-pink/40"
          >
            <span class="flex size-9 items-center justify-center rounded-pill bg-surface-pink text-brand-pink">
              <action.icon class="size-4" />
            </span>
            <span class="text-sm font-medium text-ink">{action.label}</span>
          </A>
        )}
      </For>
    </div>
  );
}
