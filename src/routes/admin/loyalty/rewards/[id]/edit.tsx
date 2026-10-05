import { createMemo, Show } from "solid-js";
import { useNavigate, useParams } from "@solidjs/router";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { EmptyState } from "~/components/admin/EmptyState";
import { RewardPresentationForm } from "~/components/admin/loyalty/RewardPresentationForm";
import { RewardGiftIcon } from "~/components/admin/icons";
import type { RewardPresentationValues } from "~/lib/adminLoyaltyRewards";
import { useAdminRewards } from "~/lib/adminLoyaltyRewardStore";
import { pushToast } from "~/lib/toast";

export default function AdminLoyaltyRewardEditPage() {
  const params = useParams<{ id: string }>();
  const store = useAdminRewards();
  const navigate = useNavigate();
  const reward = createMemo(() => store.getById(params.id));

  const handleSubmit = async (values: RewardPresentationValues) => {
    await store.updatePresentation(params.id, values);
    pushToast(`บันทึกการแสดงผลของ "${values.displayName}" เรียบร้อยแล้ว`, "success");
    navigate(`/admin/loyalty/rewards/${params.id}`);
  };

  return (
    <Show
      when={reward()}
      fallback={
        <div class="flex flex-col gap-6">
          <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "สะสมแต้ม", href: "/admin/loyalty" }, { label: "ของรางวัล", href: "/admin/loyalty/rewards" }]} />
          <EmptyState icon={<RewardGiftIcon />} title="ไม่พบของรางวัลนี้" description="ข้อมูลอาจยังไม่ได้ Sync มาจาก Charmiss Club CRM หรือลิงก์ไม่ถูกต้อง" actionLabel="กลับไปหน้าของรางวัล" onAction={() => navigate("/admin/loyalty/rewards")} class="bg-surface-card shadow-card" />
        </div>
      }
    >
      {(current) => (
        <div class="flex flex-col gap-6">
          <Breadcrumb
            items={[
              { label: "แดชบอร์ด", href: "/admin" },
              { label: "สะสมแต้ม", href: "/admin/loyalty" },
              { label: "ของรางวัล", href: "/admin/loyalty/rewards" },
              { label: current().displayName, href: `/admin/loyalty/rewards/${current().id}` },
              { label: "แก้ไขการแสดงผล" },
            ]}
          />
          <PageHeader title={`แก้ไขการแสดงผล: ${current().displayName}`} description="แก้ไขได้เฉพาะรูปภาพ ชื่อ รายละเอียด Visibility และการเชื่อม Ecommerce — ไม่แก้ไข Coin Rule ของ Charmiss Club CRM" />
          <RewardPresentationForm reward={current()} onSubmit={handleSubmit} onCancel={() => navigate(`/admin/loyalty/rewards/${current().id}`)} />
        </div>
      )}
    </Show>
  );
}
