import { createMemo, createSignal, Show } from "solid-js";
import { useNavigate, useParams } from "@solidjs/router";
import { Breadcrumb } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";
import { Button } from "~/components/shared/Button";
import { StatusBadge } from "~/components/admin/StatusBadge";
import { EmptyState } from "~/components/admin/EmptyState";
import { ConfirmDialog } from "~/components/admin/ConfirmDialog";
import { BannerRowActionsMenu } from "~/components/admin/content/BannerRowActionsMenu";
import { ContentIcon, ImageIcon } from "~/components/admin/icons";
import { formatMarketingDate } from "~/lib/adminMarketing";
import { resolveHomepageDestinationHref } from "~/lib/adminHomepage";
import { useAdminDestinationLookups } from "~/lib/adminDestinationLookups";
import { BANNER_STATUS_META, BANNER_PLACEMENT_META, validateBannerPublish } from "~/lib/adminBanners";
import { useAdminBanners } from "~/lib/adminBannerStore";
import { pushToast } from "~/lib/toast";

/** Header / Banner Images / Destination / Schedule / Metadata, same static-sections shape `promotion-pages/[id]/index.tsx` already established. */
export default function AdminBannerDetailPage() {
  const params = useParams<{ id: string }>();
  const store = useAdminBanners();
  const lookups = useAdminDestinationLookups();
  const navigate = useNavigate();
  const banner = createMemo(() => store.getById(params.id));

  const [confirmDelete, setConfirmDelete] = createSignal(false);
  const [confirmToggle, setConfirmToggle] = createSignal(false);
  const [actionLoading, setActionLoading] = createSignal(false);

  const confirmToggleAction = async () => {
    const current = banner();
    if (!current) return;
    if (current.status !== "published") {
      const errs = validateBannerPublish(current);
      if (errs.length > 0) {
        setConfirmToggle(false);
        pushToast(`ไม่สามารถเผยแพร่ได้: ${errs[0]}`, "error");
        return;
      }
    }
    setActionLoading(true);
    await store.setStatus(current.id, current.status === "published" ? "unpublished" : "published");
    setActionLoading(false);
    setConfirmToggle(false);
    pushToast(current.status === "published" ? "ยกเลิกการเผยแพร่แล้ว" : "เผยแพร่ Banner แล้ว", "success");
  };

  const confirmDeleteAction = async () => {
    const current = banner();
    if (!current) return;
    setActionLoading(true);
    await store.remove(current.id);
    setActionLoading(false);
    setConfirmDelete(false);
    pushToast(`ลบ "${current.name}" เรียบร้อยแล้ว`, "error");
    navigate("/admin/content/banners");
  };

  return (
    <Show
      when={banner()}
      fallback={
        <div class="flex flex-col gap-6">
          <Breadcrumb items={[{ label: "แดชบอร์ด", href: "/admin" }, { label: "จัดการเนื้อหา", href: "/admin/promotion-pages" }, { label: "Banners", href: "/admin/content/banners" }]} />
          <EmptyState icon={<ContentIcon />} title="ไม่พบ Banner นี้" description="Banner นี้อาจถูกลบไปแล้ว หรือลิงก์ไม่ถูกต้อง" actionLabel="กลับไปหน้ารายการ" onAction={() => navigate("/admin/content/banners")} class="bg-surface-card shadow-card" />
        </div>
      }
    >
      {(current) => {
        const b = current;
        const destinationHref = () => resolveHomepageDestinationHref(b().destination, lookups);
        /**
         * CHARMISS CMS — ADMIN ONLY §4 — Full Page Preview for a Banner
         * means opening the real page its Destination points to, rendered
         * by the real Frontend (no synthetic "Banner page" invented). A
         * Landing Page destination goes through the existing Admin preview
         * route (`/admin/preview/promotion-pages/:id`, same one
         * `promotion-pages/[id]/index.tsx` already uses) so Draft/Scheduled
         * pages still preview correctly — the public `/promotion/:slug`
         * route 404s anything not currently visible. Every other
         * destination kind (product/category/collection/internal/external)
         * has no draft state, so it opens the real resolved href directly.
         */
        const openDestinationPreview = () => {
          const dest = b().destination;
          if (dest.type === "landingPage") {
            window.open(`/admin/preview/promotion-pages/${dest.landingPageId}`, "_blank");
            return;
          }
          const href = destinationHref();
          if (href) window.open(href, "_blank");
        };

        return (
          <div class="flex flex-col gap-6">
            <Breadcrumb
              items={[
                { label: "แดชบอร์ด", href: "/admin" },
                { label: "จัดการเนื้อหา", href: "/admin/promotion-pages" },
                { label: "Banners", href: "/admin/content/banners" },
                { label: b().name },
              ]}
            />
            <PageHeader
              title={b().name}
              description={BANNER_PLACEMENT_META[b().placement].label}
              actions={
                <div class="flex items-center gap-2">
                  <Show when={b().destination.type !== "none"}>
                    <Button variant="outline" onClick={openDestinationPreview}>
                      ดูตัวอย่างหน้าปลายทาง
                    </Button>
                  </Show>
                  <Button variant="primary" href={`/admin/content/banners/${b().id}/edit`}>
                    แก้ไข
                  </Button>
                  <BannerRowActionsMenu
                    id={b().id}
                    name={b().name}
                    isPublished={b().status === "published"}
                    hideView
                    onTogglePublish={() => setConfirmToggle(true)}
                    onDelete={() => setConfirmDelete(true)}
                    triggerClass="flex size-11 items-center justify-center rounded-pill border border-border text-ink-gray hover:bg-surface-pink"
                  />
                </div>
              }
            />

            <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div class="flex flex-col gap-6 lg:col-span-2">
                <Section title="Banner">
                  <div class="aspect-[16/6] w-full overflow-hidden rounded-media bg-surface-gray/60">
                    <Show when={b().banners.desktop} fallback={<div class="flex size-full items-center justify-center text-ink-placeholder"><ImageIcon class="size-8" /></div>}>
                      <img src={b().banners.desktop} alt="" class="size-full object-cover" />
                    </Show>
                  </div>
                  <div class="grid grid-cols-2 gap-3">
                    <BannerThumb label="Tablet Banner" src={b().banners.tablet} />
                    <BannerThumb label="Mobile Banner" src={b().banners.mobile} />
                  </div>
                </Section>

                <Section title="Destination">
                  <Row label="ปลายทาง" value={destinationHref() ?? "—"} />
                </Section>
              </div>

              <div class="flex flex-col gap-6">
                <Section title="สถานะ">
                  <StatusBadge tone={BANNER_STATUS_META[b().status].tone} class="w-fit">
                    {BANNER_STATUS_META[b().status].label}
                  </StatusBadge>
                </Section>

                <Section title="ระยะเวลา">
                  <Show when={b().startDate && b().endDate} fallback={<p class="text-sm text-ink-gray">ไม่ได้กำหนดระยะเวลา</p>}>
                    <Row label="เริ่ม" value={`${formatMarketingDate(b().startDate)} ${b().startTime}`} />
                    <Row label="สิ้นสุด" value={`${formatMarketingDate(b().endDate)} ${b().endTime}`} />
                  </Show>
                </Section>

                <Section title="ข้อมูลเพิ่มเติม">
                  <Row label="Placement" value={BANNER_PLACEMENT_META[b().placement].label} />
                  <Row label="สร้างเมื่อ" value={b().createdAt} />
                  <Row label="แก้ไขล่าสุด" value={b().updatedAt} />
                </Section>
              </div>
            </div>

            <ConfirmDialog
              open={confirmToggle()}
              onOpenChange={setConfirmToggle}
              title={b().status === "published" ? "ยกเลิกการเผยแพร่ Banner นี้?" : "เผยแพร่ Banner นี้?"}
              description={b().name}
              confirmLabel={b().status === "published" ? "ยกเลิกการเผยแพร่" : "เผยแพร่"}
              loading={actionLoading()}
              onConfirm={confirmToggleAction}
            />

            <ConfirmDialog
              open={confirmDelete()}
              onOpenChange={setConfirmDelete}
              title="ลบ Banner?"
              description={`คุณต้องการลบ "${b().name}" หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`}
              confirmLabel="ลบ"
              tone="danger"
              loading={actionLoading()}
              onConfirm={confirmDeleteAction}
            />
          </div>
        );
      }}
    </Show>
  );
}

function Section(props: { title: string; children: import("solid-js").JSX.Element }) {
  return (
    <div class="flex flex-col gap-3 rounded-card bg-surface-card p-4 shadow-card sm:p-5">
      <h2 class="text-base font-semibold text-ink">{props.title}</h2>
      {props.children}
    </div>
  );
}

function Row(props: { label: string; value: string }) {
  return (
    <div class="flex items-center justify-between gap-3 text-sm">
      <dt class="text-ink-gray">{props.label}</dt>
      <dd class="truncate font-medium text-ink">{props.value}</dd>
    </div>
  );
}

function BannerThumb(props: { label: string; src: string }) {
  return (
    <div class="flex flex-col gap-1.5">
      <p class="text-xs font-semibold uppercase tracking-wide text-ink-placeholder">{props.label}</p>
      <div class="aspect-[16/10] w-full overflow-hidden rounded-media bg-surface-gray/60">
        <Show when={props.src} fallback={<div class="flex size-full items-center justify-center text-ink-placeholder"><ImageIcon class="size-5" /></div>}>
          <img src={props.src} alt="" class="size-full object-cover" />
        </Show>
      </div>
    </div>
  );
}
