import { Head } from "$fresh/runtime.ts";
import { Handlers, PageProps } from "$fresh/server.ts";
import { Layout } from "../../../components/Layout.tsx";
import { getServiceClient, getSupabaseClient } from "../../../lib/supabase.ts";
import {
  getManagedOrganizations,
  type ManagedOrganization,
} from "../../../lib/hub-client.ts";
import OrganizationSettingsForm from "../../../islands/OrganizationSettingsForm.tsx";

const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

interface LocalOrganization {
  id: string;
  name: string;
  hub_organization_id: string | null;
}

interface PageData {
  organization: LocalOrganization | null;
  hubOrganization: ManagedOrganization | null;
  error?: string;
}

export const handler: Handlers<PageData> = {
  async GET(req, ctx) {
    const organizationId = ctx.params.id;
    const userId = ctx.state.userId as string;

    if (!userId) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/login" },
      });
    }

    try {
      const supabase =
        userId === TEST_USER_ID ? getServiceClient() : getSupabaseClient(req);

      // ローカルの政治団体情報を取得
      const { data: organization, error: orgError } = await supabase
        .from("political_organizations")
        .select("id, name, hub_organization_id")
        .eq("id", organizationId)
        .single();

      if (orgError || !organization) {
        return ctx.render({
          organization: null,
          hubOrganization: null,
          error: "政治団体が見つかりません",
        });
      }

      // Hub から管理する政治団体一覧を取得
      let hubOrganization: ManagedOrganization | null = null;
      if (organization.hub_organization_id) {
        try {
          const managedOrgs = await getManagedOrganizations(userId);
          hubOrganization =
            managedOrgs.find(
              (org) => org.id === organization.hub_organization_id,
            ) || null;
        } catch (error) {
          console.warn("Failed to fetch hub organization:", error);
        }
      }

      return ctx.render({
        organization,
        hubOrganization,
      });
    } catch (error) {
      console.error("Error:", error);
      return ctx.render({
        organization: null,
        hubOrganization: null,
        error: "エラーが発生しました",
      });
    }
  },
};

export default function OrganizationSettingsPage({
  data,
}: PageProps<PageData>) {
  const { organization, hubOrganization, error } = data;

  if (!organization) {
    return (
      <>
        <Head>
          <title>政治団体設定 - Polimoney Ledger</title>
        </Head>
        <Layout currentPath="/organizations" title="政治団体設定">
          <div role="alert" class="alert alert-error">
            <span>{error || "政治団体が見つかりません"}</span>
          </div>
        </Layout>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>{organization.name} - 設定 - Polimoney Ledger</title>
      </Head>
      <Layout
        currentPath="/organizations"
        title={`${organization.name} - 設定`}
      >
        {/* パンくずリスト */}
        <div class="text-sm breadcrumbs mb-4">
          <ul>
            <li>
              <a href="/organizations">政治団体一覧</a>
            </li>
            <li>{organization.name}</li>
          </ul>
        </div>

        {/* タブナビゲーション */}
        <div role="tablist" class="tabs tabs-bordered mb-6">
          <a
            role="tab"
            href={`/organizations/${organization.id}/ledger`}
            class="tab hover:text-primary"
          >
            仕訳一覧
          </a>
          <a
            role="tab"
            href={`/organizations/${organization.id}/assets`}
            class="tab hover:text-primary"
          >
            資産一覧
          </a>
          <a
            role="tab"
            href={`/organizations/${organization.id}/members`}
            class="tab hover:text-primary"
          >
            メンバー
          </a>
          <a role="tab" class="tab tab-active">
            設定
          </a>
        </div>

        {error && (
          <div role="alert" class="alert alert-warning mb-6">
            <span>{error}</span>
          </div>
        )}

        {/* Hub 認証状態 */}
        {!hubOrganization ? (
          <div class="card bg-base-100 shadow mb-6">
            <div class="card-body">
              <h2 class="card-title text-warning">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                政治団体認証が必要です
              </h2>
              <p class="text-base-content/70">
                この政治団体は Hub
                に認証されていません。詳細情報を編集するには、まず政治団体管理者認証を完了してください。
              </p>
              <div class="card-actions justify-end">
                <a href="/settings" class="btn btn-primary">
                  認証申請へ
                </a>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* 認証済みバッジ */}
            <div class="flex items-center gap-2 mb-6">
              <div class="badge badge-success gap-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                認証済み
              </div>
              <span class="text-sm text-base-content/70">
                認証日:{" "}
                {hubOrganization.manager_verified_at
                  ? new Date(
                      hubOrganization.manager_verified_at,
                    ).toLocaleDateString("ja-JP")
                  : "-"}
              </span>
              <span class="text-sm text-base-content/70">
                認証ドメイン: {hubOrganization.manager_verified_domain || "-"}
              </span>
            </div>

            {/* 詳細情報編集フォーム */}
            <OrganizationSettingsForm
              organizationId={hubOrganization.id}
              initialData={{
                name: hubOrganization.name,
                type: hubOrganization.type,
                official_url: hubOrganization.official_url || "",
                registration_authority:
                  hubOrganization.registration_authority || "",
                established_date: hubOrganization.established_date || "",
                office_address: hubOrganization.office_address || "",
                representative_name: hubOrganization.representative_name || "",
                accountant_name: hubOrganization.accountant_name || "",
                contact_email: hubOrganization.contact_email || "",
                description: hubOrganization.description || "",
                sns_x: hubOrganization.sns_x || "",
                sns_instagram: hubOrganization.sns_instagram || "",
                sns_facebook: hubOrganization.sns_facebook || "",
                sns_tiktok: hubOrganization.sns_tiktok || "",
              }}
            />
          </>
        )}
      </Layout>
    </>
  );
}
