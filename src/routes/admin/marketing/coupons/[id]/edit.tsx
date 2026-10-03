import { Show } from "solid-js";
import { useNavigate, useParams } from "@solidjs/router";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { EmptyState } from "~/components/admin/EmptyState";
import { InventoryIcon } from "~/components/admin/icons";
import { CouponForm, type CouponFormValues } from "~/components/admin/marketing/CouponForm";
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
    await store.update(current.id, { ...values, usageCount: current.usageCount });
    pushToast("บันทึกการเปลี่ยนแปลงแล้ว", "success");
    navigate(`/admin/marketing/coupons/${current.id}`);
  };

  return (
    <Show
      when={coupon()}
      fallback={
        <div class="flex flex-col gap-6">
          <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "การตลาด", href: "/admin/marketing" }, { label: "คูปอง", href: "/admin/marketing/coupons" }]} />
          <EmptyState icon={<InventoryIcon />} title="ไม่พบคูปองนี้" actionLabel="กลับไปหน้าคูปอง" onAction={() => navigate("/admin/marketing/coupons")} class="bg-surface-card shadow-card" />
        </div>
      }
    >
      {(current) => (
        <div class="flex flex-col gap-6">
          <Breadcrumb
            items={[
              { label: "แดชบอร์ด", href: "/admin" },
              { label: "การตลาด", href: "/admin/marketing" },
              { label: "คูปอง", href: "/admin/marketing/coupons" },
              { label: current().code },
              { label: "แก้ไข" },
            ]}
          />
          <PageHeader title={`แก้ไข: ${current().code}`} description="แก้ไขเงื่อนไขคูปองและบันทึกการเปลี่ยนแปลง" />
          <CouponForm initial={current()} submitLabel="บันทึกการเปลี่ยนแปลง" onSubmit={handleSubmit} onCancel={() => navigate(`/admin/marketing/coupons/${current().id}`)} />
        </div>
      )}
    </Show>
  );
}
