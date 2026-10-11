import { createMemo, Show } from "solid-js";
import { isRichTextHtml, sanitizeRichText } from "~/lib/richText";

/** Every external link opens in a new tab (and can't reach back to this page). */
function withLinkTargets(html: string): string {
  return html.replace(/<a href="(https?:\/\/[^"]*)">/gi, '<a href="$1" target="_blank" rel="noopener noreferrer">');
}

/**
 * Stored rich text (`RichTextEditor`, `~/lib/richText`) on the storefront.
 * HTML is sanitized to the whitelist before it's rendered; old plain-text
 * values (no tags) keep their line breaks.
 */
export function RichTextContent(props: { value?: string; class?: string }) {
  const rich = () => isRichTextHtml(props.value);
  const html = createMemo(() => (rich() ? withLinkTargets(sanitizeRichText(props.value)) : ""));
  return (
    <Show when={rich()} fallback={<p class={`rich-text whitespace-pre-line ${props.class ?? ""}`}>{props.value ?? ""}</p>}>
      <div class={`rich-text ${props.class ?? ""}`} innerHTML={html()} />
    </Show>
  );
}
