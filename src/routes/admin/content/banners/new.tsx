import { useNavigate } from "@solidjs/router";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { BannerForm } from "~/components/admin/content/BannerForm";
import { useAdminBanners } from "~/lib/adminBannerStore";
import type { BannerFormValues } from "~/lib/adminBanners";
import { pushToast } from "~/lib/toast";

export default function AdminBannerNewPage() {
  const store = useAdminBanners();
  const navigate = useNavigate();

  const handleSubmit = async (values: BannerFormValues) => {
    const created = await store.add(values);
    pushToast(
      created.status === "published" ? `เผยแพร่ "${created.name}" เรียบร้อยแล้ว` : `บันทึกแบบร่าง "${created.name}" เรียบร้อยแล้ว`,
      "success",
    );
    navigate(`/admin/content/banners/${created.id}`);
  };

  return (
    <div class="flex flex-col gap-6">
      <Breadcrumb
        items={[
          { label: "แดชบอร์ด", href: "/admin" },
          { label: "จัดการเนื้อหา", href: "/admin/promotion-pages" },
          { label: "Banners", href: "/admin/content/banners" },
          { label: "สร้างใหม่" },
        ]}
      />
      <PageHeader title="สร้าง Banner" description="กำหนดชื่อ, รูปภาพ, ระยะเวลา และลิงก์ปลายทางของ Banner นี้" />
      <BannerForm mode="create" onSubmit={handleSubmit} onCancel={() => navigate("/admin/content/banners")} />
    </div>
  );
}
