import { Show } from "solid-js";
import { useNavigate, useParams } from "@solidjs/router";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { EmptyState } from "~/components/admin/EmptyState";
import { ContentIcon } from "~/components/admin/icons";
import { CampaignForm } from "~/components/admin/content/CampaignForm";
import { useAdminCampaigns } from "~/lib/adminCampaignStore";
import { isSlugTaken, type CampaignFormValues } from "~/lib/adminCampaigns";
import { pushToast } from "~/lib/toast";

export default function AdminCampaignEditPage() {
  const params = useParams<{ id: string }>();
  const store = useAdminCampaigns();
  const navigate = useNavigate();
  const campaign = () => store.getById(params.id);

  const handleSubmit = async (values: CampaignFormValues) => {
    const current = campaign();
    if (!current) return;
    await store.update(current.id, values);
    pushToast("บันทึกการเปลี่ยนแปลงแล้ว", "success");
    navigate(`/admin/content/campaigns/${current.id}`);
  };

  return (
    <Show
      when={campaign()}
      fallback={
        <div class="flex flex-col gap-6">
          <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "จัดการเนื้อหา", href: "/admin/promotion-pages" }, { label: "Campaigns", href: "/admin/content/campaigns" }]} />
          <EmptyState icon={<ContentIcon />} title="ไม่พบ Campaign นี้" description="Campaign นี้อาจถูกลบไปแล้ว หรือลิงก์ไม่ถูกต้อง" actionLabel="กลับไปหน้ารายการ" onAction={() => navigate("/admin/content/campaigns")} class="bg-surface-card shadow-card" />
        </div>
      }
    >
      {(current) => (
        <div class="flex flex-col gap-6">
          <Breadcrumb
            items={[
              { label: "แดชบอร์ด", href: "/admin" },
              { label: "จัดการเนื้อหา", href: "/admin/promotion-pages" },
              { label: "Campaigns", href: "/admin/content/campaigns" },
              { label: current().name },
              { label: "แก้ไข" },
            ]}
          />
          <PageHeader title={`แก้ไข: ${current().name}`} description="แก้ไขข้อมูล Campaign และบันทึกการเปลี่ยนแปลง" />
          <CampaignForm
            mode="edit"
            initial={current()}
            isSlugTaken={(slug) => isSlugTaken(store.campaigns(), slug, current().id)}
            onSubmit={handleSubmit}
            onCancel={() => navigate(`/admin/content/campaigns/${current().id}`)}
          />
        </div>
      )}
    </Show>
  );
}
