import { type PageProps } from "$fresh/server.ts";

export default function App({ Component }: PageProps) {
  return (
    <html lang="ja" data-theme="polimoney">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
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
        <link rel="stylesheet" href="/styles.css" />
        <script type="module" src="https://unpkg.com/cally"></script>
      </head>
      <body class="min-h-screen bg-base-200 font-ud">
        <Component />
      </body>
    </html>
  );
}
