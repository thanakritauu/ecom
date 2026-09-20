import { useNavigate } from "@solidjs/router";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { CampaignForm } from "~/components/admin/content/CampaignForm";
import { useAdminCampaigns } from "~/lib/adminCampaignStore";
import { isSlugTaken, type CampaignFormValues } from "~/lib/adminCampaigns";
import { pushToast } from "~/lib/toast";

export default function AdminCampaignNewPage() {
  const store = useAdminCampaigns();
  const navigate = useNavigate();

  const handleSubmit = async (values: CampaignFormValues) => {
    const created = await store.add(values);
    pushToast(
      created.status === "published" ? `เผยแพร่ "${created.name}" เรียบร้อยแล้ว` : `บันทึกแบบร่าง "${created.name}" เรียบร้อยแล้ว`,
      "success",
    );
    navigate(`/admin/content/campaigns/${created.id}`);
  };

  return (
    <div class="flex flex-col gap-6">
      <Breadcrumb
        items={[
          { label: "แดชบอร์ด", href: "/admin" },
          { label: "เนื้อหา", href: "/admin/content" },
          { label: "Campaigns", href: "/admin/content/campaigns" },
          { label: "สร้างใหม่" },
        ]}
      />
      <PageHeader title="สร้าง Campaign" description="กำหนดชื่อ Campaign, Banner, เนื้อหา และสินค้าที่จะแสดงในแคมเปญนี้" />
      <CampaignForm
        mode="create"
        isSlugTaken={(slug) => isSlugTaken(store.campaigns(), slug)}
        onSubmit={handleSubmit}
        onCancel={() => navigate("/admin/content/campaigns")}
      />
    </div>
  );
}
