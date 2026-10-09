import { For, onMount, Show, type JSX } from "solid-js";
import { A } from "@solidjs/router";
import { Header } from "../shared/Header";
import { Footer } from "../shared/Footer";
import { Container } from "../shared/Container";
import { Breadcrumb } from "../shared/Breadcrumb";
import { Button } from "../shared/Button";
import { CheckIcon } from "../shared/icons";
import { NAV_ITEM_CLASS } from "../account/AccountSidebar";
import { INFO_PAGE_GROUPS } from "~/lib/siteInfo";

/**
 * Frame for the Footer's help / about / legal pages — same page background,
 * 24px content→Footer gap and sidebar-beside-content layout as the Account
 * pages (`AccountShell`), with a centered page heading (DSL) above. Content
 * goes in `InfoCard`s; the blocks below are the shared pieces those pages
 * compose instead of each styling its own lists/steps.
 */
export function InfoPageShell(props: { title: string; subtitle?: string; children: JSX.Element }) {
  return (
    <>
      <Header />
      <main class="flex flex-col overflow-x-hidden bg-surface-gray/60 py-6">
        <Container width="wide" class="flex flex-col gap-4">
          <Breadcrumb items={[{ label: "หน้าแรก", href: "/" }, { label: props.title }]} />
          <header class="flex flex-col items-center gap-1 text-center">
            <h1 class="text-2xl font-bold text-ink lg:text-3xl">{props.title}</h1>
            <Show when={props.subtitle}>
              <p class="text-sm leading-[1.75] text-ink-gray">{props.subtitle}</p>
            </Show>
          </header>
          <div class="flex flex-col gap-4 lg:flex-row lg:items-start">
            <InfoSidebar />
            <div class="flex min-w-0 flex-1 flex-col gap-4">{props.children}</div>
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}

/** Account-menu look: a pill row that scrolls sideways below `lg`, a grouped vertical card beside the content on desktop. */
function InfoSidebar() {
  let rail: HTMLUListElement | undefined;
  onMount(() => {
    const active = rail?.querySelector<HTMLElement>("[aria-current='page']");
    if (rail && active && rail.scrollWidth > rail.clientWidth)
      rail.scrollLeft += active.getBoundingClientRect().left - rail.getBoundingClientRect().left - 12; // 12 = the rail's own left padding
  });

  return (
    <nav aria-label="เมนูช่วยเหลือและข้อมูล" class="w-full min-w-0 shrink-0 rounded-card bg-white shadow-card lg:w-[264px] lg:p-4">
      <ul ref={rail} class="no-scrollbar flex gap-2 overflow-x-auto p-3 lg:flex-col lg:gap-1 lg:overflow-visible lg:p-0">
        <For each={INFO_PAGE_GROUPS}>
          {(group, i) => (
            <>
              <Show when={i() > 0}>
                <li class="my-1 hidden h-px w-full bg-surface-gray lg:block" aria-hidden="true" />
              </Show>
              <li class="hidden px-3 pb-1 pt-2 text-sm text-ink-gray lg:block" aria-hidden="true">
                {group.title}
              </li>
              <For each={group.links}>
                {(link) => (
                  <li class="shrink-0">
                    <A
                      href={link.href}
                      end
                      class={NAV_ITEM_CLASS}
                      activeClass="!border-transparent bg-surface-pink text-brand-pink"
                      inactiveClass="text-ink lg:hover:bg-surface-gray"
                    >
                      <span class="flex-1 text-left">{link.label}</span>
                    </A>
                  </li>
                )}
              </For>
            </>
          )}
        </For>
      </ul>
    </nav>
  );
}

/** White content card with an optional section heading — same card as `AccountPanel`. */
export function InfoCard(props: { title?: string; id?: string; class?: string; children: JSX.Element }) {
  return (
    <section aria-labelledby={props.title ? props.id : undefined} class={`flex min-w-0 flex-col gap-4 rounded-card bg-white p-4 shadow-card sm:p-6 ${props.class ?? ""}`}>
      <Show when={props.title}>
        <h2 id={props.id} class="text-xl font-bold text-ink">
          {props.title}
        </h2>
      </Show>
      {props.children}
    </section>
  );
}

/** Body copy inside a card. */
export function Prose(props: { children: JSX.Element }) {
  return <div class="flex flex-col gap-3 text-base leading-[1.75] text-ink">{props.children}</div>;
}

/** Dot list for plain points; `check` swaps the dot for the DSL check (conditions met, benefits). */
export function BulletList(props: { items: JSX.Element[]; check?: boolean }) {
  return (
    <ul class="flex flex-col gap-2 text-base leading-[1.75] text-ink">
      <For each={props.items}>
        {(item) => (
          <li class="flex gap-3">
            <Show when={props.check} fallback={<span class="mt-[11px] size-1.5 shrink-0 rounded-pill bg-brand-pink" aria-hidden="true" />}>
              <span class="mt-1 flex size-5 shrink-0 items-center justify-center rounded-pill bg-surface-pink text-brand-pink" aria-hidden="true">
                <CheckIcon class="size-3" />
              </span>
            </Show>
            <span class="min-w-0 flex-1">{item}</span>
          </li>
        )}
      </For>
    </ul>
  );
}

export type InfoStep = { title: string; body: JSX.Element };

/** Numbered steps — pink number circles joined by a thin line. */
export function StepList(props: { steps: InfoStep[] }) {
  return (
    <ol class="flex flex-col">
      <For each={props.steps}>
        {(step, i) => (
          <li class="flex gap-4">
            <div class="flex flex-col items-center">
              <span class="flex size-8 shrink-0 items-center justify-center rounded-pill bg-brand-pink text-sm font-semibold text-white">{i() + 1}</span>
              <Show when={i() < props.steps.length - 1}>
                <span class="w-px flex-1 bg-brand-pink/30" aria-hidden="true" />
              </Show>
            </div>
            <div class={`flex min-w-0 flex-1 flex-col gap-1 pt-1 ${i() < props.steps.length - 1 ? "pb-6" : ""}`}>
              <p class="font-semibold leading-[1.75] text-ink">{step.title}</p>
              <div class="text-sm leading-[1.75] text-ink-gray">{step.body}</div>
            </div>
          </li>
        )}
      </For>
    </ol>
  );
}

export type InfoFact = { label: string; value: string; note?: string };

/** Key numbers in pink tiles — 2 per row on phones, up to 4 on desktop. */
export function FactGrid(props: { facts: InfoFact[] }) {
  return (
    <dl class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <For each={props.facts}>
        {(fact) => (
          <div class="flex flex-col gap-1 rounded-card bg-surface-pink p-4">
            <dt class="text-sm leading-[1.75] text-ink-gray">{fact.label}</dt>
            <dd class="text-lg font-bold leading-[1.75] text-brand-pink">{fact.value}</dd>
            <Show when={fact.note}>
              <dd class="text-sm leading-[1.75] text-ink-gray">{fact.note}</dd>
            </Show>
          </div>
        )}
      </For>
    </dl>
  );
}

/** Closing prompt card — centered line + one pink action. */
export function InfoCta(props: { title: string; body?: string; actionLabel: string; href: string }) {
  return (
    <section class="flex flex-col items-center gap-3 rounded-card bg-surface-pink p-6 text-center">
      <p class="text-lg font-bold text-ink">{props.title}</p>
      <Show when={props.body}>
        <p class="text-sm leading-[1.75] text-ink-gray">{props.body}</p>
      </Show>
      <Button href={props.href}>{props.actionLabel}</Button>
    </section>
  );
}

export type LegalSection = { title: string; paragraphs?: string[]; items?: string[] };

/** Numbered sections for the terms / privacy pages, with the "last updated" line on top. */
export function LegalDocument(props: { updated: string; intro: string; sections: LegalSection[] }) {
  return (
    <InfoCard>
      <p class="text-sm text-ink-gray">ปรับปรุงล่าสุด {props.updated}</p>
      <Prose>
        <p>{props.intro}</p>
      </Prose>
      <For each={props.sections}>
        {(section, i) => (
          <div class="flex flex-col gap-2 border-t border-surface-gray pt-4">
            <h2 class="text-lg font-bold text-ink">
              {i() + 1}. {section.title}
            </h2>
            <Prose>
              <For each={section.paragraphs ?? []}>{(p) => <p>{p}</p>}</For>
            </Prose>
            <Show when={section.items}>{(items) => <BulletList items={items()} />}</Show>
          </div>
        )}
      </For>
    </InfoCard>
  );
}
