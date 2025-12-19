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

interface Election {
  id: string;
  election_name: string;
  owner_user_id: string;
}

interface PageData {
  election: Election;
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
          Location: `/login?redirect=/elections/${ctx.params.id}/members`,
        },
      });
    }

    const electionId = ctx.params.id;
    const supabase =
      userId === TEST_USER_ID ? getServiceClient() : getSupabaseClient(req);

    // 選挙の情報を取得
    const { data: election, error: elecError } = await supabase
      .from("elections")
      .select("id, election_name, owner_user_id")
      .eq("id", electionId)
      .single();

    if (elecError || !election) {
      return ctx.render({
        election: { id: "", election_name: "", owner_user_id: "" },
        members: [],
        isOwner: false,
        canManageMembers: false,
        error: "選挙が見つかりません",
      });
    }

    const isOwner = election.owner_user_id === userId;

    // メンバー一覧を取得
    const { data: members } = await supabase
      .from("ledger_members")
      .select("id, user_id, role, created_at, invited_by_user_id")
      .eq("election_id", electionId)
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
      election,
      members: members || [],
      isOwner,
      canManageMembers,
    });
  },
};

export default function ElectionMembersPage({ data }: PageProps<PageData>) {
  const { election, members, isOwner, canManageMembers, error } = data;

  if (error) {
    return (
      <>
        <Head>
          <title>エラー - Polimoney Ledger</title>
        </Head>
        <Layout currentPath="/elections" title="エラー">
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
        <title>
          メンバー管理 - {election.election_name} - Polimoney Ledger
        </title>
      </Head>
      <Layout
        currentPath="/elections"
        title={`${election.election_name} - メンバー管理`}
      >
        <div class="max-w-4xl">
          {/* 戻るリンク */}
          <div class="mb-4">
            <a
              href={`/elections/${election.id}/ledger`}
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
            electionId={election.id}
            initialMembers={members}
            isOwner={isOwner}
            canManageMembers={canManageMembers}
          />
        </div>
      </Layout>
    </>
  );
}
