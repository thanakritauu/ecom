import { DropdownMenu } from "@kobalte/core/dropdown-menu";
import { createSignal, For, onMount } from "solid-js";
import { isServer } from "solid-js/web";
import { ChevronIcon } from "./ChevronIcon";
import { CheckIcon } from "./icons";

export type Language = "th" | "en";

const STORAGE_KEY = "charmiss:language";
// Module-level so the navbar and mobile-menu pickers always agree. Only ever
// written on the client (onMount / a pick), so SSR always renders "th".
const [language, setLanguage] = createSignal<Language>("th");

const LANGUAGES: { id: Language; label: string; flag: () => any }[] = [
  { id: "th", label: "ไทย", flag: () => <FlagTh /> },
  { id: "en", label: "English", flag: () => <FlagEn /> },
];

/**
 * Navbar language picker (ไทย / English) — a Kobalte dropdown. The choice
 * is remembered per browser (`localStorage`) and mirrored onto
 * `<html lang>`; the storefront copy itself is Thai-only for now, so picking
 * English doesn't translate the pages yet. `tone="menu"` is the full-width
 * row used inside the mobile menu.
 */
export function LanguageSwitcher(props: { tone?: "bar" | "menu" }) {
  const current = () => LANGUAGES.find((l) => l.id === language()) ?? LANGUAGES[0];

  onMount(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "th" || saved === "en") apply(saved);
    } catch {}
  });

  const apply = (id: Language) => {
    setLanguage(id);
    if (isServer) return;
    document.documentElement.lang = id;
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {}
  };

  return (
    <DropdownMenu placement="bottom-end" gutter={8}>
      <DropdownMenu.Trigger
        aria-label={`ภาษา: ${current().label}`}
        class={
          props.tone === "menu"
            ? "flex min-h-[44px] w-full items-center gap-2 rounded-pill bg-surface-pink px-4 text-ink"
            : "flex min-h-[32px] items-center gap-1 rounded-pill px-1 text-sm text-ink transition-colors duration-150 hover:text-brand-pink"
        }
      >
        {current().flag()}
        <span class={props.tone === "menu" ? "flex-1 text-left" : ""}>{current().label}</span>
        <ChevronIcon direction="down" class="size-4 transition-transform duration-150 [[data-expanded]_&]:rotate-180" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content class="z-[60] min-w-[160px] rounded-card border border-border bg-white p-1.5 shadow-card outline-none">
          <DropdownMenu.RadioGroup value={language()} onChange={(v) => apply(v as Language)}>
            <For each={LANGUAGES}>
              {(lang) => (
                <DropdownMenu.RadioItem
                  value={lang.id}
                  closeOnSelect
                  class="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-[12px] px-3 text-sm text-ink outline-none transition-colors duration-150 data-[highlighted]:bg-surface-pink data-[checked]:font-medium data-[checked]:text-brand-pink"
                >
                  {lang.flag()}
                  <span class="flex-1">{lang.label}</span>
                  <DropdownMenu.ItemIndicator class="text-brand-pink">
                    <CheckIcon class="size-4" />
                  </DropdownMenu.ItemIndicator>
                </DropdownMenu.RadioItem>
              )}
            </For>
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu>
  );
}

/** Round Thai flag, no outline ring (the old flag-th.png had a pink ring baked into the image). */
function FlagTh() {
  return (
    <svg viewBox="0 0 60 60" class="size-4 shrink-0 rounded-full" aria-hidden="true">
      <clipPath id="flag-th-clip">
        <circle cx="30" cy="30" r="30" />
      </clipPath>
      <g clip-path="url(#flag-th-clip)">
        <rect width="60" height="60" fill="#A51931" />
        <rect y="10" width="60" height="40" fill="#F4F5F8" />
        <rect y="20" width="60" height="20" fill="#2D2A4A" />
      </g>
    </svg>
  );
}

/** Round Union Jack, same 16px footprint as the Thai flag. */
function FlagEn() {
  return (
    <svg viewBox="0 0 60 60" class="size-4 shrink-0 rounded-full" aria-hidden="true">
      <clipPath id="flag-en-clip">
        <circle cx="30" cy="30" r="30" />
      </clipPath>
      <g clip-path="url(#flag-en-clip)">
        <rect width="60" height="60" fill="#012169" />
        <path d="M0 0l60 60M60 0L0 60" stroke="#fff" stroke-width="12" />
        <path d="M0 0l60 60M60 0L0 60" stroke="#C8102E" stroke-width="5" />
        <path d="M30 0v60M0 30h60" stroke="#fff" stroke-width="18" />
        <path d="M30 0v60M0 30h60" stroke="#C8102E" stroke-width="10" />
      </g>
    </svg>
  );
}
