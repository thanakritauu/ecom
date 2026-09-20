import { Show } from "solid-js";
import { useNavigate, useParams } from "@solidjs/router";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { EmptyState } from "~/components/admin/EmptyState";
import { LoyaltyIcon } from "~/components/admin/icons";
import { FlashSaleForm, type FlashSaleFormValues } from "~/components/admin/marketing/FlashSaleForm";
import { useAdminMarketing } from "~/lib/adminMarketingStore";
import { pushToast } from "~/lib/toast";

export default function AdminFlashSaleEditPage() {
  const params = useParams<{ id: string }>();
  const store = useAdminMarketing().flashSales;
  const navigate = useNavigate();
  const flashSale = () => store.getById(params.id);

  const handleSubmit = async (values: FlashSaleFormValues) => {
    const current = flashSale();
    if (!current) return;
    await store.update(current.id, values);
    pushToast("บันทึกการเปลี่ยนแปลงแล้ว", "success");
    navigate(`/admin/marketing/flash-sale/${current.id}`);
  };

  return (
    <Show
      when={flashSale()}
      fallback={
        <div class="flex flex-col gap-6">
          <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "การตลาด", href: "/admin/marketing" }, { label: "แฟลชเซล", href: "/admin/marketing/flash-sale" }]} />
          <EmptyState icon={<LoyaltyIcon />} title="ไม่พบแฟลชเซลนี้" actionLabel="กลับไปหน้าแฟลชเซล" onAction={() => navigate("/admin/marketing/flash-sale")} class="bg-white shadow-card" />
        </div>
      }
    >
      {(current) => (
        <div class="flex flex-col gap-6">
          <Breadcrumb
            items={[
              { label: "แดชบอร์ด", href: "/admin" },
              { label: "การตลาด", href: "/admin/marketing" },
              { label: "แฟลชเซล", href: "/admin/marketing/flash-sale" },
              { label: current().name },
              { label: "แก้ไข" },
            ]}
          />
          <PageHeader title={`แก้ไข: ${current().name}`} description="แก้ไขข้อมูลแฟลชเซลและบันทึกการเปลี่ยนแปลง" />
          <FlashSaleForm initial={current()} submitLabel="บันทึกการเปลี่ยนแปลง" onSubmit={handleSubmit} onCancel={() => navigate(`/admin/marketing/flash-sale/${current().id}`)} />
        </div>
      )}
    </Show>
  );
}
