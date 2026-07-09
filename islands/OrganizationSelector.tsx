import { useRef, useState } from "preact/hooks";
import type { Organization } from "../lib/hub-client.ts";

interface Props {
  initialOrganizations: Organization[];
}

const ORGANIZATION_TYPES: Record<string, string> = {
  political_party: "政党",
  support_group: "後援会",
  fund_management: "資金管理団体",
  other: "その他の政治団体",
};

const EVIDENCE_TYPES: Record<string, string> = {
  registration_form: "政治団体設立届出書（控え）",
  name_list: "政治団体名簿のスクリーンショット",
  financial_report: "政治資金収支報告書の表紙",
};

export default function OrganizationSelector({ initialOrganizations }: Props) {
  const [organizations] = useState<Organization[]>(initialOrganizations);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("");
  const [showRequestForm, setShowRequestForm] = useState(false);

  // フィルタリング
  const filteredOrganizations = organizations.filter((org) => {
    const matchesSearch = org.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesType = !selectedType || org.type === selectedType;
    return matchesSearch && matchesType;
  });

  // 種別でグループ化
  const groupedByType = filteredOrganizations.reduce((acc, org) => {
    if (!acc[org.type]) acc[org.type] = [];
    acc[org.type].push(org);
    return acc;
  }, {} as Record<string, Organization[]>);

  return (
    <div>
      {/* 検索・フィルター */}
      <div class="card bg-base-100 shadow-xl mb-6">
        <div class="st-card__content" style="padding: var(--st-sys-spacing-6);">
          <div class="flex flex-wrap gap-4">
            <div class="form-control flex-1 min-w-[200px]">
              <label class="st-field__label-wrapper">
                <span class="st-field__label">🔍 検索</span>
              </label>
              <input
                type="text"
                value={searchTerm}
                onInput={(e) =>
                  setSearchTerm((e.target as HTMLInputElement).value)}
                placeholder="団体名で検索..."
                class="st-input" style="width: 100%;"
              />
            </div>
            <div class="form-control w-48">
              <label class="st-field__label-wrapper">
                <span class="st-field__label">種別</span>
              </label>
              <select
                value={selectedType}
                onChange={(e) =>
                  setSelectedType((e.target as HTMLSelectElement).value)}
                class="st-select" style="width: 100%;"
              >
                <option value="">すべて</option>
                {Object.entries(ORGANIZATION_TYPES).map(([code, name]) => (
                  <option key={code} value={code}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 団体一覧 */}
      <div class="st-stack st-stack--lg">
        {Object.keys(groupedByType).length > 0
          ? (
            Object.entries(ORGANIZATION_TYPES).map(([type, typeName]) => {
              const orgs = groupedByType[type];
              if (!orgs || orgs.length === 0) return null;
              return (
                <div key={type}>
                  <h2 class="text-xl font-semibold mb-3 flex items-center">
                    <span class="mr-2">🏛️</span>
                    {typeName}
                  </h2>
                  <div class="st-card st-card--elevated">
                    <div class="card-body p-0">
                      <ul class="menu p-0">
                        {orgs.map((org) => (
                          <li key={org.id}>
                            <div class="flex justify-between items-center py-4 px-6 border-b border-base-200 last:border-b-0">
                              <div>
                                <h3 style="font-weight: 500;">{org.name}</h3>
                                <div class="mt-1 flex items-center gap-2">
                                  <span class="badge badge-success badge-sm">
                                    {ORGANIZATION_TYPES[org.type] || org.type}
                                  </span>
                                  <span class="text-xs opacity-70">
                                    {new Date(org.created_at)
                                      .toLocaleDateString(
                                        "ja-JP",
                                      )}
                                  </span>
                                </div>
                              </div>
                              <a
                                href={`/organizations/${org.id}/ledger`}
                                class="st-button st-button--filled st-button--sm"
                              >
                                台帳を開く
                              </a>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })
          )
          : (
            <div class="st-card st-card--elevated">
              <div class="card-body items-center text-center">
                <p style="color: var(--st-sys-color-on-surface-variant);">
                  該当する政治団体が見つかりません
                </p>
              </div>
            </div>
          )}
      </div>

      {/* 登録リクエストセクション */}
      <div role="alert" class="alert alert-warning mt-8">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          style="width: 1.5rem; height: 1.5rem; flex-shrink: 0;"
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <div>
          <h3 style="font-weight: 700;">該当する政治団体がない場合</h3>
          <p style="font-size: var(--st-sys-typescale-body-small-size);">
            お探しの政治団体が見つからない場合は、証明書類を添付して登録をリクエストできます。
          </p>
        </div>
        <button
          class="btn btn-sm btn-warning"
          onClick={() => setShowRequestForm(true)}
        >
          登録をリクエスト
        </button>
      </div>

      {/* 登録リクエストモーダル */}
      {showRequestForm && (
        <OrganizationRequestModal onClose={() => setShowRequestForm(false)} />
      )}
    </div>
  );
}

// 政治団体登録リクエストモーダル
function OrganizationRequestModal({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState({
    name: "",
    type: "support_group",
    registration_authority: "",
    evidence_type: "registration_form",
    evidence_file_url: "",
    evidence_file_name: "",
    notes: "",
    requested_by_email: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const formDataUpload = new FormData();
      formDataUpload.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formDataUpload,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "ファイルのアップロードに失敗しました");
      }

      const data = await response.json();
      setFormData({
        ...formData,
        evidence_file_url: data.url,
        evidence_file_name: file.name,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "アップロードエラー");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();

    if (!formData.evidence_file_url) {
      setError("証明書類をアップロードしてください");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/organization-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "リクエストの送信に失敗しました");
      }

      alert("登録リクエストを送信しました。承認されるまでお待ちください。");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <dialog class="modal modal-open">
      <div class="modal-box max-w-2xl">
        <form method="dialog">
          <button
            class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
            onClick={onClose}
            type="button"
          >
            ✕
          </button>
        </form>
        <h3 class="font-bold text-lg mb-4">政治団体の登録リクエスト</h3>

        {error && (
          <div role="alert" class="st-alert st-alert--error" style="margin-bottom: var(--st-sys-spacing-4);">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              style="width: 1.5rem; height: 1.5rem; flex-shrink: 0;"
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

        <form onSubmit={handleSubmit} class="st-stack st-stack--md">
          <div class="st-field">
            <label class="st-field__label-wrapper">
              <span class="st-field__label">
                団体名 <span style="color: var(--st-sys-color-error);">*</span>
              </span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onInput={(e) =>
                setFormData({
                  ...formData,
                  name: (e.target as HTMLInputElement).value,
                })}
              placeholder="例: 山田太郎後援会"
              class="st-input" style="width: 100%;"
            />
          </div>

          <div class="st-field">
            <label class="st-field__label-wrapper">
              <span class="st-field__label">
                団体種別 <span style="color: var(--st-sys-color-error);">*</span>
              </span>
            </label>
            <select
              required
              value={formData.type}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  type: (e.target as HTMLSelectElement).value,
                })}
              class="st-select" style="width: 100%;"
            >
              {Object.entries(ORGANIZATION_TYPES).map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div class="st-field">
            <label class="st-field__label-wrapper">
              <span class="st-field__label">届出先</span>
            </label>
            <input
              type="text"
              value={formData.registration_authority}
              onInput={(e) =>
                setFormData({
                  ...formData,
                  registration_authority: (e.target as HTMLInputElement).value,
                })}
              placeholder="例: 東京都選挙管理委員会"
              class="st-input" style="width: 100%;"
            />
          </div>

          <div class="st-field">
            <label class="st-field__label-wrapper">
              <span class="st-field__label">
                証明書類の種類 <span style="color: var(--st-sys-color-error);">*</span>
              </span>
            </label>
            <select
              required
              value={formData.evidence_type}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  evidence_type: (e.target as HTMLSelectElement).value,
                })}
              class="st-select" style="width: 100%;"
            >
              {Object.entries(EVIDENCE_TYPES).map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div class="st-field">
            <label class="st-field__label-wrapper">
              <span class="st-field__label">
                証明書類のアップロード <span style="color: var(--st-sys-color-error);">*</span>
              </span>
            </label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*,.pdf"
              class="file-input file-input-bordered w-full"
            />
            {isUploading && (
              <span class="mt-2 text-sm">
                <span class="loading loading-spinner loading-sm mr-2" />
                アップロード中...
              </span>
            )}
            {formData.evidence_file_name && !isUploading && (
              <span class="mt-2 text-sm text-success">
                ✅ {formData.evidence_file_name}
              </span>
            )}
            <label class="st-field__label-wrapper">
              <span class="st-field__helper">
                政治団体設立届出書の控え、名簿のスクリーンショット等をアップロードしてください
              </span>
            </label>
          </div>

          <div class="st-field">
            <label class="st-field__label-wrapper">
              <span class="st-field__label">連絡先メールアドレス</span>
            </label>
            <input
              type="email"
              value={formData.requested_by_email}
              onInput={(e) =>
                setFormData({
                  ...formData,
                  requested_by_email: (e.target as HTMLInputElement).value,
                })}
              placeholder="example@email.com"
              class="st-input" style="width: 100%;"
            />
          </div>

          <div class="st-field">
            <label class="st-field__label-wrapper">
              <span class="st-field__label">備考</span>
            </label>
            <textarea
              value={formData.notes}
              onInput={(e) =>
                setFormData({
                  ...formData,
                  notes: (e.target as HTMLTextAreaElement).value,
                })}
              rows={3}
              class="textarea textarea-bordered w-full"
            />
          </div>

          <div class="modal-action">
            <button type="button" class="st-button st-button--text" onClick={onClose}>
              キャンセル
            </button>
            <button
              type="submit"
              class="st-button st-button--filled"
              disabled={isSubmitting || !formData.evidence_file_url}
            >
              {isSubmitting ? "送信中..." : "リクエストを送信"}
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}
