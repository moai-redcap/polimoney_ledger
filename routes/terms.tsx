import { Head } from "$fresh/runtime.ts";

export default function TermsPage() {
  return (
    <>
      <Head>
        <title>利用規約 - Polimoney Ledger</title>
        <link href="/styles.css" rel="stylesheet" />
      </Head>
      <div class="min-h-screen bg-base-200 py-8 px-4">
        <div class="max-w-3xl mx-auto">
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body prose max-w-none">
              <h1>利用規約</h1>

              <p class="text-sm text-base-content/60">
                最終更新日: 2024年12月17日
              </p>

              <h2>第1条（本規約の適用）</h2>
              <p>
                この利用規約（以下「本規約」といいます）は、Polimoney Ledger（以下「本サービス」といいます）の利用条件を定めるものです。
                本サービスをご利用いただく方（以下「ユーザー」といいます）は、本規約に同意したものとみなします。
              </p>

              <h2>第2条（本サービスの目的）</h2>
              <p>
                本サービスは、政治家及び会計責任者が政治資金の収支を記録・管理するためのツールです。
                政治資金の透明化と適正な管理を支援することを目的としています。
              </p>

              <h2>第3条（利用資格）</h2>
              <p>
                本サービスは、以下のいずれかに該当する方が利用できます。
              </p>
              <ul>
                <li>政治家本人</li>
                <li>政治団体の会計責任者</li>
                <li>上記の者から招待を受けた方</li>
              </ul>

              <h2>第4条（禁止事項）</h2>
              <p>ユーザーは、以下の行為を行ってはなりません。</p>
              <ul>
                <li>虚偽の情報を登録する行為</li>
                <li>他人になりすます行為</li>
                <li>本サービスの運営を妨害する行為</li>
                <li>法令または公序良俗に違反する行為</li>
                <li>本サービスを政治資金管理以外の目的で利用する行為</li>
              </ul>

              <h2>第5条（免責事項）</h2>
              <p>
                本サービスは現状有姿で提供されます。
                本サービスの利用により生じた損害について、運営者は一切の責任を負いません。
              </p>

              <div class="alert alert-warning my-6">
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
                <div>
                  <h3 class="font-bold">
                    フィッシングサイトに関する注意事項
                  </h3>
                  <p class="text-sm mt-2">
                    Polimoney Ledger
                    はオープンソースソフトウェアとして開発されています。
                    Webサイトは公に公開するという性質上、コピーされやすく、なりすましサイトの構築をされやすいものです。
                    また、それはAI（LLM）の普及により、より容易くなっています。
                  </p>
                  <p class="text-sm mt-2">
                    Polimoney Ledger
                    は現状ベータ版での公開で無料のサービスです。
                    ボランティアによる運営のため、サポートが行き届かない可能性があります。
                  </p>
                  <p class="text-sm mt-2 font-semibold">
                    フィッシングサイトには十分にご注意頂き、ご利用ください。
                  </p>
                </div>
              </div>

              <h2>第6条（サービスの変更・終了）</h2>
              <p>
                運営者は、事前の通知なく本サービスの内容を変更、または提供を終了することができます。
              </p>

              <h2>第7条（本規約の変更）</h2>
              <p>
                運営者は、必要に応じて本規約を変更することができます。
                変更後の規約は、本サービス上に掲載した時点で効力を生じるものとします。
              </p>

              <h2>第8条（準拠法・管轄裁判所）</h2>
              <p>
                本規約の解釈にあたっては、日本法を準拠法とします。
                本サービスに関して紛争が生じた場合には、東京地方裁判所を第一審の専属的合意管轄裁判所とします。
              </p>

              <div class="mt-8">
                <a href="/register" class="btn btn-ghost">
                  ← 登録画面に戻る
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
