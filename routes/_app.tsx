import { define } from "../lib/define.ts";

export default define.layout(({ Component }) => {
  return (
    <html lang="ja">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" type="image/svg+xml" href="/logo-ledger.svg" />
        <title>Polimoney Ledger</title>
        {/* Noto Sans JP - 日本語対応の読みやすいフォント */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
        <link rel="stylesheet" href="/sawtooth.css" />
        <script type="module" src="https://unpkg.com/cally"></script>
      </head>
      <body style="min-height: 100vh; background: var(--st-sys-color-surface-variant); font-family: 'Noto Sans JP', sans-serif;">
        <Component />
      </body>
    </html>
  );
});
