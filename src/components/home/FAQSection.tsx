import { Container } from "../shared/Container";
import { Accordion } from "../shared/Accordion";
import { HOME_FAQ_ITEMS } from "~/lib/faqContent";

/** Copy lives in `faqContent.ts` (shared with the full `/help/faq` page). Built at module scope — see the Footer's note on Accordion items. */
const faqItems = HOME_FAQ_ITEMS.map((item) => ({ id: item.id, trigger: item.question, content: item.answer }));

export function FAQSection(props: { /** Heading override from the page's section settings; empty = the usual heading. */ title?: string }) {
  return (
    <section aria-labelledby="faq-heading" class="pb-6 pt-0">
      {/* Figma 124:7017 — 1140px content, 40px pink centered title, 16px title→list */}
      <Container width="narrow" class="lg:max-w-container-wide">
        <div class="mx-auto flex w-full flex-col gap-3 sm:gap-4 lg:max-w-[1140px]">
          <h2 id="faq-heading" class="text-center text-[28px] font-bold leading-[normal] text-brand-pink sm:text-[34px] lg:text-[40px]">
            {props.title || "คำถามที่พบบ่อย"}
          </h2>
          <Accordion items={faqItems} defaultValue={["faq3"]} />
        </div>
      </Container>
    </section>
  );
}
