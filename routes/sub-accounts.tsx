import { Head } from "$fresh/runtime.ts";
import { Handlers, PageProps } from "$fresh/server.ts";
import { Layout } from "../components/Layout.tsx";
import { getServiceClient, getSupabaseClient } from "../lib/supabase.ts";
import SubAccountManager from "../islands/SubAccountManager.tsx";

const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

interface SubAccount {
  id: string;
  ledger_type: "political_organization" | "election";
  parent_account_code: string;
  name: string;
  created_at: string;
}

interface AccountMaster {
  code: string;
  name: string;
  type: string;
  report_category: string;
  available_ledger_types: string[];
}

interface PageData {
  subAccounts: SubAccount[];
  accountMaster: AccountMaster[];
  error?: string;
}

export const handler: Handlers<PageData> = {
  async GET(req, ctx) {
    const userId = ctx.state.userId as string;
    if (!userId) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/login?redirect=/sub-accounts" },
      });
    }

    const supabase =
      userId === TEST_USER_ID ? getServiceClient() : getSupabaseClient(req);

    const [subAccountsResult, accountMasterResult] = await Promise.all([
      supabase
        .from("sub_accounts")
        .select("*")
        .eq("owner_user_id", userId)
        .order("parent_account_code")
        .order("name"),
      supabase
        .from("account_master")
        .select("code, name, type, report_category, available_ledger_types")
        .order("code"),
    ]);

    if (subAccountsResult.error) {
      console.error("Failed to fetch sub_accounts:", subAccountsResult.error);
      return ctx.render({
        subAccounts: [],
        accountMaster: [],
        error: "補助科目の取得に失敗しました",
      });
    }

    return ctx.render({
      subAccounts: subAccountsResult.data || [],
      accountMaster: accountMasterResult.data || [],
    });
  },
};

export default function SubAccountsPage({ data }: PageProps<PageData>) {
  const { subAccounts, accountMaster, error } = data;

  return (
    <>
      <Head>
        <title>補助科目 - Polimoney Ledger</title>
      </Head>
      <Layout currentPath="/sub-accounts" title="補助科目">
        <div class="max-w-4xl">
          {error && (
            <div class="alert alert-error mb-4">
              <span>{error}</span>
            </div>
          )}

          <SubAccountManager
            initialSubAccounts={subAccounts}
            accountMaster={accountMaster}
          />
        </div>
      </Layout>
    </>
  );
}
