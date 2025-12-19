import { Head } from "$fresh/runtime.ts";
import { Handlers, PageProps } from "$fresh/server.ts";
import { Layout } from "../../../components/Layout.tsx";
import { getServiceClient, getSupabaseClient } from "../../../lib/supabase.ts";
import { hasPermission, AppRole } from "../../../lib/permissions.ts";
import MemberManager from "../../../islands/MemberManager.tsx";

const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

interface Member {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
  invited_by_user_id: string;
}

interface Organization {
  id: string;
  name: string;
  owner_user_id: string;
}

interface PageData {
  organization: Organization;
  members: Member[];
  isOwner: boolean;
  canManageMembers: boolean;
  error?: string;
}

export const handler: Handlers<PageData> = {
  async GET(req, ctx) {
    const userId = ctx.state.userId as string;
    if (!userId) {
      return new Response(null, {
        status: 302,
        headers: {
          Location: `/login?redirect=/organizations/${ctx.params.id}/members`,
        },
      });
    }

    const organizationId = ctx.params.id;
    const supabase =
      userId === TEST_USER_ID ? getServiceClient() : getSupabaseClient(req);

    // 政治団体の情報を取得
    const { data: organization, error: orgError } = await supabase
      .from("political_organizations")
      .select("id, name, owner_user_id")
      .eq("id", organizationId)
      .single();

    if (orgError || !organization) {
      return ctx.render({
        organization: { id: "", name: "", owner_user_id: "" },
        members: [],
        isOwner: false,
        canManageMembers: false,
        error: "政治団体が見つかりません",
      });
    }

    const isOwner = organization.owner_user_id === userId;

    // メンバー一覧を取得
    const { data: members } = await supabase
      .from("ledger_members")
      .select("id, user_id, role, created_at, invited_by_user_id")
      .eq("organization_id", organizationId)
      .order("created_at");

    // 現在のユーザーの権限を確認
    let canManageMembers = isOwner;
    if (!isOwner) {
      const currentMember = members?.find((m) => m.user_id === userId);
      if (currentMember) {
        canManageMembers = hasPermission(
          currentMember.role as AppRole,
          "manageMembers"
        );
      }
    }

    return ctx.render({
      organization,
      members: members || [],
      isOwner,
      canManageMembers,
    });
  },
};

export default function OrganizationMembersPage({ data }: PageProps<PageData>) {
  const { organization, members, isOwner, canManageMembers, error } = data;

  if (error) {
    return (
      <>
        <Head>
          <title>エラー - Polimoney Ledger</title>
        </Head>
        <Layout currentPath="/organizations" title="エラー">
          <div class="alert alert-error">
            <span>{error}</span>
          </div>
        </Layout>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>メンバー管理 - {organization.name} - Polimoney Ledger</title>
      </Head>
      <Layout
        currentPath="/organizations"
        title={`${organization.name} - メンバー管理`}
      >
        <div class="max-w-4xl">
          {/* 戻るリンク */}
          <div class="mb-4">
            <a
              href={`/organizations/${organization.id}/ledger`}
              class="btn btn-ghost btn-sm"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              台帳に戻る
            </a>
          </div>

          <MemberManager
            organizationId={organization.id}
            initialMembers={members}
            isOwner={isOwner}
            canManageMembers={canManageMembers}
          />
        </div>
      </Layout>
    </>
  );
}
