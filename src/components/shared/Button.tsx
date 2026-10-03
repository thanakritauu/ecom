import { splitProps, type JSX } from "solid-js";

type Variant = "primary" | "outline" | "ghost" | "white";
type Size = "sm" | "md" | "lg";

/**
 * Source of truth for every button across both Admin and the customer
 * frontend (Global UI Correction #18-21) — Admin reuses this component
 * as-is rather than a second button system, so a size/padding change here
 * is a global one. Horizontal padding is symmetric at every size (`px-4`/
 * `px-6`/`px-8`, never a lopsided `pl-`/`pr-` pair), and Primary/Secondary
 * map onto the existing `primary` (solid pink + white) / `outline` (pink
 * border + pink text) variants below — no new colors or a third visual
 * language for Admin.
 *
 * Design system rule: button text is always Medium (`font-medium`, 500) —
 * don't override it with semibold/bold, even when a Figma frame says so.
 * The same default is set for every raw `<button>` in `app.css`.
 */
const variantClass: Record<Variant, string> = {
  primary: "bg-brand-pink text-white hover:bg-brand-pink/90 border-none",
  outline: "bg-surface-card text-brand-pink border border-brand-pink hover:bg-surface-pink",
  ghost: "bg-white/30 text-white border-none hover:bg-white/40",
  white: "bg-white text-brand-pink hover:bg-white/90 border-none",
};

const sizeClass: Record<Size, string> = {
  sm: "px-4 py-1 text-sm gap-1",
  md: "px-6 py-2 text-base gap-2",
  lg: "px-8 py-2.5 text-lg gap-2",
};

type ButtonOwnProps = {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  class?: string;
};

const baseClass = (local: ButtonOwnProps) =>
  `inline-flex min-h-[44px] items-center justify-center rounded-pill font-medium
   transition-all duration-250 ease-out active:scale-[0.97]
   disabled:cursor-not-allowed disabled:opacity-50
   ${variantClass[local.variant ?? "primary"]} ${sizeClass[local.size ?? "md"]} ${local.class ?? ""}`;

/** Renders an `<a>` when `href` is passed, a `<button>` otherwise — same visual system either way. */
export function Button(
  props:
    | (ButtonOwnProps & JSX.ButtonHTMLAttributes<HTMLButtonElement>)
    | (ButtonOwnProps & JSX.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }),
) {
  if ("href" in props && props.href) {
    const [local, rest] = splitProps(props as ButtonOwnProps & JSX.AnchorHTMLAttributes<HTMLAnchorElement>, [
      "variant",
      "size",
      "loading",
      "class",
      "children",
    ]);
    return (
      <a {...rest} class={baseClass(local)}>
        {local.children}
      </a>
    );
  }

  const [local, rest] = splitProps(props as ButtonOwnProps & JSX.ButtonHTMLAttributes<HTMLButtonElement>, [
    "variant",
    "size",
    "loading",
    "class",
    "children",
    "disabled",
  ]);
  return (
    <button {...rest} disabled={local.disabled || local.loading} class={baseClass(local)}>
      {local.loading ? <span class="loading loading-spinner loading-sm" aria-hidden="true" /> : null}
      {local.children}
    </button>
  );
}
