import { useNavigate } from "@solidjs/router";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { LandingPageForm } from "~/components/admin/content/LandingPageForm";
import { useAdminContent } from "~/lib/adminContentStore";
import { isSlugTaken, type LandingPageFormValues } from "~/lib/adminContent";
import { pushToast } from "~/lib/toast";

export default function AdminLandingPageNewPage() {
  const store = useAdminContent();
  const navigate = useNavigate();

  const handleSubmit = async (values: LandingPageFormValues) => {
    const created = await store.add(values);
    pushToast(
      created.status === "published" ? `เผยแพร่หน้า "${created.name}" เรียบร้อยแล้ว` : `บันทึกแบบร่าง "${created.name}" เรียบร้อยแล้ว`,
      "success",
    );
    navigate(`/admin/promotion-pages/${created.id}`);
  };

  return (
    <div class="flex flex-col gap-6">
      <Breadcrumb
        items={[
          { label: "แดชบอร์ด", href: "/admin" },
          { label: "จัดการเนื้อหา", href: "/admin/promotion-pages" },
          { label: "หน้าโปรโมชั่น", href: "/admin/promotion-pages" },
          { label: "เพิ่มหน้าโปรโมชั่น" },
        ]}
      />
      <PageHeader title="เพิ่มหน้าโปรโมชั่น" description="กำหนดชื่อหน้า, Banner, เนื้อหา และสินค้าที่จะแสดงในหน้านี้" />
      <LandingPageForm
        mode="create"
        isSlugTaken={(slug) => isSlugTaken(store.pages(), slug)}
        onSubmit={handleSubmit}
        onCancel={() => navigate("/admin/promotion-pages")}
      />
    </div>
  );
}
