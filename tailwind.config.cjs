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
        ink: {
          DEFAULT: "#1e3146", // Text/Black token — not pure black anywhere in the design
          gray: "#5a6a85",
          placeholder: "#b3bac7",
        },
        surface: {
          pink: "#feebf1",
          gray: "#eff0f3",
        },
        system: {
          red: "#f23030",
          yellow: "#ff9300",
        },
        success: {
          DEFAULT: "#009b4d",
          soft: "#e6fbf0",
        },
        danger: {
          soft: "#feeaea",
          strong: "#da2b2b",
        },
        // Promoted from StatusBadge's inline arbitrary values (`bg-[#fff4e6]`
        // / `bg-[#f1eeff]`) into named tokens — same two soft tints, now a
        // documented part of the design system so Toast (Global UI
        // Correction #23) and any future soft-semantic surface reuse them
        // instead of re-guessing a hex. `info` reuses the soft-purple this
        // codebase already treats as its "info" semantic (StatusBadge, the
        // brand palette has no blue) rather than introducing an unrelated color.
        warning: {
          soft: "#fff4e6",
        },
        info: {
          soft: "#f1eeff",
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
