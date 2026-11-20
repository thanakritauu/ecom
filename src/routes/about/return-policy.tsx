import { InfoCta, InfoPageShell } from "~/components/info/InfoPageShell";
import { ReturnPolicyContent } from "~/components/info/PolicyContent";
import { INFO_PAGES } from "~/lib/siteInfo";

/** นโยบายคืนสินค้า — 7-day window, same as the FAQ answer. Prototype copy pending the real policy. */
export default function ReturnPolicyPage() {
  return (
    <InfoPageShell title={INFO_PAGES.returnPolicy.label} subtitle="คืนสินค้าได้ภายใน 7 วันหลังได้รับสินค้า">
      <ReturnPolicyContent />

      <InfoCta title="ต้องการแจ้งคืนสินค้า?" actionLabel="ไปที่ประวัติการซื้อ" href="/account" />
    </InfoPageShell>
  );
}
