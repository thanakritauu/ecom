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
      created.status === "draft" ? "บันทึกแบบร่างแล้ว ยังไม่แสดงบนหน้าร้าน" : created.status === "scheduled" ? "ตั้งเวลาเผยแพร่หน้าแคมเปญแล้ว" : "เผยแพร่หน้าแคมเปญเรียบร้อยแล้ว",
      "success",
    );
    navigate(`/admin/promotion-pages/${created.id}`);
  };

  return (
    <div class="flex flex-col gap-6">
      <Breadcrumb
        items={[
          { label: "แดชบอร์ด", href: "/admin" },
          { label: "หน้าแคมเปญ", href: "/admin/promotion-pages" },
          { label: "เพิ่มหน้าแคมเปญ" },
        ]}
      />
      <PageHeader title="เพิ่มหน้าแคมเปญ" description="ตั้งชื่อหน้า ใส่แบนเนอร์ เนื้อหา และสินค้าที่จะแสดงบนหน้าร้าน" />
      <LandingPageForm
        mode="create"
        isSlugTaken={(slug) => isSlugTaken(store.pages(), slug)}
        onSubmit={handleSubmit}
        onCancel={() => navigate("/admin/promotion-pages")}
        onDesign={async (values) => {
          if (!values) return;
          const created = await store.add({ ...values, status: "draft" });
          pushToast("บันทึกแบบร่างแล้ว เริ่มออกแบบหน้าได้เลย", "success");
          navigate(`/admin/promotion-pages/${created.id}/builder`);
        }}
      />
    </div>
  );
}
