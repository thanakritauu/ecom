import { useNavigate } from "@solidjs/router";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { ProductCollectionForm } from "~/components/admin/content/ProductCollectionForm";
import { useAdminCollections } from "~/lib/adminCollectionStore";
import type { ProductCollectionFormValues } from "~/lib/adminCollections";
import { pushToast } from "~/lib/toast";

export default function AdminProductCollectionNewPage() {
  const store = useAdminCollections();
  const navigate = useNavigate();

  const handleSubmit = async (values: ProductCollectionFormValues) => {
    const created = await store.add(values);
    pushToast(`สร้าง Collection "${created.name}" เรียบร้อยแล้ว`, "success");
    navigate(`/admin/content/product-collections/${created.id}`);
  };

  return (
    <div class="flex flex-col gap-6">
      <Breadcrumb
        items={[
          { label: "แดชบอร์ด", href: "/admin" },
          { label: "จัดการเนื้อหา", href: "/admin/promotion-pages" },
          { label: "Product Collections", href: "/admin/content/product-collections" },
          { label: "สร้างใหม่" },
        ]}
      />
      <PageHeader title="สร้าง Collection" description="กำหนดชื่อ, คำอธิบาย, สถานะ และสินค้าที่จะอยู่ใน Collection นี้" />
      <ProductCollectionForm mode="create" onSubmit={handleSubmit} onCancel={() => navigate("/admin/content/product-collections")} />
    </div>
  );
}
