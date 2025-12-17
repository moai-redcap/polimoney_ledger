import { Head } from "$fresh/runtime.ts";
import { Handlers, PageProps } from "$fresh/server.ts";
import { Layout } from "../../../components/Layout.tsx";
import { getSupabaseClient, getServiceClient } from "../../../lib/supabase.ts";
import JournalForm from "../../../islands/JournalForm.tsx";
import JournalList from "../../../islands/JournalList.tsx";

const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

interface Organization {
  id: string;
  name: string;
  organization_type: string;
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
  organization: Organization | null;
  journals: Journal[];
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

      // 政治団体情報を取得
      const { data: organization, error: orgError } = await supabase
        .from("political_organizations")
        .select("id, name, organization_type")
        .eq("id", organizationId)
        .single();

      if (orgError || !organization) {
        return ctx.render({
          organization: null,
          journals: [],
          error: "政治団体が見つかりません",
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
        .eq("organization_id", organizationId)
        .eq("submitted_by_user_id", userId)
        .order("journal_date", { ascending: false });

      if (journalError) {
        console.error("Failed to fetch journals:", journalError);
      }

      return ctx.render({
        organization,
        journals: journals || [],
      });
    } catch (error) {
      console.error("Error:", error);
      return ctx.render({
        organization: null,
        journals: [],
        error: "エラーが発生しました",
      });
    }
  },
};

export default function OrganizationLedgerPage({ data }: PageProps<PageData>) {
  const { organization, journals, error } = data;

  if (error || !organization) {
    return (
      <>
        <Head>
          <title>台帳が見つかりません - Polimoney Ledger</title>
        </Head>
        <Layout currentPath="/organizations" title="台帳">
          <div class="alert alert-error">
            <span>{error || "政治団体が見つかりません"}</span>
          </div>
          <div class="mt-4">
            <a href="/organizations" class="btn btn-outline">
              ← 政治団体一覧に戻る
            </a>
          </div>
        </Layout>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>{organization.name} - 台帳 - Polimoney Ledger</title>
      </Head>
      <Layout currentPath="/organizations" title={`${organization.name} の台帳`}>
        {/* パンくずリスト */}
        <div class="text-sm breadcrumbs mb-4">
          <ul>
            <li>
              <a href="/organizations">政治団体一覧</a>
            </li>
            <li>{organization.name}</li>
          </ul>
        </div>

        {/* 仕訳入力フォーム */}
        <div class="card bg-base-100 shadow mb-6">
          <div class="card-body">
            <h2 class="card-title text-lg mb-4">仕訳を登録</h2>
            <JournalForm
              organizationId={organization.id}
              electionId={null}
            />
          </div>
        </div>

        {/* 仕訳一覧 */}
        <div class="card bg-base-100 shadow">
          <div class="card-body">
            <h2 class="card-title text-lg mb-4">仕訳一覧</h2>
            <JournalList
              journals={journals}
              basePath={`/organizations/${organization.id}/ledger`}
            />
          </div>
        </div>
      </Layout>
    </>
  );
}
