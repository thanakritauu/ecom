import { useLocation } from "@solidjs/router";
import { OutOfScopePage } from "~/components/shared/OutOfScopePage";

/**
 * Catch-all for every Home/PDP link/CTA that points at a route which exists
 * (so it's a real navigation, never a dead `href="#"`) but has no page built
 * yet — every nav item, footer link, and CTA outside of `/` and
 * `/product/:slug` lands here instead of a router 404. Matches only after
 * every more specific route (like `/product/[slug]`) fails to, per
 * file-router precedence.
 */
export default function CatchAll() {
  const location = useLocation();
  return <OutOfScopePage pageName={`หน้า ${location.pathname}`} identifier={location.pathname} />;
}
