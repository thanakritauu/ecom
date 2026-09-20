import { createMemo, For, Show } from "solid-js";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { Button } from "~/components/shared/Button";
import { StatusBadge } from "~/components/admin/StatusBadge";
import { ImageIcon } from "~/components/admin/icons";
import { HOMEPAGE_SECTION_TYPE_META } from "~/lib/adminHomepage";
import { useAdminHomepage } from "~/lib/adminHomepageStore";

/** §4 — Homepage Overview: status/last-updated/active-section-count/pending-change-count at a glance, then a read-only glance at the currently Published sections (editing itself only happens in the Editor). */
export default function AdminHomepageOverviewPage() {
  const store = useAdminHomepage();

  const hasChanges = () => store.hasUnpublishedChanges();
  const activeCount = createMemo(() => store.publishedSections().filter((s) => s.enabled).length);
  const changedCount = createMemo(() => {
    const draft = store.draftSections();
    const published = store.publishedSections();
    const publishedById = new Map(published.map((s) => [s.id, s]));
    const draftIds = new Set(draft.map((s) => s.id));
    let count = 0;
    for (const s of draft) {
      const p = publishedById.get(s.id);
      if (!p || JSON.stringify(p) !== JSON.stringify(s)) count++;
    }
    for (const p of published) if (!draftIds.has(p.id)) count++;
    return count;
  });

  return (
    <div class="flex flex-col gap-6">
      <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "เนื้อหา", href: "/admin/content" }, { label: "Homepage" }]} />
      <PageHeader
        title="Homepage"
        description="จัดการเนื้อหาและส่วนประกอบของหน้าแรก"
        actions={
          <Button href="/admin/content/homepage/edit" variant="primary">
            แก้ไข Homepage
          </Button>
        }
      />

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="สถานะ">
          <StatusBadge tone={hasChanges() ? "warning" : "success"} class="w-fit">
            {hasChanges() ? "มีการแก้ไขที่ยังไม่ได้เผยแพร่" : "เผยแพร่แล้ว"}
          </StatusBadge>
        </StatCard>
        <StatCard label="แก้ไขล่าสุด">
          <p class="text-lg font-semibold text-ink">{hasChanges() ? store.draftUpdatedAt() : store.publishedUpdatedAt()}</p>
        </StatCard>
        <StatCard label="Section ที่เปิดใช้งาน">
          <p class="text-lg font-semibold text-ink">{activeCount()} รายการ</p>
        </StatCard>
        <StatCard label="การแก้ไขที่รอเผยแพร่">
          <p class="text-lg font-semibold text-ink">{changedCount()} รายการ</p>
        </StatCard>
      </div>

      <div class="flex flex-col gap-3 rounded-card bg-white p-4 shadow-card sm:p-5">
        <h2 class="text-base font-semibold text-ink">Sections ที่เผยแพร่อยู่ในปัจจุบัน</h2>
        <Show when={store.publishedSections().length > 0} fallback={<p class="py-6 text-center text-sm text-ink-gray">ยังไม่มี Section — เพิ่ม Section เพื่อเริ่มจัดการ Homepage</p>}>
          <div class="flex flex-col gap-2">
            <For each={store.publishedSections()}>
              {(section) => (
                <div class="flex items-center gap-3 rounded-card border border-surface-gray p-3">
                  <div class="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-media bg-surface-gray/60 text-ink-placeholder">
                    <Show when={section.banners.desktop} fallback={<ImageIcon class="size-4" />}>
                      <img src={section.banners.desktop} alt="" class="size-full object-cover" />
                    </Show>
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-sm font-medium text-ink">{section.name || "(ไม่มีชื่อ Section)"}</p>
                    <p class="text-xs text-ink-gray">{HOMEPAGE_SECTION_TYPE_META[section.type].label}</p>
                  </div>
                  <StatusBadge tone={section.enabled ? "success" : "neutral"}>{section.enabled ? "เปิดใช้งาน" : "ปิดใช้งาน"}</StatusBadge>
                </div>
              )}
            </For>
          </div>
        </Show>
      </div>
    </div>
  );
}

function StatCard(props: { label: string; children: import("solid-js").JSX.Element }) {
  return (
    <div class="flex flex-col gap-2 rounded-card bg-white p-4 shadow-card">
      <p class="text-xs font-semibold uppercase tracking-wide text-ink-placeholder">{props.label}</p>
      {props.children}
    </div>
  );
}
