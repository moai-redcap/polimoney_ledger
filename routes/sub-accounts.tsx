import { Head } from "fresh/runtime";
import { page } from "fresh";
import { Layout } from "../components/Layout.tsx";
import { getServiceClient, getSupabaseClient } from "../lib/supabase.ts";
import SubAccountManager from "../islands/SubAccountManager.tsx";
import { define } from "../lib/define.ts";

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

export const handler = define.handlers<PageData>({
  async GET(ctx) {
    const req = ctx.req;
    const userId = ctx.state.userId as string;
    if (!userId) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/login?redirect=/sub-accounts" },
      });
    }

    const supabase = userId === TEST_USER_ID
      ? getServiceClient()
      : getSupabaseClient(userId);

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
      return page({
        subAccounts: [],
        accountMaster: [],
        error: "補助科目の取得に失敗しました",
      });
    }

    return page({
      subAccounts: subAccountsResult.data || [],
      accountMaster: accountMasterResult.data || [],
    });
  },
});

export default define.page<typeof handler>(({ data }) => {
  const { subAccounts, accountMaster, error } = data;

  return (
    <>
      <Head>
        <title>補助科目 - Polimoney Ledger</title>
      </Head>
      <Layout currentPath="/sub-accounts" title="補助科目">
        <div style="max-width: 56rem;">
          {error && (
            <div class="st-alert st-alert--error" style="margin-bottom: var(--st-sys-spacing-4);">
              <div class="st-alert__icon">❌</div>
              <div class="st-alert__content">{error}</div>
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
});
