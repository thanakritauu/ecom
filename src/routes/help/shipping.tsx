import { InfoCta, InfoPageShell } from "~/components/info/InfoPageShell";
import { ShippingPolicyContent } from "~/components/info/PolicyContent";
import { formatTHB } from "~/components/shared/PriceDisplay";
import { DELIVERY, FREE_SHIPPING_THRESHOLD } from "~/lib/cartSelectors";
import { INFO_PAGES } from "~/lib/siteInfo";

/** การจัดส่ง — fee/threshold/carrier read from the same constants Checkout charges with, so this page can't drift from the order total. */
export default function ShippingPage() {
  return (
    <InfoPageShell title={INFO_PAGES.shipping.label} subtitle={`${DELIVERY.label} ทั่วประเทศ ส่งฟรีเมื่อซื้อครบ ${formatTHB(FREE_SHIPPING_THRESHOLD)}`}>
      <ShippingPolicyContent />

      <InfoCta title="ตรวจสอบคำสั่งซื้อของคุณ" actionLabel="ไปที่ประวัติการซื้อ" href="/account" />
    </InfoPageShell>
  );
}
