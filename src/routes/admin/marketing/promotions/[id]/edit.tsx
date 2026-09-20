import { Show } from "solid-js";
import { useNavigate, useParams } from "@solidjs/router";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { EmptyState } from "~/components/admin/EmptyState";
import { MarketingIcon } from "~/components/admin/icons";
import { PromotionForm, type PromotionFormValues } from "~/components/admin/marketing/PromotionForm";
import { useAdminMarketing } from "~/lib/adminMarketingStore";
import { pushToast } from "~/lib/toast";

export default function AdminPromotionEditPage() {
  const params = useParams<{ id: string }>();
  const store = useAdminMarketing().promotions;
  const navigate = useNavigate();
  const promotion = () => store.getById(params.id);

  const handleSubmit = async (values: PromotionFormValues) => {
    const current = promotion();
    if (!current) return;
    await store.update(current.id, { ...values, usageCount: current.usageCount });
    pushToast("บันทึกการเปลี่ยนแปลงแล้ว", "success");
    navigate(`/admin/marketing/promotions/${current.id}`);
  };

  return (
    <Show
      when={promotion()}
      fallback={
        <div class="flex flex-col gap-6">
          <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "การตลาด", href: "/admin/marketing" }, { label: "โปรโมชั่น", href: "/admin/marketing/promotions" }]} />
          <EmptyState icon={<MarketingIcon />} title="ไม่พบโปรโมชั่นนี้" actionLabel="กลับไปหน้าโปรโมชั่น" onAction={() => navigate("/admin/marketing/promotions")} class="bg-white shadow-card" />
        </div>
      }
    >
      {(current) => (
        <div class="flex flex-col gap-6">
          <Breadcrumb
            items={[
              { label: "แดชบอร์ด", href: "/admin" },
              { label: "การตลาด", href: "/admin/marketing" },
              { label: "โปรโมชั่น", href: "/admin/marketing/promotions" },
              { label: current().name },
              { label: "แก้ไข" },
            ]}
          />
          <PageHeader title={`แก้ไข: ${current().name}`} description="แก้ไขข้อมูลโปรโมชั่นและบันทึกการเปลี่ยนแปลง" />
          <PromotionForm
            initial={current()}
            submitLabel="บันทึกการเปลี่ยนแปลง"
            onSubmit={handleSubmit}
            onCancel={() => navigate(`/admin/marketing/promotions/${current().id}`)}
          />
        </div>
      )}
    </Show>
  );
}
