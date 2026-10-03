import { createHandler, StartServer } from "@solidjs/start/server";

export default createHandler(() => (
  <StartServer
    document={({ assets, children, scripts }) => (
      <html lang="th">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          {/* Favicon — `public/favicon.png` is a real 32x32 PNG (not an SVG
              wrapper): the Charmiss pink 2-line wordmark (tracked source at
              `src/assets/icons/logo-charmiss-pink-stacked.png`, 600x217)
              pre-rendered once — via Pillow, `src/assets/icons/favicon-32.png`
              is the same output kept for reference — onto a transparent
              32x32 canvas, scaled down to fit by width and centered
              vertically (contain, not stretch/squash), so the square PNG
              file itself already has the correct framing baked in; no
              runtime SVG/`preserveAspectRatio` trick needed. Only one
              `<link>` to maintain — no separate `shortcut icon`/Apple touch
              icon exists in this project. */}
          <link rel="icon" type="image/png" href="/favicon.png" />
          <title>Charmiss</title>
          {assets}
        </head>
        <body>
          <div id="app">{children}</div>
          {scripts}
        </body>
      </html>
    )}
  />
));
