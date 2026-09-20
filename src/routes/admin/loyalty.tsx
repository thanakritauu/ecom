import { AdminPlaceholder } from "~/components/admin/AdminPlaceholder";

export default function AdminLoyaltyPage() {
  return (
    <AdminPlaceholder
      title="สะสมแต้ม"
      description="จัดการสมาชิก ระดับสมาชิก แต้มสะสม ภารกิจ และของรางวัล"
      breadcrumb={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "สะสมแต้ม" }]}
      comingPhase="Phase 08"
      previewItems={["สมาชิก", "ระดับสมาชิก", "แต้มสะสม", "ภารกิจ", "ของรางวัล"]}
    />
  );
}
