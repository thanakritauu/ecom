import { createSection, genHomepageSectionId, SECTION_TYPE_GROUP_LABEL, SECTION_TYPE_META, SECTION_TYPE_ORDER, type HomepageSection, type HomepageSectionType, type SectionTypeGroup } from "~/lib/pageSections";

/** The page builder's component library, straight from the section registry (`SECTION_TYPE_META` + `createSection`). */
export type LibraryGroup = SectionTypeGroup;

export const LIBRARY_GROUPS: { id: LibraryGroup; label: string }[] = (["media", "products", "builtin", "content"] as LibraryGroup[]).map((id) => ({ id, label: SECTION_TYPE_GROUP_LABEL[id] }));

export type LibraryItem = { type: HomepageSectionType; label: string; description: string; group: LibraryGroup };

export function sectionTypeLabel(type: HomepageSectionType): string {
  return SECTION_TYPE_META[type]?.label ?? type;
}

export function libraryItems(): LibraryItem[] {
  // Palette order first, then any registry type the order list doesn't name yet, so every type is offered.
  const rest = (Object.keys(SECTION_TYPE_META) as HomepageSectionType[]).filter((t) => !SECTION_TYPE_ORDER.includes(t));
  return [...SECTION_TYPE_ORDER, ...rest].map((type) => ({
    type,
    label: SECTION_TYPE_META[type].label,
    description: SECTION_TYPE_META[type].description,
    group: SECTION_TYPE_META[type].group,
  }));
}

export function libraryGroupOf(type: HomepageSectionType): LibraryGroup {
  return SECTION_TYPE_META[type]?.group ?? "content";
}

/** A fresh section of `type` with a unique id. */
export function createBuilderSection(type: HomepageSectionType): HomepageSection {
  return createSection(type);
}

export function duplicateBuilderSection(section: HomepageSection): HomepageSection {
  const copy = JSON.parse(JSON.stringify(section)) as HomepageSection;
  return { ...copy, id: genHomepageSectionId(), name: `${section.name} (สำเนา)` };
}
