import { Head } from "fresh/runtime";
import { page } from "fresh";
import { Layout } from "../../../components/Layout.tsx";
import {
import { define } from "../../../lib/define.ts";
  getManagedOrganizations,
  type ManagedOrganization,
} from "../../../lib/hub-client.ts";

interface PageData {
  userId: string;
  managedOrganizations: ManagedOrganization[];
}

const organizationTypeLabels: Record<string, string> = {
  political_party: "政党",
  support_group: "後援会",
  fund_management: "資金管理団体",
  other: "その他",
};

export const handler = define.handlers<PageData>({
  async GET(ctx) {
    const userId = ctx.state.userId as string;
    if (!userId) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/login?redirect=/profile/organization" },
      });
    }

    // Hub から管理している政治団体一覧を取得
    const managedOrganizations = await getManagedOrganizations(userId).catch(
      () => [],
    );

    return page({
      userId,
      managedOrganizations,
    });
  },
});

export default define.page<typeof handler>(({
  data,
}) => {
  const { managedOrganizations } = data;

  return (
    <>
      <Head>
        <title>政治団体情報編集 - Polimoney Ledger</title>
      </Head>
      <Layout currentPath="/profile/organization" title="政治団体情報編集">
        <div style="max-width: 42rem;">
          {managedOrganizations.length > 0
            ? (
              <div class="st-stack st-stack--lg">
                <div class="st-alert st-alert--info">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    style="width: 1.5rem; height: 1.5rem; flex-shrink: 0;"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>編集したい政治団体を選択してください。</span>
                </div>

                <div class="st-card st-card--elevated">
                  <div class="st-card__content" style="padding: var(--st-sys-spacing-6);">
                    <h3 class="card-title text-base">管理している政治団体</h3>
                    <div class="space-y-3">
                      {managedOrganizations.map((org) => (
                        <a
                          key={org.id}
                          href={`/profile/organization/${org.id}`}
                          class="flex items-center justify-between p-4 bg-base-200 rounded-lg hover:bg-base-300 transition-colors"
                        >
                          <div class="st-flex st-flex--items-center st-gap-3">
                            <div class="avatar placeholder">
                              <div class="bg-success text-success-content rounded-full w-10">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  style="width: 1.25rem; height: 1.25rem;"
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </div>
                            </div>
                            <div>
                              <span style="font-weight: 500;">{org.name}</span>
                              <span class="badge badge-outline badge-sm ml-2">
                                {organizationTypeLabels[org.type] || org.type}
                              </span>
                              <p style="font-size: var(--st-sys-typescale-label-small-size); color: var(--st-sys-color-on-surface-variant);">
                                認証ドメイン: {org.manager_verified_domain}
                              </p>
                            </div>
                          </div>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="1.5"
                            stroke="currentColor"
                            class="w-5 h-5 text-base-content/50"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="m8.25 4.5 7.5 7.5-7.5 7.5"
                            />
                          </svg>
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )
            : (
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
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    <div>
                      <h3 style="font-weight: 700;">
                        管理している政治団体がありません
                      </h3>
                      <p style="font-size: var(--st-sys-typescale-body-small-size);">
                        政治団体情報を編集するには、まず政治団体管理者認証を完了してください。
                      </p>
                    </div>
                  </div>
                  <div class="card-actions mt-4">
                    <a href="/verify/organization" class="st-button st-button--filled">
                      政治団体管理者認証を申請
                    </a>
                  </div>
                </div>
              </div>
            )}
        </div>
      </Layout>
    </>
  );
});
