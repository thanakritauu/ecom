import type { JSX } from "solid-js";
import { CategoryGridIcon, CouponTicketIcon, FlashBoltIcon, ImageIcon, LayersIcon, PagesPanelIcon, ProductBoxIcon, PromotionTagIcon, StarIcon } from "~/components/admin/icons";
import { SECTION_TYPE_META, type HomepageSectionType, type SectionIconName } from "~/lib/pageSections";

function TimerIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class={props.class}>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2.5 2.5M9.5 2.5h5" />
    </svg>
  );
}

function DividerLineIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true" class={props.class}>
      <path d="M4 12h16M8 5h8M8 19h8" />
    </svg>
  );
}

function QuestionIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class={props.class}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01" />
    </svg>
  );
}

const ICONS: Record<SectionIconName, (p: { class?: string }) => JSX.Element> = {
  hero: LayersIcon,
  banner: ImageIcon,
  slider: LayersIcon,
  grid: CategoryGridIcon,
  countdown: TimerIcon,
  products: ProductBoxIcon,
  content: PagesPanelIcon,
  cta: PromotionTagIcon,
  divider: DividerLineIcon,
  flash: FlashBoltIcon,
  coupon: CouponTicketIcon,
  star: StarIcon,
  faq: QuestionIcon,
};

/** The registry icon of a section type (`SECTION_TYPE_META[type].icon`), or of an icon key directly. Default 20px. */
export function SectionTypeIcon(props: { type?: HomepageSectionType; icon?: SectionIconName; class?: string }) {
  const name = () => props.icon ?? (props.type ? SECTION_TYPE_META[props.type].icon : "content");
  return <>{ICONS[name()]({ class: props.class ?? "size-5" })}</>;
}
