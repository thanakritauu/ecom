import { Show } from "solid-js";
import { useNavigate, useParams } from "@solidjs/router";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { EmptyState } from "~/components/admin/EmptyState";
import { CouponTicketIcon } from "~/components/admin/icons";
import { CouponForm, type CouponFormValues } from "~/components/admin/marketing/CouponForm";
import { MarketingToolIconBox } from "~/components/admin/marketing/MarketingToolIcon";
import { MARKETING_TOOL_META, couponTool, marketingHubListHref } from "~/lib/adminMarketing";
import { useAdminMarketing } from "~/lib/adminMarketingStore";
import { pushToast } from "~/lib/toast";

export default function AdminCouponEditPage() {
  const params = useParams<{ id: string }>();
  const store = useAdminMarketing().coupons;
  const navigate = useNavigate();
  const coupon = () => store.getById(params.id);

  const handleSubmit = async (values: CouponFormValues) => {
    const current = coupon();
    if (!current) return;
    const wasDraft = current.status === "draft";
    await store.update(current.id, values);
    pushToast(values.status === "draft" ? "บันทึกแบบร่างแล้ว ยังไม่มีผลที่หน้าร้าน" : wasDraft ? "เผยแพร่คูปองแล้ว" : "บันทึกคูปองเรียบร้อยแล้ว", "success");
    navigate(`/admin/marketing/coupons/${current.id}`);
  };

  return (
    <Show
      when={coupon()}
      fallback={
        <div class="flex flex-col gap-6">
          <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "การตลาด" }, { label: "โปรโมชั่น", href: marketingHubListHref() }]} />
          <EmptyState icon={<CouponTicketIcon />} title="ไม่พบคูปองนี้" description="คูปองอาจถูกลบไปแล้ว หรือลิงก์ไม่ถูกต้อง" actionLabel="กลับไปหน้าโปรโมชั่น" onAction={() => navigate(marketingHubListHref())} class="bg-surface-card shadow-card" />
        </div>
      }
    >
      {(current) => (
        <div class="flex flex-col gap-6">
          <Breadcrumb
            items={[
              { label: "แดชบอร์ด", href: "/admin" },
              { label: "การตลาด" },
              { label: "โปรโมชั่น", href: marketingHubListHref() },
              { label: current().code, href: `/admin/marketing/coupons/${current().id}` },
              { label: "แก้ไข" },
            ]}
          />
          <PageHeader icon={<MarketingToolIconBox tool={couponTool(current())} />} title={`แก้ไข ${MARKETING_TOOL_META[couponTool(current())].label}`} description={current().code} />
          <CouponForm
            tool={couponTool(current())}
            initial={current()}
            submitLabel="บันทึกการเปลี่ยนแปลง"
            takenCodes={store.items().filter((c) => c.id !== current().id).map((c) => c.code.toUpperCase())}
            onSubmit={handleSubmit}
            onCancel={() => navigate(`/admin/marketing/coupons/${current().id}`)}
          />
        </div>
      )}
    </Show>
  );
}
