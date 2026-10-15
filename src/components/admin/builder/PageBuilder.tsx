import { createMemo, createSignal, For, on, createEffect, onCleanup, onMount, Show, untrack, type JSX } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { Button } from "~/components/shared/Button";
import { ChevronIcon } from "~/components/shared/ChevronIcon";
import { SheetModal } from "~/components/shared/SheetModal";
import { StatusBadge } from "~/components/admin/StatusBadge";
import { ConfirmDialog } from "~/components/admin/ConfirmDialog";
import { CloseXIcon, EyeIcon, WarningTriangleIcon, LayersIcon } from "~/components/admin/icons";
import { BuiltinSectionForm, HomepageSectionForm, sectionFieldErrors } from "~/components/admin/content/HomepageSectionForm";
import { landingPagePublishErrors, landingPagePublishStatus } from "~/components/admin/content/landingPagePublish";
import { useAdminContent } from "~/lib/adminContentStore";
import { PROMOTION_PAGE_STATUS_META, promotionPageHref, validatePublishRequirements, type PromotionPage } from "~/lib/adminContent";
import { formatMarketingDateTime } from "~/lib/adminMarketing";
import { emptyBanners, isBuiltinSectionType, type HomepageSection, type HomepageSectionType } from "~/lib/pageSections";
import { writePreviewDraft } from "~/lib/adminPreviewDraft";
import { pushToast } from "~/lib/toast";
import { BuilderCanvas, DEVICE_LABEL, DEVICE_WIDTH, type BuilderDevice, type SectionAction } from "./BuilderCanvas";
import { InsertMenu, LayersList, LibraryPanel, PanelSection, useDisclosure } from "./BuilderPanels";
import { SectionTypeIcon } from "~/components/admin/content/SectionTypeIcon";
import { createBuilderSection, duplicateBuilderSection, sectionTypeLabel } from "./builderLibrary";
import { createDragController, createSectionHistory, formatSavedTime, moveTargetIndex, type DragPayload, type DropTarget } from "./builderState";

const AUTOSAVE_MS = 2000;
type Issue = { message: string; sectionId?: string };

const sameSections = (a: HomepageSection[], b: HomepageSection[]) => JSON.stringify(a) === JSON.stringify(b);

function UndoIcon(props: { class?: string; redo?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" class={props.class ?? "size-5"} fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style={props.redo ? { transform: "scaleX(-1)" } : undefined}>
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
    </svg>
  );
}

/**
 * ตัวออกแบบหน้า: full-screen page builder for one หน้าแคมเปญ / หน้าแรก.
 *
 * - Edits live in an in-memory undo/redo history and autosave 2s after the
 *   last change: a page still in แบบร่าง saves straight into its record; a
 *   page that has been published saves into a separate working copy
 *   (`useAdminContent().saveWorkingCopy`) the storefront never reads, resumed
 *   the next time the builder opens.
 * - "ตกลงและเผยแพร่" runs the same publish checks as the edit form; problems
 *   list in a panel and clicking one selects the broken section.
 * - "ทิ้งการแก้ไข" drops the working copy and goes back to the live sections.
 * - lg and up: library + layers | canvas | settings. Below lg: a list mode
 *   (layers with drag handles and "+" gaps, tap to edit in a sheet) with a
 *   preview toggle.
 */
export function PageBuilder(props: { page: PromotionPage }) {
  const store = useAdminContent();
  const navigate = useNavigate();
  const pageId = props.page.id;
  const page = () => store.getById(pageId) ?? props.page;
  const isDraftPage = () => page().status === "draft";

  const history = createSectionHistory(untrack(() => (!isDraftPage() && store.workingCopy(pageId)?.sections) || page().sections));
  const sections = history.present;

  const [selectedId, setSelectedId] = createSignal<string | null>(null);
  const [device, setDevice] = createSignal<BuilderDevice>("desktop");
  const [saveState, setSaveState] = createSignal<"idle" | "pending" | "saved">("idle");
  const [savedAt, setSavedAt] = createSignal<string | undefined>(untrack(() => (isDraftPage() ? undefined : store.workingCopy(pageId)?.savedAt)));
  const [showIssues, setShowIssues] = createSignal(false);
  const [issuesOpen, setIssuesOpen] = createSignal(false);
  const [publishing, setPublishing] = createSignal(false);
  const [previewOpen, setPreviewOpen] = createSignal(false);
  const [confirmDelete, setConfirmDelete] = createSignal<HomepageSection | null>(null);
  const [confirmDiscard, setConfirmDiscard] = createSignal(false);
  const [wide, setWide] = createSignal(true);
  const [mobileView, setMobileView] = createSignal<"list" | "preview">("list");
  const [editSheetOpen, setEditSheetOpen] = createSignal(false);
  const [insertSheetAt, setInsertSheetAt] = createSignal<number | null>(null);
  const [libraryOpen, toggleLibrary] = useDisclosure(true);
  const [layersOpen, toggleLayers] = useDisclosure(true);
  let canvasApi: { scrollTo: (id: string) => void } | undefined;
  let leftScroller: HTMLDivElement | undefined;
  let listScroller: HTMLDivElement | undefined;

  onMount(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => {
      setWide(mq.matches);
      if (!mq.matches && untrack(device) === "desktop") setDevice("mobile");
    };
    sync();
    mq.addEventListener("change", sync);
    onCleanup(() => mq.removeEventListener("change", sync));
  });

  // ---- autosave -----------------------------------------------------------
  let timer: ReturnType<typeof setTimeout> | undefined;
  let suppressSave = false;
  const writeNow = () => {
    clearTimeout(timer);
    timer = undefined;
    const list = sections();
    if (isDraftPage()) store.saveSections(pageId, list);
    else if (sameSections(list, page().sections)) store.discardWorkingCopy(pageId);
    else store.saveWorkingCopy(pageId, list);
    setSavedAt(new Date().toISOString());
    setSaveState("saved");
  };
  const flush = () => {
    if (saveState() === "pending") writeNow();
  };
  createEffect(
    on(
      sections,
      () => {
        if (suppressSave) {
          suppressSave = false;
          return;
        }
        setSaveState("pending");
        clearTimeout(timer);
        timer = setTimeout(writeNow, AUTOSAVE_MS);
      },
      { defer: true },
    ),
  );
  onMount(() => {
    const beforeUnload = () => flush();
    window.addEventListener("beforeunload", beforeUnload);
    onCleanup(() => window.removeEventListener("beforeunload", beforeUnload));
  });
  onCleanup(flush);

  const hasUnpublished = createMemo(() => !isDraftPage() && !sameSections(sections(), page().sections));
  const saveLabel = () => {
    if (saveState() === "pending") return "กำลังบันทึก...";
    const time = formatSavedTime(savedAt());
    if (time) return `บันทึกแบบร่างแล้ว ${time}`;
    return isDraftPage() ? "แบบร่าง บันทึกอัตโนมัติ" : "ตรงกับหน้าที่เผยแพร่อยู่";
  };

  // ---- edits --------------------------------------------------------------
  const indexOf = (id: string) => sections().findIndex((s) => s.id === id);
  const commit = (next: HomepageSection[], mergeKey?: string) => history.commit(next, mergeKey);
  const updateSection = (id: string, next: HomepageSection) => commit(sections().map((s) => (s.id === id ? next : s)), `edit:${id}`);
  const moveTo = (from: number, to: number) => {
    const list = [...sections()];
    if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return;
    const [moved] = list.splice(from, 1);
    list.splice(to, 0, moved);
    commit(list);
  };
  const insertAt = (index: number, type: HomepageSectionType) => {
    const created = createBuilderSection(type);
    const list = [...sections()];
    list.splice(Math.max(0, Math.min(index, list.length)), 0, created);
    commit(list);
    select(created.id, true);
  };
  const insertAfterSelection = (type: HomepageSectionType) => {
    const at = selectedId() ? indexOf(selectedId()!) + 1 : sections().length;
    insertAt(at > 0 ? at : sections().length, type);
  };
  const removeSection = (id: string) => {
    commit(sections().filter((s) => s.id !== id));
    if (selectedId() === id) setSelectedId(null);
  };
  const runAction = (id: string, action: SectionAction) => {
    const i = indexOf(id);
    if (i < 0) return;
    if (action === "up") moveTo(i, i - 1);
    else if (action === "down") moveTo(i, i + 1);
    else if (action === "toggle") commit(sections().map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)));
    else if (action === "duplicate") {
      const copy = duplicateBuilderSection(sections()[i]);
      const list = [...sections()];
      list.splice(i + 1, 0, copy);
      commit(list);
      select(copy.id, true);
    } else if (action === "delete") setConfirmDelete(sections()[i]);
  };

  const select = (id: string | null, scroll = false) => {
    setSelectedId(id);
    if (id && scroll) requestAnimationFrame(() => requestAnimationFrame(() => canvasApi?.scrollTo(id)));
    if (id && !wide()) setEditSheetOpen(true);
  };

  const handleDrop = (payload: DragPayload, target: DropTarget) => {
    if (payload.kind === "new") {
      insertAt(target.index, payload.type);
      return;
    }
    const from = indexOf(payload.id);
    if (from < 0) return;
    moveTo(from, moveTargetIndex(from, target.index));
  };
  const dnd = createDragController(handleDrop);
  const dragId = () => {
    const d = dnd.drag();
    return d?.payload.kind === "move" ? d.payload.id : null;
  };

  // ---- undo / redo keys ---------------------------------------------------
  const undo = () => {
    if (history.undo()) pruneSelection();
  };
  const redo = () => {
    if (history.redo()) pruneSelection();
  };
  const pruneSelection = () => {
    if (selectedId() && indexOf(selectedId()!) < 0) setSelectedId(null);
  };
  onMount(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
      const mod = e.metaKey || e.ctrlKey;
      if (mod && !typing && (e.key === "z" || e.key === "Z")) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (mod && !typing && (e.key === "y" || e.key === "Y")) {
        e.preventDefault();
        redo();
      } else if (mod && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        saveDraftNow();
      } else if (!typing && e.key === "Escape" && !previewOpen()) {
        setSelectedId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    onCleanup(() => window.removeEventListener("keydown", onKey));
  });

  // ---- publish / discard --------------------------------------------------
  const issues = createMemo<Issue[]>(() => {
    const list = sections();
    const out: Issue[] = [];
    // Page-level rules only: section media is checked per section below, so it can point at the section.
    const pageOnly = validatePublishRequirements({ ...page(), sections: list.map((s) => ({ ...s, assets: [], banners: emptyBanners() })) });
    for (const message of pageOnly) out.push({ message });
    if (list.length > 0 && !page().isHomepage && !list.some((s) => s.enabled)) out.push({ message: "กรุณาเปิดแสดงส่วนเนื้อหาอย่างน้อย 1 ส่วน" });
    for (const s of list) {
      if (!s.enabled) continue;
      for (const message of Object.values(sectionFieldErrors(s, { requireFutureEnd: true }))) out.push({ message: `${s.name || sectionTypeLabel(s.type)}: ${message}`, sectionId: s.id });
    }
    if (out.length === 0) for (const message of landingPagePublishErrors({ ...page(), sections: list })) out.push({ message });
    return out;
  });
  const errorIds = createMemo(() => new Set(showIssues() ? issues().flatMap((i) => (i.sectionId ? [i.sectionId] : [])) : []));

  const saveDraftNow = () => {
    writeNow();
    pushToast(isDraftPage() ? "บันทึกแบบร่างแล้ว ยังไม่แสดงบนหน้าร้าน" : "บันทึกแบบร่างแล้ว หน้าร้านยังแสดงเวอร์ชันเดิมจนกว่าจะเผยแพร่", "success");
  };

  const publish = async () => {
    flush();
    setShowIssues(true);
    if (issues().length > 0) {
      setIssuesOpen(true);
      pushToast(`ยังเผยแพร่ไม่ได้ ยังขาดข้อมูล ${issues().length} รายการ`, "error");
      return;
    }
    const current = page();
    const status = current.status === "draft" || current.status === "unpublished" ? landingPagePublishStatus(current) : current.status;
    setPublishing(true);
    try {
      await store.publishSections(pageId, sections(), status);
      setSavedAt(undefined);
      setSaveState("idle");
      setShowIssues(false);
      setIssuesOpen(false);
      pushToast(status === "scheduled" ? "ตั้งเวลาเผยแพร่หน้าแล้ว หน้าจะแสดงเองเมื่อถึงวันเริ่ม" : "เผยแพร่หน้าเรียบร้อยแล้ว", "success");
    } catch {
      pushToast("เผยแพร่ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง", "error");
    } finally {
      setPublishing(false);
    }
  };

  const discard = () => {
    clearTimeout(timer);
    timer = undefined;
    store.discardWorkingCopy(pageId);
    suppressSave = true;
    history.reset(page().sections);
    setSelectedId(null);
    setSavedAt(undefined);
    setSaveState("idle");
    setShowIssues(false);
    setConfirmDiscard(false);
    pushToast("ทิ้งการแก้ไขแล้ว กลับไปใช้เวอร์ชันที่เผยแพร่อยู่", "success");
  };
  const canDiscard = () => !isDraftPage() && (hasUnpublished() || !!store.workingCopy(pageId));

  const goBack = () => {
    flush();
    navigate(`/admin/promotion-pages/${pageId}`);
  };

  const openIssue = (issue: Issue) => {
    if (!issue.sectionId) {
      navigate(`/admin/promotion-pages/${pageId}/edit`);
      return;
    }
    setIssuesOpen(false);
    if (!wide()) setMobileView("list");
    select(issue.sectionId, true);
  };

  const selectedSection = () => (selectedId() ? sections().find((s) => s.id === selectedId()) : undefined);
  const statusMeta = () => PROMOTION_PAGE_STATUS_META[page().status];

  // ---- pieces -------------------------------------------------------------
  const iconButton = "flex size-10 items-center justify-center rounded-pill text-ink-gray hover:bg-surface-pink hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent";

  const DeviceSwitch = () => (
    <div class="flex items-center gap-1 rounded-pill bg-surface-gray p-1 text-sm">
      <For each={["desktop", "tablet", "mobile"] as BuilderDevice[]}>
        {(d) => (
          <button
            type="button"
            onClick={() => setDevice(d)}
            aria-pressed={device() === d}
            class={`min-h-8 rounded-pill px-3 font-medium transition-colors duration-150 ${device() === d ? "bg-surface-card text-ink shadow-card" : "text-ink-gray"}`}
          >
            {DEVICE_LABEL[d]}
          </button>
        )}
      </For>
    </div>
  );

  const IssuesButton = () => (
    <Show when={showIssues() && issues().length > 0}>
      <div class="relative">
        <button
          type="button"
          onClick={() => setIssuesOpen((v) => !v)}
          class="flex min-h-10 items-center gap-1.5 rounded-pill bg-danger-soft px-3 text-sm font-medium text-danger-strong"
        >
          <WarningTriangleIcon class="size-4" /> ต้องแก้ {issues().length} รายการ
        </button>
        <Show when={issuesOpen()}>
          <div class="absolute right-0 top-full z-40 mt-2 w-[min(360px,calc(100vw-24px))] rounded-card border border-border bg-surface-card p-2 shadow-card">
            <div class="flex items-center justify-between px-2 pb-1">
              <p class="text-sm font-semibold text-ink">ยังเผยแพร่ไม่ได้</p>
              <button type="button" aria-label="ปิด" onClick={() => setIssuesOpen(false)} class="flex size-8 items-center justify-center rounded-pill text-ink-gray hover:bg-surface-pink">
                <CloseXIcon class="size-3.5" />
              </button>
            </div>
            <div class="flex max-h-[50vh] flex-col overflow-y-auto">
              <For each={issues()}>
                {(issue) => (
                  <button type="button" onClick={() => openIssue(issue)} class="flex items-start gap-2 rounded-card px-2 py-2 text-left text-sm font-normal text-ink hover:bg-surface-pink">
                    <span class="mt-2 size-1.5 shrink-0 rounded-pill bg-system-red" />
                    <span class="min-w-0 flex-1">
                      {issue.message}
                      <span class="block text-xs text-ink-gray">{issue.sectionId ? "กดเพื่อไปที่ส่วนนี้" : "แก้ในหน้าตั้งค่าหน้า"}</span>
                    </span>
                  </button>
                )}
              </For>
            </div>
          </div>
        </Show>
      </div>
    </Show>
  );

  const TopBar = () => (
    <header class="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-border bg-surface-card px-3 py-2 lg:flex-nowrap lg:px-4">
      <button type="button" onClick={goBack} aria-label="กลับ" class={iconButton}>
        <ChevronIcon direction="left" class="size-6" />
      </button>
      <div class="flex min-w-0 flex-1 flex-col lg:flex-initial">
        <div class="flex min-w-0 items-center gap-2">
          <p class="truncate text-base font-semibold text-ink lg:max-w-[260px]">{page().name}</p>
          <StatusBadge tone={statusMeta().tone} class="shrink-0">{statusMeta().label}</StatusBadge>
        </div>
        <p class="truncate text-xs text-ink-gray" aria-live="polite">
          {saveLabel()}
          <Show when={hasUnpublished()}> มีการแก้ไขที่ยังไม่เผยแพร่</Show>
        </p>
      </div>
      <div class="flex items-center gap-0.5">
        <button type="button" onClick={undo} disabled={!history.canUndo()} aria-label="เลิกทำ" title="เลิกทำ (Ctrl/Cmd+Z)" class={iconButton}>
          <UndoIcon />
        </button>
        <button type="button" onClick={redo} disabled={!history.canRedo()} aria-label="ทำซ้ำ" title="ทำซ้ำ (Shift+Ctrl/Cmd+Z)" class={iconButton}>
          <UndoIcon redo />
        </button>
      </div>
      <Show when={wide()}>
        <div class="flex flex-1 justify-center">
          <DeviceSwitch />
        </div>
      </Show>
      <div class="flex w-full flex-wrap items-center justify-end gap-2 lg:w-auto lg:flex-nowrap">
        <IssuesButton />
        <Button type="button" variant="outline" size="sm" class="min-h-10" onClick={() => setPreviewOpen(true)}>
          <EyeIcon class="size-4" /> ดูตัวอย่าง
        </Button>
        <Show when={canDiscard()}>
          <button type="button" onClick={() => setConfirmDiscard(true)} class="min-h-10 rounded-pill px-3 text-sm font-medium text-ink-gray hover:bg-danger-soft hover:text-danger-strong">
            ทิ้งการแก้ไข
          </button>
        </Show>
        <Button type="button" variant="outline" size="sm" class="min-h-10" onClick={saveDraftNow}>
          บันทึกแบบร่าง
        </Button>
        <Button type="button" variant="primary" size="sm" class="min-h-10" loading={publishing()} disabled={page().status === "published" && !hasUnpublished()} onClick={publish}>
          {publishing() ? "กำลังเผยแพร่..." : "ตกลงและเผยแพร่"}
        </Button>
      </div>
    </header>
  );

  const SectionSettings = (p: { section: () => HomepageSection; inSheet?: boolean }) => (
    <div class="flex flex-col">
      <Show when={!p.inSheet}>
        <div class="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-surface-card px-4 py-3">
          <span class="text-brand-pink">
            <SectionTypeIcon type={p.section().type} class="size-5" />
          </span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-semibold text-ink">{p.section().name || sectionTypeLabel(p.section().type)}</p>
            <p class="text-xs text-ink-gray">{sectionTypeLabel(p.section().type)}</p>
          </div>
          <button type="button" aria-label="ปิดการตั้งค่าส่วน" onClick={() => setSelectedId(null)} class="flex size-9 items-center justify-center rounded-pill text-ink-gray hover:bg-surface-pink">
            <CloseXIcon class="size-3.5" />
          </button>
        </div>
      </Show>
      <Show when={!p.section().enabled}>
        <p class="mx-4 mt-3 rounded-card bg-surface-gray px-3 py-2 text-xs text-ink-gray">ส่วนนี้ซ่อนอยู่ ไม่แสดงบนหน้าร้าน</p>
      </Show>
      <Show
        when={isBuiltinSectionType(p.section().type)}
        fallback={<HomepageSectionForm section={p.section()} onChange={(next) => updateSection(p.section().id, next)} errors={showIssues() ? sectionFieldErrors(p.section(), { requireFutureEnd: true }) : undefined} />}
      >
        <BuiltinSectionForm section={p.section()} onChange={(next) => updateSection(p.section().id, next)} />
      </Show>
    </div>
  );

  const PageSettings = () => (
    <div class="flex flex-col gap-4 p-4">
      <div>
        <p class="text-base font-semibold text-ink">ตั้งค่าหน้า</p>
        <p class="mt-1 text-sm text-ink-gray">คลิกส่วนบนหน้าจอเพื่อแก้ไขเนื้อหาของส่วนนั้น ลากส่วนจากคลังด้านซ้ายมาวาง หรือกด + ระหว่างส่วนเพื่อเพิ่ม</p>
      </div>
      <dl class="flex flex-col gap-3 rounded-card bg-surface-gray/60 p-3 text-sm">
        <Row label="ชื่อหน้า">{page().name}</Row>
        <Row label="ลิงก์หน้าร้าน">{promotionPageHref(page())}</Row>
        <Row label="สถานะ">
          <StatusBadge tone={statusMeta().tone}>{statusMeta().label}</StatusBadge>
        </Row>
        <Row label="ช่วงเวลาแสดง">
          {page().startDate ? formatMarketingDateTime(page().startDate, page().startTime) : "ไม่กำหนด"}
          {" - "}
          {page().endDate ? formatMarketingDateTime(page().endDate, page().endTime) : "ไม่กำหนด"}
        </Row>
        <Row label="จำนวนส่วน">
          {sections().length} ส่วน (แสดง {sections().filter((s) => s.enabled).length} ส่วน)
        </Row>
      </dl>
      <Button type="button" variant="outline" onClick={() => { flush(); navigate(`/admin/promotion-pages/${pageId}/edit`); }}>
        แก้ไขการตั้งค่าหน้า
      </Button>
      <Show when={!isDraftPage()}>
        <p class="text-xs text-ink-gray">หน้านี้เผยแพร่แล้ว การแก้ไขในตัวออกแบบจะบันทึกเป็นแบบร่างแยกไว้ หน้าร้านยังแสดงเวอร์ชันเดิมจนกว่าจะกด ตกลงและเผยแพร่</p>
      </Show>
    </div>
  );

  const canvas = () => (
    <BuilderCanvas
      sections={sections()}
      device={device()}
      homepage={page().isHomepage}
      selectedId={selectedId()}
      errorIds={errorIds()}
      dropTarget={dnd.drag()?.target ?? null}
      dragId={dragId()}
      dragging={!!dnd.drag()}
      registerZone={(hit, scroller) => dnd.registerZone("canvas", hit, scroller)}
      onStartDrag={dnd.start}
      consumedClick={dnd.consumedClick}
      onSelect={(id) => select(id)}
      onAction={runAction}
      onInsert={insertAt}
      ref={(api) => (canvasApi = api)}
      emptyHint={!page().isHomepage ? "ถ้ายังไม่มีส่วน หน้าร้านจะแสดงแบนเนอร์หลักและสินค้าจากการตั้งค่าหน้าแทน" : undefined}
    />
  );

  return (
    <div class="fixed inset-0 z-30 flex flex-col bg-surface-gray text-ink">
      <TopBar />

      <Show
        when={wide()}
        fallback={
          <>
            <div class="flex shrink-0 items-center gap-2 border-b border-border bg-surface-card px-3 py-2">
              <div class="flex flex-1 items-center gap-1 rounded-pill bg-surface-gray p-1 text-sm">
                <button type="button" onClick={() => setMobileView("list")} class={`min-h-9 flex-1 rounded-pill px-3 font-medium ${mobileView() === "list" ? "bg-surface-card text-ink shadow-card" : "text-ink-gray"}`}>
                  รายการส่วน ({sections().length})
                </button>
                <button type="button" onClick={() => setMobileView("preview")} class={`min-h-9 flex-1 rounded-pill px-3 font-medium ${mobileView() === "preview" ? "bg-surface-card text-ink shadow-card" : "text-ink-gray"}`}>
                  ตัวอย่าง
                </button>
              </div>
              <Show when={mobileView() === "preview"}>
                <select
                  value={device()}
                  onChange={(e) => setDevice(e.currentTarget.value as BuilderDevice)}
                  aria-label="ขนาดหน้าจอ"
                  class="h-10 rounded-pill border border-border bg-surface-card px-3 text-sm text-ink"
                >
                  <For each={["mobile", "tablet", "desktop"] as BuilderDevice[]}>{(d) => <option value={d}>{DEVICE_LABEL[d]}</option>}</For>
                </select>
              </Show>
            </div>
            <Show
              when={mobileView() === "list"}
              fallback={<div class="min-h-0 flex-1">{canvas()}</div>}
            >
              <div ref={listScroller} class="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-6">
                <div class="mx-auto flex max-w-2xl flex-col gap-2">
                  <Show when={sections().length === 0}>
                    <div class="flex flex-col items-center gap-2 rounded-card border-2 border-dashed border-brand-pink/40 bg-surface-card px-6 py-10 text-center">
                      <LayersIcon class="size-8 text-brand-pink" />
                      <p class="text-sm font-medium text-ink">ยังไม่มีส่วนในหน้านี้</p>
                      <p class="text-xs text-ink-gray">กด + เพื่อเพิ่มส่วนแรก</p>
                    </div>
                  </Show>
                  <LayersList
                    full
                    sections={sections()}
                    selectedId={selectedId()}
                    errorIds={errorIds()}
                    dropTarget={dnd.drag()?.target ?? null}
                    dragId={dragId()}
                    registerZone={(hit, scroller) => dnd.registerZone("layers", hit, scroller)}
                    scroller={() => listScroller}
                    onStartDrag={dnd.start}
                    consumedClick={dnd.consumedClick}
                    onSelect={(id) => select(id)}
                    onToggle={(id) => runAction(id, "toggle")}
                    onMove={(id, dir) => runAction(id, dir < 0 ? "up" : "down")}
                    onDuplicate={(id) => runAction(id, "duplicate")}
                    onDelete={(id) => runAction(id, "delete")}
                    onInsertAt={(index) => setInsertSheetAt(index)}
                  />
                </div>
              </div>
            </Show>

            <SheetModal
              open={editSheetOpen() && !!selectedSection()}
              onOpenChange={(open) => {
                setEditSheetOpen(open);
                if (!open) setSelectedId(null);
              }}
              title={selectedSection()?.name || (selectedSection() ? sectionTypeLabel(selectedSection()!.type) : "")}
              description={selectedSection() ? sectionTypeLabel(selectedSection()!.type) : undefined}
            >
              <div class="min-h-0 flex-1 overflow-y-auto">
                <Show when={selectedId()} keyed>
                  {(id) => <Show when={sections().find((s) => s.id === id)}>{(sec) => <SectionSettings section={sec} inSheet />}</Show>}
                </Show>
              </div>
            </SheetModal>
            <SheetModal open={insertSheetAt() !== null} onOpenChange={(open) => !open && setInsertSheetAt(null)} title="เพิ่มส่วน" height="auto">
              <div class="min-h-0 flex-1 overflow-y-auto px-4 py-2">
                <InsertMenu
                  onPick={(type) => {
                    const at = insertSheetAt() ?? sections().length;
                    setInsertSheetAt(null);
                    insertAt(at, type);
                  }}
                />
              </div>
            </SheetModal>
          </>
        }
      >
        <div class="flex min-h-0 flex-1">
          <aside ref={leftScroller} class="flex w-[272px] shrink-0 flex-col overflow-y-auto border-r border-border bg-surface-card">
            <PanelSection title="คลังส่วน" open={libraryOpen()} onToggle={toggleLibrary}>
              <p class="mb-3 text-xs text-ink-gray">ลากไปวางบนหน้า หรือคลิกเพื่อเพิ่มต่อจากส่วนที่เลือก</p>
              <LibraryPanel onStartDrag={dnd.start} onPick={insertAfterSelection} consumedClick={dnd.consumedClick} />
            </PanelSection>
            <div class="border-t border-border" />
            <PanelSection title="รายการส่วน" count={sections().length} open={layersOpen()} onToggle={toggleLayers}>
              <Show when={sections().length > 0} fallback={<p class="text-xs text-ink-gray">ยังไม่มีส่วน</p>}>
                <LayersList
                  sections={sections()}
                  selectedId={selectedId()}
                  errorIds={errorIds()}
                  dropTarget={dnd.drag()?.target ?? null}
                  dragId={dragId()}
                  registerZone={(hit, scroller) => dnd.registerZone("layers", hit, scroller)}
                  scroller={() => leftScroller}
                  onStartDrag={dnd.start}
                  consumedClick={dnd.consumedClick}
                  onSelect={(id) => select(id, true)}
                  onToggle={(id) => runAction(id, "toggle")}
                />
              </Show>
            </PanelSection>
          </aside>

          <main class="min-w-0 flex-1">{canvas()}</main>

          <aside class="w-[360px] shrink-0 overflow-y-auto border-l border-border bg-surface-card xl:w-[400px]">
            <Show when={selectedId()} keyed fallback={<PageSettings />}>
              {(id) => <Show when={sections().find((s) => s.id === id)} fallback={<PageSettings />}>{(sec) => <SectionSettings section={sec} />}</Show>}
            </Show>
          </aside>
        </div>
      </Show>

      {/* Drag ghost */}
      <Show when={dnd.drag()}>
        {(d) => (
          <div class="pointer-events-none fixed z-50 flex items-center gap-2 rounded-pill bg-brand-pink px-3 py-1.5 text-sm font-medium text-white shadow-card" style={{ left: `${d().x + 12}px`, top: `${d().y + 12}px` }}>
            {d().payload.label}
            <Show when={!d().target}>
              <span class="text-xs font-normal text-white/80">ปล่อยบนหน้าเพื่อวาง</span>
            </Show>
          </div>
        )}
      </Show>

      <Show when={previewOpen()}>
        <BuilderPreview page={{ ...page(), sections: sections() }} initialDevice={device()} onClose={() => setPreviewOpen(false)} />
      </Show>

      <ConfirmDialog
        open={confirmDelete() !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title="ลบส่วนนี้?"
        description={`ลบ "${confirmDelete()?.name ?? ""}" ออกจากหน้านี้ กดเลิกทำได้ถ้าเปลี่ยนใจ`}
        confirmLabel="ลบส่วน"
        tone="danger"
        onConfirm={() => {
          const s = confirmDelete();
          if (s) removeSection(s.id);
          setConfirmDelete(null);
          setEditSheetOpen(false);
        }}
      />
      <ConfirmDialog
        open={confirmDiscard()}
        onOpenChange={setConfirmDiscard}
        title="ทิ้งการแก้ไขทั้งหมด?"
        description="การแก้ไขที่ยังไม่เผยแพร่จะหายไป หน้าจะกลับไปเป็นเวอร์ชันที่แสดงบนหน้าร้านตอนนี้"
        confirmLabel="ทิ้งการแก้ไข"
        tone="danger"
        onConfirm={discard}
      />
    </div>
  );
}

function Row(props: { label: string; children: JSX.Element }) {
  return (
    <div class="flex flex-col gap-0.5">
      <dt class="text-xs text-ink-gray">{props.label}</dt>
      <dd class="break-words text-ink">{props.children}</dd>
    </div>
  );
}

/** ดูตัวอย่าง: the real storefront page (Header, Footer, working carousels and tabs) with the current edits, at the chosen device width. */
function BuilderPreview(props: { page: PromotionPage; initialDevice: BuilderDevice; onClose: () => void }) {
  const [device, setDevice] = createSignal<BuilderDevice>(props.initialDevice);
  const draftId = writePreviewDraft("promotion-page", untrack(() => props.page));
  const src = `/admin/preview/promotion-pages/${props.page.id}?embed=1${draftId ? `&draft=${draftId}` : ""}`;
  onMount(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && props.onClose();
    window.addEventListener("keydown", onKey);
    onCleanup(() => window.removeEventListener("keydown", onKey));
  });
  return (
    <div class="fixed inset-0 z-40 flex flex-col bg-surface-gray" role="dialog" aria-label="ดูตัวอย่างหน้า">
      <div class="flex shrink-0 items-center gap-3 border-b border-border bg-surface-card px-3 py-2 lg:px-4">
        <p class="min-w-0 flex-1 truncate text-sm font-semibold text-ink">ตัวอย่าง {props.page.name}</p>
        <div class="flex items-center gap-1 rounded-pill bg-surface-gray p-1 text-sm">
          <For each={["desktop", "tablet", "mobile"] as BuilderDevice[]}>
            {(d) => (
              <button type="button" onClick={() => setDevice(d)} class={`min-h-8 rounded-pill px-3 font-medium ${device() === d ? "bg-surface-card text-ink shadow-card" : "text-ink-gray"}`}>
                {DEVICE_LABEL[d]}
              </button>
            )}
          </For>
        </div>
        <button type="button" onClick={props.onClose} aria-label="ปิดตัวอย่าง" class="flex size-10 items-center justify-center rounded-pill text-ink-gray hover:bg-surface-pink">
          <CloseXIcon class="size-4" />
        </button>
      </div>
      <div class="flex min-h-0 flex-1 justify-center overflow-auto p-0 sm:p-4">
        <iframe
          src={src}
          title="ตัวอย่างหน้า"
          class="h-full max-w-full shrink-0 border-0 bg-white shadow-card"
          classList={{ "sm:rounded-card": device() !== "desktop" }}
          style={{ width: device() === "desktop" ? "100%" : `${DEVICE_WIDTH[device()]}px` }}
        />
      </div>
    </div>
  );
}
