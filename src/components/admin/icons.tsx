import { ChevronIcon } from "~/components/shared/ChevronIcon";
/**
 * Small hand-authored `currentColor` line icons for the Admin nav/topbar —
 * same stroke-width-1.8 style as ~/components/shared/icons.tsx (no Figma
 * export exists for an admin backend, so these are drawn to match that
 * visual language rather than introducing a new icon style).
 */

export function DashboardIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-5"} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="5" rx="1.5" />
      <rect x="13" y="10" width="8" height="11" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
    </svg>
  );
}

export function CatalogIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-5"} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <path d="M11.3 3.3a2 2 0 0 1 1.4-.6h5.4A2 2 0 0 1 20 4.6V10a2 2 0 0 1-.6 1.4l-8 8a2 2 0 0 1-2.8 0l-5.4-5.4a2 2 0 0 1 0-2.8l8-8Z" stroke-linejoin="round" />
      <circle cx="15.5" cy="7.5" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function OrdersIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-5"} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <path d="M6 3h9l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" stroke-linejoin="round" />
      <path d="M15 3v4a1 1 0 0 0 1 1h4" stroke-linejoin="round" />
      <path d="M8 12h8M8 16h8" stroke-linecap="round" />
    </svg>
  );
}

export function CustomersIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-5"} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M2.8 20c.9-3.4 3.4-5.2 6.2-5.2s5.3 1.8 6.2 5.2" stroke-linecap="round" stroke-linejoin="round" />
      {/* Was an open arc (`a3 3 0 1 1 ...`) that never closed, rendering as a
          visibly broken/gapped circle at any size above ~20px — Global UI
          Correction — Final Refinement #14/15 root cause: wrong SVG
          primitive, not a CSS/scale issue. A plain closed `<circle>` (same
          shape every other head in this icon set uses) fixes it outright. */}
      <circle cx="17" cy="8.6" r="2.6" />
      <path d="M15.3 14.9c2.5.5 4.4 2.2 5.2 4.7" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}

export function InventoryIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-5"} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <path d="M3 7.5 12 3l9 4.5-9 4.5-9-4.5Z" stroke-linejoin="round" />
      <path d="M3 7.5V16l9 4.5 9-4.5V7.5" stroke-linejoin="round" />
      <path d="M12 12v8.5" />
    </svg>
  );
}

export function MarketingIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-5"} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <path d="M3 10v4a1 1 0 0 0 1 1h2l1.5 5H10l-1-5h2l7 3.5V6.5L11 10H4a1 1 0 0 0-1 1Z" stroke-linejoin="round" />
      <path d="M17 8.5v7" stroke-linecap="round" />
    </svg>
  );
}

export function LoyaltyIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-5"} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <path
        d="M12 3.5 14.5 9l6 .8-4.4 4.1 1.2 5.9L12 16.9l-5.3 2.9 1.2-5.9L3.5 9.8l6-.8L12 3.5Z"
        stroke-linejoin="round"
      />
    </svg>
  );
}

export function ReviewsIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-5"} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <path d="M4 5h16v10a1 1 0 0 1-1 1H9l-4 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" stroke-linejoin="round" />
      <path d="m10 8.5 1 2 2.2.3-1.6 1.5.4 2.2-2-1-2 1 .4-2.2-1.6-1.5 2.2-.3 1-2Z" stroke-linejoin="round" />
    </svg>
  );
}

export function ContentIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-5"} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="1.5" />
      <path d="M3 9h18" />
      <path d="M8 13.5h8M8 16.5h5" stroke-linecap="round" />
    </svg>
  );
}

/**
 * Global UI Correction — Final Refinement #14/15: the previous path here was
 * a hand-approximated gear whose "teeth" mixed several different radii
 * (1.7/1.9/1.1) and anchor offsets that didn't repeat symmetrically —
 * self-intersecting into a visibly warped/pinched cog at any real size, not
 * just a scaling artifact. Root cause was the SVG path data itself (an
 * asset problem, not implementation/CSS/viewBox), so it's replaced outright
 * with a known-correct, evenly-toothed gear path (adapted from Feather
 * Icons' MIT-licensed "settings" glyph) instead of hand-tweaking the broken
 * one further. Same viewBox/stroke conventions as every other icon here.
 */
export function SettingsIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-5"} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
        stroke-linejoin="round"
      />
    </svg>
  );
}

export function BellIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-5"} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <path d="M6 9a6 6 0 1 1 12 0c0 3.4 1 5.2 1.8 6.2a.8.8 0 0 1-.6 1.3H4.8a.8.8 0 0 1-.6-1.3C5 14.2 6 12.4 6 9Z" stroke-linejoin="round" />
      <path d="M9.5 19a2.5 2.5 0 0 0 5 0" stroke-linecap="round" />
    </svg>
  );
}

export function SearchIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-5"} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" stroke-linecap="round" />
    </svg>
  );
}

export function LogoutIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-5"} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <path d="M9 21H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h4" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M16 17l5-5-5-5M21 12H9" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}

/** Same chevron as the storefront (DSL — see shared/ChevronIcon). */
export function ChevronRightIcon(props: { class?: string }) {
  return <ChevronIcon direction="right" class={props.class ?? "size-4"} />;
}

export function ChevronDownIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-4"} fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
      <path d="m6 9 6 6 6-6" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}

export function CloseXIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-3.5"} fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" stroke-linecap="round" />
    </svg>
  );
}

export function RevenueIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-5"} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <rect x="2.5" y="6" width="19" height="13" rx="2" />
      <circle cx="12" cy="12.5" r="3" />
      <path d="M6 6V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

export function AovIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-5"} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <path d="M4 19h16" stroke-linecap="round" />
      <rect x="6" y="11" width="3.5" height="8" rx="0.8" />
      <rect x="10.5" y="7" width="3.5" height="12" rx="0.8" />
      <rect x="15" y="13" width="3.5" height="6" rx="0.8" />
    </svg>
  );
}

export function ArrowUpIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-3.5"} fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
      <path d="M12 19V5M6 11l6-6 6 6" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}

export function ArrowDownIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-3.5"} fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
      <path d="M12 5v14M6 13l6 6 6-6" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}

export function PlusIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-4"} fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke-linecap="round" />
    </svg>
  );
}

export function RefreshIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-4"} fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
      <path
        d="M4 12a8 8 0 0 1 14-5.2M20 12a8 8 0 0 1-14 5.2M4 4v4h4M20 20v-4h-4"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
}

export function MoreIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-5"} fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
    </svg>
  );
}

export function ImageIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-5"} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="m4.5 18 5-5.5 3 3 3.5-4.5 4.5 6" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}

export function TrashIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-4"} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-9 0 1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}

export function CalendarIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-4"} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 9.5h18M8 3v4M16 3v4" stroke-linecap="round" />
    </svg>
  );
}

export function DragHandleIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-4"} fill="currentColor" aria-hidden="true">
      <circle cx="9" cy="6" r="1.5" />
      <circle cx="15" cy="6" r="1.5" />
      <circle cx="9" cy="12" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="9" cy="18" r="1.5" />
      <circle cx="15" cy="18" r="1.5" />
    </svg>
  );
}

export function HomeIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-5"} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <path d="M3.5 10.5 12 3.5l8.5 7" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M5.5 9v10a1 1 0 0 0 1 1H10v-6h4v6h3.5a1 1 0 0 0 1-1V9" stroke-linejoin="round" />
    </svg>
  );
}

export function LayersIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-5"} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <path d="m12 3 8.5 4.5L12 12 3.5 7.5 12 3Z" stroke-linejoin="round" />
      <path d="m3.5 12 8.5 4.5 8.5-4.5" stroke-linecap="round" stroke-linejoin="round" />
      <path d="m3.5 16.5 8.5 4.5 8.5-4.5" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}

export function EyeIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-5"} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" stroke-linejoin="round" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function DuplicateIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-5"} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <rect x="8.5" y="8.5" width="12" height="12" rx="1.5" />
      <path d="M15.5 8.5V5.5A1.5 1.5 0 0 0 14 4H5.5A1.5 1.5 0 0 0 4 5.5V14a1.5 1.5 0 0 0 1.5 1.5h3" />
    </svg>
  );
}

/** Navigation Architecture — sitemap glyph (top bar = menu, branches = menu items resolving to pages), used for the standalone Navigation admin sidebar group. */
export function NavigationIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-5"} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <rect x="4" y="3.5" width="16" height="4" rx="1.2" />
      <path d="M7 7.5V12M17 7.5V12" stroke-linecap="round" />
      <path d="M7 12h10" stroke-linecap="round" />
      <rect x="4" y="16.5" width="6" height="4" rx="1.2" />
      <rect x="14" y="16.5" width="6" height="4" rx="1.2" />
      <path d="M7 12v4.5M17 12v4.5" stroke-linecap="round" />
    </svg>
  );
}

/* CMS Backoffice Polish §18 — one distinct icon per sidebar sub-item (previously only the first item in each group showed an icon at all). Same hand-authored stroke-width-1.8 style as the rest of this file. */

export function ProductBoxIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-5"} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <path d="M3.5 8 12 3.5 20.5 8 12 12.5 3.5 8Z" stroke-linejoin="round" />
      <path d="M3.5 8v8L12 20.5 20.5 16V8" stroke-linejoin="round" />
      <path d="M12 12.5v8" />
    </svg>
  );
}

export function CategoryGridIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-5"} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="1.3" />
      <rect x="13" y="3.5" width="7.5" height="7.5" rx="1.3" />
      <rect x="3.5" y="13" width="7.5" height="7.5" rx="1.3" />
      <rect x="13" y="13" width="7.5" height="7.5" rx="1.3" />
    </svg>
  );
}

export function StackBoxesIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-5"} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <rect x="3.5" y="12.5" width="7" height="7" rx="1.2" />
      <rect x="13.5" y="12.5" width="7" height="7" rx="1.2" />
      <rect x="8.5" y="4.5" width="7" height="7" rx="1.2" />
    </svg>
  );
}

export function StockAdjustIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-5"} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M8 12h3M8 8.5h5M8 15.5h2" stroke-linecap="round" />
      <path d="m15.2 11.3 2.3 2.3-4.2 4.2h-2.3v-2.3l4.2-4.2Z" stroke-linejoin="round" />
    </svg>
  );
}

export function PromotionTagIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-5"} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <path d="M11.3 3.3a2 2 0 0 1 1.4-.6h5.4A2 2 0 0 1 20 4.6V10a2 2 0 0 1-.6 1.4l-8 8a2 2 0 0 1-2.8 0l-5.4-5.4a2 2 0 0 1 0-2.8l8-8Z" stroke-linejoin="round" />
      <path d="m9.5 9.5 5 5" stroke-linecap="round" />
    </svg>
  );
}

export function CouponTicketIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-5"} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <path d="M3.5 9.5a2 2 0 0 1 0-3.8V5a1 1 0 0 1 1-1h15a1 1 0 0 1 1 1v.7a2 2 0 0 1 0 3.8v1.4a2 2 0 0 1 0 3.8V19a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-.7a2 2 0 0 1 0-3.8V9.5Z" stroke-linejoin="round" />
      <path d="M15 4.5v15" stroke-dasharray="2.2 2.2" />
    </svg>
  );
}

export function FlashBoltIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-5"} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <path d="M13 3 5 13.5h5.5L11 21l8-11.5h-5.5L13 3Z" stroke-linejoin="round" />
    </svg>
  );
}

export function BundleBoxIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-5"} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <rect x="3.5" y="8" width="17" height="12" rx="1.5" stroke-linejoin="round" />
      <path d="M3.5 12h17M12 8v12" />
      <path d="M9 8c-1.5 0-2.5-1-2.5-2.2C6.5 4.6 7.5 4 8.3 4 9.6 4 11 5.5 12 8Zm6 0c1.5 0 2.5-1 2.5-2.2C17.5 4.6 16.5 4 15.7 4 14.4 4 13 5.5 12 8Z" stroke-linejoin="round" />
    </svg>
  );
}

export function MemberBadgeIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-5"} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <circle cx="12" cy="8" r="3.3" />
      <path d="M5.5 20c.8-3.2 3.2-5 6.5-5s5.7 1.8 6.5 5" stroke-linecap="round" stroke-linejoin="round" />
      <path d="m9.6 12.6 1.6 1.6 3-3" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}

export function PointsCoinIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-5"} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5v9M9.3 15.2c.3.9 1.3 1.4 2.7 1.4 1.7 0 2.8-.8 2.8-2s-1-1.7-2.8-2c-1.8-.3-2.7-.8-2.7-1.9 0-1.1 1.1-1.9 2.7-1.9 1.3 0 2.3.5 2.6 1.4" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}

export function MissionFlagIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-5"} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <path d="M6 21V4" stroke-linecap="round" />
      <path d="M6 4.5h11l-2.5 3.5L17 11.5H6" stroke-linejoin="round" />
    </svg>
  );
}

export function RewardGiftIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-5"} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <rect x="3.5" y="9.5" width="17" height="10.5" rx="1.3" />
      <path d="M3.5 13.5h17M12 9.5v10.5" />
      <path d="M9 9.5c-1.7 0-3-1.1-3-2.5S7.3 4.5 8.3 4.5c1.4 0 2.9 1.7 3.7 5Zm6 0c1.7 0 3-1.1 3-2.5S16.7 4.5 15.7 4.5c-1.4 0-2.9 1.7-3.7 5Z" stroke-linejoin="round" />
    </svg>
  );
}

export function PagesPanelIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-5"} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="1.5" />
      <path d="M9 4v16" />
      <path d="M13 8h5M13 11.5h5M13 15h3" stroke-linecap="round" />
    </svg>
  );
}

export function CampaignFlagIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-5"} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <rect x="3.5" y="4" width="17" height="16" rx="2" />
      <path d="M3.5 9.5h17" />
      <path d="m9 15 1.7 1.7L14.5 13" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}

export function FolderIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-5"} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <path d="M3.5 6.5A1.5 1.5 0 0 1 5 5h4.4a1.5 1.5 0 0 1 1.2.6l1.2 1.6h7.7A1.5 1.5 0 0 1 21 8.7v9.8A1.5 1.5 0 0 1 19.5 20h-15A1.5 1.5 0 0 1 3 18.5v-12Z" stroke-linejoin="round" />
    </svg>
  );
}

export function SlidersIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-5"} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <path d="M4 6h9M17 6h3M4 12h3M9 12h11M4 18h13M20 18h0" stroke-linecap="round" />
      <circle cx="12" cy="6" r="2" />
      <circle cx="6" cy="12" r="2" />
      <circle cx="17" cy="18" r="2" />
    </svg>
  );
}

export function ShieldUserIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-5"} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <path d="M12 3.5 19 6v6c0 4.5-3 7.5-7 8.5-4-1-7-4-7-8.5V6l7-2.5Z" stroke-linejoin="round" />
      <circle cx="12" cy="10.3" r="2.1" />
      <path d="M8.6 15.5c.6-1.7 1.8-2.5 3.4-2.5s2.8.8 3.4 2.5" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}

export function KeyIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-5"} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <circle cx="8" cy="15" r="4" />
      <path d="m11 12 8.5-8.5M16.5 6.5l2.5 2.5M14 9l2 2" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}

/** §05-11 — Export/Import affordances shared across every Admin table. */
export function DownloadIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-4"} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <path d="M12 3.5v11.5M7.5 10.5l4.5 4.5 4.5-4.5" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M4.5 16.5v2a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-2" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}

export function UploadIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-4"} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <path d="M12 15.5V4M7.5 8.5 12 4l4.5 4.5" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M4.5 16.5v2a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-2" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}

/** CMS + Frontend Final Refinement §8 — the Product Gallery's "ตั้งเป็นรูปหลัก" (Set as Main Photo) pin affordance and its "รูปหลัก" badge. */
export function StarIcon(props: { class?: string; filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-4"} fill={props.filled ? "currentColor" : "none"} stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <path d="m12 3.5 2.66 5.52 6.09.86-4.4 4.32 1.04 6.06L12 17.35l-5.39 2.91 1.04-6.06-4.4-4.32 6.09-.86Z" stroke-linejoin="round" />
    </svg>
  );
}

/** Order + Receipt Phase §14/§15/§22 — "พิมพ์ใบเสร็จ" action. */
export function PrintIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-4"} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <path d="M7 8.5V4h10v4.5" stroke-linecap="round" stroke-linejoin="round" />
      <rect x="4.5" y="8.5" width="15" height="8" rx="1.5" />
      <path d="M7 15.5h10V20H7z" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}

/** Order + Receipt Phase §15 — the "เอกสารคำสั่งซื้อ" section / "ดูใบเสร็จ" action. */
export function ReceiptIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-4"} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <path d="M6 3.5h12v17l-2.5-1.5-2.5 1.5-2.5-1.5L8 20.5 5.5 19V3.5Z" stroke-linejoin="round" />
      <path d="M8.5 8h7M8.5 11.5h7M8.5 15h4" stroke-linecap="round" />
    </svg>
  );
}

export function FileSpreadsheetIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-4"} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <path d="M6 3.5h8l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1Z" stroke-linejoin="round" />
      <path d="M8 12.5h8M8 16h8M11 12.5V20" stroke-linecap="round" />
    </svg>
  );
}

export function CheckCircleIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-4"} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12.5 2.5 2.5L16 9.5" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}

export function WarningTriangleIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-4"} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <path d="M12 4 3 19h18L12 4Z" stroke-linejoin="round" />
      <path d="M12 10v4" stroke-linecap="round" />
      <circle cx="12" cy="16.7" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function ErrorCircleIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-4"} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9l6 6M15 9l-6 6" stroke-linecap="round" />
    </svg>
  );
}
