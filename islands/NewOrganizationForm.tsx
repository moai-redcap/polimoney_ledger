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
        <div class="st-alert st-alert--error" style="margin-bottom: var(--st-sys-spacing-4);">
          <div class="st-alert__content">{error}</div>
        </div>
      )}

      {/* 管理する政治団体一覧 */}
      <div style="max-height: 24rem; overflow-y: auto; border: 1px solid var(--st-sys-color-outline-variant); border-radius: var(--st-sys-shape-corner-large); margin-bottom: var(--st-sys-spacing-6);">
        {managedOrganizations.length === 0
          ? (
            <div style="padding: var(--st-sys-spacing-8); text-align: center; color: var(--st-sys-color-on-surface-variant);">
              管理する政治団体がありません
            </div>
          )
          : (
            managedOrganizations.map((org) => (
              <label
                key={org.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--st-sys-spacing-4)",
                  padding: "var(--st-sys-spacing-4)",
                  cursor: "pointer",
                  borderBottom: "1px solid var(--st-sys-color-outline-variant)",
                  background: selectedOrgId === org.id
                    ? "color-mix(in srgb, var(--st-sys-color-primary) 10%, transparent)"
                    : "transparent",
                  transition: "background 200ms",
                }}
              >
                <input
                  type="radio"
                  name="organization"
                  checked={selectedOrgId === org.id}
                  onChange={() => setSelectedOrgId(org.id)}
                  style="accent-color: var(--st-sys-color-primary);"
                />
                <div style="flex: 1;">
                  <div style="font-weight: 500;">{org.name}</div>
                  <div class="st-flex st-gap-2" style="margin-top: var(--st-sys-spacing-1);">
                    <span class="st-badge st-badge--sm st-badge--primary">
                      {ORGANIZATION_TYPES[org.type] || org.type}
                    </span>
                    <span class="st-badge st-badge--sm" style="background: var(--st-sys-color-tertiary-container); color: var(--st-sys-color-on-tertiary-container);">
                      ✅ 認証済み
                    </span>
                  </div>
                </div>
              </label>
            ))
          )}
      </div>

      {/* 送信ボタン */}
      <div class="st-flex st-gap-4">
        <a href="/organizations" class="st-button st-button--outlined">
          キャンセル
        </a>
        <button
          type="submit"
          class="st-button st-button--filled"
          style="flex: 1;"
          disabled={isSubmitting || !selectedOrgId}
        >
          {isSubmitting ? "作成中..." : "政治団体台帳を作成"}
        </button>
      </div>
    </form>
  );
}
