import { AdminPlaceholder } from "~/components/admin/AdminPlaceholder";

export default function AdminInventoryPage() {
  return (
    <AdminPlaceholder
      title="คลังสินค้า"
      description="ตรวจสอบสต๊อกสินค้าและประวัติการปรับปรุงสต๊อก"
      breadcrumb={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "คลังสินค้า" }]}
      comingPhase="Phase 06"
      previewItems={["สต๊อกสินค้า", "สินค้าใกล้หมด", "สินค้าหมด", "ปรับปรุงสต๊อก"]}
    />
  );
}
