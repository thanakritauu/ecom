import { createEffect, createSignal, createUniqueId, on, onCleanup, onMount, Show, type JSX } from "solid-js";
import { isRichTextEmpty, safeHref, sanitizeRichText, toRichHtml } from "~/lib/richText";
import { FieldError, FieldLabel } from "~/components/shared/TextField";

type FormatState = { block: string; bold: boolean; italic: boolean; underline: boolean; ul: boolean; ol: boolean; link: boolean };
const EMPTY_STATE: FormatState = { block: "p", bold: false, italic: false, underline: false, ul: false, ol: false, link: false };

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * "แบบ Word" editor for Admin: a contentEditable body with a toolbar
 * (หัวข้อ, ตัวหนา, ตัวเอียง, ขีดเส้นใต้, รายการ, ลิงก์, แทรกรูป, ล้างรูปแบบ).
 * Text and pictures go in any order. The value is an HTML string already
 * cleaned to the allowed tags (`~/lib/richText`); paste is cleaned the same
 * way. Old plain-text values open as paragraphs. No dependencies: it uses the
 * browser's own editing commands.
 */
export function RichTextEditor(props: {
  value: string;
  onChange: (html: string) => void;
  label?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  placeholder?: string;
  disabled?: boolean;
  /** `data-field` on the wrapper, for the shared form validation scroll. */
  field?: string;
  /** Editing area min height (Tailwind class). */
  minHeightClass?: string;
}) {
  const id = `rte-${createUniqueId()}`;
  const labelId = `${id}-label`;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  let editor!: HTMLDivElement;
  let fileInput!: HTMLInputElement;
  let linkInput: HTMLInputElement | undefined;
  let savedRange: Range | undefined;
  let lastEmitted: string | undefined;

  const [state, setState] = createSignal<FormatState>(EMPTY_STATE);
  const [empty, setEmpty] = createSignal(isRichTextEmpty(props.value));
  const [linkOpen, setLinkOpen] = createSignal(false);
  const [linkUrl, setLinkUrl] = createSignal("");
  const [linkError, setLinkError] = createSignal<string>();

  const load = (value: string) => {
    editor.innerHTML = toRichHtml(value);
    lastEmitted = isRichTextEmpty(value) ? "" : value;
    setEmpty(isRichTextEmpty(value));
  };

  const emit = () => {
    const raw = editor.innerHTML;
    const clean = isRichTextEmpty(raw) ? "" : sanitizeRichText(raw);
    setEmpty(isRichTextEmpty(raw));
    if (clean === lastEmitted) return;
    lastEmitted = clean;
    props.onChange(clean);
  };

  const selectionInEditor = () => {
    const sel = document.getSelection();
    return !!sel && sel.rangeCount > 0 && editor.contains(sel.getRangeAt(0).commonAncestorContainer);
  };

  const refreshState = () => {
    if (!selectionInEditor()) return;
    const q = (cmd: string) => {
      try {
        return document.queryCommandState(cmd);
      } catch {
        return false;
      }
    };
    let block = "p";
    try {
      block = String(document.queryCommandValue("formatBlock") || "p").toLowerCase().replace(/[<>]/g, "");
    } catch {}
    const node = document.getSelection()?.anchorNode;
    const el = node instanceof Element ? node : node?.parentElement;
    setState({
      block,
      bold: q("bold"),
      italic: q("italic"),
      underline: q("underline"),
      ul: q("insertUnorderedList"),
      ol: q("insertOrderedList"),
      link: !!el?.closest("a") && editor.contains(el.closest("a")),
    });
  };

  const saveSelection = () => {
    const sel = document.getSelection();
    if (sel && sel.rangeCount > 0 && editor.contains(sel.getRangeAt(0).commonAncestorContainer)) savedRange = sel.getRangeAt(0).cloneRange();
  };

  const restoreSelection = () => {
    editor.focus({ preventScroll: true });
    const sel = document.getSelection();
    if (!sel) return;
    if (savedRange && editor.contains(savedRange.commonAncestorContainer)) {
      sel.removeAllRanges();
      sel.addRange(savedRange);
    } else if (!selectionInEditor()) {
      // Nothing picked yet: continue at the end.
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  };

  const exec = (cmd: string, value?: string) => {
    if (props.disabled) return;
    restoreSelection();
    document.execCommand(cmd, false, value);
    saveSelection();
    emit();
    refreshState();
  };

  const toggleBlock = (tag: "h2" | "h3") => exec("formatBlock", state().block === tag ? "<p>" : `<${tag}>`);

  const clearFormat = () => {
    exec("removeFormat");
    exec("unlink");
    if (state().ul) exec("insertUnorderedList");
    if (state().ol) exec("insertOrderedList");
    exec("formatBlock", "<p>");
  };

  const insertHtml = (html: string) => {
    if (!html) return;
    restoreSelection();
    document.execCommand("insertHTML", false, html);
    saveSelection();
    emit();
  };

  const insertImages = (files: FileList | File[] | null | undefined) => {
    const images = Array.from(files ?? []).filter((f) => f.type.startsWith("image/"));
    if (images.length === 0) return;
    // Same object-URL convention as the other Admin uploaders. Each picture gets its own paragraph so text can go above and below it.
    insertHtml(images.map((f) => `<p><img src="${escapeHtml(URL.createObjectURL(f))}" alt=""></p>`).join("") + "<p><br></p>");
  };

  const openLink = () => {
    if (props.disabled) return;
    saveSelection();
    const node = document.getSelection()?.anchorNode;
    const el = node instanceof Element ? node : node?.parentElement;
    const a = el?.closest("a");
    setLinkUrl(a && editor.contains(a) ? a.getAttribute("href") ?? "" : "");
    setLinkError(undefined);
    setLinkOpen(true);
    queueMicrotask(() => linkInput?.focus());
  };

  const applyLink = () => {
    const raw = linkUrl().trim();
    const href = safeHref(raw) ?? (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(raw) ? `https://${raw}` : undefined);
    if (!href) {
      setLinkError("ลิงก์ต้องขึ้นต้นด้วย https:// หรือ / (หน้าในเว็บนี้)");
      return;
    }
    setLinkOpen(false);
    restoreSelection();
    const sel = document.getSelection();
    if (sel && sel.isCollapsed) {
      const node = sel.anchorNode;
      const el = node instanceof Element ? node : node?.parentElement;
      const a = el?.closest("a");
      if (a && editor.contains(a)) {
        a.setAttribute("href", href);
        emit();
      } else insertHtml(`<a href="${escapeHtml(href)}">${escapeHtml(raw)}</a>&nbsp;`);
    } else exec("createLink", href);
    refreshState();
  };

  const removeLink = () => {
    setLinkOpen(false);
    exec("unlink");
  };

  const onPaste = (e: ClipboardEvent) => {
    e.preventDefault();
    if (props.disabled) return;
    const data = e.clipboardData;
    if (!data) return;
    const files = Array.from(data.files ?? []).filter((f) => f.type.startsWith("image/"));
    if (files.length > 0) return insertImages(files);
    const html = data.getData("text/html");
    if (html) return insertHtml(sanitizeRichText(html.replace(/^[\s\S]*<body[^>]*>|<\/body>[\s\S]*$/gi, "")));
    const text = data.getData("text/plain");
    if (text) insertHtml(escapeHtml(text).replace(/\r?\n/g, "<br>"));
  };

  const onDrop = (e: DragEvent) => {
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      e.preventDefault();
      if (props.disabled) return;
      // Put the caret where the picture was dropped.
      const doc = document as Document & { caretRangeFromPoint?: (x: number, y: number) => Range | null };
      const range = doc.caretRangeFromPoint?.(e.clientX, e.clientY);
      if (range && editor.contains(range.commonAncestorContainer)) savedRange = range;
      insertImages(files);
    }
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const mod = e.metaKey || e.ctrlKey;
    if (!mod) return;
    const key = e.key.toLowerCase();
    if (key === "k") {
      e.preventDefault();
      openLink();
    }
  };

  onMount(() => {
    load(props.value);
    try {
      document.execCommand("defaultParagraphSeparator", false, "p");
    } catch {}
    const onSelection = () => {
      if (selectionInEditor()) {
        saveSelection();
        refreshState();
      }
    };
    document.addEventListener("selectionchange", onSelection);
    onCleanup(() => document.removeEventListener("selectionchange", onSelection));
  });

  // A new value from outside (form reset, draft restored): reload the body. Our own edits are skipped.
  createEffect(
    on(
      () => props.value,
      (value) => {
        if (!editor || value === lastEmitted) return;
        load(value);
      },
      { defer: true },
    ),
  );

  const btnClass = (active: boolean) =>
    `flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40 ${
      active ? "bg-surface-pink text-brand-pink" : "text-ink lg:hover:bg-surface-gray"
    }`;

  const ToolButton = (p: { label: string; active?: boolean; toggle?: boolean; onClick: () => void; children: JSX.Element }) => (
    <button
      type="button"
      aria-label={p.label}
      title={p.label}
      aria-pressed={p.toggle ? !!p.active : undefined}
      disabled={props.disabled}
      // Keep the text selection: act on mousedown's default being blocked, run on click (keyboard works too).
      onMouseDown={(e) => e.preventDefault()}
      onClick={p.onClick}
      class={btnClass(!!p.active)}
    >
      {p.children}
    </button>
  );

  const Divider = () => <span class="mx-0.5 h-6 w-px shrink-0 bg-border" aria-hidden="true" />;

  return (
    <div class="flex flex-col gap-1.5" data-field={props.field}>
      <Show when={props.label}>
        <span id={labelId} onClick={() => editor.focus()}>
          <FieldLabel for={id} label={props.label!} required={props.required} />
        </span>
      </Show>
      <div
        class={`overflow-hidden rounded-card border bg-surface-card transition-colors duration-150 focus-within:border-brand-pink ${
          props.error ? "border-system-red" : "border-border"
        } ${props.disabled ? "bg-surface-gray" : ""}`}
      >
        <div role="toolbar" aria-label="จัดรูปแบบข้อความ" aria-controls={id} class="flex flex-wrap items-center gap-0.5 border-b border-border bg-surface-gray/40 p-1.5">
          <ToolButton label="หัวข้อใหญ่" toggle active={state().block === "h2"} onClick={() => toggleBlock("h2")}>
            <span class="font-semibold">H2</span>
          </ToolButton>
          <ToolButton label="หัวข้อย่อย" toggle active={state().block === "h3"} onClick={() => toggleBlock("h3")}>
            <span class="font-semibold">H3</span>
          </ToolButton>
          <Divider />
          <ToolButton label="ตัวหนา" toggle active={state().bold} onClick={() => exec("bold")}>
            <span class="text-base font-bold">B</span>
          </ToolButton>
          <ToolButton label="ตัวเอียง" toggle active={state().italic} onClick={() => exec("italic")}>
            <span class="font-serif text-base italic">I</span>
          </ToolButton>
          <ToolButton label="ขีดเส้นใต้" toggle active={state().underline} onClick={() => exec("underline")}>
            <span class="text-base underline underline-offset-2">U</span>
          </ToolButton>
          <Divider />
          <ToolButton label="รายการแบบจุด" toggle active={state().ul} onClick={() => exec("insertUnorderedList")}>
            <svg viewBox="0 0 20 20" class="size-5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true">
              <path d="M8 5.5h9M8 10h9M8 14.5h9" />
              <circle cx="4" cy="5.5" r="1" fill="currentColor" stroke="none" />
              <circle cx="4" cy="10" r="1" fill="currentColor" stroke="none" />
              <circle cx="4" cy="14.5" r="1" fill="currentColor" stroke="none" />
            </svg>
          </ToolButton>
          <ToolButton label="รายการแบบตัวเลข" toggle active={state().ol} onClick={() => exec("insertOrderedList")}>
            <svg viewBox="0 0 20 20" class="size-5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true">
              <path d="M8 5.5h9M8 10h9M8 14.5h9" />
              <path d="M3 4.2l1.2-.7v4M3 12.2c.3-.6 2.2-.9 2.2.3 0 .9-2.2 1.6-2.2 2.9h2.3" stroke-width="1.2" />
            </svg>
          </ToolButton>
          <Divider />
          <ToolButton label="ลิงก์" toggle active={state().link || linkOpen()} onClick={openLink}>
            <svg viewBox="0 0 20 20" class="size-5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true">
              <path d="M8.5 11.5a3.5 3.5 0 0 0 5 0l2.5-2.5a3.5 3.5 0 0 0-5-5l-1 1" />
              <path d="M11.5 8.5a3.5 3.5 0 0 0-5 0L4 11a3.5 3.5 0 0 0 5 5l1-1" />
            </svg>
          </ToolButton>
          <ToolButton
            label="แทรกรูป"
            onClick={() => {
              saveSelection();
              fileInput.click();
            }}
          >
            <svg viewBox="0 0 20 20" class="size-5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true">
              <rect x="2.5" y="3.5" width="15" height="13" rx="2" />
              <circle cx="7" cy="8" r="1.5" />
              <path d="M17.5 13l-4-4-7.5 7.5" stroke-linecap="round" />
            </svg>
          </ToolButton>
          <Divider />
          <ToolButton label="ล้างรูปแบบ" onClick={clearFormat}>
            <svg viewBox="0 0 20 20" class="size-5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true">
              <path d="M5 4.5h10M10 4.5l-3 11M4 16.5h6" />
              <path d="M13 12l4 4M17 12l-4 4" />
            </svg>
          </ToolButton>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            multiple
            class="hidden"
            onChange={(e) => {
              insertImages(e.currentTarget.files);
              e.currentTarget.value = "";
            }}
          />
        </div>

        <Show when={linkOpen()}>
          <div class="flex flex-col gap-2 border-b border-border bg-surface-pink/40 p-3">
            <div class="flex flex-wrap items-center gap-2">
              <input
                ref={linkInput}
                type="url"
                value={linkUrl()}
                aria-label="ลิงก์"
                aria-invalid={!!linkError()}
                placeholder="https://..."
                onInput={(e) => {
                  setLinkUrl(e.currentTarget.value);
                  setLinkError(undefined);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    applyLink();
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    setLinkOpen(false);
                    restoreSelection();
                  }
                }}
                class={`h-10 min-w-0 flex-1 rounded-card border bg-surface-card px-3 text-sm text-ink outline-none focus:border-brand-pink ${linkError() ? "border-system-red" : "border-border"}`}
              />
              <button type="button" onClick={applyLink} class="h-10 rounded-pill bg-brand-pink px-4 text-sm font-medium text-white lg:hover:opacity-90">
                ใส่ลิงก์
              </button>
              <Show when={state().link}>
                <button type="button" onClick={removeLink} class="h-10 rounded-pill border border-border px-4 text-sm font-medium text-ink lg:hover:bg-surface-gray">
                  เอาลิงก์ออก
                </button>
              </Show>
              <button
                type="button"
                onClick={() => {
                  setLinkOpen(false);
                  restoreSelection();
                }}
                class="h-10 rounded-pill px-3 text-sm font-medium text-ink-gray lg:hover:bg-surface-gray"
              >
                ยกเลิก
              </button>
            </div>
            <Show when={linkError()}>
              <p class="text-xs text-system-red">{linkError()}</p>
            </Show>
          </div>
        </Show>

        <div class="relative">
          <Show when={empty() && props.placeholder}>
            <p class="pointer-events-none absolute inset-x-4 top-3 select-none text-base leading-[1.75] text-ink-placeholder" aria-hidden="true">
              {props.placeholder}
            </p>
          </Show>
          <div
            ref={editor}
            id={id}
            role="textbox"
            aria-multiline="true"
            aria-labelledby={props.label ? labelId : undefined}
            aria-label={props.label ? undefined : props.placeholder ?? "ข้อความ"}
            aria-required={props.required || undefined}
            aria-invalid={!!props.error}
            aria-describedby={[props.error ? errorId : "", props.hint ? hintId : ""].filter(Boolean).join(" ") || undefined}
            aria-disabled={props.disabled || undefined}
            contentEditable={!props.disabled}
            onInput={emit}
            onBlur={emit}
            onFocus={() => {
              if (!editor.innerHTML.trim()) editor.innerHTML = "<p><br></p>";
            }}
            onKeyUp={refreshState}
            onMouseUp={refreshState}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            onDrop={onDrop}
            class={`rich-text max-h-[640px] overflow-y-auto px-4 py-3 outline-none ${props.minHeightClass ?? "min-h-[200px]"}`}
          />
        </div>
      </div>
      <Show when={props.hint}>
        <p id={hintId} class="text-xs text-ink-gray">
          {props.hint}
        </p>
      </Show>
      <FieldError id={errorId} message={props.error} />
    </div>
  );
}

/** Re-exported so forms can check "empty" with the same rule the editor uses. */
export { isRichTextEmpty };
