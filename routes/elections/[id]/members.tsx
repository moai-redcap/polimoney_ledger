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
        {/* パンくずリスト */}
        <div class="text-sm breadcrumbs mb-4">
          <ul>
            <li>
              <a href="/elections">選挙一覧</a>
            </li>
            <li>{election.election_name}</li>
          </ul>
        </div>

        {/* タブナビゲーション */}
        <div role="tablist" class="tabs tabs-bordered mb-6">
          <a
            role="tab"
            href={`/elections/${election.id}/ledger`}
            class="tab hover:text-primary"
          >
            仕訳一覧
          </a>
          <a
            role="tab"
            href={`/elections/${election.id}/assets`}
            class="tab hover:text-primary"
          >
            資産一覧
          </a>
          <a role="tab" class="tab tab-active">
            メンバー
          </a>
        </div>

        <div class="max-w-4xl">
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
