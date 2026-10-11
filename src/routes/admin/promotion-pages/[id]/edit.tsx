import { Show } from "solid-js";
import { useNavigate, useParams } from "@solidjs/router";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { EmptyState } from "~/components/admin/EmptyState";
import { ContentIcon } from "~/components/admin/icons";
import { LandingPageForm } from "~/components/admin/content/LandingPageForm";
import { useAdminContent } from "~/lib/adminContentStore";
import { isSlugTaken, type LandingPageFormValues } from "~/lib/adminContent";
import { pushToast } from "~/lib/toast";

export default function AdminLandingPageEditPage() {
  const params = useParams<{ id: string }>();
  const store = useAdminContent();
  const navigate = useNavigate();
  const page = () => store.getById(params.id);

  const handleSubmit = async (values: LandingPageFormValues) => {
    const current = page();
    if (!current) return;
    const wasDraft = current.status === "draft";
    await store.update(current.id, values);
    pushToast(
      values.status === "draft"
        ? "บันทึกแบบร่างแล้ว ยังไม่แสดงบนหน้าร้าน"
        : wasDraft
          ? values.status === "scheduled"
            ? "ตั้งเวลาเผยแพร่หน้าแคมเปญแล้ว"
            : "เผยแพร่หน้าแคมเปญเรียบร้อยแล้ว"
          : "บันทึกหน้าแคมเปญเรียบร้อยแล้ว",
      "success",
    );
    navigate(`/admin/promotion-pages/${current.id}`);
  };

  return (
    <Show
      when={page()}
      fallback={
        <div class="flex flex-col gap-6">
          <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "หน้าแคมเปญ", href: "/admin/promotion-pages" }]} />
          <EmptyState icon={<ContentIcon />} title="ไม่พบหน้าแคมเปญนี้" description="หน้านี้อาจถูกลบไปแล้ว หรือลิงก์ไม่ถูกต้อง" actionLabel="กลับไปรายการหน้าแคมเปญ" onAction={() => navigate("/admin/promotion-pages")} class="bg-surface-card shadow-card" />
        </div>
      }
    >
      {(current) => (
        <div class="flex flex-col gap-6">
          <Breadcrumb
            items={[
              { label: "แดชบอร์ด", href: "/admin" },
              { label: "หน้าแคมเปญ", href: "/admin/promotion-pages" },
              { label: current().name, href: `/admin/promotion-pages/${current().id}` },
              { label: "แก้ไข" },
            ]}
          />
          <PageHeader title={`แก้ไข: ${current().name}`} description="แก้ไขข้อมูลหน้าแคมเปญและบันทึกการเปลี่ยนแปลง" />
          <LandingPageForm
            mode="edit"
            initial={current()}
            isSlugTaken={(slug) => isSlugTaken(store.pages(), slug, current().id)}
            onSubmit={handleSubmit}
            onCancel={() => navigate(`/admin/promotion-pages/${current().id}`)}
          />
        </div>
      )}
    </Show>
  );
}
