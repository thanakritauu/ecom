import { Show } from "solid-js";
import { useNavigate, useParams } from "@solidjs/router";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { EmptyState } from "~/components/admin/EmptyState";
import { CatalogIcon } from "~/components/admin/icons";
import { CategoryForm } from "~/components/admin/categories/CategoryForm";
import { useAdminCategories } from "~/lib/adminCategoryStore";
import { isCategorySlugTaken, type CategoryFormValues } from "~/lib/adminCategories";
import { pushToast } from "~/lib/toast";

export default function AdminCategoryEditPage() {
  const params = useParams<{ id: string }>();
  const store = useAdminCategories();
  const navigate = useNavigate();
  const category = () => store.getById(params.id);

  const handleSubmit = async (values: CategoryFormValues) => {
    const current = category();
    if (!current) return;
    await store.update(current.id, values);
    pushToast("บันทึกการเปลี่ยนแปลงแล้ว", "success");
    navigate(`/admin/categories/${current.id}`);
  };

  return (
    <Show
      when={category()}
      fallback={
        <div class="flex flex-col gap-6">
          <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "สินค้า", href: "/admin/products" }, { label: "หมวดหมู่", href: "/admin/categories" }]} />
          <EmptyState icon={<CatalogIcon />} title="ไม่พบหมวดหมู่นี้" description="หมวดหมู่นี้อาจถูกลบไปแล้ว หรือลิงก์ไม่ถูกต้อง" actionLabel="กลับไปหน้ารายการ" onAction={() => navigate("/admin/categories")} class="bg-surface-card shadow-card" />
        </div>
      }
    >
      {(current) => (
        <div class="flex flex-col gap-6">
          <Breadcrumb
            items={[
              { label: "แดชบอร์ด", href: "/admin" },
              { label: "สินค้า", href: "/admin/products" },
              { label: "หมวดหมู่", href: "/admin/categories" },
              { label: current().name },
              { label: "แก้ไข" },
            ]}
          />
          <PageHeader title={`แก้ไข: ${current().name}`} description="แก้ไขข้อมูลหมวดหมู่และบันทึกการเปลี่ยนแปลง" />
          <CategoryForm
            mode="edit"
            initial={current()}
            isSlugTaken={(slug) => isCategorySlugTaken(store.categories(), slug, current().id)}
            onSubmit={handleSubmit}
            onCancel={() => navigate(`/admin/categories/${current().id}`)}
          />
        </div>
      )}
    </Show>
  );
}
