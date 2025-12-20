import { Head } from "$fresh/runtime.ts";
import { Handlers, PageProps } from "$fresh/server.ts";
import { Layout } from "../../../components/Layout.tsx";
import OrganizationSettingsForm from "../../../islands/OrganizationSettingsForm.tsx";
import {
  getManagedOrganizations,
  getOrganization,
  type ManagedOrganization,
  type Organization,
} from "../../../lib/hub-client.ts";

interface PageData {
  userId: string;
  organizationId: string;
  organization: Organization | null;
  isManager: boolean;
}

export const handler: Handlers<PageData> = {
  async GET(_req, ctx) {
    const userId = ctx.state.userId as string;
    const organizationId = ctx.params.id;

    if (!userId) {
      return new Response(null, {
        status: 302,
        headers: {
          Location: `/login?redirect=/profile/organization/${organizationId}`,
        },
      });
    }

    // 管理権限があるかチェック
    const managedOrgs = await getManagedOrganizations(userId).catch(() => []);
    const isManager = managedOrgs.some((org) => org.id === organizationId);

    // 政治団体情報を取得
    let organization: Organization | null = null;
    if (isManager) {
      try {
        organization = await getOrganization(organizationId, { userId });
      } catch {
        organization = null;
      }
    }

    return ctx.render({
      userId,
      organizationId,
      organization,
      isManager,
    });
  },
};

export default function OrganizationProfileEditPage({
  data,
}: PageProps<PageData>) {
  const { organization, isManager, organizationId } = data;

  return (
    <>
      <Head>
        <title>
          {organization ? `${organization.name} の編集` : "政治団体情報編集"} -
          Polimoney Ledger
        </title>
      </Head>
      <Layout currentPath="/profile/organization" title="政治団体情報編集">
        <div class="max-w-2xl">
          {/* パンくず */}
          <div class="text-sm breadcrumbs mb-6">
            <ul>
              <li>
                <a href="/profile/organization">政治団体一覧</a>
              </li>
              <li>{organization?.name || "詳細"}</li>
            </ul>
          </div>

          {!isManager ? (
            <div class="card bg-base-100 shadow-xl">
              <div class="card-body">
                <div class="alert alert-error">
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
                      d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div>
                    <h3 class="font-bold">アクセス権限がありません</h3>
                    <p class="text-sm">
                      この政治団体を編集する権限がありません。
                    </p>
                  </div>
                </div>
                <div class="card-actions mt-4">
                  <a href="/profile/organization" class="btn">
                    一覧に戻る
                  </a>
                </div>
              </div>
            </div>
          ) : !organization ? (
            <div class="card bg-base-100 shadow-xl">
              <div class="card-body">
                <div class="alert alert-error">
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
                      d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div>
                    <h3 class="font-bold">政治団体が見つかりません</h3>
                    <p class="text-sm">
                      指定された政治団体は存在しないか、削除されています。
                    </p>
                  </div>
                </div>
                <div class="card-actions mt-4">
                  <a href="/profile/organization" class="btn">
                    一覧に戻る
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* 認証状態表示 */}
              <div class="card bg-success/10 border border-success/30 mb-6">
                <div class="card-body py-4">
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
                      <p class="font-bold text-success">管理者として認証済み</p>
                      <p class="text-sm text-base-content/70">
                        {organization.name}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <OrganizationSettingsForm
                organizationId={organizationId}
                initialData={{
                  name: organization.name,
                  type: organization.type,
                  official_url: organization.official_url || "",
                  registration_authority:
                    organization.registration_authority || "",
                  established_date: organization.established_date || "",
                  office_address: organization.office_address || "",
                  representative_name: organization.representative_name || "",
                  accountant_name: organization.accountant_name || "",
                  contact_email: organization.contact_email || "",
                  description: organization.description || "",
                  sns_x: organization.sns_x || "",
                  sns_instagram: organization.sns_instagram || "",
                  sns_facebook: organization.sns_facebook || "",
                  sns_tiktok: organization.sns_tiktok || "",
                }}
                currentLogoUrl={organization.logo_url}
              />
            </>
          )}
        </div>
      </Layout>
    </>
  );
}
