import { useNavigate } from "@solidjs/router";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { FlashSaleForm, type FlashSaleFormValues } from "~/components/admin/marketing/FlashSaleForm";
import { useAdminMarketing } from "~/lib/adminMarketingStore";
import { pushToast } from "~/lib/toast";

export default function AdminFlashSaleNewPage() {
  const store = useAdminMarketing().flashSales;
  const navigate = useNavigate();

  const handleSubmit = async (values: FlashSaleFormValues) => {
    const created = await store.add(values);
    pushToast(`สร้างแฟลชเซล "${created.name}" เรียบร้อยแล้ว`, "success");
    navigate(`/admin/marketing/flash-sale/${created.id}`);
  };

  return (
    <div class="flex flex-col gap-6">
      <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "การตลาด", href: "/admin/marketing" }, { label: "แฟลชเซล", href: "/admin/marketing/flash-sale" }, { label: "สร้างใหม่" }]} />
      <PageHeader title="สร้างแฟลชเซล" description="กำหนดสินค้าและราคาแฟลชเซลใหม่" />
      <FlashSaleForm submitLabel="สร้างแฟลชเซล" onSubmit={handleSubmit} onCancel={() => navigate("/admin/marketing/flash-sale")} />
    </div>
  );
}
