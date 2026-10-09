import { createSignal, Match, onCleanup, onMount, Show, Switch } from "solid-js";
import { Artwork } from "./Artwork";
import { SpeakerOffIcon, SpeakerOnIcon } from "./icons";
import { hasMedia, isVideoMedia, mediaSrc, type MediaValue, type ResponsiveMediaSet, type VideoMediaItem } from "~/lib/media";

type FitProps = {
  alt: string;
  /** Applied to the rendered image/video box (aspect classes etc.), same as `Artwork`'s `class`. */
  class?: string;
  objectFit?: "cover" | "contain";
  /** CSS object-position, e.g. "72% 30%". */
  objectPosition?: string;
  loading?: "eager" | "lazy";
  /** Where the mute/unmute button sits inside the box (Tailwind position classes). Default bottom-right. */
  audioButtonClass?: string;
};

/** Save-Data or prefers-reduced-motion: show the poster only, never download the video. */
function prefersStillMedia(): boolean {
  if (typeof window === "undefined") return false;
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (connection?.saveData) return true;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

/**
 * Storefront renderer for one `MediaValue` (image or video). Images render a
 * plain lazy `<img>`; videos follow the site video standard: autoplay, muted,
 * loop, playsinline, preload="metadata", poster first, and the file is only
 * attached once the box scrolls into view (IntersectionObserver), pausing
 * again when it leaves. Save-Data / reduced-motion visitors get the poster
 * only. When the admin marked the video "มีเสียง", a small round speaker
 * button toggles sound (always starts muted, browsers block autoplay audio).
 */
export function MediaView(props: FitProps & { media: MediaValue }) {
  return (
    <Show
      keyed
      when={isVideoMedia(props.media) ? (props.media as VideoMediaItem) : undefined}
      fallback={
        <img
          src={mediaSrc(props.media)}
          alt={props.alt}
          loading={props.loading ?? "lazy"}
          class={`size-full ${props.class ?? ""}`}
          style={{ "object-fit": props.objectFit ?? "cover", "object-position": props.objectPosition ?? "center" }}
        />
      }
    >
      {(video) => <VideoMedia {...props} video={video} />}
    </Show>
  );
}

function VideoMedia(props: FitProps & { video: VideoMediaItem }) {
  const [still, setStill] = createSignal(false);
  const [failed, setFailed] = createSignal(false);
  const [activeSrc, setActiveSrc] = createSignal<string>();
  const [muted, setMuted] = createSignal(true);
  let videoRef: HTMLVideoElement | undefined;

  onMount(() => {
    if (prefersStillMedia()) {
      setStill(true);
      return;
    }
    if (!videoRef) return;
    if (typeof IntersectionObserver === "undefined") {
      setActiveSrc(props.video.src);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!videoRef) return;
        if (entry.isIntersecting) {
          if (activeSrc() !== props.video.src) setActiveSrc(props.video.src);
          videoRef.muted = muted();
          void videoRef.play().catch(() => undefined);
        } else {
          videoRef.pause();
        }
      },
      { rootMargin: "200px 0px" },
    );
    observer.observe(videoRef);
    onCleanup(() => observer.disconnect());
  });

  const showPosterOnly = () => still() || failed();
  const fitStyle = () => ({ "object-fit": props.objectFit ?? "cover", "object-position": props.objectPosition ?? "center" });

  const toggleSound = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = !muted();
    setMuted(next);
    if (videoRef) {
      videoRef.muted = next;
      if (!next) void videoRef.play().catch(() => undefined);
    }
  };

  return (
    <Switch>
      <Match when={showPosterOnly()}>
        <img
          src={props.video.poster ?? ""}
          alt={props.alt}
          loading={props.loading ?? "lazy"}
          class={`size-full ${props.class ?? ""}`}
          style={fitStyle()}
        />
      </Match>
      <Match when={!showPosterOnly()}>
        <div class={`relative size-full overflow-hidden ${props.class ?? ""}`}>
          <video
            ref={videoRef}
            src={activeSrc()}
            poster={props.video.poster || undefined}
            autoplay
            muted
            loop
            playsinline
            preload="metadata"
            aria-label={props.alt}
            class="block size-full"
            style={fitStyle()}
            onError={() => {
              if (activeSrc()) setFailed(true);
            }}
          />
          <Show when={props.video.hasAudio}>
            <button
              type="button"
              onClick={toggleSound}
              aria-label={muted() ? "เปิดเสียง" : "ปิดเสียง"}
              aria-pressed={!muted()}
              class={`group absolute z-10 flex size-11 items-center justify-center ${props.audioButtonClass ?? "bottom-1 right-1"}`}
            >
              <span class="flex size-8 items-center justify-center rounded-pill bg-white/80 text-ink shadow-card transition-colors lg:group-hover:bg-white" aria-hidden="true">
                <Show when={muted()} fallback={<SpeakerOnIcon class="size-4" />}>
                  <SpeakerOffIcon class="size-4" />
                </Show>
              </span>
            </button>
          </Show>
        </div>
      </Match>
    </Switch>
  );
}

/**
 * Desktop (≥1024) / tablet (768-1023) / mobile (≤767) crops, each one an
 * image or a video. A missing size falls back the same way the banners
 * always have (tablet → desktop, mobile → tablet → desktop). All-image sets
 * still render one `<picture>` (unchanged markup); a set with any video
 * renders one box per breakpoint and hides the others, so a hidden crop's
 * video never loads (the observer never sees it).
 */
export function ResponsiveMedia(props: FitProps & { media: ResponsiveMediaSet }) {
  const desktop = () => [props.media.desktop, props.media.tablet, props.media.mobile].find(hasMedia) ?? "";
  const tablet = () => (hasMedia(props.media.tablet) ? props.media.tablet : desktop());
  const mobile = () => (hasMedia(props.media.mobile) ? props.media.mobile : hasMedia(props.media.tablet) ? props.media.tablet : desktop());
  const anyVideo = () => [desktop(), tablet(), mobile()].some(isVideoMedia);
  const allSame = () => mediaSrc(desktop()) === mediaSrc(tablet()) && mediaSrc(desktop()) === mediaSrc(mobile());

  return (
    <Show when={hasMedia(desktop())}>
      <Switch>
        <Match when={!anyVideo()}>
          <Artwork
            kind="image"
            src={mediaSrc(desktop())}
            tabletSrc={mediaSrc(tablet()) || undefined}
            mobileSrc={mediaSrc(mobile()) || undefined}
            alt={props.alt}
            loading={props.loading}
            objectFit={props.objectFit}
            class={props.class}
          />
        </Match>
        <Match when={allSame()}>
          <MediaView {...props} media={desktop()} />
        </Match>
        <Match when={true}>
          <div class="md:hidden">
            <MediaView {...props} media={mobile()} />
          </div>
          <div class="hidden md:block lg:hidden">
            <MediaView {...props} media={tablet()} />
          </div>
          <div class="hidden lg:block">
            <MediaView {...props} media={desktop()} />
          </div>
        </Match>
      </Switch>
    </Show>
  );
}
