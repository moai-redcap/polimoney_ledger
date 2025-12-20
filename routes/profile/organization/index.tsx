import { Head } from "$fresh/runtime.ts";
import { Handlers, PageProps } from "$fresh/server.ts";
import { Layout } from "../../../components/Layout.tsx";
import {
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

export const handler: Handlers<PageData> = {
  async GET(_req, ctx) {
    const userId = ctx.state.userId as string;
    if (!userId) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/login?redirect=/profile/organization" },
      });
    }

    // Hub から管理している政治団体一覧を取得
    const managedOrganizations = await getManagedOrganizations(userId).catch(
      () => []
    );

    return ctx.render({
      userId,
      managedOrganizations,
    });
  },
};

export default function OrganizationProfileListPage({
  data,
}: PageProps<PageData>) {
  const { managedOrganizations } = data;

  return (
    <>
      <Head>
        <title>政治団体情報編集 - Polimoney Ledger</title>
      </Head>
      <Layout currentPath="/profile/organization" title="政治団体情報編集">
        <div class="max-w-2xl">
          {managedOrganizations.length > 0 ? (
            <div class="space-y-6">
              <div class="alert alert-info">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  class="stroke-current shrink-0 w-6 h-6"
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

              <div class="card bg-base-100 shadow-xl">
                <div class="card-body">
                  <h3 class="card-title text-base">管理している政治団体</h3>
                  <div class="space-y-3">
                    {managedOrganizations.map((org) => (
                      <a
                        key={org.id}
                        href={`/profile/organization/${org.id}`}
                        class="flex items-center justify-between p-4 bg-base-200 rounded-lg hover:bg-base-300 transition-colors"
                      >
                        <div class="flex items-center gap-3">
                          <div class="avatar placeholder">
                            <div class="bg-success text-success-content rounded-full w-10">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                class="h-5 w-5"
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
                            <span class="font-medium">{org.name}</span>
                            <span class="badge badge-outline badge-sm ml-2">
                              {organizationTypeLabels[org.type] || org.type}
                            </span>
                            <p class="text-xs text-base-content/50">
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
          ) : (
            <div class="card bg-base-100 shadow-xl">
              <div class="card-body">
                <div class="alert alert-warning">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="stroke-current shrink-0 h-6 w-6"
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
                    <h3 class="font-bold">管理している政治団体がありません</h3>
                    <p class="text-sm">
                      政治団体情報を編集するには、まず政治団体管理者認証を完了してください。
                    </p>
                  </div>
                </div>
                <div class="card-actions mt-4">
                  <a href="/verify/organization" class="btn btn-primary">
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
}
