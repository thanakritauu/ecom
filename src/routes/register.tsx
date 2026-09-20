import { Navigate, useSearchParams } from "@solidjs/router";

/**
 * Figma's node 157:20131 is one unified Login/Register screen (its own copy
 * says an account is created automatically on first sign-in — there is no
 * separate "create account" form). `/register` stays a real, distinct route
 * (not a dead link from anywhere that points here) but renders that same
 * page rather than a second, duplicate form — preserving `?redirect=` so
 * the return-URL flow still works when someone lands here directly.
 */
export default function RegisterPage() {
  const [searchParams] = useSearchParams();
  const redirect = typeof searchParams.redirect === "string" ? searchParams.redirect : undefined;
  return <Navigate href={redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : "/login"} />;
}
