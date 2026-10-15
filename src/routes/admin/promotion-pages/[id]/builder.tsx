import { Show } from "solid-js";
import { useNavigate, useParams } from "@solidjs/router";
import { EmptyState } from "~/components/admin/EmptyState";
import { ContentIcon } from "~/components/admin/icons";
import { PageBuilder } from "~/components/admin/builder/PageBuilder";
import { useAdminContent } from "~/lib/adminContentStore";

/** ตัวออกแบบหน้า (full screen, no Admin sidebar: see `routes/admin.tsx`). */
export default function AdminLandingPageBuilderRoute() {
  const params = useParams<{ id: string }>();
  const store = useAdminContent();
  const navigate = useNavigate();
  return (
    <Show
      when={store.getById(params.id)}
      fallback={
        <div class="flex min-h-screen items-center justify-center bg-surface-gray p-4">
          <EmptyState icon={<ContentIcon />} title="ไม่พบหน้าแคมเปญนี้" description="หน้านี้อาจถูกลบไปแล้ว หรือลิงก์ไม่ถูกต้อง" actionLabel="กลับไปรายการหน้าแคมเปญ" onAction={() => navigate("/admin/promotion-pages")} class="w-full max-w-md bg-surface-card shadow-card" />
        </div>
      }
    >
      {(page) => <PageBuilder page={page()} />}
    </Show>
  );
}
