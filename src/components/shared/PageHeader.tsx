import { Show, type JSX } from "solid-js";
import { Breadcrumb, type BreadcrumbItem } from "./Breadcrumb";

/**
 * Title + description + actions row, used at the top of every Admin page
 * (and reusable anywhere else a page needs the same shape). Actions wrap
 * below the title/description on narrow screens instead of squeezing into a
 * single row — see PART 13 of the Admin Shell spec.
 *
 * `breadcrumb`/`status`/`primaryAction`/`secondaryAction` are additive —
 * existing callers that only pass `title`/`description`/`actions` keep
 * working unchanged. Pages that already render `<Breadcrumb>` as a sibling
 * above `<PageHeader>` are visually identical either way, so they weren't
 * mass-migrated to the new prop; it exists so any page (new or existing) can
 * fold the breadcrumb into the header itself when convenient.
 */
export function PageHeader(props: {
  title: string;
  description?: string;
  /** Shown before the title (e.g. a marketing tool's icon). */
  icon?: JSX.Element;
  breadcrumb?: BreadcrumbItem[];
  /** A small badge/status element rendered next to the title (e.g. a `StatusBadge`). */
  status?: JSX.Element;
  primaryAction?: JSX.Element;
  secondaryAction?: JSX.Element;
  /** Generic actions slot, kept for callers that compose their own action group (e.g. a primary button + a row-actions menu together). */
  actions?: JSX.Element;
}) {
  const hasActions = () => props.primaryAction || props.secondaryAction || props.actions;

  return (
    <div class="flex flex-col gap-3">
      <Show when={props.breadcrumb}>{(items) => <Breadcrumb items={items()} />}</Show>
      <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div class="flex min-w-0 items-start gap-3">
          {props.icon}
          <div class="flex min-w-0 flex-col gap-1">
            <div class="flex flex-wrap items-center gap-2">
              <h1 class="text-2xl font-bold text-ink">{props.title}</h1>
              {props.status}
            </div>
            {props.description ? <p class="text-sm text-ink-gray">{props.description}</p> : null}
          </div>
        </div>
        <Show when={hasActions()}>
          <div class="flex shrink-0 flex-wrap items-center gap-3">
            {props.secondaryAction}
            {props.primaryAction}
            {props.actions}
          </div>
        </Show>
      </div>
    </div>
  );
}
