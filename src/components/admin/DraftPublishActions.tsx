import { Show } from "solid-js";
import { Button } from "~/components/shared/Button";

/**
 * The one save-button set every Admin form for a storefront item uses
 * (draft-first rule):
 * - `draft` (creating, or the item is still แบบร่าง): ยกเลิก / บันทึกแบบร่าง / บันทึกและเผยแพร่.
 *   บันทึกแบบร่าง only needs the item's name and never shows on the storefront;
 *   บันทึกและเผยแพร่ runs the full checks and puts it live.
 * - otherwise (already published once): ยกเลิก / บันทึกการเปลี่ยนแปลง, with the
 *   form's own เปิด / ปิด status deciding whether it's live.
 * Put it inside `AdminFloatingBar`.
 */
export function DraftPublishActions(props: {
  draft: boolean;
  saving: boolean;
  onCancel: () => void;
  onSaveDraft: () => void;
  onPublish: () => void;
  onSave: () => void;
}) {
  return (
    <div class="flex w-full flex-wrap justify-end gap-3">
      <Button type="button" variant="outline" onClick={props.onCancel} disabled={props.saving}>
        ยกเลิก
      </Button>
      <Show
        when={props.draft}
        fallback={
          <Button type="button" variant="primary" onClick={props.onSave} loading={props.saving}>
            {props.saving ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
          </Button>
        }
      >
        <Button type="button" variant="outline" onClick={props.onSaveDraft} loading={props.saving}>
          บันทึกแบบร่าง
        </Button>
        <Button type="button" variant="primary" onClick={props.onPublish} loading={props.saving}>
          {props.saving ? "กำลังบันทึก..." : "บันทึกและเผยแพร่"}
        </Button>
      </Show>
    </div>
  );
}
