import type { JSX } from "solid-js";

/**
 * Same shimmer treatment as ProductCardSkeleton.tsx (the storefront's own
 * loading pattern) reused for Admin widgets — one `animate-shimmer` keyframe
 * already defined in tailwind.config.cjs, not a second loading visual
 * language invented for the back office.
 */
export function Skeleton(props: { class?: string; style?: JSX.CSSProperties }) {
  return <div style={props.style} class={`animate-shimmer rounded bg-surface-gray bg-[length:400px_100%] bg-no-repeat ${props.class ?? ""}`} />;
}
