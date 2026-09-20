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
    const created = await store.add({ ...values, usageCount: 0 });
    pushToast(`สร้างโปรโมชั่น "${created.name}" เรียบร้อยแล้ว`, "success");
    navigate(`/admin/marketing/promotions/${created.id}`);
  };

  return (
    <div class="flex flex-col gap-6">
      <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "การตลาด", href: "/admin/marketing" }, { label: "โปรโมชั่น", href: "/admin/marketing/promotions" }, { label: "สร้างใหม่" }]} />
      <PageHeader title="สร้างโปรโมชั่น" description="กำหนดส่วนลดและเงื่อนไขโปรโมชั่นใหม่" />
      <PromotionForm submitLabel="สร้างโปรโมชั่น" onSubmit={handleSubmit} onCancel={() => navigate("/admin/marketing/promotions")} />
    </div>
  );
}
