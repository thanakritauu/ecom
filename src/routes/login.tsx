import { onMount } from "solid-js";
import { useNavigate, useSearchParams } from "@solidjs/router";
import { useAuth } from "~/lib/auth";

/**
 * Login is now the Auth Modal (see components/shared/AuthModal.tsx),
 * triggered from anywhere with `useAuth().openAuthModal()` — not a page.
 * This route exists only for deep-link/back-compat: a bookmarked or shared
 * `/login` (optionally with `?redirect=`) must not 404. It lands on the
 * target page (or Home) with the modal already open on top, instead of
 * rendering a form itself.
 */
export default function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  onMount(() => {
    const target = searchParams.redirect;
    // Only ever land on a path within this app — never let `?redirect=` send someone off-site.
    const safeTarget = typeof target === "string" && target.startsWith("/") && !target.startsWith("//") ? target : "/";
    if (!auth.isAuthenticated()) auth.openAuthModal();
    navigate(safeTarget, { replace: true });
  });

  return null;
}
