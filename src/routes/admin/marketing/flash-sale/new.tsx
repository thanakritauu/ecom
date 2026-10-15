import { useNavigate } from "@solidjs/router";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { FlashSaleCampaignForm, type FlashSaleCampaignFormValues } from "~/components/admin/marketing/FlashSaleCampaignForm";
import { MarketingToolIconBox } from "~/components/admin/marketing/MarketingToolIcon";
import { useAdminMarketing } from "~/lib/adminMarketingStore";
import { MARKETING_HUB_PATH, MARKETING_TOOL_META, marketingHubListHref } from "~/lib/adminMarketing";
import { pushToast } from "~/lib/toast";

export default function AdminFlashSaleNewPage() {
  const store = useAdminMarketing().flashSales;
  const navigate = useNavigate();

  const handleSubmit = async (values: FlashSaleCampaignFormValues) => {
    await store.add(values);
    pushToast(values.status === "draft" ? "บันทึกแบบร่างแล้ว ยังไม่มีผลที่หน้าร้าน" : "เผยแพร่แฟลชเซลแล้ว", "success");
    navigate(marketingHubListHref("flash_sale"));
  };

  return (
    <div class="flex flex-col gap-6">
      <Breadcrumb
        items={[
          { label: "แดชบอร์ด", href: "/admin" },
          { label: "การตลาด" },
          { label: "โปรโมชั่น", href: `${MARKETING_HUB_PATH}?tab=tools` },
          { label: `สร้าง ${MARKETING_TOOL_META.flash_sale.label}` },
        ]}
      />
      <PageHeader icon={<MarketingToolIconBox tool="flash_sale" />} title={`สร้าง ${MARKETING_TOOL_META.flash_sale.label}`} description={MARKETING_TOOL_META.flash_sale.description} />
      <FlashSaleCampaignForm onSubmit={handleSubmit} onCancel={() => navigate(`${MARKETING_HUB_PATH}?tab=tools`)} />
    </div>
  );
}
