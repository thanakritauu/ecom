import { For } from "solid-js";
import { InfoCard, InfoCta, InfoPageShell, StepList } from "~/components/info/InfoPageShell";
import { PAYMENT_METHODS } from "~/lib/cartSelectors";
import { INFO_PAGES } from "~/lib/siteInfo";

/** วิธีสั่งซื้อ — the storefront's real flow (cart → Checkout pays on one page → order history), payment list read from `PAYMENT_METHODS`. */
export default function HowToOrderPage() {
  return (
    <InfoPageShell title={INFO_PAGES.howToOrder.label} subtitle="ช้อปง่ายใน 5 ขั้นตอน ของแท้จาก Charmiss ส่งตรงถึงบ้าน">
      <InfoCard title="ขั้นตอนการสั่งซื้อ" id="how-to-order-steps">
        <StepList
          steps={[
            { title: "เลือกสินค้าที่ชอบ", body: "ค้นหาหรือเลือกดูสินค้าตามหมวดหมู่ เลือกเฉดสีหรือตัวเลือกที่ต้องการในหน้าสินค้า" },
            { title: "เพิ่มลงตะกร้า", body: 'กด "เพิ่มลงตะกร้า" เลือกจำนวน แล้วช้อปต่อหรือไปที่ตะกร้าสินค้าได้ทันที' },
            { title: "ตรวจสอบตะกร้าสินค้า", body: 'ปรับจำนวนหรือลบสินค้า ดูของแถมที่ได้รับ แล้วกด "ชำระเงิน"' },
            { title: "กรอกที่อยู่และชำระเงิน", body: "ระบุที่อยู่จัดส่ง ใช้คูปองหรือ Charmiss Coin เลือกวิธีชำระเงิน แล้วยืนยันคำสั่งซื้อ" },
            { title: "รอรับสินค้า", body: 'ติดตามสถานะและเลขพัสดุได้ที่ "ประวัติการซื้อ" ในบัญชีของคุณ' },
          ]}
        />
      </InfoCard>

      <InfoCard title="ช่องทางการชำระเงิน" id="how-to-order-payments">
        <ul class="grid gap-3 sm:grid-cols-2">
          <For each={PAYMENT_METHODS}>
            {(method) => (
              <li class="flex flex-col gap-0.5 rounded-card border border-surface-gray p-4">
                <span class="font-medium text-ink">{method.label}</span>
                <span class="text-sm leading-[1.75] text-ink-gray">{method.description}</span>
              </li>
            )}
          </For>
        </ul>
      </InfoCard>

      <InfoCta title="พร้อมช้อปแล้วหรือยัง?" body="สินค้าใหม่และโปรโมชันพิเศษรอคุณอยู่" actionLabel="เริ่มช้อปเลย" href="/products" />
    </InfoPageShell>
  );
}
