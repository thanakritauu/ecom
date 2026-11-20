import { Show, type JSX } from "solid-js";
import { BulletList, FactGrid, InfoCard, Prose, StepList } from "./InfoPageShell";
import { formatTHB } from "../shared/PriceDisplay";
import { DELIVERY, FREE_SHIPPING_THRESHOLD, SHIPPING_FEE } from "~/lib/cartSelectors";

/**
 * The shipping terms and the return policy, written once: the /help/shipping and /about/return-policy pages
 * show them as cards, and Checkout's consent popups (`TermsConsent`) show the same text inside a modal
 * (`plain`), so what the customer agrees to is exactly what those pages say.
 */
function PolicySection(props: { plain?: boolean; title?: string; id?: string; children: JSX.Element }) {
  return (
    <Show when={props.plain} fallback={<InfoCard title={props.title} id={props.id}>{props.children}</InfoCard>}>
      <section class="flex min-w-0 flex-col gap-3">
        <Show when={props.title}>
          <h3 class="text-base font-bold text-ink">{props.title}</h3>
        </Show>
        {props.children}
      </section>
    </Show>
  );
}

export function ShippingPolicyContent(props: { plain?: boolean }) {
  return (
    <>
      <PolicySection plain={props.plain} title="ข้อมูลการจัดส่ง" id="shipping-facts">
        <FactGrid
          facts={[
            { label: "ขนส่ง", value: DELIVERY.carrier, note: DELIVERY.method },
            { label: "ค่าจัดส่ง", value: formatTHB(SHIPPING_FEE), note: "ต่อคำสั่งซื้อ" },
            { label: "ส่งฟรี", value: formatTHB(FREE_SHIPPING_THRESHOLD), note: "เมื่อซื้อครบ" },
            { label: "ระยะเวลา", value: "2-3 วัน", note: "วันทำการ (กทม.)" },
          ]}
        />
      </PolicySection>

      <PolicySection plain={props.plain} title="ระยะเวลาจัดส่ง" id="shipping-time">
        <BulletList
          items={[
            "กรุงเทพฯ และปริมณฑล ได้รับภายใน 2-3 วันทำการ หลังชำระเงินสำเร็จ",
            "ต่างจังหวัด ได้รับภายใน 3-5 วันทำการ หลังชำระเงินสำเร็จ",
            "คำสั่งซื้อที่ชำระเงินหลัง 14:00 น. หรือในวันหยุด จะเริ่มจัดส่งในวันทำการถัดไป",
            "ช่วงแคมเปญใหญ่หรือวันหยุดยาว อาจใช้เวลาจัดส่งเพิ่มขึ้น 1-2 วัน",
          ]}
        />
      </PolicySection>

      <PolicySection plain={props.plain} title="ค่าจัดส่ง" id="shipping-fee">
        <Prose>
          <p>
            ค่าจัดส่ง {formatTHB(SHIPPING_FEE)} ต่อคำสั่งซื้อ และ<strong class="font-semibold">จัดส่งฟรีทั่วประเทศ</strong>เมื่อยอดสินค้าครบ{" "}
            {formatTHB(FREE_SHIPPING_THRESHOLD)} (คิดจากราคาสินค้าก่อนหักคูปองและคะแนน Charmiss Club)
          </p>
          <p>ค่าจัดส่งจะแสดงในสรุปคำสั่งซื้อหน้าชำระเงินก่อนยืนยันทุกครั้ง</p>
        </Prose>
      </PolicySection>

      <PolicySection plain={props.plain} title="การติดตามพัสดุ" id="shipping-tracking">
        <BulletList
          items={[
            'เมื่อสินค้าถูกส่งออกจากคลัง เลขพัสดุจะแสดงในหน้า "ประวัติการซื้อ"',
            "กดดูรายละเอียดคำสั่งซื้อเพื่อเช็กสถานะการจัดส่งล่าสุด",
            "หากไม่ได้รับสินค้าภายในระยะเวลาที่กำหนด กรุณาติดต่อทีมงาน",
          ]}
        />
      </PolicySection>
    </>
  );
}

export function ReturnPolicyContent(props: { plain?: boolean }) {
  return (
    <>
      <PolicySection plain={props.plain} title="เงื่อนไขการคืนสินค้า" id="return-conditions">
        <BulletList
          check
          items={[
            "แจ้งคืนภายใน 7 วันนับจากวันที่ได้รับสินค้า",
            "สินค้าต้องอยู่ในสภาพเดิม ไม่ผ่านการใช้งาน และซีลไม่ถูกเปิด",
            "มีบรรจุภัณฑ์ ของแถม และเอกสารครบถ้วนตามที่ได้รับ",
            "แนบรูปถ่ายสินค้าและเลขคำสั่งซื้อเมื่อแจ้งคืน",
          ]}
        />
      </PolicySection>

      <PolicySection plain={props.plain} title="กรณีที่ไม่สามารถคืนได้" id="return-exclusions">
        <BulletList
          items={[
            "สินค้าที่เปิดใช้งานแล้ว หรือซีลถูกแกะ (ยกเว้นสินค้าชำรุดจากการผลิต)",
            "สินค้าที่ได้รับเป็นของแถมหรือของรางวัล",
            "สินค้าลดราคาพิเศษที่ระบุว่าไม่รับคืน",
            "แจ้งคืนเกิน 7 วันหลังได้รับสินค้า",
          ]}
        />
      </PolicySection>

      <PolicySection plain={props.plain} title="ขั้นตอนการคืนสินค้า" id="return-steps">
        <StepList
          steps={[
            { title: "แจ้งคืนสินค้า", body: 'ไปที่ "ประวัติการซื้อ" เลือกคำสั่งซื้อ แล้วกดแจ้งคืนสินค้า พร้อมระบุเหตุผลและแนบรูป' },
            { title: "รอการยืนยัน", body: "ทีมงานตรวจสอบและแจ้งผลภายใน 1-2 วันทำการ พร้อมที่อยู่สำหรับส่งคืน" },
            { title: "ส่งสินค้าคืน", body: "แพ็กสินค้าให้เรียบร้อยและส่งกลับภายใน 3 วันหลังได้รับการยืนยัน" },
            { title: "รับเงินคืน", body: "หลังตรวจสอบสินค้าแล้ว จะคืนเงินภายใน 7-14 วันทำการ ตามช่องทางที่ชำระเงิน" },
          ]}
        />
      </PolicySection>

      <PolicySection plain={props.plain} title="สินค้าชำรุดหรือได้รับไม่ถูกต้อง" id="return-damaged">
        <Prose>
          <p>
            หากได้รับสินค้าชำรุด เสียหายจากการขนส่ง หรือไม่ตรงกับที่สั่ง กรุณาถ่ายรูปหรือวิดีโอขณะเปิดกล่องและแจ้งทีมงานภายใน 48 ชั่วโมง
            Charmiss จะเปลี่ยนสินค้าใหม่หรือคืนเงินเต็มจำนวน โดยไม่มีค่าใช้จ่ายในการส่งคืน
          </p>
        </Prose>
      </PolicySection>
    </>
  );
}
