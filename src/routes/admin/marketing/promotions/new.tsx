import { useNavigate } from "@solidjs/router";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { PromotionForm, type PromotionFormValues } from "~/components/admin/marketing/PromotionForm";
import { useAdminMarketing } from "~/lib/adminMarketingStore";
import { pushToast } from "~/lib/toast";

export default function AdminPromotionNewPage() {
  const store = useAdminMarketing().promotions;
  const navigate = useNavigate();

  const handleSubmit = async (values: PromotionFormValues) => {
    const created = await store.add(values);
    pushToast(values.status === "draft" ? "บันทึกแบบร่างแล้ว ยังไม่มีผลที่หน้าร้าน" : "บันทึกและเผยแพร่โปรโมชั่นแล้ว", "success");
    navigate(`/admin/marketing/promotions/${created.id}`);
  };

  return (
    <div class="flex flex-col gap-6">
      <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "การตลาด" }, { label: "โปรโมชั่น", href: "/admin/marketing/promotions" }, { label: "เพิ่มโปรโมชั่น" }]} />
      <PageHeader title="เพิ่มโปรโมชั่น" description="เลือกประเภทโปรโมชั่น แล้วตั้งเงื่อนไขตามประเภทนั้น" />
      <PromotionForm submitLabel="บันทึกโปรโมชั่น" onSubmit={handleSubmit} onCancel={() => navigate("/admin/marketing/promotions")} />
    </div>
  );
}
