import type { JSX } from "solid-js";

export type StatusTone = "success" | "warning" | "danger" | "neutral" | "info";

/**
 * Admin's status pill — deliberately not the customer-facing `Badge` (a
 * small solid-color ribbon meant for a product card corner). Status pills in
 * a dense table need to stay legible at a glance (PART 18 of the Admin Shell
 * spec: "Status ต้องอ่านง่าย"), so this uses the same soft-background +
 * colored-text pairing the customer Account page's own order-status pills
 * already established (accountData.ts `ORDER_STATUS_META`) — reusing that
 * precedent's exact tokens rather than inventing a new color language.
 */
const toneClass: Record<StatusTone, string> = {
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-ink",
  danger: "bg-danger-soft text-danger-strong",
  neutral: "bg-surface-gray text-ink-gray",
  info: "bg-info-soft text-brand-purple",
};

export function StatusBadge(props: { tone: StatusTone; children: JSX.Element; class?: string }) {
  return (
    <span
      class={`inline-flex items-center justify-center whitespace-nowrap rounded-pill px-2.5 py-1 text-xs font-medium ${toneClass[props.tone]} ${props.class ?? ""}`}
    >
      {props.children}
    </span>
  );
}
