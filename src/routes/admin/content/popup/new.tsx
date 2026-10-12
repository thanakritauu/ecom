import { useNavigate } from "@solidjs/router";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { PopupEditor } from "~/components/admin/content/PopupEditor";

export default function AdminNewPopupPage() {
  const navigate = useNavigate();
  return (
    <div class="flex flex-col gap-6">
      <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "Popup", href: "/admin/content/popup" }, { label: "เพิ่ม Popup" }]} />
      <PageHeader title="เพิ่ม Popup" description="สร้างเป็นแบบร่างไว้ก่อนได้ แล้วเผยแพร่เมื่อข้อมูลครบ" />
      <PopupEditor onCancel={() => navigate("/admin/content/popup")} onSaved={() => navigate("/admin/content/popup")} />
    </div>
  );
}
