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
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              .markdown-body {
                background-color: transparent;
                color: var(--st-sys-color-on-surface);
              }
              .markdown-body h1 {
                border-bottom: 1px solid var(--st-sys-color-outline-variant);
                padding-bottom: 0.5rem;
              }
              .markdown-body h2 {
                border-bottom: 1px solid var(--st-sys-color-outline-variant);
                padding-bottom: 0.3rem;
              }
            `,
          }}
        />
      </Head>
      <div style="min-height: 100vh; background: var(--st-sys-color-surface);">
        {/* ヘッダー */}
        <header style="border-bottom: 1px solid var(--st-sys-color-outline-variant); background: var(--st-sys-color-surface-container-low);">
          <div class="st-container" style="display: flex; align-items: center; padding-top: var(--st-sys-spacing-3); padding-bottom: var(--st-sys-spacing-3);">
            <a href="/" style="display: flex; align-items: center; gap: var(--st-sys-spacing-2); text-decoration: none;">
              <img src="/logo-ledger.svg" alt="" style="height: 2rem; width: 2rem;" />
              <span
                style="font-weight: 700; font-size: var(--st-sys-typescale-title-large-size); color: var(--st-sys-color-primary); font-feature-settings: 'palt' 1;"
              >
                Polimoney Ledger
              </span>
            </a>
          </div>
        </header>

        {/* コンテンツ */}
        <main class="st-container" style="max-width: 56rem; padding: var(--st-sys-spacing-10) var(--st-sys-spacing-4);">
          <article
            class="markdown-body st-card st-card--elevated"
            style="padding: var(--st-sys-spacing-8);"
            dangerouslySetInnerHTML={{ __html: data.content }}
          />

          <div style="margin-top: var(--st-sys-spacing-10); text-align: center;">
            <a href="/" class="st-button st-button--outlined">
              トップページに戻る
            </a>
          </div>
        </main>

        {/* フッター */}
        <footer style="padding: var(--st-sys-spacing-6); text-align: center; background: var(--st-sys-color-surface-container-low); border-top: 1px solid var(--st-sys-color-outline-variant);">
          <p style="color: var(--st-sys-color-on-surface-variant); font-size: var(--st-sys-typescale-body-small-size);">
            © 2025 Digital Democracy 2030. オープンソースプロジェクト
          </p>
        </footer>
      </div>
    </>
  );
});
