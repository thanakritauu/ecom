import { Show } from "solid-js";
import { useNavigate, useParams } from "@solidjs/router";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { EmptyState } from "~/components/admin/EmptyState";
import { LayersIcon } from "~/components/admin/icons";
import { ProductCollectionForm } from "~/components/admin/content/ProductCollectionForm";
import { useAdminCollections } from "~/lib/adminCollectionStore";
import type { ProductCollectionFormValues } from "~/lib/adminCollections";
import { pushToast } from "~/lib/toast";

export default function AdminProductCollectionEditPage() {
  const params = useParams<{ id: string }>();
  const store = useAdminCollections();
  const navigate = useNavigate();
  const collection = () => store.getById(params.id);

  const handleSubmit = async (values: ProductCollectionFormValues) => {
    const current = collection();
    if (!current) return;
    await store.update(current.id, values);
    pushToast("บันทึกการเปลี่ยนแปลงแล้ว", "success");
    navigate(`/admin/content/product-collections/${current.id}`);
  };

  return (
    <Show
      when={collection()}
      fallback={
        <div class="flex flex-col gap-6">
          <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "จัดการเนื้อหา", href: "/admin/promotion-pages" }, { label: "Product Collections", href: "/admin/content/product-collections" }]} />
          <EmptyState icon={<LayersIcon />} title="ไม่พบ Collection นี้" description="Collection นี้อาจถูกลบไปแล้ว หรือลิงก์ไม่ถูกต้อง" actionLabel="กลับไปหน้ารายการ" onAction={() => navigate("/admin/content/product-collections")} class="bg-surface-card shadow-card" />
        </div>
      }
    >
      {(current) => (
        <div class="flex flex-col gap-6">
          <Breadcrumb
            items={[
              { label: "แดชบอร์ด", href: "/admin" },
              { label: "จัดการเนื้อหา", href: "/admin/promotion-pages" },
              { label: "Product Collections", href: "/admin/content/product-collections" },
              { label: current().name },
              { label: "แก้ไข" },
            ]}
          />
          <PageHeader title={`แก้ไข: ${current().name}`} description="แก้ไขข้อมูล Collection และบันทึกการเปลี่ยนแปลง" />
          <ProductCollectionForm mode="edit" initial={current()} onSubmit={handleSubmit} onCancel={() => navigate(`/admin/content/product-collections/${current().id}`)} />
        </div>
      )}
    </Show>
  );
}
