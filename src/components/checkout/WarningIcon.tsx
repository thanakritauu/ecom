/** Triangle "!" — the failed / unpaid payment alerts (inline boxes + popup). Same stroke language as the shared line icons. */
export function WarningIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-5"} fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
      <path d="M10.3 4.2 2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z" stroke-linejoin="round" />
      <path d="M12 9.5v4.5" stroke-linecap="round" />
      <circle cx="12" cy="17" r="0.6" fill="currentColor" />
    </svg>
  );
}
