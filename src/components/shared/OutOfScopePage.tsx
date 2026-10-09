import { A } from "@solidjs/router";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { Container } from "./Container";

/**
 * Shared placeholder for every route that exists (so links to it are real
 * navigations, not dead `href="#"`s) but hasn't been built yet — every
 * out-of-scope destination on Home routes here instead of each one growing
 * its own one-off "coming soon" screen. Keeps Header/Footer around it so it
 * still reads as the same site rather than a broken page.
 */
export function OutOfScopePage(props: { pageName: string; identifier?: string }) {
  return (
    <>
      <Header />
      <Container width="wide" class="flex min-h-[50vh] flex-col items-center justify-center gap-4 py-20 text-center">
        <h1 class="text-2xl font-bold text-ink">{props.pageName}</h1>
        <p class="text-ink-gray">
          {props.identifier ? `(${props.identifier}) ` : ""}ยังไม่ได้พัฒนาในสโคปนี้ (Home page)
        </p>
        <A href="/" class="text-brand-pink underline">
          กลับหน้าหลัก
        </A>
      </Container>
      <Footer />
    </>
  );
}
