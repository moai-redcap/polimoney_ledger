import { Head } from "$fresh/runtime.ts";
import { Handlers, PageProps } from "$fresh/server.ts";
import { Layout } from "../../components/Layout.tsx";
import OrganizationManagerVerificationForm from "../../islands/OrganizationManagerVerificationForm.tsx";
import {
  getManagedOrganizations,
  getOrganizationManagerVerificationsByUser,
  getOrganizations,
  type ManagedOrganization,
  type OrganizationManagerVerification,
  type Organization,
} from "../../lib/hub-client.ts";

interface PageData {
  userId: string;
  managedOrganizations: ManagedOrganization[];
  organizationManagerVerifications: OrganizationManagerVerification[];
  hubOrganizations: Organization[];
}

export const handler: Handlers<PageData> = {
  async GET(_req, ctx) {
    const userId = ctx.state.userId as string;
    if (!userId) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/login?redirect=/verify/organization" },
      });
    }

    // Hub から認証情報を取得
    const [
      managedOrganizations,
      organizationManagerVerifications,
      hubOrganizations,
    ] = await Promise.all([
      getManagedOrganizations(userId).catch(() => []),
      getOrganizationManagerVerificationsByUser(userId).catch(() => []),
      getOrganizations().catch(() => []),
    ]);

    return ctx.render({
      userId,
      managedOrganizations,
      organizationManagerVerifications,
      hubOrganizations,
    });
  },
};

export default function OrganizationVerificationPage({
  data,
}: PageProps<PageData>) {
  const {
    userId,
    managedOrganizations,
    organizationManagerVerifications,
    hubOrganizations,
  } = data;

  return (
    <>
      <Head>
        <title>政治団体管理者認証 - Polimoney Ledger</title>
      </Head>
      <Layout currentPath="/verify/organization" title="政治団体管理者認証">
        <div class="max-w-2xl">
          {/* 説明 */}
          <div class="alert alert-info mb-6">
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
            <div>
              <h3 class="font-bold">政治団体管理者認証とは</h3>
              <p class="text-sm">
                政治団体の管理者として認証されると、その団体の収支台帳を作成・管理できるようになります。
                既存の団体を選択するか、新規に団体を登録できます。
              </p>
            </div>
          </div>

          <OrganizationManagerVerificationForm
            userId={userId}
            managedOrganizations={managedOrganizations}
            organizationManagerVerifications={organizationManagerVerifications}
            hubOrganizations={hubOrganizations}
          />
        </div>
      </Layout>
    </>
  );
}
