import { createSignal, For, Show, onCleanup, onMount, type JSX } from "solid-js";

/**
 * Native-scroll carousel: slides are laid out in a scroll-snap row, so touch
 * swipe on mobile is the browser's own (smooth, momentum-correct) behavior
 * rather than a hand-rolled pointer-event tracker. Arrows/dots just
 * `scrollTo` the container; a scroll listener keeps `currentIndex` in sync
 * for the dot indicator and aria-live announcement. Shared by Hero and the
 * Promo banner so both get the same swipe/keyboard/a11y behavior for free.
 */
export function Carousel(props: {
  slides: { id: string; content: JSX.Element }[];
  showDots?: boolean;
  showArrows?: boolean;
  label: string;
  /** Auto-advance interval in ms. Omit/false to disable. Pauses on hover/focus/touch, restarts on manual navigation, and never runs under `prefers-reduced-motion`. */
  autoPlay?: number | false;
}) {
  let trackRef: HTMLDivElement | undefined;
  let rootRef: HTMLDivElement | undefined;
  const [index, setIndex] = createSignal(0);
  const [paused, setPaused] = createSignal(false);
  const count = () => props.slides.length;

  // The slide we last asked to scroll to, updated synchronously on every
  // navigation call. `index()` only catches up ~80ms after the browser
  // finishes the scroll (see onScroll below) — using it as the basis for
  // "next"/"previous" would make rapid Next-clicking compute against a
  // stale position and silently drop clicks.
  let pendingIndex = 0;

  // Retargeting a native smooth-scroll mid-flight is unreliable — browsers
  // don't guarantee the *last* of several rapid-fire `scrollTo({behavior:
  // "smooth"})` calls is the one that actually finishes at, so spamming
  // Next could land one slide short with `pendingIndex` and the real DOM
  // position disagreeing. Ignoring new requests until the current scroll
  // settles keeps the two in sync no matter how fast someone clicks.
  let settleTimer: ReturnType<typeof setTimeout> | undefined;
  const isSettled = () => settleTimer === undefined;
  const markUnsettled = () => {
    clearTimeout(settleTimer);
    settleTimer = setTimeout(markSettled, 500);
  };
  const markSettled = () => {
    clearTimeout(settleTimer);
    settleTimer = undefined;
  };

  const scrollToIndex = (i: number) => {
    if (!trackRef || !isSettled()) return;
    const clamped = (i + count()) % count();
    pendingIndex = clamped;
    markUnsettled();
    trackRef.scrollTo({ left: clamped * trackRef.clientWidth, behavior: "smooth" });
    restartAutoPlay();
  };

  let scrollTimeout: ReturnType<typeof setTimeout>;
  const onScroll = () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      if (!trackRef) return;
      setIndex(Math.round(trackRef.scrollLeft / trackRef.clientWidth));
    }, 80);
  };

  let autoPlayTimer: ReturnType<typeof setInterval> | undefined;
  const stopAutoPlay = () => {
    if (autoPlayTimer) clearInterval(autoPlayTimer);
    autoPlayTimer = undefined;
  };
  const startAutoPlay = () => {
    const interval = props.autoPlay;
    if (!interval || count() <= 1) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (autoPlayTimer) clearInterval(autoPlayTimer);
    autoPlayTimer = setInterval(() => {
      if (!paused()) scrollToIndex(pendingIndex + 1);
    }, interval);
  };
  // Any manual navigation (arrow, dot, keyboard, drag) should feel like a
  // fresh countdown rather than an autoplay tick sneaking in moments later —
  // restart the interval instead of letting the existing one keep ticking.
  // (scrollToIndex calls this unconditionally; it's a no-op when autoplay
  // was never started.)
  const restartAutoPlay = () => {
    if (autoPlayTimer !== undefined) startAutoPlay();
  };

  // Desktop mouse-drag: touch/pen already get real native scrolling from the
  // browser (untouched here, so it stays as smooth as it already was) — this
  // only kicks in for mouse input, where a scroll container otherwise can't
  // be dragged at all.
  let dragging = false;
  let dragMoved = false;
  let dragStartX = 0;
  let dragStartScrollLeft = 0;

  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType !== "mouse" || !trackRef) return;
    dragging = true;
    dragMoved = false;
    dragStartX = e.clientX;
    dragStartScrollLeft = trackRef.scrollLeft;
    trackRef.style.scrollSnapType = "none";
    // The track's `scroll-smooth` class puts it in `scroll-behavior: smooth`,
    // which (per spec) applies to *any* programmatic scroll — including a
    // plain `el.scrollLeft = x` assignment, not just `scrollTo()`. Left as
    // smooth, every pointermove during a drag would kick off a competing
    // mid-flight animation instead of tracking the cursor 1:1, so the drag
    // would barely move at all. Go instant for the gesture's duration.
    trackRef.style.scrollBehavior = "auto";
    // Capturing keeps the drag tracking correctly even if the cursor leaves
    // the track mid-gesture. Not essential to the drag itself (scrollLeft is
    // already being driven directly), so a browser refusing capture for this
    // pointer is safe to just ignore rather than let it surface as an
    // uncaught console error.
    try {
      trackRef.setPointerCapture(e.pointerId);
    } catch {
      /* no-op */
    }
  };
  const onPointerMove = (e: PointerEvent) => {
    if (!dragging || !trackRef) return;
    const dx = e.clientX - dragStartX;
    if (Math.abs(dx) > 3) dragMoved = true;
    trackRef.scrollLeft = dragStartScrollLeft - dx;
  };
  const endDrag = (e: PointerEvent) => {
    if (!dragging || !trackRef) return;
    dragging = false;
    trackRef.style.scrollSnapType = "";
    trackRef.style.scrollBehavior = "";
    const nearest = Math.round(trackRef.scrollLeft / trackRef.clientWidth);
    scrollToIndex(nearest);
    try {
      if (trackRef.hasPointerCapture(e.pointerId)) trackRef.releasePointerCapture(e.pointerId);
    } catch {
      /* no-op */
    }
  };

  onMount(() => {
    trackRef?.addEventListener("scroll", onScroll, { passive: true });
    trackRef?.addEventListener("pointerdown", onPointerDown);
    trackRef?.addEventListener("pointermove", onPointerMove);
    trackRef?.addEventListener("pointerup", endDrag);
    trackRef?.addEventListener("pointercancel", endDrag);
    // Dragged past the "this was a swipe, not a click" threshold — swallow
    // the click that a mouseup-over-a-link/button would otherwise fire.
    const onClickCapture = (e: MouseEvent) => {
      if (dragMoved) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    trackRef?.addEventListener("click", onClickCapture, { capture: true });
    // Where supported, clear the "settling" lock the moment the browser
    // itself says the scroll finished, instead of always waiting out the
    // fallback timeout — keeps rapid-but-not-instant clicking feeling snappy.
    trackRef?.addEventListener("scrollend", markSettled);
    onCleanup(() => {
      trackRef?.removeEventListener("scroll", onScroll);
      trackRef?.removeEventListener("pointerdown", onPointerDown);
      trackRef?.removeEventListener("pointermove", onPointerMove);
      trackRef?.removeEventListener("pointerup", endDrag);
      trackRef?.removeEventListener("pointercancel", endDrag);
      trackRef?.removeEventListener("click", onClickCapture, { capture: true });
      trackRef?.removeEventListener("scrollend", markSettled);
      clearTimeout(settleTimer);
    });

    startAutoPlay();
    onCleanup(stopAutoPlay);

    // Pause on hover (desktop) and on any touch/focus interaction (mobile
    // has no hover, so a stray autoplay tick right as someone is swiping
    // would fight their gesture) — resume once they're done.
    const pause = () => setPaused(true);
    const resume = () => setPaused(false);
    rootRef?.addEventListener("pointerenter", pause);
    rootRef?.addEventListener("pointerleave", resume);
    rootRef?.addEventListener("touchstart", pause, { passive: true });
    rootRef?.addEventListener("focusin", pause);
    rootRef?.addEventListener("focusout", resume);
    onCleanup(() => {
      rootRef?.removeEventListener("pointerenter", pause);
      rootRef?.removeEventListener("pointerleave", resume);
      rootRef?.removeEventListener("touchstart", pause);
      rootRef?.removeEventListener("focusin", pause);
      rootRef?.removeEventListener("focusout", resume);
    });
  });

  return (
    <div
      ref={rootRef}
      class="relative w-full"
      role="group"
      aria-roledescription="carousel"
      aria-label={props.label}
    >
      <div
        ref={trackRef}
        class="no-scrollbar flex w-full snap-x snap-mandatory overflow-x-auto scroll-smooth"
        classList={{ "cursor-grab active:cursor-grabbing": count() > 1 }}
        tabindex="0"
        onDragStart={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") scrollToIndex(pendingIndex + 1);
          if (e.key === "ArrowLeft") scrollToIndex(pendingIndex - 1);
        }}
      >
        <For each={props.slides}>
          {(slide, i) => (
            <div
              class="w-full shrink-0 snap-start"
              role="group"
              aria-roledescription="slide"
              aria-label={`${i() + 1} จาก ${count()}`}
              aria-hidden={index() !== i()}
            >
              {slide.content}
            </div>
          )}
        </For>
      </div>

      <Show when={props.showArrows !== false && count() > 1}>
        <div class="pointer-events-none absolute inset-x-4 top-1/2 flex -translate-y-1/2 items-center justify-between sm:inset-x-8">
          <button
            type="button"
            onClick={() => scrollToIndex(pendingIndex - 1)}
            aria-label="สไลด์ก่อนหน้า"
            class="pointer-events-auto flex size-11 items-center justify-center rounded-pill bg-white/80 text-ink shadow-card transition-colors duration-200 hover:bg-white"
          >
            <span aria-hidden="true">‹</span>
          </button>
          <button
            type="button"
            onClick={() => scrollToIndex(pendingIndex + 1)}
            aria-label="สไลด์ถัดไป"
            class="pointer-events-auto flex size-11 items-center justify-center rounded-pill bg-white/80 text-ink shadow-card transition-colors duration-200 hover:bg-white"
          >
            <span aria-hidden="true">›</span>
          </button>
        </div>
      </Show>

      <Show when={props.showDots !== false && count() > 1}>
        <div class="absolute inset-x-0 bottom-2 flex items-center justify-center">
          <For each={props.slides}>
            {(_, i) => (
              <button
                type="button"
                onClick={() => scrollToIndex(i())}
                aria-label={`ไปที่สไลด์ ${i() + 1}`}
                aria-current={index() === i()}
                class="flex size-11 shrink-0 items-center justify-center"
              >
                <span
                  aria-hidden="true"
                  classList={{
                    "h-1 rounded-pill transition-all duration-250": true,
                    "w-8 bg-white": index() === i(),
                    "w-4 bg-white/40": index() !== i(),
                  }}
                />
              </button>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
