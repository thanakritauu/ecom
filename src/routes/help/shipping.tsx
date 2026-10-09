import { BulletList, FactGrid, InfoCard, InfoCta, InfoPageShell, Prose } from "~/components/info/InfoPageShell";
import { formatTHB } from "~/components/shared/PriceDisplay";
import { DELIVERY, FREE_SHIPPING_THRESHOLD, SHIPPING_FEE } from "~/lib/cartSelectors";
import { INFO_PAGES } from "~/lib/siteInfo";

/** การจัดส่ง — fee/threshold/carrier read from the same constants Checkout charges with, so this page can't drift from the order total. */
export default function ShippingPage() {
  return (
    <InfoPageShell title={INFO_PAGES.shipping.label} subtitle={`${DELIVERY.label} ทั่วประเทศ ส่งฟรีเมื่อซื้อครบ ${formatTHB(FREE_SHIPPING_THRESHOLD)}`}>
      <InfoCard title="ข้อมูลการจัดส่ง" id="shipping-facts">
        <FactGrid
          facts={[
            { label: "ขนส่ง", value: DELIVERY.carrier, note: DELIVERY.method },
            { label: "ค่าจัดส่ง", value: formatTHB(SHIPPING_FEE), note: "ต่อคำสั่งซื้อ" },
            { label: "ส่งฟรี", value: formatTHB(FREE_SHIPPING_THRESHOLD), note: "เมื่อซื้อครบ" },
            { label: "ระยะเวลา", value: "2-3 วัน", note: "วันทำการ (กทม.)" },
          ]}
        />
      </InfoCard>

      <InfoCard title="ระยะเวลาจัดส่ง" id="shipping-time">
        <BulletList
          items={[
            "กรุงเทพฯ และปริมณฑล ได้รับภายใน 2-3 วันทำการ หลังชำระเงินสำเร็จ",
            "ต่างจังหวัด ได้รับภายใน 3-5 วันทำการ หลังชำระเงินสำเร็จ",
            "คำสั่งซื้อที่ชำระเงินหลัง 14:00 น. หรือในวันหยุด จะเริ่มจัดส่งในวันทำการถัดไป",
            "ช่วงแคมเปญใหญ่หรือวันหยุดยาว อาจใช้เวลาจัดส่งเพิ่มขึ้น 1-2 วัน",
          ]}
        />
      </InfoCard>

      <InfoCard title="ค่าจัดส่ง" id="shipping-fee">
        <Prose>
          <p>
            ค่าจัดส่ง {formatTHB(SHIPPING_FEE)} ต่อคำสั่งซื้อ และ<strong class="font-semibold">จัดส่งฟรีทั่วประเทศ</strong>เมื่อยอดสินค้าครบ{" "}
            {formatTHB(FREE_SHIPPING_THRESHOLD)} (คิดจากราคาสินค้าก่อนหักคูปองและ Charmiss Coin)
          </p>
          <p>ค่าจัดส่งจะแสดงในสรุปคำสั่งซื้อหน้าชำระเงินก่อนยืนยันทุกครั้ง</p>
        </Prose>
      </InfoCard>

      <InfoCard title="การติดตามพัสดุ" id="shipping-tracking">
        <BulletList
          items={[
            'เมื่อสินค้าถูกส่งออกจากคลัง เลขพัสดุจะแสดงในหน้า "ประวัติการซื้อ"',
            "กดดูรายละเอียดคำสั่งซื้อเพื่อเช็กสถานะการจัดส่งล่าสุด",
            "หากไม่ได้รับสินค้าภายในระยะเวลาที่กำหนด กรุณาติดต่อทีมงาน",
          ]}
        />
      </InfoCard>

      <InfoCta title="ตรวจสอบคำสั่งซื้อของคุณ" actionLabel="ไปที่ประวัติการซื้อ" href="/account" />
    </InfoPageShell>
  );
}
