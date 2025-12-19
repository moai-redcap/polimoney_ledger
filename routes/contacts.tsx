import { Head } from "$fresh/runtime.ts";
import { Handlers, PageProps } from "$fresh/server.ts";
import { Layout } from "../components/Layout.tsx";
import { getServiceClient, getSupabaseClient } from "../lib/supabase.ts";
import ContactManager from "../islands/ContactManager.tsx";

const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

interface Contact {
  id: string;
  contact_type: "person" | "corporation";
  name: string;
  address: string | null;
  occupation: string | null;
  is_name_private: boolean;
  is_address_private: boolean;
  is_occupation_private: boolean;
  privacy_reason_type: string | null;
  privacy_reason_other: string | null;
  created_at: string;
}

interface PageData {
  contacts: Contact[];
  error?: string;
}

export const handler: Handlers<PageData> = {
  async GET(req, ctx) {
    const userId = ctx.state.userId as string;
    if (!userId) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/login?redirect=/contacts" },
      });
    }

    const supabase =
      userId === TEST_USER_ID ? getServiceClient() : getSupabaseClient(req);

    const { data, error } = await supabase
      .from("contacts")
      .select("*")
      .eq("owner_user_id", userId)
      .order("name");

    if (error) {
      console.error("Failed to fetch contacts:", error);
      return ctx.render({ contacts: [], error: "関係者の取得に失敗しました" });
    }

    return ctx.render({ contacts: data || [] });
  },
};

export default function ContactsPage({ data }: PageProps<PageData>) {
  const { contacts, error } = data;

  return (
    <>
      <Head>
        <title>関係者マスタ - Polimoney Ledger</title>
      </Head>
      <Layout currentPath="/contacts" title="関係者マスタ">
        <div class="max-w-4xl">
          {error && (
            <div class="alert alert-error mb-4">
              <span>{error}</span>
            </div>
          )}

          <ContactManager initialContacts={contacts} />
        </div>
      </Layout>
    </>
  );
}
