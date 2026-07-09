import { Head } from "fresh/runtime";

export default function LandingPage() {
  return (
    <>
      <Head>
        <title>Polimoney Ledger - 政治資金収支管理ツール</title>
      </Head>
      <div style="min-height: 100vh; background: var(--st-sys-color-surface);">
        {/* ヘッダー */}
        <header
          style="position: sticky; top: 0; z-index: 50; backdrop-filter: blur(8px); border-bottom: 1px solid var(--st-sys-color-outline-variant); background: var(--st-sys-color-surface-container-low);"
        >
          <div class="st-container" style="display: flex; align-items: center; justify-content: space-between; padding-top: var(--st-sys-spacing-3); padding-bottom: var(--st-sys-spacing-3);">
            <a href="/welcome" style="display: flex; align-items: center; gap: var(--st-sys-spacing-2); text-decoration: none;">
              <img src="/logo-ledger.svg" alt="" style="height: 2rem; width: 2rem;" />
              <span
                style="font-weight: 700; font-size: var(--st-sys-typescale-title-large-size); color: var(--st-sys-color-primary); font-feature-settings: 'palt' 1;"
              >
                Polimoney Ledger
              </span>
              <span class="st-badge st-badge--sm" style="background: var(--st-sys-color-tertiary); color: var(--st-sys-color-on-tertiary);">β</span>
            </a>
            <div class="st-flex st-gap-2">
              <a href="/login" class="st-button st-button--text">
                ログイン
              </a>
              <a href="/register" class="st-button st-button--filled">
                新規登録
              </a>
            </div>
          </div>
        </header>

        {/* ヒーローセクション */}
        <section style="display: flex; align-items: center; justify-content: center; min-height: 70vh; text-align: center; padding: var(--st-sys-spacing-8);">
          <div style="max-width: 42rem;">
            <div class="st-flex st-flex--center" style="margin-bottom: var(--st-sys-spacing-6);">
              <img
                src="/logo-ledger.svg"
                alt="Polimoney Ledger"
                style="height: 6rem; width: 6rem;"
              />
            </div>
            <span class="st-badge" style="background: var(--st-sys-color-tertiary); color: var(--st-sys-color-on-tertiary); margin-bottom: var(--st-sys-spacing-4); display: inline-block;">🚧 ベータ版</span>
            <h1 style="font-size: var(--st-sys-typescale-display-small-size); font-weight: 700; margin-bottom: var(--st-sys-spacing-6); line-height: 1.2; color: var(--st-sys-color-on-surface);">
              政治資金収支の管理を
              <br />
              <span style="color: var(--st-sys-color-primary);">シンプルに</span>
            </h1>
            <p style="font-size: var(--st-sys-typescale-body-large-size); color: var(--st-sys-color-on-surface-variant); margin-bottom: var(--st-sys-spacing-4);">
              Polimoney Ledger は、政治資金収支報告書の作成・管理を
              <br class="hidden md:block" />
              簡単にするオープンソースのツールです。
            </p>
            <div class="st-alert st-alert--warning" style="max-width: 32rem; margin: 0 auto var(--st-sys-spacing-8);">
              <div class="st-alert__icon">⚠️</div>
              <div class="st-alert__content" style="font-size: var(--st-sys-typescale-body-small-size); text-align: left;">
                本サービスはベータ版です。予期せぬ動作やデータ損失の可能性があります。重要なデータは別途バックアップをお取りください。
              </div>
            </div>
            <div class="st-flex st-flex--center st-flex--wrap st-gap-4">
              <a href="/register" class="st-button st-button--filled st-button--lg">
                無料で始める
              </a>
              <a
                href="https://github.com/digitaldemocracy2030/polimoney_ledger"
                target="_blank"
                rel="noopener noreferrer"
                class="st-button st-button--outlined st-button--lg"
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
        </section>

        {/* 特徴セクション */}
        <section style="padding: var(--st-sys-spacing-12) 0; background: var(--st-sys-color-surface-container-low);">
          <div class="st-container" style="padding: 0 var(--st-sys-spacing-4);">
            <h2 style="font-size: var(--st-sys-typescale-headline-medium-size); font-weight: 700; text-align: center; margin-bottom: var(--st-sys-spacing-10); color: var(--st-sys-color-on-surface);">
              特徴
            </h2>
            <div class="st-grid st-grid--cols-3" style="max-width: 64rem; margin: 0 auto; gap: var(--st-sys-spacing-6);">
              <div class="st-card st-card--filled">
                <div class="st-card__content" style="text-align: center;">
                  <span style="font-size: 2.5rem; display: block; margin-bottom: var(--st-sys-spacing-4);">📊</span>
                  <h3 class="st-card__title" style="justify-content: center;">簡単な収支管理</h3>
                  <p style="color: var(--st-sys-color-on-surface-variant);">
                    直感的な UI で収入・支出を記録。 手軽に記録を始められます。
                  </p>
                </div>
              </div>
              <div class="st-card st-card--filled">
                <div class="st-card__content" style="text-align: center;">
                  <span style="font-size: 2.5rem; display: block; margin-bottom: var(--st-sys-spacing-4);">📄</span>
                  <h3 class="st-card__title" style="justify-content: center;">
                    報告書出力
                    <span class="st-badge st-badge--sm st-badge--outline" style="margin-left: var(--st-sys-spacing-1);">予定</span>
                  </h3>
                  <p style="color: var(--st-sys-color-on-surface-variant);">
                    政治資金収支報告書のフォーマットに
                    対応した帳票出力を目指しています。
                    （選挙種別・届出先により様式が異なるため開発中）
                  </p>
                </div>
              </div>
              <div class="st-card st-card--filled">
                <div class="st-card__content" style="text-align: center;">
                  <span style="font-size: 2.5rem; display: block; margin-bottom: var(--st-sys-spacing-4);">🔒</span>
                  <h3 class="st-card__title" style="justify-content: center;">セキュアなデータ管理</h3>
                  <p style="color: var(--st-sys-color-on-surface-variant);">
                    データは暗号化して保存。
                    あなたのデータはあなただけのものです。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA セクション */}
        <section style="padding: var(--st-sys-spacing-12) 0;">
          <div class="st-container" style="text-align: center; padding: 0 var(--st-sys-spacing-4);">
            <h2 style="font-size: var(--st-sys-typescale-headline-medium-size); font-weight: 700; margin-bottom: var(--st-sys-spacing-6); color: var(--st-sys-color-on-surface);">
              今すぐ始めましょう
            </h2>
            <p style="color: var(--st-sys-color-on-surface-variant); margin-bottom: var(--st-sys-spacing-8); max-width: 36rem; margin-left: auto; margin-right: auto;">
              Polimoney Ledger は無料でご利用いただけます。
              アカウントを作成して、政治資金の管理を始めましょう。
            </p>
            <a href="/register" class="st-button st-button--filled st-button--lg">
              無料で登録する
            </a>
          </div>
        </section>

        {/* フッター */}
        <footer style="padding: var(--st-sys-spacing-8); text-align: center; background: var(--st-sys-color-surface-container-low); border-top: 1px solid var(--st-sys-color-outline-variant);">
          <div>
            <p style="font-weight: 700; font-size: var(--st-sys-typescale-body-large-size); margin-bottom: var(--st-sys-spacing-2);">
              <span style="font-size: 1.5rem; margin-right: var(--st-sys-spacing-2);">📒</span>
              Polimoney Ledger
            </p>
            <p style="color: var(--st-sys-color-on-surface-variant); font-size: var(--st-sys-typescale-body-small-size);">
              © 2025 Digital Democracy 2030. オープンソースプロジェクト
            </p>
          </div>
          <div style="margin-top: var(--st-sys-spacing-4);">
            <div class="st-flex st-flex--center st-gap-4">
              <a href="/privacy" style="color: var(--st-sys-color-on-surface-variant); text-decoration: none;">
                プライバシーポリシー
              </a>
              <a
                href="https://github.com/digitaldemocracy2030/polimoney_ledger"
                target="_blank"
                rel="noopener noreferrer"
                style="color: var(--st-sys-color-on-surface-variant); text-decoration: none;"
              >
                GitHub
              </a>
              <a
                href="https://dd2030.org"
                target="_blank"
                rel="noopener noreferrer"
                style="color: var(--st-sys-color-on-surface-variant); text-decoration: none;"
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
