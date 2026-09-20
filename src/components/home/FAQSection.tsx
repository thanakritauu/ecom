import { Container } from "../shared/Container";
import { Accordion } from "../shared/Accordion";

/**
 * Only faq3's copy was captured verbatim from the Figma export (the others'
 * question/answer text wasn't present in the design-context response — the
 * metadata dump only exposed node ids/positions for them). The remaining
 * three are placeholder copy for a working prototype and should be swapped
 * for real support-team content before shipping.
 */
const faqItems = [
  {
    id: "faq3",
    trigger: "หลังจากสั่งซื้อแล้วจะได้รับสินค้าภายในกี่วัน?",
    content:
      "สินค้าจะถูกจัดส่งภายใน 2-3 วันทำการหลังจากชำระเงินสำเร็จ สำหรับพื้นที่กรุงเทพฯ และปริมณฑล และภายใน 3-5 วันทำการสำหรับพื้นที่ต่างจังหวัด",
  },
  {
    id: "faq4",
    trigger: "ชำระเงินด้วยวิธีใดได้บ้าง?",
    content: "รองรับบัตรเครดิต/เดบิต (Visa, Mastercard, JCB, UnionPay), โอนผ่านธนาคาร และการชำระเงินปลายทางในบางพื้นที่",
  },
  {
    id: "faq5",
    trigger: "สินค้าเป็นของแท้ 100% หรือไม่?",
    content: "สินค้าทุกชิ้นเป็นของแท้ 100% จัดจำหน่ายโดย Charmiss อย่างเป็นทางการเท่านั้น",
  },
  {
    id: "faq1",
    trigger: "หากต้องการคืนสินค้าต้องทำอย่างไร?",
    content: "แจ้งคืนสินค้าได้ภายใน 7 วันหลังได้รับสินค้า ผ่านหน้า “ติดตามคำสั่งซื้อ” โดยสินค้าต้องไม่ผ่านการใช้งาน",
  },
];

export function FAQSection() {
  return (
    <section aria-labelledby="faq-heading" class="py-10 lg:py-16">
      <Container width="narrow" class="flex flex-col gap-6">
        <h2 id="faq-heading" class="text-[22px] font-bold text-ink sm:text-2xl lg:text-[28px]">
          คำถามที่พบบ่อย
        </h2>
        <Accordion items={faqItems} defaultValue={["faq3"]} />
      </Container>
    </section>
  );
}
