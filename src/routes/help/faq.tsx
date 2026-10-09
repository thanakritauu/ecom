import { For } from "solid-js";
import { InfoCard, InfoCta, InfoPageShell } from "~/components/info/InfoPageShell";
import { Accordion } from "~/components/shared/Accordion";
import { FAQ_GROUPS } from "~/lib/faqContent";
import { INFO_PAGES } from "~/lib/siteInfo";

// Built once at module scope — see the Footer's note on Accordion items and hydration.
const groups = FAQ_GROUPS.map((group) => ({
  ...group,
  accordionItems: group.items.map((item) => ({ id: item.id, trigger: item.question, content: item.answer })),
}));

/** คำถามที่พบบ่อย — every FAQ group (Home shows four of these), same Accordion as Home's FAQ section, sized down to sit in a card. */
export default function FaqPage() {
  return (
    <InfoPageShell title={INFO_PAGES.faq.label} subtitle="รวมคำถามที่ลูกค้าถามบ่อย หาคำตอบได้ที่นี่">
      <For each={groups}>
        {(group) => (
          <InfoCard title={group.title} id={`faq-${group.id}`}>
            <Accordion items={group.accordionItems} itemClass="!p-4 sm:!p-5" triggerClass="!text-base sm:!text-lg text-ink" />
          </InfoCard>
        )}
      </For>

      <InfoCta title="ยังไม่พบคำตอบที่ต้องการ?" body="ทีมงาน Charmiss พร้อมช่วยเหลือคุณทุกวันจันทร์ - ศุกร์" actionLabel="ติดต่อเรา" href={INFO_PAGES.contact.href} />
    </InfoPageShell>
  );
}
