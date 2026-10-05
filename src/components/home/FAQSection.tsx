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
    content: "รองรับบัตรเครดิต/เดบิต (Visa, Mastercard, JCB, UnionPay), พร้อมเพย์ (สแกน QR ผ่านแอปธนาคาร) และ TrueMoney Wallet",
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
    <section aria-labelledby="faq-heading" class="pb-6 pt-0">
      {/* Figma 124:7017 — 1140px content, 40px pink centered title, 16px title→list */}
      <Container width="narrow" class="lg:max-w-container-wide">
        <div class="mx-auto flex w-full flex-col gap-3 sm:gap-4 lg:max-w-[1140px]">
          <h2 id="faq-heading" class="text-center text-[28px] font-bold leading-[normal] text-brand-pink sm:text-[34px] lg:text-[40px]">
            คำถามที่พบบ่อย
          </h2>
          <Accordion items={faqItems} defaultValue={["faq3"]} />
        </div>
      </Container>
    </section>
  );
}
