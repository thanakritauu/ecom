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
    const created = await store.add(values);
    pushToast("บันทึกคูปองเรียบร้อยแล้ว", "success");
    navigate(`/admin/marketing/coupons/${created.id}`);
  };

  return (
    <div class="flex flex-col gap-6">
      <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "การตลาด" }, { label: "คูปอง", href: "/admin/marketing/coupons" }, { label: "เพิ่มคูปอง" }]} />
      <PageHeader title="เพิ่มคูปอง" description="ตั้งโค้ดส่วนลดเป็นบาทหรือเปอร์เซ็นต์ให้ลูกค้าใช้ตอนชำระเงิน" />
      <CouponForm
        submitLabel="บันทึกคูปอง"
        takenCodes={store.items().map((c) => c.code.toUpperCase())}
        onSubmit={handleSubmit}
        onCancel={() => navigate("/admin/marketing/coupons")}
      />
    </div>
  );
}
