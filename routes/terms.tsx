import { Head } from "fresh/runtime";

export default function TermsPage() {
  return (
    <>
      <Head>
        <title>利用規約 - Polimoney Ledger</title>
      </Head>
      <div style="min-height: 100vh; background: var(--st-sys-color-surface); padding: var(--st-sys-spacing-8) var(--st-sys-spacing-4);">
        <div class="st-container" style="max-width: 48rem;">
          <div class="st-card st-card--elevated">
            <div class="st-card__content" style="padding: var(--st-sys-spacing-8);">
              <h1 style="font-size: var(--st-sys-typescale-headline-large-size); font-weight: 700; color: var(--st-sys-color-on-surface); margin-bottom: var(--st-sys-spacing-4);">利用規約</h1>

              <p style="font-size: var(--st-sys-typescale-body-small-size); color: var(--st-sys-color-on-surface-variant); margin-bottom: var(--st-sys-spacing-6);">
                最終更新日: 2024年12月20日
              </p>

              <div class="st-stack st-stack--lg" style="color: var(--st-sys-color-on-surface); line-height: 1.7;">
                <section>
                  <h2 style="font-size: var(--st-sys-typescale-title-large-size); font-weight: 700; margin-bottom: var(--st-sys-spacing-2);">第1条（本規約の適用）</h2>
                  <p>
                    この利用規約（以下「本規約」といいます）は、Polimoney
                    Ledger（以下「本サービス」といいます）の利用条件を定めるものです。
                    本サービスをご利用いただく方（以下「ユーザー」といいます）は、本規約に同意したものとみなします。
                  </p>
                </section>

                <section>
                  <h2 style="font-size: var(--st-sys-typescale-title-large-size); font-weight: 700; margin-bottom: var(--st-sys-spacing-2);">第2条（本サービスの目的）</h2>
                  <p>
                    本サービスは、政治家及び会計責任者が政治資金の収支を記録・管理するためのツールです。
                    政治資金の透明化と適正な管理を支援することを目的としています。
                  </p>
                </section>

                <section>
                  <h2 style="font-size: var(--st-sys-typescale-title-large-size); font-weight: 700; margin-bottom: var(--st-sys-spacing-2);">第3条（利用資格）</h2>
                  <p>本サービスは、以下のいずれかに該当する方が利用できます。</p>
                  <ul style="margin-left: var(--st-sys-spacing-6); margin-top: var(--st-sys-spacing-2); list-style: disc;">
                    <li>政治家本人</li>
                    <li>政治団体の会計責任者</li>
                    <li>上記の者から招待を受けた方</li>
                  </ul>
                </section>

                <section>
                  <h2 style="font-size: var(--st-sys-typescale-title-large-size); font-weight: 700; margin-bottom: var(--st-sys-spacing-2);">第3条の2（認証に関する注意事項）</h2>
                  <p>
                    本サービスにおける政治家認証および政治団体管理者認証について、以下の事項をご了承ください。
                  </p>
                  <ol style="margin-left: var(--st-sys-spacing-6); margin-top: var(--st-sys-spacing-2); list-style: decimal;">
                    <li style="margin-bottom: var(--st-sys-spacing-2);">
                      <strong>承認の順序について</strong>
                      <br />
                      承認フローの関係上、申請順に承認を出せないことがあります。
                    </li>
                    <li style="margin-bottom: var(--st-sys-spacing-2);">
                      <strong>却下理由の非開示について</strong>
                      <br />
                      承認が却下された場合、セキュリティの都合上、基本的にその理由をお伝えできません。
                    </li>
                    <li>
                      <strong>虚偽申請への対応について</strong>
                      <br />
                      虚偽の情報による申請が発覚した場合、アカウントを停止する場合があります。
                    </li>
                  </ol>
                </section>

                <section>
                  <h2 style="font-size: var(--st-sys-typescale-title-large-size); font-weight: 700; margin-bottom: var(--st-sys-spacing-2);">第4条（禁止事項）</h2>
                  <p>ユーザーは、以下の行為を行ってはなりません。</p>
                  <ul style="margin-left: var(--st-sys-spacing-6); margin-top: var(--st-sys-spacing-2); list-style: disc;">
                    <li>虚偽の情報を登録する行為</li>
                    <li>他人になりすます行為</li>
                    <li>本サービスの運営を妨害する行為</li>
                    <li>法令または公序良俗に違反する行為</li>
                    <li>本サービスを政治資金管理以外の目的で利用する行為</li>
                  </ul>
                </section>

                <section>
                  <h2 style="font-size: var(--st-sys-typescale-title-large-size); font-weight: 700; margin-bottom: var(--st-sys-spacing-2);">第5条（免責事項）</h2>
                  <p>
                    本サービスは現状有姿で提供されます。
                    本サービスの利用により生じた損害について、運営者は一切の責任を負いません。
                  </p>
                </section>

                <div class="st-alert st-alert--warning" style="margin: var(--st-sys-spacing-6) 0;">
                  <div class="st-alert__icon">⚠️</div>
                  <div class="st-alert__content">
                    <div class="st-alert__title">フィッシングサイトに関する注意事項</div>
                    <p style="font-size: var(--st-sys-typescale-body-small-size); margin-top: var(--st-sys-spacing-2);">
                      Polimoney Ledger
                      はオープンソースソフトウェアとして開発されています。
                      Webサイトは公に公開するという性質上、コピーされやすく、なりすましサイトの構築をされやすいものです。
                      また、それはAI（LLM）の普及により、より容易くなっています。
                    </p>
                    <p style="font-size: var(--st-sys-typescale-body-small-size); margin-top: var(--st-sys-spacing-2);">
                      Polimoney Ledger
                      は現状ベータ版での公開で無料のサービスです。
                      ボランティアによる運営のため、サポートが行き届かない可能性があります。
                    </p>
                    <p style="font-size: var(--st-sys-typescale-body-small-size); margin-top: var(--st-sys-spacing-2); font-weight: 600;">
                      フィッシングサイトには十分にご注意頂き、ご利用ください。
                    </p>
                  </div>
                </div>

                <section>
                  <h2 style="font-size: var(--st-sys-typescale-title-large-size); font-weight: 700; margin-bottom: var(--st-sys-spacing-2);">第6条（サービスの変更・終了）</h2>
                  <p>
                    運営者は、事前の通知なく本サービスの内容を変更、または提供を終了することができます。
                  </p>
                </section>

                <section>
                  <h2 style="font-size: var(--st-sys-typescale-title-large-size); font-weight: 700; margin-bottom: var(--st-sys-spacing-2);">第7条（本規約の変更）</h2>
                  <p>
                    運営者は、必要に応じて本規約を変更することができます。
                    変更後の規約は、本サービス上に掲載した時点で効力を生じるものとします。
                  </p>
                </section>

                <section>
                  <h2 style="font-size: var(--st-sys-typescale-title-large-size); font-weight: 700; margin-bottom: var(--st-sys-spacing-2);">第8条（準拠法・管轄裁判所）</h2>
                  <p>
                    本規約の解釈にあたっては、日本法を準拠法とします。
                    本サービスに関して紛争が生じた場合には、東京地方裁判所を第一審の専属的合意管轄裁判所とします。
                  </p>
                </section>

                <div style="margin-top: var(--st-sys-spacing-8);">
                  <a href="/register" class="st-button st-button--text">
                    ← 登録画面に戻る
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
