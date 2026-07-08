import { useState } from "preact/hooks";

interface ManagedOrganization {
  id: string;
  name: string;
  type: string;
  verified_at: string;
  verified_domain: string;
}

interface NewOrganizationFormProps {
  managedOrganizations: ManagedOrganization[];
}

const ORGANIZATION_TYPES: Record<string, string> = {
  political_party: "政党",
  support_group: "後援会",
  fund_management: "資金管理団体",
  other: "その他の政治団体",
};

export default function NewOrganizationForm({
  managedOrganizations,
}: NewOrganizationFormProps) {
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (!selectedOrgId) {
        setError("政治団体を選択してください");
        setIsSubmitting(false);
        return;
      }

      const selectedOrg = managedOrganizations.find(
        (o) => o.id === selectedOrgId,
      );
      if (!selectedOrg) {
        setError("選択された政治団体が見つかりません");
        setIsSubmitting(false);
        return;
      }

      const response = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: selectedOrg.name,
          hub_organization_id: selectedOrgId,
        }),
      });

      if (!response.ok) {
        const json = await response.json();
        throw new Error(json.error || "政治団体台帳の作成に失敗しました");
      }

      const result = await response.json();
      // 作成した政治団体台帳ページにリダイレクト
      window.location.href = `/organizations/${result.organization_id}/ledger`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div class="alert alert-error mb-4">
          <span>{error}</span>
        </div>
      )}

      {/* 管理する政治団体一覧 */}
      <div class="max-h-96 overflow-y-auto border rounded-lg mb-6">
        {managedOrganizations.length === 0
          ? (
            <div class="p-8 text-center text-base-content/60">
              管理する政治団体がありません
            </div>
          )
          : (
            managedOrganizations.map((org) => (
              <label
                key={org.id}
                class={`flex items-center gap-4 p-4 cursor-pointer hover:bg-base-200 border-b ${
                  selectedOrgId === org.id ? "bg-primary/10" : ""
                }`}
              >
                <input
                  type="radio"
                  name="organization"
                  class="radio radio-primary"
                  checked={selectedOrgId === org.id}
                  onChange={() => setSelectedOrgId(org.id)}
                />
                <div class="flex-1">
                  <div class="font-medium">{org.name}</div>
                  <div class="flex gap-2 mt-1">
                    <span class="badge badge-sm badge-info">
                      {ORGANIZATION_TYPES[org.type] || org.type}
                    </span>
                    <span class="badge badge-sm badge-success">
                      ✓ 認証済み
                    </span>
                  </div>
                </div>
              </label>
            ))
          )}
      </div>

      {/* 送信ボタン */}
      <div class="flex gap-4">
        <a href="/organizations" class="btn btn-outline">
          キャンセル
        </a>
        <button
          type="submit"
          class={`btn btn-primary flex-1 ${isSubmitting ? "loading" : ""}`}
          disabled={isSubmitting || !selectedOrgId}
        >
          {isSubmitting ? "作成中..." : "政治団体台帳を作成"}
        </button>
      </div>
    </form>
  );
}
