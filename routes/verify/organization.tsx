import { Head } from "fresh/runtime";
import { page } from "fresh";
import { Layout } from "../../components/Layout.tsx";
import OrganizationManagerVerificationForm from "../../islands/OrganizationManagerVerificationForm.tsx";
import {
  getManagedOrganizations,
  getOrganizationManagerVerificationsByUser,
  getOrganizations,
  type ManagedOrganization,
  type Organization,
  type OrganizationManagerVerification,
} from "../../lib/hub-client.ts";
import { define } from "../../lib/define.ts";

interface PageData {
  userId: string;
  managedOrganizations: ManagedOrganization[];
  organizationManagerVerifications: OrganizationManagerVerification[];
  hubOrganizations: Organization[];
  changeDomain: boolean;
  targetOrganizationId: string | null;
}

export const handler = define.handlers<PageData>({
  async GET(ctx) {
    const req = ctx.req;
    const userId = ctx.state.userId as string;
    if (!userId) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/login?redirect=/verify/organization" },
      });
    }

    // URL パラメータを取得
    const url = new URL(req.url);
    const changeDomain = url.searchParams.get("change_domain") === "true";
    const targetOrganizationId = url.searchParams.get("organization_id");

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

    return page({
      userId,
      managedOrganizations,
      organizationManagerVerifications,
      hubOrganizations,
      changeDomain,
      targetOrganizationId,
    });
  },
});

export default define.page<typeof handler>(({
  data,
}) => {
  const {
    userId,
    managedOrganizations,
    organizationManagerVerifications,
    hubOrganizations,
    changeDomain,
    targetOrganizationId,
  } = data;

  return (
    <>
      <Head>
        <title>政治団体管理者認証 - Polimoney Ledger</title>
      </Head>
      <Layout currentPath="/verify/organization" title="政治団体管理者認証">
        <div style="max-width: 42rem;">
          {/* 説明 */}
          <div class="st-alert st-alert--info" style="margin-bottom: var(--st-sys-spacing-6);">
            <div class="st-alert__icon">ℹ️</div>
            <div class="st-alert__content">
              <h3 style="font-weight: 700;">政治団体管理者認証とは</h3>
              <p style="font-size: var(--st-sys-typescale-body-small-size);">
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
            changeDomain={changeDomain}
            targetOrganizationId={targetOrganizationId}
          />
        </div>
      </Layout>
    </>
  );
});
