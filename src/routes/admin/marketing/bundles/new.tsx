import { useNavigate } from "@solidjs/router";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { BundleForm, type BundleFormValues } from "~/components/admin/marketing/BundleForm";
import { useAdminMarketing } from "~/lib/adminMarketingStore";
import { pushToast } from "~/lib/toast";

export default function AdminBundleNewPage() {
  const store = useAdminMarketing().bundles;
  const navigate = useNavigate();

  const handleSubmit = async (values: BundleFormValues) => {
    const created = await store.add(values);
    pushToast(`สร้างเซ็ตสินค้า "${created.name}" เรียบร้อยแล้ว`, "success");
    navigate(`/admin/marketing/bundles/${created.id}`);
  };

  return (
    <div class="flex flex-col gap-6">
      <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "การตลาด", href: "/admin/marketing" }, { label: "บันเดิล / เซ็ต", href: "/admin/marketing/bundles" }, { label: "สร้างใหม่" }]} />
      <PageHeader title="สร้างเซ็ตสินค้า" description="กำหนดสินค้าและราคาเซ็ตใหม่" />
      <BundleForm submitLabel="สร้างเซ็ตสินค้า" onSubmit={handleSubmit} onCancel={() => navigate("/admin/marketing/bundles")} />
    </div>
  );
}
