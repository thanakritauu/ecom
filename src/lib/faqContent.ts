import { DELIVERY, FREE_SHIPPING_THRESHOLD, SHIPPING_FEE } from "./cartSelectors";

/**
 * FAQ copy — one list for Home's FAQ section (`HOME_FAQ_IDS`) and the full
 * `/help/faq` page (every group). Only faq3's copy came verbatim from Figma;
 * the rest is prototype copy to swap for real support-team content before
 * shipping. Shipping numbers read the same constants Checkout charges with.
 */
export type FaqItem = { id: string; question: string; answer: string };
export type FaqGroup = { id: string; title: string; items: FaqItem[] };

const baht = (n: number) => `฿${n.toLocaleString("th-TH")}`;

export const FAQ_GROUPS: FaqGroup[] = [
  {
    id: "order",
    title: "การสั่งซื้อและชำระเงิน",
    items: [
      {
        id: "faq4",
        question: "ชำระเงินด้วยวิธีใดได้บ้าง?",
        answer: "รองรับบัตรเครดิต/เดบิต (Visa, Mastercard, JCB, UnionPay), พร้อมเพย์ (สแกน QR ผ่านแอปธนาคาร), โมบายล์แบงก์กิ้ง และ TrueMoney Wallet",
      },
      {
        id: "order-guest",
        question: "ต้องสมัครสมาชิกก่อนสั่งซื้อหรือไม่?",
        answer: "สั่งซื้อได้โดยไม่ต้องสมัครสมาชิก แต่การเข้าสู่ระบบจะช่วยให้ติดตามคำสั่งซื้อ บันทึกที่อยู่ และสะสม Charmiss Coin ได้",
      },
      {
        id: "order-coupon",
        question: "ใช้คูปองส่วนลดได้อย่างไร?",
        answer: "เลือกหรือกรอกโค้ดคูปองในหน้าชำระเงิน ระบบจะหักส่วนลดให้ทันทีเมื่อยอดสั่งซื้อถึงขั้นต่ำของคูปอง ใช้ได้ 1 คูปองต่อคำสั่งซื้อ",
      },
      {
        id: "order-cancel",
        question: "ยกเลิกคำสั่งซื้อได้หรือไม่?",
        answer: 'ยกเลิกได้ก่อนสินค้าถูกจัดส่ง ผ่านหน้า "ประวัติการซื้อ" ในบัญชีของคุณ หากชำระเงินแล้วจะได้รับเงินคืนตามช่องทางเดิม',
      },
    ],
  },
  {
    id: "shipping",
    title: "การจัดส่ง",
    items: [
      {
        id: "faq3",
        question: "หลังจากสั่งซื้อแล้วจะได้รับสินค้าภายในกี่วัน?",
        answer:
          "สินค้าจะถูกจัดส่งภายใน 2-3 วันทำการหลังจากชำระเงินสำเร็จ สำหรับพื้นที่กรุงเทพฯ และปริมณฑล และภายใน 3-5 วันทำการสำหรับพื้นที่ต่างจังหวัด",
      },
      {
        id: "shipping-fee",
        question: "ค่าจัดส่งเท่าไร?",
        answer: `ค่าจัดส่ง ${baht(SHIPPING_FEE)} ต่อคำสั่งซื้อ และจัดส่งฟรีทั่วประเทศเมื่อซื้อสินค้าครบ ${baht(FREE_SHIPPING_THRESHOLD)} (${DELIVERY.label})`,
      },
      {
        id: "shipping-track",
        question: "ติดตามพัสดุได้ที่ไหน?",
        answer: 'เมื่อสินค้าถูกจัดส่งแล้ว เลขพัสดุจะแสดงในหน้า "ประวัติการซื้อ" ของคำสั่งซื้อนั้น พร้อมสถานะการจัดส่งล่าสุด',
      },
    ],
  },
  {
    id: "return",
    title: "การคืนสินค้า",
    items: [
      {
        id: "faq1",
        question: "หากต้องการคืนสินค้าต้องทำอย่างไร?",
        answer: 'แจ้งคืนสินค้าได้ภายใน 7 วันหลังได้รับสินค้า ผ่านหน้า "ติดตามคำสั่งซื้อ" โดยสินค้าต้องไม่ผ่านการใช้งาน',
      },
      {
        id: "return-refund",
        question: "จะได้รับเงินคืนภายในกี่วัน?",
        answer: "หลังตรวจสอบสินค้าที่ส่งคืนเรียบร้อย จะคืนเงินภายใน 7-14 วันทำการ ตามช่องทางที่ชำระเงิน",
      },
    ],
  },
  {
    id: "product",
    title: "สินค้าและสมาชิก",
    items: [
      {
        id: "faq5",
        question: "สินค้าเป็นของแท้ 100% หรือไม่?",
        answer: "สินค้าทุกชิ้นเป็นของแท้ 100% จัดจำหน่ายโดย Charmiss อย่างเป็นทางการเท่านั้น",
      },
      {
        id: "product-shade",
        question: "เลือกเฉดสีอย่างไรให้เหมาะกับผิว?",
        answer: "ดูภาพสวอตช์และรีวิวจากลูกค้าในหน้าสินค้าแต่ละชิ้น หรือทักแชทผ่าน LINE เพื่อให้ทีมงานช่วยแนะนำเฉดที่เหมาะกับคุณ",
      },
      {
        id: "product-club",
        question: "Charmiss Club คืออะไร?",
        answer: "โปรแกรมสมาชิกที่สะสม Charmiss Coin ได้จากทุกการซื้อ นำไปใช้แทนเงินสดในการสั่งซื้อครั้งถัดไป และรับสิทธิพิเศษตามระดับสมาชิก",
      },
    ],
  },
];

/** Home's FAQ section — four picks, in this order. */
const HOME_FAQ_IDS = ["faq3", "faq4", "faq5", "faq1"];
const allItems = FAQ_GROUPS.flatMap((g) => g.items);
export const HOME_FAQ_ITEMS: FaqItem[] = HOME_FAQ_IDS.map((id) => allItems.find((i) => i.id === id)!);
