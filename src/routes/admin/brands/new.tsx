import { useNavigate } from "@solidjs/router";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { BrandForm } from "~/components/admin/brands/BrandForm";
import { useAdminBrands } from "~/lib/adminBrandStore";
import { isBrandSlugTaken, type BrandFormValues } from "~/lib/adminBrands";
import { pushToast } from "~/lib/toast";

export default function AdminBrandNewPage() {
  const store = useAdminBrands();
  const navigate = useNavigate();

  const handleSubmit = async (values: BrandFormValues) => {
    const created = await store.add(values);
    pushToast(`สร้างแบรนด์ "${created.name}" เรียบร้อยแล้ว`, "success");
    navigate(`/admin/brands/${created.id}`);
  };

  return (
    <div class="flex flex-col gap-6">
      <Breadcrumb
        items={[
          { label: "แดชบอร์ด", href: "/admin" },
          { label: "แคตตาล็อก", href: "/admin/products" },
          { label: "แบรนด์", href: "/admin/brands" },
          { label: "สร้างใหม่" },
        ]}
      />
      <PageHeader title="สร้างแบรนด์" description="กำหนดชื่อ, Slug, โลโก้, สถานะ และสินค้าที่จะอยู่ในแบรนด์นี้" />
      <BrandForm
        mode="create"
        isSlugTaken={(slug) => isBrandSlugTaken(store.brands(), slug)}
        onSubmit={handleSubmit}
        onCancel={() => navigate("/admin/brands")}
      />
    </div>
  );
}
