/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}", "./index.html"],
  theme: {
    screens: {
      // Custom breakpoints derived from the real Figma layout (STEP 12 of the audit):
      // container max-width jumps at 1140/1240px, not Tailwind's stock 1024/1280.
      sm: "640px", // mobile-L: card carousels start peeking 1.5-2 cards
      md: "768px", // tablet: 2-column grids
      lg: "1024px", // desktop: 4-column grids, fluid container
      xl: "1280px", // desktop-wide: product grid steps up to 6 columns
      "2xl": "1440px", // desktop-xl: matches the original 1440 canvas 1:1
    },
    extend: {
      colors: {
        brand: {
          pink: "#f1336e",
          purple: "#7650ff",
          yellow: "#ff9300",
        },
        // CMS + Frontend Final Refinement §9 — `ink`/`surface`/`*-soft` are
        // the tokens whose actual color differs between Charmiss CMS's Light
        // and Dark mode, so (only these) resolve through a CSS variable
        // instead of a static hex. The `rgb(var(...) / <alpha-value>)` form
        // is Tailwind's own documented pattern for a var-backed color that
        // still supports opacity modifiers (`bg-surface-gray/60` etc. is
        // used ~150x across this codebase and must keep working). The
        // variables themselves (`app.css`, `:root` vs `:root[data-theme=
        // "dark"]`) default to these exact hex values, so nothing changes
        // visually anywhere until Admin's theme toggle sets the attribute —
        // the Customer Frontend never sets it, so it never sees a dark
        // value. `brand`/`system`/`success.DEFAULT`/`danger.strong` stay
        // static: the spec's own "Brand Color stays the same", and those
        // saturated accents already read fine on both a light and dark card.
        ink: {
          DEFAULT: "rgb(var(--color-ink) / <alpha-value>)",
          gray: "rgb(var(--color-ink-gray) / <alpha-value>)",
          placeholder: "rgb(var(--color-ink-placeholder) / <alpha-value>)",
        },
        surface: {
          pink: "rgb(var(--color-surface-pink) / <alpha-value>)",
          gray: "rgb(var(--color-surface-gray) / <alpha-value>)",
          // NEW — the plain white Card/Table/Modal/Dropdown/Drawer surface
          // (`bg-white` at ~230 call sites in Admin) had no named token at
          // all before this; every one of those call sites is renamed to
          // `bg-surface-card` so it can follow the theme, `card` defaulting
          // to the exact same #ffffff so Light mode is byte-identical.
          card: "rgb(var(--color-surface-card) / <alpha-value>)",
        },
        // Category/Brand Action + Dark Mode Refinement §4/§5 — a dedicated
        // border token, split out from `surface.gray` (which every
        // `border-surface-gray` call site used to share with the neutral
        // *background* tint). One CSS variable can't hold two different
        // dark-mode values at once, and the audit's own root cause is that
        // reusing the background token AS the border color makes borders
        // nearly invisible once `surface.gray` turns near-black in Dark Mode
        // (its own contrast ratio against the Card surface is ~1.08:1).
        // `DEFAULT`/`strong` default to the exact same light hex
        // (`surface.gray`'s #eff0f3) — Light Mode is byte-identical either
        // way — and only diverge under `[data-theme="dark"]`.
        border: {
          DEFAULT: "rgb(var(--color-border) / <alpha-value>)",
          strong: "rgb(var(--color-border-strong) / <alpha-value>)",
        },
        system: {
          red: "#f23030",
          yellow: "#ff9300",
        },
        success: {
          DEFAULT: "#009b4d",
          soft: "rgb(var(--color-success-soft) / <alpha-value>)",
        },
        danger: {
          soft: "rgb(var(--color-danger-soft) / <alpha-value>)",
          // Contrast audit §6 — `text-danger-strong` on `danger.soft`'s dark
          // tint only measured ~3.2:1 (below the 4.5:1 normal-text target)
          // at the original static #da2b2b; a brighter Dark Mode–only
          // variant (still resolving through <alpha-value> so
          // `bg-danger-strong/90` keeps working) fixes that without
          // touching the Light Mode color at all.
          strong: "rgb(var(--color-danger-strong) / <alpha-value>)",
        },
        // Promoted from StatusBadge's inline arbitrary values (`bg-[#fff4e6]`
        // / `bg-[#f1eeff]`) into named tokens — same two soft tints, now a
        // documented part of the design system so Toast (Global UI
        // Correction #23) and any future soft-semantic surface reuse them
        // instead of re-guessing a hex. `info` reuses the soft-purple this
        // codebase already treats as its "info" semantic (StatusBadge, the
        // brand palette has no blue) rather than introducing an unrelated color.
        warning: {
          soft: "rgb(var(--color-warning-soft) / <alpha-value>)",
        },
        info: {
          soft: "rgb(var(--color-info-soft) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: ["'IBM Plex Sans Thai'", "sans-serif"],
      },
      borderRadius: {
        pill: "999px",
        card: "24px",
        media: "16px",
        icon: "40px",
      },
      boxShadow: {
        card: "0 2px 12px rgba(90,106,133,0.10)",
      },
      maxWidth: {
        // "wide" used to hard-cap at the 1240px Figma frame; product-grid
        // sections now get a taller ceiling so ultra-wide viewports can fit
        // a 6th column instead of just growing the side margins forever.
        // "narrow" (Coupon/FAQ/Membership/Promo) stays at the original
        // reading-width frame — those sections don't need extra room.
        "container-wide": "1600px",
        "container-narrow": "1140px",
      },
      transitionDuration: {
        250: "250ms",
      },
      keyframes: {
        "toast-in": {
          "0%": { opacity: 0, transform: "translateY(8px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        "badge-pop": {
          "0%": { transform: "scale(1)" },
          "40%": { transform: "scale(1.25)" },
          "100%": { transform: "scale(1)" },
        },
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--kb-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--kb-accordion-content-height)" },
          to: { height: "0" },
        },
        "drawer-in": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
        "drawer-out": {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(100%)" },
        },
        "overlay-in": {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
        "overlay-out": {
          from: { opacity: 1 },
          to: { opacity: 0 },
        },
        "sheet-in": {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
        "sheet-out": {
          from: { transform: "translateY(0)" },
          to: { transform: "translateY(100%)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
        "modal-in": {
          from: { opacity: 0, transform: "scale(0.95)" },
          to: { opacity: 1, transform: "scale(1)" },
        },
        "modal-out": {
          from: { opacity: 1, transform: "scale(1)" },
          to: { opacity: 0, transform: "scale(0.95)" },
        },
      },
      animation: {
        "toast-in": "toast-in 200ms ease-out",
        "badge-pop": "badge-pop 250ms ease-out",
        "accordion-down": "accordion-down 200ms ease-out",
        "accordion-up": "accordion-up 200ms ease-out",
        "drawer-in": "drawer-in 250ms ease-out",
        "drawer-out": "drawer-out 250ms ease-in",
        "overlay-in": "overlay-in 200ms ease-out",
        "overlay-out": "overlay-out 200ms ease-in",
        "sheet-in": "sheet-in 250ms ease-out",
        "sheet-out": "sheet-out 250ms ease-in",
        "modal-in": "modal-in 200ms ease-out",
        "modal-out": "modal-out 150ms ease-in",
        shimmer: "shimmer 1.5s ease-in-out infinite",
      },
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        charmiss: {
          primary: "#f1336e",
          secondary: "#7650ff",
          accent: "#ff9300",
          neutral: "#1e3146",
          "base-100": "#ffffff",
          info: "#7650ff",
          success: "#009b4d",
          warning: "#ff9300",
          error: "#f23030",
          "--rounded-btn": "9999px",
          "--rounded-badge": "9999px",
          "--tab-radius": "9999px",
        },
      },
    ],
    darkTheme: false,
  },
};
