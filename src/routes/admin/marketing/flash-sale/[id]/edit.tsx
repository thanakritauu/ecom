import { Show } from "solid-js";
import { useNavigate, useParams } from "@solidjs/router";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { EmptyState } from "~/components/admin/EmptyState";
import { FlashBoltIcon } from "~/components/admin/icons";
import { FlashSaleCampaignForm, type FlashSaleCampaignFormValues } from "~/components/admin/marketing/FlashSaleCampaignForm";
import { MarketingToolIconBox } from "~/components/admin/marketing/MarketingToolIcon";
import { MARKETING_TOOL_META, marketingHubListHref } from "~/lib/adminMarketing";
import { useAdminMarketing } from "~/lib/adminMarketingStore";
import { pushToast } from "~/lib/toast";

export default function AdminFlashSaleEditPage() {
  const params = useParams<{ id: string }>();
  const store = useAdminMarketing().flashSales;
  const navigate = useNavigate();
  const campaign = () => store.getById(params.id);
  const listHref = marketingHubListHref("flash_sale");

  const handleSubmit = async (values: FlashSaleCampaignFormValues) => {
    const current = campaign();
    if (!current) return;
    const wasDraft = current.status === "draft";
    await store.update(current.id, values);
    pushToast(values.status === "draft" ? "บันทึกแบบร่างแล้ว ยังไม่มีผลที่หน้าร้าน" : wasDraft ? "เผยแพร่แฟลชเซลแล้ว" : "บันทึกแฟลชเซลเรียบร้อยแล้ว", "success");
    navigate(listHref);
  };

  return (
    <Show
      when={campaign()}
      keyed
      fallback={
        <div class="flex flex-col gap-6">
          <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "การตลาด" }, { label: "โปรโมชั่น", href: listHref }]} />
          <EmptyState icon={<FlashBoltIcon />} title="ไม่พบแฟลชเซลนี้" actionLabel="กลับไปหน้าโปรโมชั่น" onAction={() => navigate(listHref)} class="bg-surface-card shadow-card" />
        </div>
      }
    >
      {(current) => (
        <div class="flex flex-col gap-6">
          <Breadcrumb
            items={[
              { label: "แดชบอร์ด", href: "/admin" },
              { label: "การตลาด" },
              { label: "โปรโมชั่น", href: listHref },
              { label: current.name || MARKETING_TOOL_META.flash_sale.label },
              { label: "แก้ไข" },
            ]}
          />
          <PageHeader icon={<MarketingToolIconBox tool="flash_sale" />} title={`แก้ไข ${MARKETING_TOOL_META.flash_sale.label}`} description={current.name} />
          <FlashSaleCampaignForm initial={current} onSubmit={handleSubmit} onCancel={() => navigate(listHref)} />
        </div>
      )}
    </Show>
  );
}
