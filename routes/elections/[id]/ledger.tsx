import { Head } from "$fresh/runtime.ts";
import { Handlers, PageProps } from "$fresh/server.ts";
import { Layout } from "../../../components/Layout.tsx";
import { getSupabaseClient, getServiceClient } from "../../../lib/supabase.ts";
import JournalForm from "../../../islands/JournalForm.tsx";
import JournalList from "../../../islands/JournalList.tsx";

const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

interface Election {
  id: string;
  election_name: string;
  election_date: string;
  politicians: {
    name: string;
  } | null;
}

interface Journal {
  id: string;
  journal_date: string;
  description: string;
  status: "draft" | "approved";
  contact_id: string | null;
  created_at: string;
  journal_entries: {
    id: string;
    account_code: string;
    debit_amount: number;
    credit_amount: number;
  }[];
  contacts: {
    name: string;
  } | null;
}

interface PageData {
  election: Election | null;
  journals: Journal[];
  error?: string;
}

export const handler: Handlers<PageData> = {
  async GET(req, ctx) {
    const electionId = ctx.params.id;
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

      // 選挙情報を取得
      const { data: election, error: electionError } = await supabase
        .from("elections")
        .select("id, election_name, election_date, politicians(name)")
        .eq("id", electionId)
        .single();

      if (electionError || !election) {
        return ctx.render({
          election: null,
          journals: [],
          error: "選挙が見つかりません",
        });
      }

      // 仕訳一覧を取得
      const { data: journals, error: journalError } = await supabase
        .from("journals")
        .select(`
          id,
          journal_date,
          description,
          status,
          contact_id,
          created_at,
          journal_entries (
            id,
            account_code,
            debit_amount,
            credit_amount
          ),
          contacts (
            name
          )
        `)
        .eq("election_id", electionId)
        .eq("submitted_by_user_id", userId)
        .order("journal_date", { ascending: false });

      if (journalError) {
        console.error("Failed to fetch journals:", journalError);
      }

      return ctx.render({
        election,
        journals: journals || [],
      });
    } catch (error) {
      console.error("Error:", error);
      return ctx.render({
        election: null,
        journals: [],
        error: "エラーが発生しました",
      });
    }
  },
};

// 日付をフォーマット
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function ElectionLedgerPage({ data }: PageProps<PageData>) {
  const { election, journals, error } = data;

  if (error || !election) {
    return (
      <>
        <Head>
          <title>台帳が見つかりません - Polimoney Ledger</title>
        </Head>
        <Layout currentPath="/elections" title="台帳">
          <div class="alert alert-error">
            <span>{error || "選挙が見つかりません"}</span>
          </div>
          <div class="mt-4">
            <a href="/elections" class="btn btn-outline">
              ← 選挙一覧に戻る
            </a>
          </div>
        </Layout>
      </>
    );
  }

  const title = `${election.election_name}${
    election.politicians?.name ? ` (${election.politicians.name})` : ""
  }`;

  return (
    <>
      <Head>
        <title>{title} - 台帳 - Polimoney Ledger</title>
      </Head>
      <Layout currentPath="/elections" title={`${title} の台帳`}>
        {/* パンくずリスト */}
        <div class="text-sm breadcrumbs mb-4">
          <ul>
            <li>
              <a href="/elections">選挙一覧</a>
            </li>
            <li>{election.election_name}</li>
          </ul>
        </div>

        {/* 選挙情報バッジ */}
        <div class="mb-4">
          <span class="badge badge-outline">
            {formatDate(election.election_date)}
          </span>
        </div>

        {/* 仕訳入力フォーム */}
        <div class="card bg-base-100 shadow mb-6">
          <div class="card-body">
            <h2 class="card-title text-lg mb-4">仕訳を登録</h2>
            <JournalForm
              organizationId={null}
              electionId={election.id}
            />
          </div>
        </div>

        {/* 仕訳一覧 */}
        <div class="card bg-base-100 shadow">
          <div class="card-body">
            <h2 class="card-title text-lg mb-4">仕訳一覧</h2>
            <JournalList
              journals={journals}
              basePath={`/elections/${election.id}/ledger`}
            />
          </div>
        </div>
      </Layout>
    </>
  );
}
