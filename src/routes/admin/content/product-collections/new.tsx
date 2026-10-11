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
    pushToast(values.status === "draft" ? "บันทึกแบบร่างเรียบร้อยแล้ว" : "เผยแพร่กลุ่มสินค้าพิเศษเรียบร้อยแล้ว", "success");
    navigate(`/admin/content/product-collections/${created.id}`);
  };

  return (
    <div class="flex flex-col gap-6">
      <Breadcrumb
        items={[
          { label: "แดชบอร์ด", href: "/admin" },
          { label: "สินค้า", href: "/admin/products" },
          { label: "กลุ่มสินค้าพิเศษ", href: "/admin/content/product-collections" },
          { label: "เพิ่มกลุ่มสินค้าพิเศษ" },
        ]}
      />
      <PageHeader title="เพิ่มกลุ่มสินค้าพิเศษ" description="ตั้งชื่อกลุ่มและเลือกสินค้าที่จะอยู่ในกลุ่มนี้" />
      <ProductCollectionForm onSubmit={handleSubmit} onCancel={() => navigate("/admin/content/product-collections")} />
    </div>
  );
}
