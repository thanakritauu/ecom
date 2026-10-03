import type { JSX } from "solid-js";
import { useAdminUI } from "~/lib/adminUI";

/**
 * Global Admin UX Rule #1 (Floating/Sticky CTA) — one fixed-to-viewport
 * bottom bar shell reused for both a form's Save/Cancel and (via
 * AdminBulkActionBar) a list's bulk-action row, so every "important action
 * should always be reachable" surface in Admin shares the same shape
 * instead of each page inventing its own bar. The left offset starts the bar
 * to the right of AdminSidebar's current width — the sidebar itself isn't
 * `position: fixed`, so a plain `inset-x-0` bar would otherwise slide
 * underneath it — and follows the sidebar's collapse state (Global UI
 * Correction #5) so a collapsed sidebar doesn't leave a dead gap. Safe-area
 * padding + the border/shadow/blur match the customer side's own
 * StickyAddToCartBar, not a new visual language.
 */
export function AdminFloatingBar(props: { children: JSX.Element; class?: string }) {
  const ui = useAdminUI();
  return (
    <div
      classList={{
        "fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface-card/95 shadow-[0_-2px_12px_rgba(90,106,133,0.10)] backdrop-blur transition-[left] duration-200":
          true,
        "lg:left-20": ui.sidebarCollapsed(),
        "lg:left-64": !ui.sidebarCollapsed(),
        [props.class ?? ""]: !!props.class,
      }}
      style={{ "padding-bottom": "env(safe-area-inset-bottom)" }}
    >
      <div class="flex items-center gap-3 px-4 py-3 lg:px-6">{props.children}</div>
    </div>
  );
}
