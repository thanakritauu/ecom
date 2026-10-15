import { useNavigate, useSearchParams } from "@solidjs/router";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { CouponForm, type CouponFormValues } from "~/components/admin/marketing/CouponForm";
import { MarketingToolIconBox } from "~/components/admin/marketing/MarketingToolIcon";
import { useAdminMarketing } from "~/lib/adminMarketingStore";
import { MARKETING_HUB_PATH, MARKETING_TOOL_META, isCouponTool, type CouponTool } from "~/lib/adminMarketing";
import { pushToast } from "~/lib/toast";

/** Create from a coupon tool card (`?tool=coupon_new`); no tool = the plain คูปอง tool. */
export default function AdminCouponNewPage() {
  const store = useAdminMarketing().coupons;
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const raw = Array.isArray(params.tool) ? params.tool[0] : params.tool;
  const tool: CouponTool = isCouponTool(raw) ? raw : "coupon";
  const meta = MARKETING_TOOL_META[tool];

  const handleSubmit = async (values: CouponFormValues) => {
    const created = await store.add(values);
    pushToast(values.status === "draft" ? "บันทึกแบบร่างแล้ว ยังไม่มีผลที่หน้าร้าน" : "เผยแพร่คูปองแล้ว", "success");
    navigate(`/admin/marketing/coupons/${created.id}`);
  };

  return (
    <div class="flex flex-col gap-6">
      <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "การตลาด" }, { label: "โปรโมชั่น", href: `${MARKETING_HUB_PATH}?tab=tools` }, { label: `สร้าง ${meta.label}` }]} />
      <PageHeader icon={<MarketingToolIconBox tool={tool} />} title={`สร้าง ${meta.label}`} description={meta.description} />
      <CouponForm
        tool={tool}
        submitLabel="บันทึกคูปอง"
        takenCodes={store.items().map((c) => c.code.toUpperCase())}
        onSubmit={handleSubmit}
        onCancel={() => navigate(`${MARKETING_HUB_PATH}?tab=tools`)}
      />
    </div>
  );
}
