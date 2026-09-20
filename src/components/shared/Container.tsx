import type { JSX } from "solid-js";

type ContainerWidth = "wide" | "default" | "narrow";

const widthClass: Record<ContainerWidth, string> = {
  // Figma shipped two container widths (1240px / padding 100 and 1140px /
  // padding 150) with no obvious rule for which section gets which — see
  // STEP 2 of the audit. We keep both as an explicit system rather than
  // silently forcing one everywhere, so each section can opt into the width
  // that matches its Figma frame.
  wide: "max-w-container-wide",
  default: "max-w-container-wide",
  narrow: "max-w-container-narrow",
};

export function Container(props: {
  width?: ContainerWidth;
  class?: string;
  children: JSX.Element;
}) {
  return (
    <div
      class={`mx-auto w-full px-4 sm:px-6 lg:px-[clamp(1.5rem,6vw,100px)] ${
        widthClass[props.width ?? "default"]
      } ${props.class ?? ""}`}
    >
      {props.children}
    </div>
  );
}
