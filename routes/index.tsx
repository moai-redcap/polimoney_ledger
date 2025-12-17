import { Head } from "$fresh/runtime.ts";

export default function LandingPage() {
  return (
    <>
      <Head>
        <title>Polimoney Ledger - 政治資金収支管理ツール</title>
        <link href="/static/styles.css" rel="stylesheet" />
      </Head>
      <div class="min-h-screen bg-gradient-to-b from-base-200 to-base-300">
        {/* ヘッダー */}
        <header class="navbar bg-base-100/80 backdrop-blur-sm sticky top-0 z-50 border-b border-base-300">
          <div class="container mx-auto">
            <div class="flex-1">
              <a href="/" class="flex items-center gap-2">
                <span class="text-2xl">📒</span>
                <span class="font-bold text-xl">Polimoney Ledger</span>
                <span class="badge badge-warning badge-sm">β</span>
              </a>
            </div>
            <div class="flex-none gap-2">
              <a href="/login" class="btn btn-ghost">
                ログイン
              </a>
              <a href="/register" class="btn btn-primary">
                新規登録
              </a>
            </div>
          </div>
        </header>

        {/* ヒーローセクション */}
        <section class="hero min-h-[70vh]">
          <div class="hero-content text-center">
            <div class="max-w-2xl">
              <div class="flex items-center justify-center gap-3 mb-6">
                <span class="text-8xl">📒</span>
              </div>
              <div class="badge badge-warning badge-lg mb-4">🚧 ベータ版</div>
              <h1 class="text-4xl md:text-5xl font-bold mb-6">
                政治資金収支の管理を
                <br />
                <span class="text-primary">シンプルに</span>
              </h1>
              <p class="text-lg text-base-content/70 mb-4">
                Polimoney Ledger は、政治資金収支報告書の作成・管理を
                <br class="hidden md:block" />
                簡単にするオープンソースのツールです。
              </p>
              <div class="alert alert-warning max-w-lg mx-auto mb-8">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="stroke-current shrink-0 h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <span class="text-sm text-left">
                  本サービスはベータ版です。予期せぬ動作やデータ損失の可能性があります。重要なデータは別途バックアップをお取りください。
                </span>
              </div>
              <div class="flex flex-col sm:flex-row gap-4 justify-center">
                <a href="/register" class="btn btn-primary btn-lg">
                  無料で始める
                </a>
                <a
                  href="https://github.com/digitaldemocracy2030/polimoney_ledger"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="btn btn-outline btn-lg"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  GitHub
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* 特徴セクション */}
        <section class="py-20 bg-base-100">
          <div class="container mx-auto px-4">
            <h2 class="text-3xl font-bold text-center mb-12">特徴</h2>
            <div class="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <div class="card bg-base-200">
                <div class="card-body items-center text-center">
                  <span class="text-4xl mb-4">📊</span>
                  <h3 class="card-title">簡単な収支管理</h3>
                  <p class="text-base-content/70">
                    直感的な UI で収入・支出を記録。
                    複式簿記の知識がなくても使えます。
                  </p>
                </div>
              </div>
              <div class="card bg-base-200">
                <div class="card-body items-center text-center">
                  <span class="text-4xl mb-4">📄</span>
                  <h3 class="card-title">
                    報告書出力
                    <span class="badge badge-outline badge-sm ml-1">予定</span>
                  </h3>
                  <p class="text-base-content/70">
                    政治資金収支報告書のフォーマットに
                    対応した帳票出力を目指しています。
                    （選挙種別・届出先により様式が異なるため開発中）
                  </p>
                </div>
              </div>
              <div class="card bg-base-200">
                <div class="card-body items-center text-center">
                  <span class="text-4xl mb-4">🔒</span>
                  <h3 class="card-title">セキュアなデータ管理</h3>
                  <p class="text-base-content/70">
                    データは暗号化して保存。
                    あなたのデータはあなただけのものです。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA セクション */}
        <section class="py-20">
          <div class="container mx-auto px-4 text-center">
            <h2 class="text-3xl font-bold mb-6">今すぐ始めましょう</h2>
            <p class="text-base-content/70 mb-8 max-w-xl mx-auto">
              Polimoney Ledger は無料でご利用いただけます。
              アカウントを作成して、政治資金の管理を始めましょう。
            </p>
            <a href="/register" class="btn btn-primary btn-lg">
              無料で登録する
            </a>
          </div>
        </section>

        {/* フッター */}
        <footer class="footer footer-center p-10 bg-base-100 text-base-content border-t border-base-300">
          <div>
            <p class="font-bold text-lg">
              <span class="text-2xl mr-2">📒</span>
              Polimoney Ledger
            </p>
            <p class="text-base-content/60">
              © 2025 Digital Democracy 2030. オープンソースプロジェクト
            </p>
          </div>
          <div>
            <div class="grid grid-flow-col gap-4">
              <a href="/privacy" class="link link-hover">
                プライバシーポリシー
              </a>
              <a
                href="https://github.com/digitaldemocracy2030/polimoney_ledger"
                target="_blank"
                rel="noopener noreferrer"
                class="link link-hover"
              >
                GitHub
              </a>
              <a
                href="https://dd2030.org"
                target="_blank"
                rel="noopener noreferrer"
                class="link link-hover"
              >
                DD2030
              </a>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
