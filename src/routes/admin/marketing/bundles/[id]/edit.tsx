import { Show } from "solid-js";
import { useNavigate, useParams } from "@solidjs/router";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { EmptyState } from "~/components/admin/EmptyState";
import { ReviewsIcon } from "~/components/admin/icons";
import { BundleForm, type BundleFormValues } from "~/components/admin/marketing/BundleForm";
import { useAdminMarketing } from "~/lib/adminMarketingStore";
import { pushToast } from "~/lib/toast";

export default function AdminBundleEditPage() {
  const params = useParams<{ id: string }>();
  const store = useAdminMarketing().bundles;
  const navigate = useNavigate();
  const bundle = () => store.getById(params.id);

  const handleSubmit = async (values: BundleFormValues) => {
    const current = bundle();
    if (!current) return;
    await store.update(current.id, values);
    pushToast("บันทึกการเปลี่ยนแปลงแล้ว", "success");
    navigate(`/admin/marketing/bundles/${current.id}`);
  };

  return (
    <Show
      when={bundle()}
      fallback={
        <div class="flex flex-col gap-6">
          <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "การตลาด", href: "/admin/marketing" }, { label: "บันเดิล / เซ็ต", href: "/admin/marketing/bundles" }]} />
          <EmptyState icon={<ReviewsIcon />} title="ไม่พบเซ็ตสินค้านี้" actionLabel="กลับไปหน้าบันเดิล" onAction={() => navigate("/admin/marketing/bundles")} class="bg-white shadow-card" />
        </div>
      }
    >
      {(current) => (
        <div class="flex flex-col gap-6">
          <Breadcrumb
            items={[
              { label: "แดชบอร์ด", href: "/admin" },
              { label: "การตลาด", href: "/admin/marketing" },
              { label: "บันเดิล / เซ็ต", href: "/admin/marketing/bundles" },
              { label: current().name },
              { label: "แก้ไข" },
            ]}
          />
          <PageHeader title={`แก้ไข: ${current().name}`} description="แก้ไขข้อมูลเซ็ตสินค้าและบันทึกการเปลี่ยนแปลง" />
          <BundleForm initial={current()} submitLabel="บันทึกการเปลี่ยนแปลง" onSubmit={handleSubmit} onCancel={() => navigate(`/admin/marketing/bundles/${current().id}`)} />
        </div>
      )}
    </Show>
  );
}
