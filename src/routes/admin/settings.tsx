import { AdminPlaceholder } from "~/components/admin/AdminPlaceholder";

export default function AdminSettingsPage() {
  return (
    <AdminPlaceholder
      title="ตั้งค่า"
      description="ตั้งค่าทั่วไป ผู้ดูแลระบบ และสิทธิ์การใช้งาน"
      breadcrumb={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "ตั้งค่า" }]}
      comingPhase="Phase 11"
      previewItems={["ทั่วไป", "ผู้ดูแลระบบ", "สิทธิ์การใช้งาน"]}
    />
  );
}
