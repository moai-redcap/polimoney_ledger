import { useState, useMemo, useRef, useEffect } from "preact/hooks";

interface ManagedOrganization {
  id: string;
  name: string;
  type: string;
  manager_verified_at: string;
  manager_verified_domain: string;
}

interface OrganizationManagerVerification {
  id: string;
  organization_name: string;
  official_email: string;
  status: string;
  created_at: string;
}

interface Organization {
  id: string;
  name: string;
  type: string;
}

interface Props {
  userId: string;
  managedOrganizations: ManagedOrganization[];
  organizationManagerVerifications: OrganizationManagerVerification[];
  hubOrganizations: Organization[];
  /** ドメイン変更モード */
  changeDomain?: boolean;
}

const statusLabels: Record<string, { label: string; class: string }> = {
  pending: { label: "保留中", class: "badge-warning" },
  email_sent: { label: "メール送信済", class: "badge-info" },
  email_verified: { label: "承認待ち", class: "badge-info" },
  approved: { label: "承認済み", class: "badge-success" },
  rejected: { label: "却下", class: "badge-error" },
};

const organizationTypeLabels: Record<string, string> = {
  political_party: "政党",
  support_group: "後援会",
  fund_management: "資金管理団体",
  other: "その他",
};

export default function OrganizationManagerVerificationForm({
  userId,
  managedOrganizations,
  organizationManagerVerifications,
  hubOrganizations,
  changeDomain = false,
}: Props) {
  // フォーム表示（ドメイン変更モードの場合は最初から表示）
  const [showForm, setShowForm] = useState(changeDomain);

  // 検索可能コンボボックス
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 新規作成用
  const [orgName, setOrgName] = useState("");
  const [orgType, setOrgType] = useState("other");
  const [orgEmail, setOrgEmail] = useState("");
  const [orgRole, setOrgRole] = useState("");

  // メール認証
  const [verificationCode, setVerificationCode] = useState("");
  const [activeVerificationId, setActiveVerificationId] = useState<
    string | null
  >(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // 検索フィルタリング
  const filteredOrgs = useMemo(() => {
    if (!searchQuery.trim()) return hubOrganizations;
    const query = searchQuery.toLowerCase();
    return hubOrganizations.filter(
      (org) =>
        org.name.toLowerCase().includes(query) ||
        (organizationTypeLabels[org.type] || org.type)
          .toLowerCase()
          .includes(query)
    );
  }, [searchQuery, hubOrganizations]);

  // クリック外でドロップダウンを閉じる
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 政治団体を選択
  const handleSelectOrg = (org: Organization | null) => {
    setSelectedOrg(org);
    if (org) {
      setSearchQuery(org.name);
      setOrgName(org.name);
      setOrgType(org.type);
    } else {
      setSearchQuery("");
      setOrgName("");
      setOrgType("other");
    }
    setIsDropdownOpen(false);
  };

  // 申請送信
  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/organizations/manager-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organization_id: selectedOrg?.id || undefined,
          organization_name: selectedOrg ? selectedOrg.name : orgName,
          organization_type: selectedOrg ? selectedOrg.type : orgType,
          official_email: orgEmail,
          role_in_organization: orgRole || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "申請に失敗しました");
      }

      setMessage({ type: "success", text: "認証申請を送信しました" });
      setShowForm(false);
      setTimeout(() => location.reload(), 1500);
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "申請に失敗しました",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 認証コード送信
  const handleSendCode = async (verificationId: string) => {
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/organizations/manager-verify/${verificationId}/send-code`,
        { method: "POST" }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "コード送信に失敗しました");
      }

      setActiveVerificationId(verificationId);
      setMessage({ type: "success", text: "認証コードを送信しました" });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error ? error.message : "コード送信に失敗しました",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 認証コード検証
  const handleVerifyCode = async (e: Event) => {
    e.preventDefault();
    if (!activeVerificationId) return;

    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/organizations/manager-verify/${activeVerificationId}/verify-code`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: verificationCode }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "認証に失敗しました");
      }

      setMessage({ type: "success", text: "メール認証が完了しました" });
      setTimeout(() => location.reload(), 1500);
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "認証に失敗しました",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div class="space-y-6">
      {/* メッセージ */}
      {message && (
        <div
          role="alert"
          class={`alert ${
            message.type === "success" ? "alert-success" : "alert-error"
          }`}
        >
          <span>{message.text}</span>
        </div>
      )}

      {/* 管理中の団体一覧 */}
      {managedOrganizations.length > 0 && (
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <h3 class="card-title text-base">管理している政治団体</h3>
            <div class="space-y-3">
              {managedOrganizations.map((org) => (
                <div
                  key={org.id}
                  class="flex items-center justify-between p-4 bg-base-200 rounded-lg"
                >
                  <div class="flex items-center gap-3">
                    <div class="avatar placeholder">
                      <div class="bg-success text-success-content rounded-full w-10">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          class="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    </div>
                    <div>
                      <span class="font-medium">{org.name}</span>
                      <span class="badge badge-outline ml-2">
                        {organizationTypeLabels[org.type] || org.type}
                      </span>
                    </div>
                  </div>
                  <span class="text-sm text-base-content/70">
                    {org.manager_verified_domain}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 申請履歴 */}
      {organizationManagerVerifications.filter((v) => v.status !== "approved")
        .length > 0 && (
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <h3 class="card-title text-base">申請履歴</h3>
            <div class="space-y-3">
              {organizationManagerVerifications
                .filter((v) => v.status !== "approved")
                .map((v) => (
                  <div
                    key={v.id}
                    class="flex items-center justify-between p-4 bg-base-200 rounded-lg"
                  >
                    <div>
                      <span class="font-medium">{v.organization_name}</span>
                      <span class="text-sm text-base-content/70 ml-2">
                        ({v.official_email})
                      </span>
                      <p class="text-xs text-base-content/50">
                        {new Date(v.created_at).toLocaleDateString("ja-JP")}
                      </p>
                    </div>
                    <div class="flex items-center gap-2">
                      <span
                        class={`badge ${
                          statusLabels[v.status]?.class || "badge-ghost"
                        }`}
                      >
                        {statusLabels[v.status]?.label || v.status}
                      </span>
                      {v.status === "email_sent" && (
                        <button
                          class="btn btn-sm btn-primary"
                          onClick={() => handleSendCode(v.id)}
                          disabled={isSubmitting}
                        >
                          コードを再送信
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* 認証コード入力 */}
      {activeVerificationId && (
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <h3 class="card-title text-base">認証コードを入力</h3>
            <p class="text-sm text-base-content/70 mb-4">
              メールに送信された6桁のコードを入力してください。
            </p>
            <form onSubmit={handleVerifyCode}>
              <div class="flex gap-2">
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) =>
                    setVerificationCode((e.target as HTMLInputElement).value)
                  }
                  class="input input-bordered flex-1"
                  placeholder="6桁のコード"
                  maxLength={6}
                />
                <button
                  type="submit"
                  class="btn btn-primary"
                  disabled={isSubmitting || verificationCode.length !== 6}
                >
                  認証
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 新規申請フォーム */}
      {showForm ? (
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <h3 class="card-title text-base">認証申請</h3>
            <form onSubmit={handleSubmit} class="space-y-4">
              {/* 検索可能コンボボックス */}
              <div class="form-control" ref={dropdownRef}>
                <label class="label">
                  <span class="label-text">政治団体を検索・選択</span>
                </label>
                <div class="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery((e.target as HTMLInputElement).value);
                      setSelectedOrg(null);
                      setIsDropdownOpen(true);
                    }}
                    onFocus={() => setIsDropdownOpen(true)}
                    class="input input-bordered w-full"
                    placeholder="団体名を入力して検索..."
                  />
                  {/* ドロップダウン */}
                  {isDropdownOpen && (
                    <div class="absolute z-50 w-full mt-1 bg-base-100 border border-base-300 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                      {/* 新規作成オプション */}
                      <button
                        type="button"
                        class={`w-full px-4 py-3 text-left hover:bg-base-200 border-b border-base-300 ${
                          !selectedOrg && !searchQuery ? "bg-primary/10" : ""
                        }`}
                        onClick={() => handleSelectOrg(null)}
                      >
                        <span class="font-medium text-primary">
                          ＋ 新規作成
                        </span>
                        <span class="text-sm text-base-content/70 ml-2">
                          （一覧にない場合）
                        </span>
                      </button>
                      {/* 検索結果 */}
                      {filteredOrgs.length > 0 ? (
                        filteredOrgs.map((org) => (
                          <button
                            type="button"
                            key={org.id}
                            class={`w-full px-4 py-3 text-left hover:bg-base-200 ${
                              selectedOrg?.id === org.id ? "bg-primary/10" : ""
                            }`}
                            onClick={() => handleSelectOrg(org)}
                          >
                            <span class="font-medium">{org.name}</span>
                            <span class="badge badge-sm badge-outline ml-2">
                              {organizationTypeLabels[org.type] || org.type}
                            </span>
                          </button>
                        ))
                      ) : searchQuery ? (
                        <div class="px-4 py-3 text-base-content/70">
                          「{searchQuery}」に一致する団体が見つかりません
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
                <label class="label">
                  <span class="label-text-alt">
                    既存の政治団体を選択するか、新規作成できます
                  </span>
                </label>
              </div>

              {/* 新規作成時の入力フィールド */}
              {!selectedOrg && (
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-base-200 rounded-lg">
                  <div class="form-control">
                    <label class="label">
                      <span class="label-text">政治団体名 *</span>
                    </label>
                    <input
                      type="text"
                      value={orgName}
                      onChange={(e) =>
                        setOrgName((e.target as HTMLInputElement).value)
                      }
                      class="input input-bordered"
                      placeholder="○○後援会"
                      required={!selectedOrg}
                    />
                  </div>
                  <div class="form-control">
                    <label class="label">
                      <span class="label-text">団体種別 *</span>
                    </label>
                    <select
                      value={orgType}
                      onChange={(e) =>
                        setOrgType((e.target as HTMLSelectElement).value)
                      }
                      class="select select-bordered"
                      required
                    >
                      {Object.entries(organizationTypeLabels).map(
                        ([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                </div>
              )}

              {/* 共通フィールド */}
              <div class="grid grid-cols-1 gap-4">
                <div class="form-control">
                  <label class="label">
                    <span class="label-text">公式メールアドレス *</span>
                  </label>
                  <input
                    type="email"
                    value={orgEmail}
                    onChange={(e) =>
                      setOrgEmail((e.target as HTMLInputElement).value)
                    }
                    class="input input-bordered"
                    placeholder="例: info@party.example.jp"
                    required
                  />
                  <label class="label">
                    <span class="label-text-alt">
                      この政治団体の公式メールアドレスで認証を行います
                    </span>
                  </label>
                </div>
                <div class="form-control">
                  <label class="label">
                    <span class="label-text">役職</span>
                  </label>
                  <input
                    type="text"
                    value={orgRole}
                    onChange={(e) =>
                      setOrgRole((e.target as HTMLInputElement).value)
                    }
                    class="input input-bordered"
                    placeholder="例: 事務局長、会計責任者"
                  />
                </div>
              </div>

              <div class="flex gap-2">
                <button
                  type="submit"
                  class="btn btn-primary"
                  disabled={isSubmitting || (!selectedOrg && !orgName)}
                >
                  {isSubmitting ? "送信中..." : "申請する"}
                </button>
                <button
                  type="button"
                  class="btn"
                  onClick={() => {
                    setShowForm(false);
                    setSelectedOrg(null);
                    setSearchQuery("");
                  }}
                >
                  キャンセル
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <h3 class="card-title text-base">新規認証申請</h3>
            <p class="text-base-content/70 mb-4">
              政治団体の管理者として認証されると、その団体の収支台帳を管理できるようになります。
              認証には公式メールアドレスでの確認が必要です。
            </p>
            <button class="btn btn-primary" onClick={() => setShowForm(true)}>
              認証を申請する
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
