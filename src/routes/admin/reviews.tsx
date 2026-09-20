import { AdminPlaceholder } from "~/components/admin/AdminPlaceholder";

export default function AdminReviewsPage() {
  return (
    <AdminPlaceholder
      title="รีวิว"
      description="ตรวจสอบและอนุมัติรีวิวสินค้าจากลูกค้า"
      breadcrumb={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "รีวิว" }]}
      comingPhase="Phase 09"
      previewItems={["รอตรวจสอบ", "อนุมัติแล้ว", "ปฏิเสธ", "ซ่อน"]}
    />
  );
}
