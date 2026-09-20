import type { JSX } from "solid-js";

export function Badge(props: { tone?: "red" | "pink" | "success"; class?: string; children: JSX.Element }) {
  const tone = {
    red: "bg-system-red text-white",
    pink: "bg-brand-pink text-white",
    success: "bg-success text-white",
  }[props.tone ?? "red"];

  return (
    <span
      class={`inline-flex items-center justify-center rounded-pill px-1.5 py-0.5 text-xs font-medium opacity-90 ${tone} ${props.class ?? ""}`}
    >
      {props.children}
    </span>
  );
}
