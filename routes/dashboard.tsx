import { Head } from "fresh/runtime";
import { Layout } from "../components/Layout.tsx";

export default function Home() {
  return (
    <>
      <Head>
        <title>Polimoney Ledger</title>
      </Head>
      <Layout currentPath="/" title="ホーム">
        {/* ウェルカムメッセージ */}
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%;">
          <div style="text-align: center; max-width: 28rem;">
            <span style="font-size: 4rem; margin-bottom: var(--st-sys-spacing-4); display: block;">📒</span>
            <h2 style="font-size: var(--st-sys-typescale-headline-small-size); font-weight: 700; margin-bottom: var(--st-sys-spacing-2); color: var(--st-sys-color-on-surface);">Polimoney Ledger へようこそ</h2>
            <p style="color: var(--st-sys-color-on-surface-variant); margin-bottom: var(--st-sys-spacing-6);">
              政治資金収支報告書の作成・管理ツールです。
              左のメニューから台帳を選択してください。
            </p>

            <div class="st-stack st-stack--md">
              <a href="/organizations" class="st-button st-button--filled st-button--lg" style="width: 100%; justify-content: center;">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                  style="width: 1.5rem; height: 1.5rem;"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z"
                  />
                </svg>
                政治団体から始める
              </a>
              <a href="/elections" class="st-button st-button--outlined st-button--lg" style="width: 100%; justify-content: center;">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                  style="width: 1.5rem; height: 1.5rem;"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z"
                  />
                </svg>
                選挙から始める
              </a>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
}
