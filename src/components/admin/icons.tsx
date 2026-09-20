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

export function ChevronRightIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-4"} fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
      <path d="m9 6 6 6-6 6" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
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
