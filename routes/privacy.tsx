import { Head } from "$fresh/runtime.ts";

export default function PrivacyPage() {
  return (
    <>
      <Head>
        <title>プライバシーポリシー - Polimoney Ledger</title>
        <link href="/static/styles.css" rel="stylesheet" />
      </Head>
      <div class="min-h-screen bg-base-200">
        {/* ヘッダー */}
        <header class="navbar bg-base-100 border-b border-base-300">
          <div class="container mx-auto">
            <div class="flex-1">
              <a href="/" class="flex items-center gap-2">
                <span class="text-2xl">📒</span>
                <span class="font-bold text-xl">Polimoney Ledger</span>
              </a>
            </div>
          </div>
        </header>

        {/* コンテンツ */}
        <main class="container mx-auto px-4 py-12 max-w-4xl">
          <article class="prose prose-lg max-w-none">
            <h1>プライバシーポリシー</h1>
            <p class="lead">
              Digital Democracy 2030（以下「DD2030」）は、Polimoney Ledger（以下「本サービス」）における
              個人情報の取り扱いについて、以下のとおりプライバシーポリシーを定めます。
            </p>
            <p class="text-base-content/60 text-sm">
              最終更新日: 2025年1月1日
            </p>

            <h2>1. 収集する情報</h2>
            <p>本サービスでは、以下の情報を収集します。</p>
            <h3>1.1 アカウント情報</h3>
            <ul>
              <li>メールアドレス</li>
              <li>氏名</li>
              <li>役割（政治家本人、会計責任者等）</li>
              <li>本人確認書類（審査目的のみに使用）</li>
            </ul>
            <h3>1.2 収支データ</h3>
            <ul>
              <li>政治資金に関する収支記録</li>
              <li>関係者情報（寄附者・支出先等の氏名、住所、職業）</li>
              <li>領収書等の画像データ</li>
            </ul>
            <h3>1.3 利用情報</h3>
            <ul>
              <li>ログイン日時、アクセスログ</li>
              <li>利用ブラウザ、OS 情報</li>
            </ul>

            <h2>2. 情報の利用目的</h2>
            <p>収集した情報は、以下の目的で利用します。</p>
            <ul>
              <li>本サービスの提供・運営</li>
              <li>ユーザー認証・本人確認</li>
              <li>サービス改善・機能開発</li>
              <li>お問い合わせへの対応</li>
              <li>利用規約違反の調査・対応</li>
              <li>法令に基づく対応</li>
            </ul>

            <h2>3. 情報の公開</h2>
            <h3>3.1 Polimoney への公開</h3>
            <p>
              本サービスで記録した収支データは、ユーザーの承認操作により、
              政治資金可視化プラットフォーム「Polimoney」に公開される場合があります。
              公開されるデータには以下が含まれます。
            </p>
            <ul>
              <li>政治家名、政治団体名</li>
              <li>収支の金額・日付・目的</li>
              <li>関係者名（5万円以上の寄附者等、法令で公開が義務付けられているもの）</li>
            </ul>
            <p>
              <strong>
                関係者の詳細な個人情報（住所、電話番号等）は公開されません。
              </strong>
            </p>

            <h3>3.2 非公開情報</h3>
            <p>以下の情報は公開されません。</p>
            <ul>
              <li>法定の公開基準を満たさない少額の収支に関する個人情報</li>
              <li>領収書等の画像データ</li>
              <li>本人確認書類</li>
              <li>仕訳のメモ・備考等の内部情報</li>
            </ul>

            <h2>4. 情報の第三者提供</h2>
            <p>
              DD2030 は、以下の場合を除き、個人情報を第三者に提供しません。
            </p>
            <ul>
              <li>ユーザーの同意がある場合</li>
              <li>法令に基づく開示請求があった場合</li>
              <li>人の生命・身体・財産の保護に必要な場合</li>
              <li>サービス運営に必要な業務委託先への提供（適切な管理のもと）</li>
            </ul>

            <h2>5. データの保管</h2>
            <h3>5.1 保管場所</h3>
            <p>
              データは Supabase（AWS 上のサービス）に保管されます。
              データベースは暗号化され、セキュアに管理されています。
            </p>
            <h3>5.2 保管期間</h3>
            <p>
              収支データは、政治資金規正法に基づく保存義務期間（3年間）を考慮し、
              最低3年間保管します。ユーザーがアカウントを削除した場合でも、
              法令遵守のため一定期間保管を継続する場合があります。
            </p>

            <h2>6. セキュリティ</h2>
            <p>DD2030 は、個人情報の漏洩・紛失・改ざんを防ぐため、以下の対策を講じています。</p>
            <ul>
              <li>通信の暗号化（HTTPS）</li>
              <li>データベースの暗号化</li>
              <li>アクセス制御（Row Level Security）</li>
              <li>定期的なセキュリティ監査</li>
            </ul>

            <h2>7. ユーザーの権利</h2>
            <p>ユーザーは、以下の権利を有します。</p>
            <ul>
              <li>
                <strong>アクセス権</strong>: 自身の個人情報の開示を請求できます
              </li>
              <li>
                <strong>訂正権</strong>: 誤った情報の訂正を請求できます
              </li>
              <li>
                <strong>削除権</strong>: 個人情報の削除を請求できます（法令上の保存義務がある場合を除く）
              </li>
              <li>
                <strong>データポータビリティ</strong>: 自身のデータをエクスポートできます
              </li>
            </ul>
            <p>
              これらの権利の行使については、お問い合わせフォームよりご連絡ください。
            </p>

            <h2>8. Cookie について</h2>
            <p>
              本サービスでは、認証情報の管理のために Cookie を使用します。
              ブラウザの設定により Cookie を無効にすることができますが、
              その場合、本サービスの一部機能が利用できなくなる場合があります。
            </p>

            <h2>9. オープンソースについて</h2>
            <p>
              本サービスはオープンソースソフトウェアとして公開されています。
              ソースコードは{" "}
              <a
                href="https://github.com/digitaldemocracy2030/polimoney_ledger"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub
              </a>{" "}
              で確認できます。セキュリティに関する懸念がある場合は、
              Issue または Security Advisory を通じてご報告ください。
            </p>

            <h2>10. 未成年者の利用</h2>
            <p>
              本サービスは、政治家および会計責任者向けのサービスであり、
              18歳未満の方による利用を想定していません。
            </p>

            <h2>11. ポリシーの変更</h2>
            <p>
              DD2030 は、必要に応じて本ポリシーを変更することがあります。
              重要な変更がある場合は、本サービス上で通知します。
            </p>

            <h2>12. お問い合わせ</h2>
            <p>
              本ポリシーに関するお問い合わせは、以下までご連絡ください。
            </p>
            <ul>
              <li>
                <strong>組織名</strong>: Digital Democracy 2030
              </li>
              <li>
                <strong>ウェブサイト</strong>:{" "}
                <a href="https://dd2030.org" target="_blank" rel="noopener noreferrer">
                  https://dd2030.org
                </a>
              </li>
              <li>
                <strong>GitHub</strong>:{" "}
                <a
                  href="https://github.com/digitaldemocracy2030"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  github.com/digitaldemocracy2030
                </a>
              </li>
            </ul>
          </article>

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
}
