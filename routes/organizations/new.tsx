import { Head } from "fresh/runtime";
import { page } from "fresh";
import { Layout } from "../../components/Layout.tsx";
import {
  getManagedOrganizations,
  type ManagedOrganization,
} from "../../lib/hub-client.ts";
import NewOrganizationForm from "../../islands/NewOrganizationForm.tsx";
import { define } from "../../lib/define.ts";

interface NewOrganizationPageData {
  managedOrganizations: ManagedOrganization[];
  canCreateOrganization: boolean;
  error?: string;
}

export const handler = define.handlers<NewOrganizationPageData>({
  async GET(ctx) {
    const userId = ctx.state.userId as string;

    if (!userId) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/login" },
      });
    }

    try {
      // Hub から自分が管理する政治団体一覧を取得
      const managedOrganizations = await getManagedOrganizations(userId);
      const canCreateOrganization = managedOrganizations.length > 0;

      return page({ managedOrganizations, canCreateOrganization });
    } catch (error) {
      console.error("Failed to fetch managed organizations from Hub:", error);
      return page({
        managedOrganizations: [],
        canCreateOrganization: false,
        error: error instanceof Error
          ? error.message
          : "政治団体一覧の取得に失敗しました",
      });
    }
  },
});

export default define.page<typeof handler>(({
  data,
}) => {
  const { managedOrganizations, canCreateOrganization, error } = data;

  return (
    <>
      <Head>
        <title>新しい政治団体台帳を作成 - Polimoney Ledger</title>
      </Head>
      <Layout currentPath="/organizations" title="新しい政治団体台帳を作成">
        {/* パンくずリスト */}
        <div class="text-sm breadcrumbs mb-6">
          <ul>
            <li>
              <a href="/organizations">政治団体台帳一覧</a>
            </li>
            <li>新規作成</li>
          </ul>
        </div>

        {error && (
          <div class="alert alert-warning mb-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              style="width: 1.5rem; height: 1.5rem; flex-shrink: 0;"
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
            <span>{error}</span>
          </div>
        )}

        {!canCreateOrganization
          ? (
            // 管理者として認証されていない場合
            <div class="st-card st-card--elevated">
              <div class="st-card__content" style="padding: var(--st-sys-spacing-6);">
                <div class="st-alert st-alert--warning">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    style="width: 1.5rem; height: 1.5rem; flex-shrink: 0;"
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
                    <h3 style="font-weight: 700;">政治団体台帳を作成できません</h3>
                    <p class="text-sm mt-1">
                      政治団体台帳を作成するには、政治団体の管理者として認証されている必要があります。
                    </p>
                  </div>
                </div>

                <div class="mt-6 space-y-4">
                  <h3 class="font-bold text-lg">政治団体台帳を作成するには</h3>
                  <ol class="list-decimal list-inside space-y-2 text-base-content/70">
                    <li>
                      <strong>政治団体の管理者として認証申請</strong>
                      する（政治団体の公式ドメインのメール認証が必要）
                    </li>
                    <li>
                      Hub管理者による<strong>承認</strong>を受ける
                    </li>
                    <li>
                      承認後、このページから政治団体台帳を作成できるようになります
                    </li>
                  </ol>

                  <div class="st-alert st-alert--info" style="margin-top: var(--st-sys-spacing-4);">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      style="width: 1.5rem; height: 1.5rem; flex-shrink: 0;"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span>
                      認証済み管理者から招待されたメンバーも、権限に応じて台帳を操作できます。
                    </span>
                  </div>
                </div>

                <div class="card-actions justify-end mt-6">
                  <a href="/settings" class="st-button st-button--filled">
                    管理者認証を申請する
                  </a>
                  <a href="/organizations" class="st-button st-button--text">
                    戻る
                  </a>
                </div>
              </div>
            </div>
          )
          : (
            // 管理者として認証されている場合
            <div class="st-card st-card--elevated">
              <div class="st-card__content" style="padding: var(--st-sys-spacing-6);">
                <p class="text-base-content/70 mb-4">
                  あなたが管理者として認証されている政治団体から選択してください。
                </p>
                <NewOrganizationForm
                  managedOrganizations={managedOrganizations}
                />
              </div>
            </div>
          )}
      </Layout>
    </>
  );
});
