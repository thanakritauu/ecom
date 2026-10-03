import { Show } from "solid-js";
import { useNavigate, useParams } from "@solidjs/router";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { EmptyState } from "~/components/admin/EmptyState";
import { LayersIcon } from "~/components/admin/icons";
import { BrandForm } from "~/components/admin/brands/BrandForm";
import { useAdminBrands } from "~/lib/adminBrandStore";
import { isBrandSlugTaken, type BrandFormValues } from "~/lib/adminBrands";
import { pushToast } from "~/lib/toast";

export default function AdminBrandEditPage() {
  const params = useParams<{ id: string }>();
  const store = useAdminBrands();
  const navigate = useNavigate();
  const brand = () => store.getById(params.id);

  const handleSubmit = async (values: BrandFormValues) => {
    const current = brand();
    if (!current) return;
    await store.update(current.id, values);
    pushToast("บันทึกการเปลี่ยนแปลงแล้ว", "success");
    navigate(`/admin/brands/${current.id}`);
  };

  return (
    <Show
      when={brand()}
      fallback={
        <div class="flex flex-col gap-6">
          <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "สินค้า", href: "/admin/products" }, { label: "แบรนด์", href: "/admin/brands" }]} />
          <EmptyState icon={<LayersIcon />} title="ไม่พบแบรนด์นี้" description="แบรนด์นี้อาจถูกลบไปแล้ว หรือลิงก์ไม่ถูกต้อง" actionLabel="กลับไปหน้ารายการ" onAction={() => navigate("/admin/brands")} class="bg-surface-card shadow-card" />
        </div>
      }
    >
      {(current) => (
        <div class="flex flex-col gap-6">
          <Breadcrumb
            items={[
              { label: "แดชบอร์ด", href: "/admin" },
              { label: "สินค้า", href: "/admin/products" },
              { label: "แบรนด์", href: "/admin/brands" },
              { label: current().name },
              { label: "แก้ไข" },
            ]}
          />
          <PageHeader title={`แก้ไข: ${current().name}`} description="แก้ไขข้อมูลแบรนด์และบันทึกการเปลี่ยนแปลง" />
          <BrandForm
            mode="edit"
            initial={current()}
            isSlugTaken={(slug) => isBrandSlugTaken(store.brands(), slug, current().id)}
            onSubmit={handleSubmit}
            onCancel={() => navigate(`/admin/brands/${current().id}`)}
          />
        </div>
      )}
    </Show>
  );
}
