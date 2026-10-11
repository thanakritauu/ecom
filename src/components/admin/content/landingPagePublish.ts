import { validatePublishRequirements, type PromotionPage } from "~/lib/adminContent";
import { sectionFieldErrors } from "./HomepageSectionForm";

/**
 * Everything that blocks a หน้าแคมเปญ from going live, for the quick
 * "เผยแพร่" actions on the list and detail pages: the page-level rules plus
 * the same per-section rules the edit form runs (`sectionFieldErrors`), so a
 * page can't be published from the list with an incomplete section.
 */
export function landingPagePublishErrors(page: PromotionPage): string[] {
  const errors = validatePublishRequirements(page);
  if (page.sections.length > 0 && !page.isHomepage && !page.sections.some((s) => s.enabled)) errors.push("กรุณาเปิดแสดงส่วนเนื้อหาอย่างน้อย 1 ส่วน");
  for (const section of page.sections) {
    if (!section.enabled) continue;
    const first = Object.values(sectionFieldErrors(section))[0];
    if (first) errors.push(`ส่วน "${section.name || section.title || "ไม่มีชื่อ"}" ${first}`);
  }
  return errors;
}

/** Publishing a page whose start date/time is still ahead schedules it (it shows by itself then); otherwise it goes live now. */
export function landingPagePublishStatus(page: Pick<PromotionPage, "startDate" | "startTime">, nowMs: number = Date.now()): "published" | "scheduled" {
  if (!page.startDate) return "published";
  const start = new Date(`${page.startDate}T${page.startTime || "00:00"}`).getTime();
  return Number.isFinite(start) && start > nowMs ? "scheduled" : "published";
}
