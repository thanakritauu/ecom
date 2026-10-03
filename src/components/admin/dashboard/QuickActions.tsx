import { For } from "solid-js";
import { A } from "@solidjs/router";
import { PlusIcon, MarketingIcon, OrdersIcon, InventoryIcon } from "~/components/admin/icons";

const ACTIONS = [
  { label: "เพิ่มสินค้า", href: "/admin/products", icon: PlusIcon },
  { label: "สร้างโปรโมชั่น", href: "/admin/marketing", icon: MarketingIcon },
  { label: "สร้างคูปอง", href: "/admin/marketing", icon: MarketingIcon },
  { label: "ดู Orders", href: "/admin/orders", icon: OrdersIcon },
  { label: "จัดการ Stock", href: "/admin/inventory", icon: InventoryIcon },
] as const;

/** PART 14 — shortcuts into the modules an admin reaches for most; every target already exists as a real (if placeholder) route. */
export function QuickActions() {
  return (
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <For each={ACTIONS}>
        {(action) => (
          <A
            href={action.href}
            class="flex min-h-11 flex-col items-center justify-center gap-2 rounded-card border border-border bg-surface-card px-3 py-4 text-center transition-colors duration-150 hover:border-brand-pink hover:bg-surface-pink/40"
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
