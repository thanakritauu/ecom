import { Show, type JSX } from "solid-js";
import { Header } from "../shared/Header";
import { Footer } from "../shared/Footer";
import { Container } from "../shared/Container";
import { ProfileHeaderCard } from "./ProfileHeaderCard";
import { AccountSidebar, type AccountCounts } from "./AccountSidebar";
import { AccountGuestPrompt } from "./AccountGuestPrompt";
import { useAuth } from "~/lib/auth";

/** Frame shared by every `/account/*` menu page: profile header, account menu, and the page's own panel. Guests see the sign-in prompt. */
export function AccountShell(props: { counts?: AccountCounts; children: JSX.Element }) {
  const auth = useAuth();
  return (
    <>
      <Header />
      <main class="flex flex-col overflow-x-hidden bg-surface-gray/60 py-6">
        <Container width="wide">
          <Show when={auth.isAuthenticated()} fallback={<AccountGuestPrompt />}>
            {/* Phones / tablets: name + menu share one white card. Desktop: that wrapper dissolves (`lg:contents`)
                into the grid, so the name spans the top and the menu sits beside the page's panel as before. */}
            <div class="flex flex-col gap-4 lg:grid lg:grid-cols-[264px_minmax(0,1fr)] lg:items-start">
              <div class="flex flex-col overflow-hidden rounded-card border border-surface-gray bg-white shadow-card lg:contents">
                <ProfileHeaderCard user={auth.user()!} />
                <AccountSidebar counts={props.counts} />
              </div>
              <div class="flex min-w-0 flex-1 flex-col gap-4">{props.children}</div>
            </div>
          </Show>
        </Container>
      </main>
      <Footer />
    </>
  );
}

/** The white card each account page's content sits in, with its page heading. */
export function AccountPanel(props: {
  title: string;
  headingId: string;
  action?: JSX.Element;
  /** Keeps the heading for screen readers only (the page's content already says what it is). */
  hideTitle?: boolean;
  children: JSX.Element;
}) {
  return (
    <section aria-labelledby={props.headingId} class="flex min-w-0 flex-1 flex-col gap-4 rounded-card bg-white p-4 shadow-card sm:p-6">
      <Show
        when={!props.hideTitle}
        fallback={
          <h1 id={props.headingId} class="sr-only">
            {props.title}
          </h1>
        }
      >
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h1 id={props.headingId} class="text-xl font-bold text-ink">
            {props.title}
          </h1>
          {props.action}
        </div>
      </Show>
      {props.children}
    </section>
  );
}
