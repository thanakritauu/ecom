import { Show } from "solid-js";

type CommonProps = {
  alt: string;
  aspectRatio?: string; // e.g. "16/9", "1/1"
  objectFit?: "cover" | "contain";
  objectPosition?: string; // e.g. "center", "top", "50% 20%"
  class?: string;
  /** A different crop/asset to show under the `md:` breakpoint — desktop artwork rarely works unchanged on mobile. */
  mobileSrc?: string;
  /** A different crop/asset for the 768–1023px tablet band specifically — falls back to `src` (the desktop asset) when omitted, same as before this prop existed. */
  tabletSrc?: string;
};

type ImageArtworkProps = CommonProps & {
  kind: "image";
  src: string;
  loading?: "eager" | "lazy";
};

type VideoArtworkProps = CommonProps & {
  kind: "video";
  src: string;
  poster: string;
  /** Rendered instead of <video> if playback fails, and while it hasn't loaded. */
  fallbackImage: string;
};

/** Hero Banner — Multi-Asset Support. `src` is an embeddable `https://www.youtube.com/embed/<id>` URL (see `getYoutubeEmbedUrl`) — never a raw watch/share URL, so this component never has to parse one. */
type YoutubeArtworkProps = CommonProps & {
  kind: "youtube";
  src: string;
};

/**
 * A Figma "Hero"/promo frame is one flattened piece of artwork (image,
 * video, or a YouTube embed) — not a text layer we should be pulling apart.
 * This component is the single place that knows how to render that artwork
 * responsively, so Hero/PromoCarousel/Membership just point it at an asset.
 */
export function Artwork(props: ImageArtworkProps | VideoArtworkProps | YoutubeArtworkProps) {
  const fit = props.objectFit ?? "cover";
  const style = () => ({
    "aspect-ratio": props.aspectRatio,
    "object-fit": fit,
    "object-position": props.objectPosition ?? "center",
  });

  if (props.kind === "youtube") {
    return (
      <iframe
        class={`size-full border-0 ${props.class ?? ""}`}
        style={style()}
        src={props.src}
        title={props.alt}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
      />
    );
  }

  if (props.kind === "video") {
    return (
      <video
        class={`size-full ${props.class ?? ""}`}
        style={style()}
        poster={props.poster}
        autoplay
        muted
        loop
        playsinline
        aria-label={props.alt}
        onError={(e) => {
          const video = e.currentTarget;
          const img = document.createElement("img");
          img.src = props.fallbackImage;
          img.alt = props.alt;
          img.className = video.className;
          Object.assign(img.style, video.style);
          video.replaceWith(img);
        }}
      >
        <source src={props.src} />
      </video>
    );
  }

  return (
    <picture>
      <Show when={props.mobileSrc}>
        <source media="(max-width: 767px)" srcset={props.mobileSrc} />
      </Show>
      <Show when={props.tabletSrc}>
        <source media="(max-width: 1023px)" srcset={props.tabletSrc} />
      </Show>
      <img
        src={props.src}
        alt={props.alt}
        loading={props.loading ?? "lazy"}
        class={`size-full ${props.class ?? ""}`}
        style={style()}
      />
    </picture>
  );
}
