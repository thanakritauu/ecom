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

export function CartIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-6"} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <path d="M2 3h2l2.2 12.2a2 2 0 0 0 2 1.6h8.6a2 2 0 0 0 2-1.6L21 7H6" stroke-linecap="round" stroke-linejoin="round" />
      <circle cx="9.5" cy="20.5" r="1.3" />
      <circle cx="17.5" cy="20.5" r="1.3" />
    </svg>
  );
}

export function PlusCartIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-5"} fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
      <path d="M3 4h2l2.4 12.2a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 2-1.6L21 8H6" stroke-linecap="round" stroke-linejoin="round" />
      <circle cx="9.5" cy="20.5" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="17.5" cy="20.5" r="1.4" fill="currentColor" stroke="none" />
      <path d="M16 3v5M13.5 5.5h5" stroke-linecap="round" />
    </svg>
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
 * Promotion Page → Frontend Navigation add-on — a small curated icon set an
 * admin can pick from for a nav item's `[Icon] Label` (see
 * `~/lib/promotionNavIcons`), reusing this same file rather than starting a
 * second icon system for it. Same `currentColor`/stroke-1.8 house style as
 * every icon above.
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

export function FireIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-5"} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <path
        d="M12 21c4 0 7-2.7 7-6.5 0-2.4-1.2-4-2.4-5.4.1 1.3-.4 2.3-1.2 2.9.2-2.8-1-5.3-3.4-7-1 1.9-.9 3.6-2 5-.7.9-1.7 1.5-2 2.8-.2.9-.2 1.8 0 2.6C7.4 14 7 12.9 7 11.5 5.7 13 5 14.4 5 16c0 3 3 5 7 5Z"
        stroke-linejoin="round"
      />
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

export function SparkleIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-5"} fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <path d="M11 3c.5 2.8 1.4 4.4 3.5 5.5C12.4 9.6 11.5 11.2 11 14c-.5-2.8-1.4-4.4-3.5-5.5C9.6 7.4 10.5 5.8 11 3Z" stroke-linejoin="round" />
      <path d="M18.5 13c.3 1.6.8 2.5 2 3.1-1.2.6-1.7 1.5-2 3.1-.3-1.6-.8-2.5-2-3.1 1.2-.6 1.7-1.5 2-3.1Z" stroke-linejoin="round" />
    </svg>
  );
}
