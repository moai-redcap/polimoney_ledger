import { Head } from "$fresh/runtime.ts";
import { Handlers, PageProps } from "$fresh/server.ts";
import { getOrganizations, type Organization } from "../lib/hub-client.ts";
import { Layout } from "../components/Layout.tsx";
import OrganizationSelector from "../islands/OrganizationSelector.tsx";

interface OrganizationsPageData {
  organizations: Organization[];
  error?: string;
}

export const handler: Handlers<OrganizationsPageData> = {
  async GET(_req, ctx) {
    try {
      const organizations = await getOrganizations();
      return ctx.render({ organizations });
    } catch (error) {
      console.error("Failed to fetch organizations:", error);
      return ctx.render({
        organizations: [],
        error:
          error instanceof Error
            ? error.message
            : "政治団体一覧の取得に失敗しました",
      });
    }
  },
};

export default function OrganizationsPage({
  data,
}: PageProps<OrganizationsPageData>) {
  const { organizations, error } = data;

  return (
    <>
      <Head>
        <title>政治団体一覧 - Polimoney Ledger</title>
      </Head>
      <Layout currentPath="/organizations" title="政治団体一覧">
        {error && (
          <div role="alert" class="alert alert-error mb-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="stroke-current shrink-0 h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{error}</span>
          </div>
        )}
        <OrganizationSelector initialOrganizations={organizations} />
      </Layout>
    </>
  );
}
