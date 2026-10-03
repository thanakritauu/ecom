import { onCleanup, onMount } from "solid-js";
import { isServer } from "solid-js/web";

/** §01 — every Admin page (including the chromeless Login page) reads "Charmiss CMS" in the browser tab, without touching the single shared `<title>` in entry-server.tsx that the Customer Frontend also uses. */
export function useAdminDocumentTitle() {
  if (isServer) return;
  onMount(() => {
    const previous = document.title;
    document.title = "Charmiss CMS";
    onCleanup(() => {
      document.title = previous;
    });
  });
}
