import { useNavigate } from "@solidjs/router";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { CustomerForm } from "~/components/admin/customers/CustomerForm";
import { useAdminCustomers } from "~/lib/adminCustomerStore";
import { getCustomerFullName, isCustomerEmailTaken, isCustomerPhoneTaken, type CustomerFormValues } from "~/lib/adminCustomers";
import { pushToast } from "~/lib/toast";

export default function AdminCustomerNewPage() {
  const store = useAdminCustomers();
  const navigate = useNavigate();

  const handleSubmit = async (values: CustomerFormValues) => {
    const created = await store.add(values);
    pushToast(`สร้างลูกค้า "${getCustomerFullName(created)}" เรียบร้อยแล้ว`, "success");
    navigate(`/admin/customers/${created.id}`);
  };

  return (
    <div class="flex flex-col gap-6">
      <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "ลูกค้า", href: "/admin/customers" }, { label: "สร้างใหม่" }]} />
      <PageHeader title="สร้างลูกค้า" description="กรอกข้อมูลลูกค้าใหม่เข้าสู่ระบบ" />
      <CustomerForm
        mode="create"
        isEmailTaken={(email) => isCustomerEmailTaken(store.customers(), email)}
        isPhoneTaken={(phone) => isCustomerPhoneTaken(store.customers(), phone)}
        onSubmit={handleSubmit}
        onCancel={() => navigate("/admin/customers")}
      />
    </div>
  );
}
