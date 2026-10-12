import { useLocation } from "@solidjs/router";
import { createSignal, For, onMount, Show } from "solid-js";
import { Toggle } from "~/components/admin/Toggle";
import { INFO_PAGES } from "~/lib/siteInfo";
import {
  COOKIE_CATEGORIES,
  cookieSettingsOpen,
  markCookieConsentSettled,
  readCookieConsent,
  saveCookieConsent,
  setCookieSettingsOpen,
  type CookieCategory,
} from "~/lib/cookieConsent";
import { Button } from "./Button";
import { SheetModal } from "./SheetModal";

/**
 * PDPA cookie consent: a bar pinned to the bottom of every storefront page
 * until the visitor chooses (accept all / necessary only / custom), plus the
 * settings sheet, which the Footer's "ตั้งค่าคุกกี้" also opens later.
 * Client-only (shown after mount), never on /admin.
 */
export function CookieConsent() {
  const location = useLocation();
  const [decided, setDecided] = createSignal(true);
  const [choice, setChoice] = createSignal({ analytics: false, marketing: false });

  onMount(() => {
    const stored = readCookieConsent();
    if (stored) setChoice({ analytics: stored.analytics, marketing: stored.marketing });
    setDecided(!!stored);
    if (stored) markCookieConsentSettled();
  });

  const decide = (next: { analytics: boolean; marketing: boolean }) => {
    saveCookieConsent(next);
    setChoice(next);
    setDecided(true);
    setCookieSettingsOpen(false);
    markCookieConsentSettled();
  };
  const acceptAll = () => decide({ analytics: true, marketing: true });
  const necessaryOnly = () => decide({ analytics: false, marketing: false });
  const isOn = (id: CookieCategory) => (id === "necessary" ? true : choice()[id]);
  const setOn = (id: CookieCategory, on: boolean) => id !== "necessary" && setChoice((c) => ({ ...c, [id]: on }));

  const onStorefront = () => !location.pathname.startsWith("/admin");

  return (
    <Show when={onStorefront()}>
      <Show when={!decided()}>
        <div class="fixed inset-x-0 bottom-0 z-[45] p-3 sm:p-4" role="region" aria-label="การใช้คุกกี้">
          <div class="mx-auto flex max-w-[1140px] flex-col gap-4 rounded-card border border-border bg-white p-4 shadow-card sm:p-5 lg:flex-row lg:items-center lg:gap-8">
            <div class="flex min-w-0 flex-1 flex-col gap-1">
              <p class="text-base font-semibold text-ink">เว็บไซต์นี้ใช้คุกกี้</p>
              <p class="text-sm leading-[1.75] text-ink-gray">
                เราใช้คุกกี้ที่จำเป็นเพื่อให้เว็บไซต์ทำงานได้ และขอความยินยอมจากคุณก่อนใช้คุกกี้เพื่อการวิเคราะห์และการตลาด อ่านเพิ่มเติมได้ที่{" "}
                <a href={INFO_PAGES.privacy.href} class="font-medium text-brand-pink underline">
                  {INFO_PAGES.privacy.label}
                </a>
              </p>
            </div>
            <div class="flex shrink-0 flex-col gap-2 sm:flex-row-reverse sm:items-center">
              <Button size="md" class="w-full sm:w-auto" onClick={acceptAll}>
                ยอมรับทั้งหมด
              </Button>
              <Button size="md" variant="outline" class="w-full sm:w-auto" onClick={necessaryOnly}>
                เฉพาะที่จำเป็น
              </Button>
              <button
                type="button"
                onClick={() => setCookieSettingsOpen(true)}
                class="min-h-11 px-3 text-sm font-medium text-ink-gray underline transition-colors duration-150 lg:hover:text-brand-pink"
              >
                ตั้งค่าคุกกี้
              </button>
            </div>
          </div>
        </div>
      </Show>

      <SheetModal
        open={cookieSettingsOpen()}
        onOpenChange={setCookieSettingsOpen}
        height="auto"
        title="ตั้งค่าคุกกี้"
        description="เลือกประเภทคุกกี้ที่อนุญาตให้เราใช้ เปลี่ยนได้ทุกเมื่อจากลิงก์ตั้งค่าคุกกี้ท้ายเว็บไซต์"
        footer={
          <div class="flex flex-col gap-2 sm:flex-row-reverse">
            <Button size="md" class="w-full sm:flex-1" onClick={() => decide(choice())}>
              บันทึกการตั้งค่า
            </Button>
            <Button size="md" variant="outline" class="w-full sm:flex-1" onClick={acceptAll}>
              ยอมรับทั้งหมด
            </Button>
          </div>
        }
      >
        <ul class="flex flex-col divide-y divide-border">
          <For each={COOKIE_CATEGORIES}>
            {(cat) => (
              <li class="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
                <div class="flex min-w-0 flex-1 flex-col gap-1">
                  <p class="text-base font-semibold text-ink">{cat.title}</p>
                  <p class="text-sm leading-[1.75] text-ink-gray">{cat.description}</p>
                </div>
                <div class="shrink-0 pt-0.5">
                  <Toggle
                    checked={isOn(cat.id)}
                    onChange={(on) => setOn(cat.id, on)}
                    disabled={cat.id === "necessary"}
                    onLabel={cat.id === "necessary" ? "เปิดเสมอ" : "เปิด"}
                    offLabel="ปิด"
                  />
                </div>
              </li>
            )}
          </For>
        </ul>
      </SheetModal>
    </Show>
  );
}
