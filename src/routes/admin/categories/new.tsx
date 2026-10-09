import { useNavigate } from "@solidjs/router";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { CategoryForm } from "~/components/admin/categories/CategoryForm";
import { useAdminCategories } from "~/lib/adminCategoryStore";
import { isCategorySlugTaken, type CategoryFormValues } from "~/lib/adminCategories";
import { pushToast } from "~/lib/toast";

export default function AdminCategoryNewPage() {
  const store = useAdminCategories();
  const navigate = useNavigate();

  const handleSubmit = async (values: CategoryFormValues) => {
    const created = await store.add(values);
    pushToast("บันทึกหมวดหมู่เรียบร้อยแล้ว", "success");
    navigate(`/admin/categories/${created.id}`);
  };

  return (
    <div class="flex flex-col gap-6">
      <Breadcrumb
        items={[
          { label: "แดชบอร์ด", href: "/admin" },
          { label: "สินค้า", href: "/admin/products" },
          { label: "หมวดหมู่", href: "/admin/categories" },
          { label: "เพิ่มหมวดหมู่" },
        ]}
      />
      <PageHeader title="เพิ่มหมวดหมู่" description="กำหนดชื่อและ Slug ของหมวดหมู่นี้" />
      <CategoryForm
        mode="create"
        isSlugTaken={(slug) => isCategorySlugTaken(store.categories(), slug)}
        onSubmit={handleSubmit}
        onCancel={() => navigate("/admin/categories")}
      />
    </div>
  );
}
