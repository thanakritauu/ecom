import { Show } from "solid-js";
import { useNavigate, useParams } from "@solidjs/router";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { EmptyState } from "~/components/admin/EmptyState";
import { ContentIcon } from "~/components/admin/icons";
import { BannerForm } from "~/components/admin/content/BannerForm";
import { useAdminBanners } from "~/lib/adminBannerStore";
import type { BannerFormValues } from "~/lib/adminBanners";
import { pushToast } from "~/lib/toast";

export default function AdminBannerEditPage() {
  const params = useParams<{ id: string }>();
  const store = useAdminBanners();
  const navigate = useNavigate();
  const banner = () => store.getById(params.id);

  const handleSubmit = async (values: BannerFormValues) => {
    const current = banner();
    if (!current) return;
    await store.update(current.id, values);
    pushToast("บันทึกการเปลี่ยนแปลงแล้ว", "success");
    navigate(`/admin/content/banners/${current.id}`);
  };

  return (
    <Show
      when={banner()}
      fallback={
        <div class="flex flex-col gap-6">
          <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "เนื้อหา", href: "/admin/content" }, { label: "Banners", href: "/admin/content/banners" }]} />
          <EmptyState icon={<ContentIcon />} title="ไม่พบ Banner นี้" description="Banner นี้อาจถูกลบไปแล้ว หรือลิงก์ไม่ถูกต้อง" actionLabel="กลับไปหน้ารายการ" onAction={() => navigate("/admin/content/banners")} class="bg-white shadow-card" />
        </div>
      }
    >
      {(current) => (
        <div class="flex flex-col gap-6">
          <Breadcrumb
            items={[
              { label: "แดชบอร์ด", href: "/admin" },
              { label: "เนื้อหา", href: "/admin/content" },
              { label: "Banners", href: "/admin/content/banners" },
              { label: current().name },
              { label: "แก้ไข" },
            ]}
          />
          <PageHeader title={`แก้ไข: ${current().name}`} description="แก้ไขข้อมูล Banner และบันทึกการเปลี่ยนแปลง" />
          <BannerForm
            mode="edit"
            initial={current()}
            onSubmit={handleSubmit}
            onCancel={() => navigate(`/admin/content/banners/${current().id}`)}
          />
        </div>
      )}
    </Show>
  );
}
