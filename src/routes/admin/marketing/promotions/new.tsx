import { Show } from "solid-js";
import { Navigate, useNavigate, useSearchParams } from "@solidjs/router";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { PromotionForm, type PromotionFormValues } from "~/components/admin/marketing/PromotionForm";
import { MarketingToolIconBox } from "~/components/admin/marketing/MarketingToolIcon";
import { useAdminMarketing } from "~/lib/adminMarketingStore";
import { MARKETING_HUB_PATH, MARKETING_TOOL_META, isPromotionTool, type PromotionTool } from "~/lib/adminMarketing";
import { pushToast } from "~/lib/toast";

/** Create from a tool card (`?tool=gift_with_purchase`); without a promotion tool it goes back to the gallery. */
export default function AdminPromotionNewPage() {
  const store = useAdminMarketing().promotions;
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const tool = (): PromotionTool | undefined => {
    const t = Array.isArray(params.tool) ? params.tool[0] : params.tool;
    return isPromotionTool(t) ? t : undefined;
  };

  const handleSubmit = async (values: PromotionFormValues) => {
    const created = await store.add(values);
    pushToast(values.status === "draft" ? "บันทึกแบบร่างแล้ว ยังไม่มีผลที่หน้าร้าน" : "เผยแพร่โปรโมชั่นแล้ว", "success");
    navigate(`/admin/marketing/promotions/${created.id}`);
  };

  return (
    <Show when={tool()} fallback={<Navigate href={`${MARKETING_HUB_PATH}?tab=tools`} />}>
      {(t) => (
        <div class="flex flex-col gap-6">
          <Breadcrumb
            items={[
              { label: "แดชบอร์ด", href: "/admin" },
              { label: "การตลาด" },
              { label: "โปรโมชั่น", href: `${MARKETING_HUB_PATH}?tab=tools` },
              { label: `สร้าง ${MARKETING_TOOL_META[t()].label}` },
            ]}
          />
          <PageHeader icon={<MarketingToolIconBox tool={t()} />} title={`สร้าง ${MARKETING_TOOL_META[t()].label}`} description={MARKETING_TOOL_META[t()].description} />
          <PromotionForm tool={t()} submitLabel="บันทึกโปรโมชั่น" onSubmit={handleSubmit} onCancel={() => navigate(`${MARKETING_HUB_PATH}?tab=tools`)} />
        </div>
      )}
    </Show>
  );
}
