/**
 * Rich text ("แบบ Word") stored as a small HTML string: what Admin's
 * `RichTextEditor` writes and the storefront's `RichTextContent` renders
 * (product description, coupon extra conditions).
 *
 * The sanitizer is string based (no DOM), so it runs the same during SSR and
 * in the browser. Only these survive: p, br, h2, h3, strong, em, u, ul, ol,
 * li, a[href] (http(s), relative or #anchor) and img[src] (http(s), relative,
 * blob: from the Admin uploader, or a data:image). Every other tag is dropped
 * but its text is kept; script / style / iframe-like blocks are dropped with
 * their content. Attributes other than those are always removed.
 */

/** Tags whose whole content is removed (not only the tag). */
const DROP_WITH_CONTENT = ["script", "style", "iframe", "object", "embed", "noscript", "template", "svg", "math", "head", "title", "xml", "select", "textarea", "button"];

/** Pasted / legacy tag -> the allowed tag it becomes. */
const TAG_MAP: Record<string, string> = {
  p: "p",
  div: "p",
  section: "p",
  article: "p",
  blockquote: "p",
  pre: "p",
  br: "br",
  h1: "h2",
  h2: "h2",
  h3: "h3",
  h4: "h3",
  h5: "h3",
  h6: "h3",
  strong: "strong",
  b: "strong",
  em: "em",
  i: "em",
  u: "u",
  ul: "ul",
  ol: "ol",
  li: "li",
  a: "a",
  img: "img",
};

const VOID_TAGS = new Set(["br", "img"]);

const escapeText = (s: string) => s.replace(/&(?!(?:[a-zA-Z][a-zA-Z0-9]{1,31}|#\d{1,7}|#x[0-9a-fA-F]{1,6});)/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escapeAttr = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function decodeAttr(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);?/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);?/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&nbsp;/g, "\u00a0")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function readAttrs(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) attrs[m[1].toLowerCase()] = decodeAttr(m[2] ?? m[3] ?? m[4] ?? "");
  return attrs;
}

/** Strips control / whitespace characters browsers ignore inside a URL scheme ("java\tscript:"). */
const compactUrl = (url: string) => url.replace(/[\u0000- \u007f-\u009f]/g, "");

/** A link target that's safe to keep: http(s), a site-relative path, or an in-page anchor. */
export function safeHref(raw: string): string | undefined {
  const url = raw.trim();
  const compact = compactUrl(url);
  if (/^https?:\/\//i.test(compact)) return url;
  if (/^\/(?!\/)/.test(compact) || compact.startsWith("#")) return url;
  return undefined;
}

/** True for links that leave the site (open in a new tab). */
export const isExternalHref = (href: string) => /^https?:\/\//i.test(href.trim());

function safeImgSrc(raw: string): string | undefined {
  const url = raw.trim();
  const compact = compactUrl(url);
  if (/^https?:\/\//i.test(compact) || /^\/(?!\/)/.test(compact) || /^blob:/i.test(compact)) return url;
  if (/^data:image\/(png|jpe?g|gif|webp|avif);base64,[a-z0-9+/=]+$/i.test(compact)) return compact;
  return undefined;
}

/** Cleans any HTML down to the allowed tags and attributes (see the file comment). Safe to put in `innerHTML`. */
export function sanitizeRichText(html: string | undefined | null): string {
  if (!html) return "";
  let src = String(html)
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, "")
    .replace(/<![^>]*>/g, "")
    .replace(/<\?[\s\S]*?\?>/g, "");
  for (const tag of DROP_WITH_CONTENT) {
    src = src.replace(new RegExp(`<${tag}\\b[\\s\\S]*?<\\/${tag}\\s*>`, "gi"), "").replace(new RegExp(`<${tag}\\b[^>]*>`, "gi"), "");
  }

  const out: string[] = [];
  const open: string[] = [];
  const tagRe = /<\/?([a-zA-Z][a-zA-Z0-9:-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(src))) {
    out.push(escapeText(src.slice(last, m.index)));
    last = tagRe.lastIndex;
    const closing = m[0][1] === "/";
    const name = TAG_MAP[m[1].toLowerCase()];
    if (!name) continue;
    if (closing) {
      if (VOID_TAGS.has(name)) continue;
      // Close only a tag that's actually open (and anything opened inside it).
      const at = open.lastIndexOf(name);
      if (at === -1) continue;
      while (open.length > at) out.push(`</${open.pop()}>`);
      continue;
    }
    const attrs = readAttrs(m[2]);
    if (name === "br") {
      out.push("<br>");
    } else if (name === "img") {
      const srcUrl = attrs.src ? safeImgSrc(attrs.src) : undefined;
      if (srcUrl) out.push(`<img src="${escapeAttr(srcUrl)}" alt="${escapeAttr(attrs.alt ?? "")}">`);
    } else if (name === "a") {
      const href = attrs.href ? safeHref(attrs.href) : undefined;
      out.push(href ? `<a href="${escapeAttr(href)}">` : "<a>");
      open.push("a");
    } else {
      // A block opened inside a paragraph (pasted <div><p>) would nest blocks: close the paragraph first.
      if ((name === "p" || name === "h2" || name === "h3" || name === "ul" || name === "ol") && open[open.length - 1] === "p") out.push(`</${open.pop()}>`);
      out.push(`<${name}>`);
      open.push(name);
    }
  }
  out.push(escapeText(src.slice(last)));
  while (open.length) out.push(`</${open.pop()}>`);

  return out
    .join("")
    .replace(/<a>([\s\S]*?)<\/a>/g, "$1")
    .replace(/<(p|h2|h3|strong|em|u|li|ul|ol)>(\s|&nbsp;)*<\/\1>/g, "")
    // Blank lines at the very start / end (the editor's caret paragraph) add nothing.
    .replace(/^(\s*<p>(\s|&nbsp;|<br>)*<\/p>)+|(<p>(\s|&nbsp;|<br>)*<\/p>\s*)+$/g, "")
    .trim();
}

/** Stored value has real rich-text markup (vs. old plain text with line breaks). */
export function isRichTextHtml(value: string | undefined | null): boolean {
  return !!value && /<(p|br|h[1-6]|strong|b|em|i|u|ul|ol|li|a|img|div)\b[^>]*>/i.test(value);
}

/** Old plain-text descriptions as editor HTML: blank lines split paragraphs, single line breaks stay. */
export function plainTextToRichHtml(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${escapeText(block).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

/** Any stored value (rich or plain) as safe HTML. */
export function toRichHtml(value: string | undefined | null): string {
  if (!value) return "";
  return isRichTextHtml(value) ? sanitizeRichText(value) : plainTextToRichHtml(value);
}

/** The words only (no tags), for "is it empty" checks, list snippets and search. */
export function richTextToPlain(value: string | undefined | null): string {
  if (!value) return "";
  return decodeAttr(
    value
      .replace(/<(br|\/p|\/h[1-6]|\/li|\/div)\b[^>]*>/gi, "\n")
      .replace(/<[^>]*>/g, ""),
  )
    .replace(/ /g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** No words and no pictures. */
export function isRichTextEmpty(value: string | undefined | null): boolean {
  return !richTextToPlain(value) && !/<img\b/i.test(value ?? "");
}
