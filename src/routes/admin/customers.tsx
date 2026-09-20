import { AdminPlaceholder } from "~/components/admin/AdminPlaceholder";

export default function AdminCustomersPage() {
  return (
    <AdminPlaceholder
      title="ลูกค้า"
      description="ดูข้อมูลลูกค้า ประวัติการสั่งซื้อ และคะแนนสะสม"
      breadcrumb={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "ลูกค้า" }]}
      comingPhase="Phase 05"
      previewItems={["รายชื่อลูกค้า", "รายละเอียดลูกค้า", "ที่อยู่", "รายการโปรด", "รีวิว"]}
    />
  );
}
