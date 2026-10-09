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
    pushToast("บันทึกกลุ่มสินค้าพิเศษเรียบร้อยแล้ว", "success");
    navigate(`/admin/content/product-collections/${current.id}`);
  };

  return (
    <Show
      when={collection()}
      fallback={
        <div class="flex flex-col gap-6">
          <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "สินค้า", href: "/admin/products" }, { label: "กลุ่มสินค้าพิเศษ", href: "/admin/content/product-collections" }]} />
          <EmptyState icon={<LayersIcon />} title="ไม่พบกลุ่มสินค้าพิเศษนี้" description="กลุ่มสินค้าพิเศษนี้อาจถูกลบไปแล้ว หรือลิงก์ไม่ถูกต้อง" actionLabel="กลับไปหน้ากลุ่มสินค้าพิเศษ" onAction={() => navigate("/admin/content/product-collections")} class="bg-surface-card shadow-card" />
        </div>
      }
    >
      {(current) => (
        <div class="flex flex-col gap-6">
          <Breadcrumb
            items={[
              { label: "แดชบอร์ด", href: "/admin" },
              { label: "สินค้า", href: "/admin/products" },
              { label: "กลุ่มสินค้าพิเศษ", href: "/admin/content/product-collections" },
              { label: current().name, href: `/admin/content/product-collections/${current().id}` },
              { label: "แก้ไข" },
            ]}
          />
          <PageHeader title={`แก้ไข: ${current().name}`} description="แก้ไขข้อมูลกลุ่มสินค้าพิเศษและบันทึกการเปลี่ยนแปลง" />
          <ProductCollectionForm submitLabel="บันทึกการเปลี่ยนแปลง" initial={current()} onSubmit={handleSubmit} onCancel={() => navigate(`/admin/content/product-collections/${current().id}`)} />
        </div>
      )}
    </Show>
  );
}
