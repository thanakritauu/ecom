import { Show } from "solid-js";
import { useNavigate, useParams } from "@solidjs/router";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { EmptyState } from "~/components/admin/EmptyState";
import { CustomersIcon } from "~/components/admin/icons";
import { CustomerForm } from "~/components/admin/customers/CustomerForm";
import { useAdminCustomers } from "~/lib/adminCustomerStore";
import { getCustomerFullName, isCustomerEmailTaken, isCustomerPhoneTaken, type CustomerFormValues } from "~/lib/adminCustomers";
import { pushToast } from "~/lib/toast";

export default function AdminCustomerEditPage() {
  const params = useParams<{ id: string }>();
  const store = useAdminCustomers();
  const navigate = useNavigate();
  const customer = () => store.getById(params.id);

  const handleSubmit = async (values: CustomerFormValues) => {
    const current = customer();
    if (!current) return;
    const updated = await store.update(current.id, values);
    pushToast("บันทึกลูกค้าเรียบร้อยแล้ว", "success");
    navigate(`/admin/customers/${updated.id}`);
  };

  return (
    <Show
      when={customer()}
      fallback={
        <div class="flex flex-col gap-6">
          <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "ลูกค้า", href: "/admin/customers" }]} />
          <EmptyState
            icon={<CustomersIcon />}
            title="ไม่พบลูกค้ารายนี้"
            description="ลูกค้ารายนี้อาจถูกลบไปแล้ว หรือลิงก์ไม่ถูกต้อง"
            actionLabel="กลับไปหน้าลูกค้า"
            onAction={() => navigate("/admin/customers")}
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
              { label: "ลูกค้า", href: "/admin/customers" },
              { label: getCustomerFullName(current()), href: `/admin/customers/${current().id}` },
              { label: "แก้ไข" },
            ]}
          />
          <PageHeader title={`แก้ไข: ${getCustomerFullName(current())}`} description="แก้ไขข้อมูลลูกค้าและบันทึกการเปลี่ยนแปลง" />
          <CustomerForm
            submitLabel="บันทึกการเปลี่ยนแปลง"
            initial={current()}
            isEmailTaken={(email) => isCustomerEmailTaken(store.customers(), email, current().id)}
            isPhoneTaken={(phone) => isCustomerPhoneTaken(store.customers(), phone, current().id)}
            onSubmit={handleSubmit}
            onCancel={() => navigate(`/admin/customers/${current().id}`)}
          />
        </div>
      )}
    </Show>
  );
}
