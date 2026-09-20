import { For } from "solid-js";
import { Breadcrumb, type BreadcrumbItem } from "~/components/shared/Breadcrumb";
import { PageHeader } from "~/components/shared/PageHeader";

/**
 * Shared body for every Admin module page that doesn't have real content
 * yet (PART 18 of the spec) — Dashboard and every Catalog/Orders/.../Settings
 * route all render this today. Each real module built in a later phase
 * replaces its own route's usage of this with actual content; this
 * component itself doesn't need to change when that happens.
 */
export function AdminPlaceholder(props: {
  title: string;
  description: string;
  breadcrumb: BreadcrumbItem[];
  comingPhase: string;
  previewItems?: string[];
}) {
  return (
    <div class="flex flex-col gap-6">
      <Breadcrumb items={props.breadcrumb} />
      <PageHeader title={props.title} description={props.description} />
      <div class="flex flex-col items-center gap-3 rounded-card border border-dashed border-surface-gray bg-white px-6 py-16 text-center">
        <p class="text-base font-semibold text-ink">Coming in {props.comingPhase}</p>
        <p class="max-w-md text-sm text-ink-gray">
          หน้านี้จะพัฒนาเนื้อหาจริงในเฟสถัดไป ตอนนี้เป็นเพียง Placeholder เพื่อทดสอบ Navigation และ Layout ของระบบหลังบ้าน
        </p>
        {props.previewItems?.length ? (
          <ul class="mt-2 flex flex-wrap items-center justify-center gap-2">
            <For each={props.previewItems}>
              {(item) => <li class="rounded-pill bg-surface-gray px-3 py-1 text-xs font-medium text-ink-gray">{item}</li>}
            </For>
          </ul>
        ) : null}
      </div>
    </div>
  );
}
