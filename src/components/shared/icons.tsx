/**
 * Small hand-authored `currentColor` icons for UI that has no equivalent
 * Figma export (wishlist heart, cart, hamburger, quick-add) or where the
 * exported asset was baked for one specific background and can't be
 * recolored. Kept in one place instead of inlined per component.
 */

export function HeartIcon(props: { filled?: boolean; class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-5"} aria-hidden="true">
      <path
        // The two lobes' bottom curves used to land 0.8 units apart (12,20.5
        // and 10.4,20.5) instead of meeting at one point, closed by a short
        // straight bridge shorter than the 1.8 stroke-width itself — with
        // `stroke-linejoin="round"` that produced two overlapping corner
        // arcs that merged into a bulging blob instead of a clean tip. Both
        // ends now converge on their shared symmetry point (11.2,20.5); every
        // other coordinate is untouched (verified byte-identical) — same
        // silhouette, just a proper single joint at the bottom.
        d="M11.2 20.5s-6.7-4.6-9.2-9.1C.4 8.2 1.8 4.5 5.4 3.6c2-.5 4 .3 5.1 2 .3.5 1.1.5 1.4 0 1.1-1.7 3.1-2.5 5.1-2 3.6.9 5 4.6 3.4 7.8-2.5 4.5-9.2 9.1-9.2 9.1Z"
        fill={props.filled ? "currentColor" : "none"}
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linejoin="round"
      />
    </svg>
  );
}

/**
 * Design system rule — the site's cart mark is a shopping bag (Header,
 * BottomNav "ตะกร้า", every "เพิ่มลงตะกร้า" button). Never a trolley.
 */
export function CartIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-6"} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <path d="M5 8h14l-1.1 11.6a1.6 1.6 0 0 1-1.6 1.4H7.7a1.6 1.6 0 0 1-1.6-1.4L5 8Z" stroke-linejoin="round" />
      <path d="M9 10.5V7a3 3 0 0 1 6 0v3.5" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}

/** Shopping bag with a plus — same bag as `CartIcon`. */
export function PlusCartIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-5"} fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
      <path d="M5 8h14l-1.1 11.6a1.6 1.6 0 0 1-1.6 1.4H7.7a1.6 1.6 0 0 1-1.6-1.4L5 8Z" stroke-linejoin="round" />
      <path d="M9 10.5V7a3 3 0 0 1 6 0v3.5" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M12 12.5v5M9.5 15h5" stroke-linecap="round" />
    </svg>
  );
}

/**
 * Design system rule — the one × on the site, taken from the Home promo
 * popup: a thin 2.5px round-cap X. `CloseMark` is the full close control's
 * look (32px white circle, soft shadow, gray X) — put it inside any close
 * button that keeps its own 44px tap area. Tight spots (filter chip remove,
 * search clear) use the bare `CloseIcon` glyph.
 */
export function CloseIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-3.5"} fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" stroke-linecap="round" />
    </svg>
  );
}

export function CloseMark(props: { class?: string }) {
  return (
    <span
      class={`flex size-8 shrink-0 items-center justify-center rounded-pill bg-white/80 text-ink-gray shadow-card transition-colors lg:group-hover:bg-white ${props.class ?? ""}`}
      aria-hidden="true"
    >
      <CloseIcon />
    </span>
  );
}

/** "View product detail" affordance on ProductCard — not a Figma export, hand-authored to match the other line icons here. */
export function DetailArrowIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-4"} fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
      <path d="M7 17 17 7M9 7h8v8" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}

export function UserIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-5"} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.5 20c1-3.8 4-5.8 7.5-5.8s6.5 2 7.5 5.8" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}

export function HamburgerIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-6"} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <path d="M3 6h18M3 12h18M3 18h18" stroke-linecap="round" />
    </svg>
  );
}

/**
 * Small line icons (tag, star, gift, ...) shared by coupons, reviews and
 * cart rows. Same `currentColor`/stroke-1.8 house style as every icon above.
 */
export function TagIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-5"} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <path d="M11.5 3H5a1 1 0 0 0-1 1v6.5a1 1 0 0 0 .3.7l9.5 9.5a1 1 0 0 0 1.4 0l6.5-6.5a1 1 0 0 0 0-1.4l-9.5-9.5a1 1 0 0 0-.7-.3Z" stroke-linejoin="round" />
      <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function StarIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-5"} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <path d="M12 3.5 14.5 9l6 .8-4.4 4.1 1.2 5.9L12 16.9l-5.3 2.9 1.2-5.9-4.4-4.1 6-.8L12 3.5Z" stroke-linejoin="round" />
    </svg>
  );
}

export function GiftIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-5"} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <rect x="3" y="9" width="18" height="4" rx="1" />
      <rect x="4.5" y="13" width="15" height="8" rx="1" />
      <path d="M12 9v12M12 9C10.5 9 8 8.3 8 6a2 2 0 1 1 4 0c0-1.3 1.5-2 2-2a2 2 0 1 1 0 4c-1 0-1.5-.5-2 0Z" stroke-linejoin="round" />
    </svg>
  );
}

/** Free shipping: same 1.8 stroke as `GiftIcon`, so the two promo banners read as a pair. */
export function TruckIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-5"} fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true">
      <path d="M2.5 6.5h11v9.5h-11z" />
      <path d="M13.5 9.5h4l3.5 3.5v3h-7.5z" />
      <circle cx="6.5" cy="17.5" r="1.8" fill="white" />
      <circle cx="17" cy="17.5" r="1.8" fill="white" />
    </svg>
  );
}

/** Global Responsive + Navigation Foundation (Bottom Nav's "หน้าแรก"). */
export function HomeIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-5"} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <path d="M3.5 10.5 12 3.5l8.5 7" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M5.5 9v10a1 1 0 0 0 1 1H10v-5.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V20h3.5a1 1 0 0 0 1-1V9" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}

/**
 * Receipt/document glyph — was local to `AccountSidebar.tsx` ("ประวัติการซื้อ");
 * moved here so Global Top Navigation's own order-history link (Header.tsx)
 * reuses the exact same mark instead of a second icon for the same
 * destination/meaning.
 */
export function DocumentIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-5"} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <path d="M6 2.5h9l4.5 4.5v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-17a1 1 0 0 1 1-1Z" stroke-linejoin="round" />
      <path d="M14.5 2.5V7a1 1 0 0 0 1 1h4.5" stroke-linejoin="round" />
      <path d="M8 13h8M8 17h5" stroke-linecap="round" />
    </svg>
  );
}

/** Copy to clipboard — two stacked sheets, same 1.8 stroke as the other line icons. */
export function CopyIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-4"} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <rect x="8.5" y="8.5" width="12" height="12" rx="2" stroke-linejoin="round" />
      <path d="M15.5 8.5V5.5a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}

/**
 * Design system rule — the one check mark (✓) on the site: the selected-tile
 * tick from QuickAddSheet / payment methods (16×16, 2px round stroke, in
 * `currentColor`). As a "done/selected" marker it sits white on a pink
 * circle (`CheckBadge`); never a text "✓" glyph.
 */
export function CheckIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" class={props.class ?? "size-3.5"} aria-hidden="true">
      <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}

/** Pink (or `class`-overridden) circle with the DSL check — selected tile, completed step. */
export function CheckBadge(props: { class?: string }) {
  return (
    <span class={`flex shrink-0 items-center justify-center rounded-pill text-white ${props.class ?? "size-6 bg-brand-pink"}`} aria-hidden="true">
      <CheckIcon />
    </span>
  );
}

/** Magnifier — the same glyph the SearchBar draws inline. */
export function SearchIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-5"} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" stroke-linecap="round" />
    </svg>
  );
}

/** Location pin — addresses. */
export function PinIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-5"} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" stroke-linejoin="round" />
      <circle cx="12" cy="10" r="2.3" />
    </svg>
  );
}

/** Payment card — saved cards. */
export function CardIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-5"} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <rect x="3" y="5.5" width="18" height="13" rx="2" />
      <path d="M3 10h18M7 15h4" stroke-linecap="round" />
    </svg>
  );
}

/** Coin — Charmiss Coin history (line style, for the empty state; the brand coin artwork stays a PNG elsewhere). */
export function CoinIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-5"} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="5" />
    </svg>
  );
}

/** Play button — review clips. */
export function PlayIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-5"} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <rect x="3" y="4.5" width="18" height="15" rx="3" />
      <path d="M10 9.2v5.6l4.6-2.8L10 9.2Z" stroke-linejoin="round" />
    </svg>
  );
}

/** Video sound on: speaker + two waves, same 1.8 line style as the icons above. Pair with `SpeakerOffIcon`. */
export function SpeakerOnIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-5"} fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
      <path d="M15.5 9.2a4 4 0 0 1 0 5.6M18.2 6.6a7.6 7.6 0 0 1 0 10.8" />
    </svg>
  );
}

/** Video muted: same speaker with an X where the waves were. */
export function SpeakerOffIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-5"} fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
      <path d="M15.5 9.5l5 5M20.5 9.5l-5 5" />
    </svg>
  );
}
