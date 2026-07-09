import { Head } from "fresh/runtime";

export default function Error404() {
  return (
    <>
      <Head>
        <title>404 - Page not found</title>
      </Head>
      <div style="min-height: 100vh; background: var(--st-sys-color-surface); display: flex; align-items: center; justify-content: center;">
        <div style="text-align: center;">
          <h1 style="font-size: 8rem; font-weight: 700; color: var(--st-sys-color-primary); line-height: 1;">404</h1>
          <p style="font-size: var(--st-sys-typescale-headline-small-size); font-weight: 600; margin-top: var(--st-sys-spacing-4); color: var(--st-sys-color-on-surface);">ページが見つかりません</p>
          <p style="color: var(--st-sys-color-on-surface-variant); margin-top: var(--st-sys-spacing-2);">
            お探しのページは存在しないか、移動した可能性があります。
          </p>
          <a href="/" class="st-button st-button--filled" style="margin-top: var(--st-sys-spacing-6); display: inline-flex;">
            ホームに戻る
          </a>
        </div>
      </div>
    </>
  );
}
