import { BulletList, InfoCard, InfoCta, InfoPageShell, Prose, StepList } from "~/components/info/InfoPageShell";
import { INFO_PAGES } from "~/lib/siteInfo";

/** นโยบายคืนสินค้า — 7-day window, same as the FAQ answer. Prototype copy pending the real policy. */
export default function ReturnPolicyPage() {
  return (
    <InfoPageShell title={INFO_PAGES.returnPolicy.label} subtitle="คืนสินค้าได้ภายใน 7 วันหลังได้รับสินค้า">
      <InfoCard title="เงื่อนไขการคืนสินค้า" id="return-conditions">
        <BulletList
          check
          items={[
            "แจ้งคืนภายใน 7 วันนับจากวันที่ได้รับสินค้า",
            "สินค้าต้องอยู่ในสภาพเดิม ไม่ผ่านการใช้งาน และซีลไม่ถูกเปิด",
            "มีบรรจุภัณฑ์ ของแถม และเอกสารครบถ้วนตามที่ได้รับ",
            "แนบรูปถ่ายสินค้าและเลขคำสั่งซื้อเมื่อแจ้งคืน",
          ]}
        />
      </InfoCard>

      <InfoCard title="กรณีที่ไม่สามารถคืนได้" id="return-exclusions">
        <BulletList
          items={[
            "สินค้าที่เปิดใช้งานแล้ว หรือซีลถูกแกะ (ยกเว้นสินค้าชำรุดจากการผลิต)",
            "สินค้าที่ได้รับเป็นของแถมหรือของรางวัล",
            "สินค้าลดราคาพิเศษที่ระบุว่าไม่รับคืน",
            "แจ้งคืนเกิน 7 วันหลังได้รับสินค้า",
          ]}
        />
      </InfoCard>

      <InfoCard title="ขั้นตอนการคืนสินค้า" id="return-steps">
        <StepList
          steps={[
            { title: "แจ้งคืนสินค้า", body: 'ไปที่ "ประวัติการซื้อ" เลือกคำสั่งซื้อ แล้วกดแจ้งคืนสินค้า พร้อมระบุเหตุผลและแนบรูป' },
            { title: "รอการยืนยัน", body: "ทีมงานตรวจสอบและแจ้งผลภายใน 1-2 วันทำการ พร้อมที่อยู่สำหรับส่งคืน" },
            { title: "ส่งสินค้าคืน", body: "แพ็กสินค้าให้เรียบร้อยและส่งกลับภายใน 3 วันหลังได้รับการยืนยัน" },
            { title: "รับเงินคืน", body: "หลังตรวจสอบสินค้าแล้ว จะคืนเงินภายใน 7-14 วันทำการ ตามช่องทางที่ชำระเงิน" },
          ]}
        />
      </InfoCard>

      <InfoCard title="สินค้าชำรุดหรือได้รับไม่ถูกต้อง" id="return-damaged">
        <Prose>
          <p>
            หากได้รับสินค้าชำรุด เสียหายจากการขนส่ง หรือไม่ตรงกับที่สั่ง กรุณาถ่ายรูปหรือวิดีโอขณะเปิดกล่องและแจ้งทีมงานภายใน 48 ชั่วโมง
            Charmiss จะเปลี่ยนสินค้าใหม่หรือคืนเงินเต็มจำนวน โดยไม่มีค่าใช้จ่ายในการส่งคืน
          </p>
        </Prose>
      </InfoCard>

      <InfoCta title="ต้องการแจ้งคืนสินค้า?" actionLabel="ไปที่ประวัติการซื้อ" href="/account" />
    </InfoPageShell>
  );
}
