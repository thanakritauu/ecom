import { createMemo, Show } from "solid-js";
import { useNavigate, useParams } from "@solidjs/router";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { EmptyState } from "~/components/admin/EmptyState";
import { ProductForm } from "~/components/admin/products/ProductForm";
import { CatalogIcon } from "~/components/admin/icons";
import { useAdminProducts } from "~/lib/adminProductStore";
import { pushToast } from "~/lib/toast";

/**
 * PART 19 — same `ProductForm` as `/new`, pre-filled from the store's
 * current data; saving calls `updateProduct` instead of `addProduct` and
 * returns to Product Detail so the new values are immediately visible there.
 */
export default function AdminEditProductPage() {
  const params = useParams<{ id: string }>();
  const store = useAdminProducts();
  const navigate = useNavigate();

  const product = createMemo(() => store.getById(params.id));

  return (
    <Show
      when={product()}
      fallback={
        <div class="flex flex-col gap-6">
          <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "สินค้า", href: "/admin/products" }]} />
          <EmptyState
            icon={<CatalogIcon />}
            title="ไม่พบสินค้านี้"
            description="สินค้าอาจถูกลบไปแล้ว หรือลิงก์ไม่ถูกต้อง"
            actionLabel="กลับไปหน้าสินค้า"
            onAction={() => navigate("/admin/products")}
            class="bg-surface-card shadow-card"
          />
        </div>
      }
    >
      {(current) => (
        <div class="flex flex-col gap-6">
          <Breadcrumb
            items={[
              { label: "แดชบอร์ด", href: "/admin" },
              { label: "สินค้า", href: "/admin/products" },
              { label: current().name, href: `/admin/products/${current().id}` },
              { label: "แก้ไข" },
            ]}
          />
          <PageHeader title={`แก้ไข: ${current().name}`} description="แก้ไขข้อมูลสินค้าและบันทึกการเปลี่ยนแปลง" />

          <ProductForm
            initial={current()}
            submitLabel="บันทึกการเปลี่ยนแปลง"
            onCancel={() => navigate(`/admin/products/${current().id}`)}
            onSubmit={async (values) => {
              const updated = await store.updateProduct(current().id, values);
              pushToast("บันทึกสินค้าเรียบร้อยแล้ว", "success");
              navigate(`/admin/products/${updated.id}`);
            }}
          />
        </div>
      )}
    </Show>
  );
}
