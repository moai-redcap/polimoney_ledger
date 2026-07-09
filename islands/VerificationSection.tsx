import { useState } from "preact/hooks";

interface Politician {
  id: string;
  name: string;
  verified_at: string | null;
  verified_domain: string | null;
}

interface ManagedOrganization {
  id: string;
  name: string;
  type: string;
  manager_verified_at: string;
  manager_verified_domain: string;
}

interface PoliticianVerification {
  id: string;
  name: string;
  official_email: string;
  status: string;
  created_at: string;
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
  verifiedPolitician: Politician | null;
  managedOrganizations: ManagedOrganization[];
  politicianVerifications: PoliticianVerification[];
  organizationManagerVerifications: OrganizationManagerVerification[];
  hubOrganizations: Organization[];
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

export default function VerificationSection({
  userId,
  verifiedPolitician,
  managedOrganizations,
  politicianVerifications,
  organizationManagerVerifications,
  hubOrganizations,
}: Props) {
  // 政治家認証フォーム
  const [showPoliticianForm, setShowPoliticianForm] = useState(false);
  const [politicianName, setPoliticianName] = useState("");
  const [politicianEmail, setPoliticianEmail] = useState("");
  const [politicianUrl, setPoliticianUrl] = useState("");
  const [politicianParty, setPoliticianParty] = useState("");

  // 政治団体管理者認証フォーム
  const [showOrgManagerForm, setShowOrgManagerForm] = useState(false);
  const [orgId, setOrgId] = useState("");
  const [orgName, setOrgName] = useState("");
  const [orgEmail, setOrgEmail] = useState("");
  const [orgRole, setOrgRole] = useState("");
  const [orgType, setOrgType] = useState("other");

  // メール認証フォーム
  const [verificationCode, setVerificationCode] = useState("");
  const [activeVerificationId, setActiveVerificationId] = useState<
    string | null
  >(null);
  const [activeVerificationType, setActiveVerificationType] = useState<
    "politician" | "org_manager" | null
  >(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<
    {
      type: "success" | "error";
      text: string;
    } | null
  >(null);

  // 政治家認証申請
  const handlePoliticianSubmit = async (e: Event) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/politicians/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: politicianName,
          official_email: politicianEmail,
          official_url: politicianUrl || undefined,
          party: politicianParty || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "申請に失敗しました");
      }

      setMessage({ type: "success", text: "認証申請を送信しました" });
      setShowPoliticianForm(false);
      // ページをリロードして最新状態を反映
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

  // 政治団体管理者認証申請
  const handleOrgManagerSubmit = async (e: Event) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/organizations/manager-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organization_id: orgId || undefined,
          organization_name: orgName,
          organization_type: orgType,
          official_email: orgEmail,
          role_in_organization: orgRole || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "申請に失敗しました");
      }

      setMessage({ type: "success", text: "認証申請を送信しました" });
      setShowOrgManagerForm(false);
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

  // メール認証コード送信
  const handleSendVerificationCode = async (
    verificationId: string,
    type: "politician" | "org_manager",
  ) => {
    setIsSubmitting(true);
    setMessage(null);

    try {
      const endpoint = type === "politician"
        ? `/api/politicians/verify/${verificationId}/send-code`
        : `/api/organizations/manager-verify/${verificationId}/send-code`;

      const response = await fetch(endpoint, { method: "POST" });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "コード送信に失敗しました");
      }

      setActiveVerificationId(verificationId);
      setActiveVerificationType(type);
      setMessage({ type: "success", text: "認証コードを送信しました" });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error
          ? error.message
          : "コード送信に失敗しました",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // メール認証コード検証
  const handleVerifyCode = async (e: Event) => {
    e.preventDefault();
    if (!activeVerificationId || !activeVerificationType) return;

    setIsSubmitting(true);
    setMessage(null);

    try {
      const endpoint = activeVerificationType === "politician"
        ? `/api/politicians/verify/${activeVerificationId}/verify-code`
        : `/api/organizations/manager-verify/${activeVerificationId}/verify-code`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: verificationCode }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "認証に失敗しました");
      }

      setMessage({ type: "success", text: "メール認証が完了しました" });
      setActiveVerificationId(null);
      setActiveVerificationType(null);
      setVerificationCode("");
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

  // 既存の政治団体を選択した時
  const handleOrgSelect = (e: Event) => {
    const target = e.target as HTMLSelectElement;
    const selectedId = target.value;
    setOrgId(selectedId);

    if (selectedId) {
      const selected = hubOrganizations.find((o) => o.id === selectedId);
      if (selected) {
        setOrgName(selected.name);
        setOrgType(selected.type);
      }
    } else {
      setOrgName("");
      setOrgType("other");
    }
  };

  return (
    <div class="st-stack st-stack--lg">
      {/* メッセージ */}
      {message && (
        <div
          role="alert"
          class="st-alert"
        >
          <span>{message.text}</span>
        </div>
      )}

      {/* 政治家認証セクション */}
      <div class="st-card st-card--elevated">
        <div class="st-card__content" style="padding: var(--st-sys-spacing-6);">
          <h2 class="st-card__title">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              style="width: 1.5rem; height: 1.5rem;"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            政治家認証
          </h2>

          {verifiedPolitician
            ? (
              <div class="st-flex st-flex--items-center st-gap-3">
                <div class="badge badge-success gap-1">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-4 w-4"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  認証済み
                </div>
                <span style="font-weight: 500;">{verifiedPolitician.name}</span>
                <span class="text-sm text-base-content/70">
                  ({verifiedPolitician.verified_domain})
                </span>
              </div>
            )
            : (
              <>
                {/* 申請履歴 */}
                {politicianVerifications.length > 0 && (
                  <div style="margin-bottom: var(--st-sys-spacing-4);">
                    <h3 class="text-sm font-medium mb-2">申請履歴</h3>
                    <div class="space-y-2">
                      {politicianVerifications.map((v) => (
                        <div
                          key={v.id}
                          class="flex items-center justify-between p-3 bg-base-200 rounded-lg"
                        >
                          <div>
                            <span style="font-weight: 500;">{v.name}</span>
                            <span class="text-sm text-base-content/70 ml-2">
                              ({v.official_email})
                            </span>
                          </div>
                          <div class="st-flex st-flex--items-center st-gap-2">
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
                                onClick={() =>
                                  handleSendVerificationCode(
                                    v.id,
                                    "politician",
                                  )}
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
                )}

                {/* 認証コード入力 */}
                {activeVerificationId &&
                  activeVerificationType === "politician" && (
                  <form onSubmit={handleVerifyCode} style="margin-bottom: var(--st-sys-spacing-4);">
                    <div class="st-field">
                      <label class="st-field__label-wrapper">
                        <span class="st-field__label">認証コード</span>
                      </label>
                      <div class="st-flex st-gap-2">
                        <input
                          type="text"
                          value={verificationCode}
                          onChange={(e) =>
                            setVerificationCode(
                              (e.target as HTMLInputElement).value,
                            )}
                          class="st-input" style="flex: 1;"
                          placeholder="6桁のコード"
                          maxLength={6}
                        />
                        <button
                          type="submit"
                          class="st-button st-button--filled"
                          disabled={isSubmitting ||
                            verificationCode.length !== 6}
                        >
                          認証
                        </button>
                      </div>
                    </div>
                  </form>
                )}

                {/* 新規申請フォーム */}
                {showPoliticianForm
                  ? (
                    <form onSubmit={handlePoliticianSubmit} class="st-stack st-stack--md">
                      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="st-field">
                          <label class="st-field__label-wrapper">
                            <span class="st-field__label">氏名 *</span>
                          </label>
                          <input
                            type="text"
                            value={politicianName}
                            onChange={(e) =>
                              setPoliticianName(
                                (e.target as HTMLInputElement).value,
                              )}
                            class="st-input"
                            required
                          />
                        </div>
                        <div class="st-field">
                          <label class="st-field__label-wrapper">
                            <span class="st-field__label">公式メールアドレス *</span>
                          </label>
                          <input
                            type="email"
                            value={politicianEmail}
                            onChange={(e) =>
                              setPoliticianEmail(
                                (e.target as HTMLInputElement).value,
                              )}
                            class="st-input"
                            placeholder="例: info@example.lg.jp"
                            required
                          />
                        </div>
                        <div class="st-field">
                          <label class="st-field__label-wrapper">
                            <span class="st-field__label">公式サイト URL</span>
                          </label>
                          <input
                            type="url"
                            value={politicianUrl}
                            onChange={(e) =>
                              setPoliticianUrl(
                                (e.target as HTMLInputElement).value,
                              )}
                            class="st-input"
                            placeholder="https://"
                          />
                        </div>
                        <div class="st-field">
                          <label class="st-field__label-wrapper">
                            <span class="st-field__label">所属政党</span>
                          </label>
                          <input
                            type="text"
                            value={politicianParty}
                            onChange={(e) =>
                              setPoliticianParty(
                                (e.target as HTMLInputElement).value,
                              )}
                            class="st-input"
                          />
                        </div>
                      </div>
                      <div class="st-flex st-gap-2">
                        <button
                          type="submit"
                          class="st-button st-button--filled"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? "送信中..." : "申請する"}
                        </button>
                        <button
                          type="button"
                          class="st-button"
                          onClick={() => setShowPoliticianForm(false)}
                        >
                          キャンセル
                        </button>
                      </div>
                    </form>
                  )
                  : (
                    <div class="st-card__actions">
                      <button
                        class="st-button st-button--filled"
                        onClick={() => setShowPoliticianForm(true)}
                      >
                        政治家認証を申請
                      </button>
                    </div>
                  )}
              </>
            )}
        </div>
      </div>

      {/* 政治団体管理者認証セクション */}
      <div class="st-card st-card--elevated">
        <div class="st-card__content" style="padding: var(--st-sys-spacing-6);">
          <h2 class="st-card__title">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              style="width: 1.5rem; height: 1.5rem;"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
            政治団体管理者認証
          </h2>

          {/* 認証済み団体一覧 */}
          {managedOrganizations.length > 0 && (
            <div style="margin-bottom: var(--st-sys-spacing-4);">
              <h3 class="text-sm font-medium mb-2">管理している政治団体</h3>
              <div class="space-y-2">
                {managedOrganizations.map((org) => (
                  <div
                    key={org.id}
                    class="flex items-center justify-between p-3 bg-base-200 rounded-lg"
                  >
                    <div class="st-flex st-flex--items-center st-gap-2">
                      <div class="badge badge-success gap-1">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          class="h-3 w-3"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                        認証済
                      </div>
                      <span style="font-weight: 500;">{org.name}</span>
                      <span class="st-badge st-badge--outline">
                        {organizationTypeLabels[org.type] || org.type}
                      </span>
                    </div>
                    <span class="text-sm text-base-content/70">
                      {org.manager_verified_domain}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 申請履歴 */}
          {organizationManagerVerifications.length > 0 && (
            <div style="margin-bottom: var(--st-sys-spacing-4);">
              <h3 class="text-sm font-medium mb-2">申請履歴</h3>
              <div class="space-y-2">
                {organizationManagerVerifications
                  .filter((v) => v.status !== "approved")
                  .map((v) => (
                    <div
                      key={v.id}
                      class="flex items-center justify-between p-3 bg-base-200 rounded-lg"
                    >
                      <div>
                        <span style="font-weight: 500;">{v.organization_name}</span>
                        <span class="text-sm text-base-content/70 ml-2">
                          ({v.official_email})
                        </span>
                      </div>
                      <div class="st-flex st-flex--items-center st-gap-2">
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
                            onClick={() =>
                              handleSendVerificationCode(v.id, "org_manager")}
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
          )}

          {/* 認証コード入力 */}
          {activeVerificationId && activeVerificationType === "org_manager" && (
            <form onSubmit={handleVerifyCode} style="margin-bottom: var(--st-sys-spacing-4);">
              <div class="st-field">
                <label class="st-field__label-wrapper">
                  <span class="st-field__label">認証コード</span>
                </label>
                <div class="st-flex st-gap-2">
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) =>
                      setVerificationCode((e.target as HTMLInputElement).value)}
                    class="st-input" style="flex: 1;"
                    placeholder="6桁のコード"
                    maxLength={6}
                  />
                  <button
                    type="submit"
                    class="st-button st-button--filled"
                    disabled={isSubmitting || verificationCode.length !== 6}
                  >
                    認証
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* 新規申請フォーム */}
          {showOrgManagerForm
            ? (
              <form onSubmit={handleOrgManagerSubmit} class="st-stack st-stack--md">
                <div class="st-field">
                  <label class="st-field__label-wrapper">
                    <span class="st-field__label">既存の政治団体を選択</span>
                  </label>
                  <select
                    value={orgId}
                    onChange={handleOrgSelect}
                    class="st-select"
                  >
                    <option value="">-- 新規作成 --</option>
                    {hubOrganizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}{" "}
                        ({organizationTypeLabels[org.type] || org.type}
                        )
                      </option>
                    ))}
                  </select>
                  <label class="st-field__label-wrapper">
                    <span class="st-field__helper">
                      既存の政治団体を選択するか、新規作成できます
                    </span>
                  </label>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div class="st-field">
                    <label class="st-field__label-wrapper">
                      <span class="st-field__label">政治団体名 *</span>
                    </label>
                    <input
                      type="text"
                      value={orgName}
                      onChange={(e) =>
                        setOrgName((e.target as HTMLInputElement).value)}
                      class="st-input"
                      required
                      disabled={!!orgId}
                    />
                  </div>
                  <div class="st-field">
                    <label class="st-field__label-wrapper">
                      <span class="st-field__label">団体種別 *</span>
                    </label>
                    <select
                      value={orgType}
                      onChange={(e) =>
                        setOrgType((e.target as HTMLSelectElement).value)}
                      class="st-select"
                      required
                      disabled={!!orgId}
                    >
                      {Object.entries(organizationTypeLabels).map(
                        ([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ),
                      )}
                    </select>
                  </div>
                  <div class="form-control md:col-span-2">
                    <label class="st-field__label-wrapper">
                      <span class="st-field__label">公式メールアドレス *</span>
                    </label>
                    <input
                      type="email"
                      value={orgEmail}
                      onChange={(e) =>
                        setOrgEmail((e.target as HTMLInputElement).value)}
                      class="st-input"
                      placeholder="例: info@party.example.jp"
                      required
                    />
                    <label class="st-field__label-wrapper">
                      <span class="st-field__helper">
                        この政治団体の公式メールアドレスで認証を行います
                      </span>
                    </label>
                  </div>
                  <div class="form-control md:col-span-2">
                    <label class="st-field__label-wrapper">
                      <span class="st-field__label">役職</span>
                    </label>
                    <input
                      type="text"
                      value={orgRole}
                      onChange={(e) =>
                        setOrgRole((e.target as HTMLInputElement).value)}
                      class="st-input"
                      placeholder="例: 事務局長、会計責任者"
                    />
                  </div>
                </div>
                <div class="st-flex st-gap-2">
                  <button
                    type="submit"
                    class="st-button st-button--filled"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "送信中..." : "申請する"}
                  </button>
                  <button
                    type="button"
                    class="st-button"
                    onClick={() => setShowOrgManagerForm(false)}
                  >
                    キャンセル
                  </button>
                </div>
              </form>
            )
            : (
              <div class="st-card__actions">
                <button
                  class="st-button st-button--filled"
                  onClick={() => setShowOrgManagerForm(true)}
                >
                  政治団体管理者認証を申請
                </button>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
