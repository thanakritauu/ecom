import { createSignal, For, onMount, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { Button } from "~/components/shared/Button";
import { AdminFloatingBar } from "~/components/admin/AdminFloatingBar";
import { ConfirmDialog } from "~/components/admin/ConfirmDialog";
import { EmptyState } from "~/components/admin/EmptyState";
import { EyeIcon, LayersIcon, PlusIcon } from "~/components/admin/icons";
import { HomepageSectionCard } from "~/components/admin/content/HomepageSectionCard";
import { HomepagePreviewDialog } from "~/components/admin/content/HomepagePreviewDialog";
import { HOMEPAGE_SECTION_TYPE_META, genHomepageSectionId, type HomepageSection, type HomepageSectionType } from "~/lib/adminHomepage";
import { useAdminHomepage } from "~/lib/adminHomepageStore";
import { pushToast } from "~/lib/toast";

const ADD_TYPE_OPTIONS: HomepageSectionType[] = ["hero", "promotion_banner", "product", "campaign", "content", "cta"];
const TODAY_LABEL = "18 ก.ย. 2569";

function blankSection(type: HomepageSectionType): HomepageSection {
  return {
    id: genHomepageSectionId(),
    type,
    name: `${HOMEPAGE_SECTION_TYPE_META[type].label} ใหม่`,
    enabled: true,
    eyebrow: "",
    title: "",
    description: "",
    banners: { desktop: "", tablet: "", mobile: "" },
    cta: { label: "", destination: { type: "none" } },
    contentLayout: "image-text",
    productSource: "manual",
    products: [],
    collectionId: "",
    campaignId: "",
    createdAt: TODAY_LABEL,
    updatedAt: TODAY_LABEL,
  };
}

/**
 * §5-§7/§20/§21/§24 — Section-based editor: one flat, reorderable list of
 * cards (never a long single form). Everything here edits a local working
 * copy seeded once from `store.draftSections()`; "บันทึกแบบร่าง"/"เผยแพร่"
 * are the only two moments that actually write back into the store, same
 * "local buffer + explicit commit" shape `PromotionPageForm` already uses.
 */
export default function AdminHomepageEditPage() {
  const store = useAdminHomepage();
  const navigate = useNavigate();
  const [sections, setSections] = createSignal<HomepageSection[]>([]);
  const [initialized, setInitialized] = createSignal(false);
  const [expandedId, setExpandedId] = createSignal<string | null>(null);
  const [dragIndex, setDragIndex] = createSignal<number | null>(null);
  const [confirmDelete, setConfirmDelete] = createSignal<HomepageSection | null>(null);
  const [saving, setSaving] = createSignal(false);
  const [previewOpen, setPreviewOpen] = createSignal(false);

  onMount(() => {
    setSections(store.draftSections());
    setInitialized(true);
  });

  const updateSection = (id: string, next: HomepageSection) => setSections((list) => list.map((s) => (s.id === id ? next : s)));
  const toggleEnabled = (id: string) => setSections((list) => list.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)));
  const removeSection = (id: string) => setSections((list) => list.filter((s) => s.id !== id));

  const move = (index: number, dir: -1 | 1) => {
    setSections((list) => {
      const target = index + dir;
      if (target < 0 || target >= list.length) return list;
      const next = [...list];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const reorder = (from: number, to: number) => {
    setSections((list) => {
      if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
      const next = [...list];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const addSection = (type: HomepageSectionType) => {
    const created = blankSection(type);
    setSections((list) => [...list, created]);
    setExpandedId(created.id);
  };

  const requestDelete = (s: HomepageSection) => setConfirmDelete(s);
  const confirmDeleteAction = () => {
    const s = confirmDelete();
    if (!s) return;
    removeSection(s.id);
    setConfirmDelete(null);
    pushToast(`ลบ Section "${s.name}" แล้ว`, "error");
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      await store.saveDraft(sections());
      pushToast("บันทึกแบบร่าง Homepage เรียบร้อยแล้ว", "success");
    } catch {
      pushToast("บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง", "error");
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    setSaving(true);
    try {
      await store.publish(sections());
      pushToast("เผยแพร่ Homepage เรียบร้อยแล้ว", "success");
    } catch {
      pushToast("เผยแพร่ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Show when={initialized()} fallback={<div class="p-10 text-center text-sm text-ink-gray">กำลังโหลด...</div>}>
      <div class="flex flex-col gap-6" classList={{ "pb-20": true }}>
        <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "เนื้อหา", href: "/admin/content" }, { label: "Homepage", href: "/admin/content/homepage" }, { label: "แก้ไข" }]} />
        <PageHeader
          title="แก้ไข Homepage"
          description="จัดการ Section, ลำดับ และเนื้อหาของหน้าแรก"
          actions={
            <Button type="button" variant="outline" onClick={() => setPreviewOpen(true)}>
              <EyeIcon class="size-4" /> Preview
            </Button>
          }
        />

        <div class="flex flex-col gap-3 rounded-card bg-white p-4 shadow-card sm:p-5">
          <p class="text-sm font-semibold text-ink">เพิ่ม Section</p>
          <div class="flex flex-wrap gap-2">
            <For each={ADD_TYPE_OPTIONS}>
              {(type) => (
                <Button type="button" variant="outline" size="sm" onClick={() => addSection(type)}>
                  <PlusIcon class="size-3.5" /> {HOMEPAGE_SECTION_TYPE_META[type].label}
                </Button>
              )}
            </For>
          </div>
        </div>

        <Show
          when={sections().length > 0}
          fallback={<EmptyState icon={<LayersIcon />} title="ยังไม่มี Section" description="เพิ่ม Section เพื่อเริ่มจัดการ Homepage" class="bg-white shadow-card" />}
        >
          <div class="flex flex-col gap-3">
            <For each={sections()}>
              {(section, index) => (
                <HomepageSectionCard
                  section={section}
                  index={index()}
                  total={sections().length}
                  expanded={expandedId() === section.id}
                  onToggleExpand={() => setExpandedId((id) => (id === section.id ? null : section.id))}
                  onChange={(next) => updateSection(section.id, next)}
                  onToggleEnabled={() => toggleEnabled(section.id)}
                  onDelete={() => requestDelete(section)}
                  onMove={(dir) => move(index(), dir)}
                  onDragStart={() => setDragIndex(index())}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const from = dragIndex();
                    if (from !== null) reorder(from, index());
                    setDragIndex(null);
                  }}
                />
              )}
            </For>
          </div>
        </Show>

        <AdminFloatingBar>
          <div class="flex w-full flex-wrap justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => navigate("/admin/content/homepage")} disabled={saving()}>
              ยกเลิก
            </Button>
            <Button type="button" variant="outline" onClick={handleSaveDraft} loading={saving()}>
              บันทึกแบบร่าง
            </Button>
            <Button type="button" variant="primary" onClick={handlePublish} loading={saving()}>
              เผยแพร่
            </Button>
          </div>
        </AdminFloatingBar>
        <div class="h-16" aria-hidden="true" />

        <ConfirmDialog
          open={confirmDelete() !== null}
          onOpenChange={(open) => !open && setConfirmDelete(null)}
          title="ลบ Section นี้หรือไม่?"
          description={`ข้อมูลของ Section "${confirmDelete()?.name ?? ""}" จะถูกนำออกจาก Homepage`}
          confirmLabel="ลบ"
          tone="danger"
          onConfirm={confirmDeleteAction}
        />

        <HomepagePreviewDialog open={previewOpen()} onOpenChange={setPreviewOpen} sections={sections()} />
      </div>
    </Show>
  );
}
