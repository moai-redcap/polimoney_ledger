import { Head } from "fresh/runtime";
import { page } from "fresh";
import { CSS, render as renderMarkdown } from "@deno/gfm";
import { define } from "../lib/define.ts";

interface PageData {
  content: string;
}

export const handler = define.handlers<PageData>({
  async GET(ctx) {
    const markdown = await Deno.readTextFile("docs/privacy-policy.md");
    const content = renderMarkdown(markdown);
    return page({ content });
  },
});

export default define.page<typeof handler>(({ data }) => {
  return (
    <>
      <Head>
        <title>プライバシーポリシー - Polimoney Ledger</title>
        <link href="/styles.css" rel="stylesheet" />
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              .markdown-body {
                background-color: transparent;
              }
              .markdown-body h1 {
                border-bottom: 1px solid oklch(var(--bc) / 0.2);
                padding-bottom: 0.5rem;
              }
              .markdown-body h2 {
                border-bottom: 1px solid oklch(var(--bc) / 0.1);
                padding-bottom: 0.3rem;
              }
            `,
          }}
        />
      </Head>
      <div class="min-h-screen bg-base-200">
        {/* ヘッダー */}
        <header class="navbar bg-base-100 border-b border-base-300">
          <div class="container mx-auto">
            <div class="flex-1">
              <a href="/" class="flex items-center gap-2">
                <img src="/logo-ledger.svg" alt="" class="h-8 w-8" />
                <span
                  class="font-bold text-xl text-emerald-600"
                  style="font-feature-settings: 'palt' 1;"
                >
                  Polimoney Ledger
                </span>
              </a>
            </div>
          </div>
        </header>

        {/* コンテンツ */}
        <main class="container mx-auto px-4 py-12 max-w-4xl">
          <article
            class="markdown-body bg-base-100 p-8 rounded-lg shadow"
            dangerouslySetInnerHTML={{ __html: data.content }}
          />

          <div class="mt-12 text-center">
            <a href="/" class="btn btn-outline">
              トップページに戻る
            </a>
          </div>
        </main>

        {/* フッター */}
        <footer class="footer footer-center p-6 bg-base-100 text-base-content border-t border-base-300">
          <p class="text-base-content/60">
            © 2025 Digital Democracy 2030. オープンソースプロジェクト
          </p>
        </footer>
      </div>
    </>
  );
});
