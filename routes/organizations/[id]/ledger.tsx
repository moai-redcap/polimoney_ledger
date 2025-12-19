import { Head } from "$fresh/runtime.ts";
import { Handlers, PageProps } from "$fresh/server.ts";
import { Layout } from "../../../components/Layout.tsx";
import { getServiceClient, getSupabaseClient } from "../../../lib/supabase.ts";
import { type AccountCode, getAccountCodes } from "../../../lib/hub-client.ts";
import JournalFormDrawer from "../../../islands/JournalFormDrawer.tsx";
import JournalList from "../../../islands/JournalList.tsx";
import ExportCSVButton from "../../../islands/ExportCSVButton.tsx";

const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

interface Organization {
  id: string;
  name: string;
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

interface Contact {
  id: string;
  name: string;
  contact_type: string;
}

interface SubAccount {
  id: string;
  name: string;
  parent_account_code: string;
}

interface PageData {
  organization: Organization | null;
  journals: Journal[];
  accountCodes: AccountCode[];
  contacts: Contact[];
  subAccounts: SubAccount[];
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
        .select("id, name")
        .eq("id", organizationId)
        .single();

      if (orgError || !organization) {
        return ctx.render({
          organization: null,
          journals: [],
          accountCodes: [],
          contacts: [],
          subAccounts: [],
          error: "政治団体が見つかりません",
        });
      }

      // 並列で各種データを取得
      const [journalsResult, contactsResult, subAccountsResult, accountCodes] =
        await Promise.all([
          // 仕訳一覧
          supabase
            .from("journals")
            .select(
              `
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
            `
            )
            .eq("organization_id", organizationId)
            .order("journal_date", { ascending: false }),
          // 関係者一覧
          supabase
            .from("contacts")
            .select("id, name, contact_type")
            .eq("owner_user_id", userId)
            .order("name"),
          // 補助科目一覧
          supabase
            .from("sub_accounts")
            .select("id, name, parent_account_code")
            .eq("owner_user_id", userId)
            .eq("ledger_type", "political_organization")
            .order("name"),
          // 勘定科目マスタ（Hub から取得）
          getAccountCodes({ ledgerType: "organization" }).catch((error) => {
            console.error("Failed to fetch account codes from Hub:", error);
            return [];
          }),
        ]);

      if (journalsResult.error) {
        console.error("Failed to fetch journals:", journalsResult.error);
      }

      return ctx.render({
        organization,
        journals: journalsResult.data || [],
        accountCodes,
        contacts: contactsResult.data || [],
        subAccounts: subAccountsResult.data || [],
      });
    } catch (error) {
      console.error("Error:", error);
      return ctx.render({
        organization: null,
        journals: [],
        accountCodes: [],
        contacts: [],
        subAccounts: [],
        error: "エラーが発生しました",
      });
    }
  },
};

export default function OrganizationLedgerPage({ data }: PageProps<PageData>) {
  const { organization, journals, accountCodes, contacts, subAccounts, error } =
    data;

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
      <Layout
        currentPath="/organizations"
        title={`${organization.name} の台帳`}
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
          <a role="tab" class="tab tab-active">
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
        </div>

        {/* 勘定科目取得エラー警告 */}
        {accountCodes.length === 0 && (
          <div class="alert alert-warning mb-4">
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
            <span>
              勘定科目マスタの取得に失敗しました。仕訳登録には勘定科目が必要です。
            </span>
          </div>
        )}

        {/* 仕訳一覧 */}
        <div class="card bg-base-100 shadow">
          <div class="card-body">
            <div class="flex items-center justify-between mb-4">
              <h2 class="card-title text-lg">
                仕訳一覧
                <span class="badge badge-ghost">{journals.length}件</span>
              </h2>
              <div class="flex items-center gap-2">
                <ExportCSVButton organizationId={organization.id} />
                <JournalFormDrawer
                  ledgerType="organization"
                  organizationId={organization.id}
                  electionId={null}
                  accountCodes={accountCodes}
                  contacts={contacts}
                  subAccounts={subAccounts}
                />
              </div>
            </div>
            <JournalList
              journals={journals}
              basePath={`/organizations/${organization.id}/ledger`}
              accountCodes={accountCodes}
            />
          </div>
        </div>
      </Layout>
    </>
  );
}
