import { useNavigate } from "@solidjs/router";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { CouponForm, type CouponFormValues } from "~/components/admin/marketing/CouponForm";
import { useAdminMarketing } from "~/lib/adminMarketingStore";
import { pushToast } from "~/lib/toast";

export default function AdminCouponNewPage() {
  const store = useAdminMarketing().coupons;
  const navigate = useNavigate();

  const handleSubmit = async (values: CouponFormValues) => {
    const created = await store.add({ ...values, usageCount: 0 });
    pushToast(`สร้างคูปอง "${created.code}" เรียบร้อยแล้ว`, "success");
    navigate(`/admin/marketing/coupons/${created.id}`);
  };

  return (
    <div class="flex flex-col gap-6">
      <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "การตลาด", href: "/admin/marketing" }, { label: "คูปอง", href: "/admin/marketing/coupons" }, { label: "สร้างใหม่" }]} />
      <PageHeader title="สร้างคูปอง" description="กำหนดรหัสและเงื่อนไขคูปองใหม่" />
      <CouponForm submitLabel="สร้างคูปอง" onSubmit={handleSubmit} onCancel={() => navigate("/admin/marketing/coupons")} />
    </div>
  );
}
