import { useNavigate } from "@solidjs/router";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { ProductForm } from "~/components/admin/products/ProductForm";
import { useAdminProducts } from "~/lib/adminProductStore";
import { pushToast } from "~/lib/toast";
import { setProductTiktokClips } from "~/lib/adminTiktokClips";

export default function AdminNewProductPage() {
  const store = useAdminProducts();
  const navigate = useNavigate();

  return (
    <div class="flex flex-col gap-6">
      <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "สินค้า", href: "/admin/products" }, { label: "เพิ่มสินค้า" }]} />
      <PageHeader title="เพิ่มสินค้า" description="กรอกข้อมูลสินค้าใหม่เพื่อเพิ่มเข้าแคตตาล็อกของ Charmiss" />

      <ProductForm
        submitLabel="บันทึกสินค้า"
        onCancel={() => navigate("/admin/products")}
        onSubmit={async (values) => {
          const created = await store.addProduct(values);
          if (values.tiktokClipIds) setProductTiktokClips(created.id, values.tiktokClipIds);
          pushToast(values.status === "draft" ? "บันทึกแบบร่างแล้ว ยังไม่แสดงบนหน้าร้าน" : "บันทึกและเผยแพร่สินค้าแล้ว", "success");
          navigate(`/admin/products/${created.id}`);
        }}
      />
    </div>
  );
}
