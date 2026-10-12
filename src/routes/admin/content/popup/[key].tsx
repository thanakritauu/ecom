import { createSignal, onMount, Show } from "solid-js";
import { useNavigate, useParams } from "@solidjs/router";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { PopupEditor } from "~/components/admin/content/PopupEditor";
import { readStoredPromoPopups, type PromoPopupRecord } from "~/lib/promoPopup";

export default function AdminEditPopupPage() {
  const params = useParams();
  const navigate = useNavigate();
  const [record, setRecord] = createSignal<PromoPopupRecord | null>();
  // The list lives in localStorage: read it after mount (SSR has no storage).
  onMount(() => setRecord(readStoredPromoPopups().find((p) => p.key === params.key) ?? null));

  return (
    <div class="flex flex-col gap-6">
      <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "Popup", href: "/admin/content/popup" }, { label: record()?.name ?? "แก้ไข Popup" }]} />
      <Show when={record() !== undefined}>
        <Show when={record()} fallback={<p class="text-sm text-ink-gray">ไม่พบ Popup นี้ อาจถูกลบไปแล้ว</p>}>
          {(r) => (
            <>
              <PageHeader title={r().name} description="แก้ไข Popup" />
              <PopupEditor initial={r()} onCancel={() => navigate("/admin/content/popup")} onSaved={() => navigate("/admin/content/popup")} />
            </>
          )}
        </Show>
      </Show>
    </div>
  );
}
