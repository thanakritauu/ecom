/**
 * Design system rule — the one chevron for every arrow on the site
 * (storefront + Admin): carousel / gallery / media-viewer prev-next, "ดูทั้งหมด"
 * links, row disclosure arrows, pagination. It's the FAQ accordion's
 * chevron (faq-chevron-down.svg, 24×24), drawn in `currentColor` and rotated
 * per `direction`. Default size is 24px (`size-6`); on small screens it may
 * be shrunk with another square `size-*` class, never stretched to a
 * non-square box. Slider arrow buttons around it use `bg-white/50`.
 */
export function ChevronIcon(props: { direction?: "left" | "right" | "up" | "down"; class?: string }) {
  const rotate = { down: "", up: "rotate-180", left: "rotate-90", right: "-rotate-90" }[props.direction ?? "down"];
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" class={`shrink-0 ${rotate} ${props.class ?? "size-6"}`}>
      <path
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M5.29289 8.29289C5.68342 7.90237 6.31658 7.90237 6.70711 8.29289L12 13.5858L17.2929 8.29289C17.6834 7.90237 18.3166 7.90237 18.7071 8.29289C19.0976 8.68342 19.0976 9.31658 18.7071 9.70711L12.7071 15.7071C12.3166 16.0976 11.6834 16.0976 11.2929 15.7071L5.29289 9.70711C4.90237 9.31658 4.90237 8.68342 5.29289 8.29289Z"
      />
    </svg>
  );
}
