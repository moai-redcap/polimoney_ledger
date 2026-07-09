import { useEffect, useMemo, useRef, useState } from "preact/hooks";

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
  official_domain: string;
  status: string;
  created_at: string;
  request_type?: string;
  verification_method?: string;
  is_lg_domain?: boolean;
  dns_txt_token?: string;
}

interface Organization {
  id: string;
  name: string;
  type: string;
}

interface PoliticalFundReportInfo {
  organization_name: string;
  representative_name: string;
  registration_authority: string;
}

interface Props {
  userId: string;
  userEmail: string;
  managedOrganizations: ManagedOrganization[];
  organizationManagerVerifications: OrganizationManagerVerification[];
  hubOrganizations: Organization[];
  /** ドメイン変更モード */
  changeDomain?: boolean;
  /** ドメイン変更対象の団体ID */
  targetOrganizationId?: string | null;
}

const statusLabels: Record<string, { label: string; class: string }> = {
  pending: { label: "認証待ち", class: "badge-warning" },
  email_sent: { label: "メール送信済", class: "badge-info" },
  email_verified: { label: "承認待ち", class: "badge-info" },
  dns_verified: { label: "承認待ち", class: "badge-info" },
  approved: { label: "承認済み", class: "badge-success" },
  rejected: { label: "却下", class: "badge-error" },
};

const organizationTypeLabels: Record<string, string> = {
  political_party: "政党",
  support_group: "後援会",
  fund_management: "資金管理団体",
  other: "その他",
};

// lg.jpドメインかどうかを判定
function isLgJpDomain(domain: string): boolean {
  const lowerDomain = domain.toLowerCase();
  return lowerDomain === "lg.jp" || lowerDomain.endsWith(".lg.jp");
}

// メールアドレスからドメインを取得
function getDomainFromEmail(email: string): string {
  return email.split("@")[1] || "";
}

// 届出先選択肢
const registrationAuthorities = [
  "総務省",
  "北海道選管",
  "青森県選管",
  "岩手県選管",
  "宮城県選管",
  "秋田県選管",
  "山形県選管",
  "福島県選管",
  "茨城県選管",
  "栃木県選管",
  "群馬県選管",
  "埼玉県選管",
  "千葉県選管",
  "東京都選管",
  "神奈川県選管",
  "新潟県選管",
  "富山県選管",
  "石川県選管",
  "福井県選管",
  "山梨県選管",
  "長野県選管",
  "岐阜県選管",
  "静岡県選管",
  "愛知県選管",
  "三重県選管",
  "滋賀県選管",
  "京都府選管",
  "大阪府選管",
  "兵庫県選管",
  "奈良県選管",
  "和歌山県選管",
  "鳥取県選管",
  "島根県選管",
  "岡山県選管",
  "広島県選管",
  "山口県選管",
  "徳島県選管",
  "香川県選管",
  "愛媛県選管",
  "高知県選管",
  "福岡県選管",
  "佐賀県選管",
  "長崎県選管",
  "熊本県選管",
  "大分県選管",
  "宮崎県選管",
  "鹿児島県選管",
  "沖縄県選管",
];

export default function OrganizationManagerVerificationForm({
  userId,
  userEmail,
  managedOrganizations,
  organizationManagerVerifications,
  hubOrganizations,
  changeDomain = false,
  targetOrganizationId = null,
}: Props) {
  // ドメイン変更対象の団体を特定
  const targetOrganization = useMemo(() => {
    if (!changeDomain || !targetOrganizationId) return null;
    return managedOrganizations.find((org) => org.id === targetOrganizationId);
  }, [changeDomain, targetOrganizationId, managedOrganizations]);

  // フォーム表示
  const [showForm, setShowForm] = useState(false);

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

  // 政治資金収支報告書情報（必須）
  const [fundInfo, setFundInfo] = useState<PoliticalFundReportInfo>({
    organization_name: "",
    representative_name: "",
    registration_authority: "",
  });

  // ドメイン変更用
  const [newEmail, setNewEmail] = useState("");
  const [newFundInfo, setNewFundInfo] = useState<PoliticalFundReportInfo>({
    organization_name: "",
    representative_name: "",
    registration_authority: "",
  });

  // メール認証
  const [verificationCode, setVerificationCode] = useState("");
  const [activeVerificationId, setActiveVerificationId] = useState<
    string | null
  >(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<
    {
      type: "success" | "error";
      text: string;
    } | null
  >(null);

  // メールアドレス変更時にドメイン判定
  const [isLgDomain, setIsLgDomain] = useState(false);
  useEffect(() => {
    const domain = getDomainFromEmail(orgEmail);
    setIsLgDomain(isLgJpDomain(domain));
  }, [orgEmail]);

  // 新しいメールアドレス変更時にドメイン判定（ドメイン変更用）
  const [newIsLgDomain, setNewIsLgDomain] = useState(false);
  useEffect(() => {
    const domain = getDomainFromEmail(newEmail);
    setNewIsLgDomain(isLgJpDomain(domain));
  }, [newEmail]);

  // 検索フィルタリング
  const filteredOrgs = useMemo(() => {
    if (!searchQuery.trim()) return hubOrganizations;
    const query = searchQuery.toLowerCase();
    return hubOrganizations.filter(
      (org) =>
        org.name.toLowerCase().includes(query) ||
        (organizationTypeLabels[org.type] || org.type)
          .toLowerCase()
          .includes(query),
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

  // 新規申請送信
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
          request_type: "new",
          political_fund_report_info: fundInfo,
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

  // ドメイン変更申請送信
  const handleDomainChangeSubmit = async (e: Event) => {
    e.preventDefault();
    if (!targetOrganization) return;

    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/organizations/manager-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organization_id: targetOrganization.id,
          organization_name: targetOrganization.name,
          official_email: newEmail,
          request_type: "domain_change",
          previous_domain: targetOrganization.manager_verified_domain,
          political_fund_report_info: newFundInfo,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "申請に失敗しました");
      }

      setMessage({ type: "success", text: "ドメイン変更申請を送信しました" });
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

  // 認証コード送信（メール認証用）
  const handleSendCode = async (verificationId: string) => {
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/organizations/manager-verify/${verificationId}/send-code`,
        { method: "POST" },
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
        text: error instanceof Error
          ? error.message
          : "コード送信に失敗しました",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // DNS TXT検証
  const handleVerifyDns = async (verificationId: string) => {
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/organizations/manager-verify/${verificationId}/verify-dns`,
        { method: "POST" },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "DNS TXT検証に失敗しました");
      }

      setMessage({
        type: "success",
        text: "DNS TXT認証が完了しました。管理者の承認をお待ちください。",
      });
      setTimeout(() => location.reload(), 1500);
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error
          ? error.message
          : "DNS TXT検証に失敗しました",
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
        },
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

  // DNS TXT認証UI
  const DnsTxtVerificationUI = ({
    verification,
  }: {
    verification: OrganizationManagerVerification;
  }) => (
    <div class="st-card st-card--elevated">
      <div class="st-card__content" style="padding: var(--st-sys-spacing-6);">
        <h3 class="card-title text-base">DNS TXT認証</h3>
        <div class="st-alert st-alert--info" style="margin-bottom: var(--st-sys-spacing-4);">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            style="width: 1.5rem; height: 1.5rem; flex-shrink: 0;"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            >
            </path>
          </svg>
          <span>
            ドメインの所有権を確認するため、DNS TXTレコードを設定してください。
          </span>
        </div>

        <div class="bg-base-200 p-4 rounded-lg font-mono text-sm space-y-2">
          <div>
            <span style="color: var(--st-sys-color-on-surface-variant);">ドメイン:</span>{" "}
            <span style="font-weight: 700;">{verification.official_domain}</span>
          </div>
          <div>
            <span style="color: var(--st-sys-color-on-surface-variant);">タイプ:</span>{" "}
            <span style="font-weight: 700;">TXT</span>
          </div>
          <div>
            <span style="color: var(--st-sys-color-on-surface-variant);">値:</span>{" "}
            <code class="bg-base-300 px-2 py-1 rounded break-all">
              polimoney-verify={verification.dns_txt_token}
            </code>
          </div>
        </div>

        <p style="font-size: var(--st-sys-typescale-body-small-size); color: var(--st-sys-color-on-surface-variant); margin-top: var(--st-sys-spacing-4);">
          DNS設定が反映されるまで数分〜数時間かかる場合があります。
          設定後、「検証する」ボタンをクリックしてください。
        </p>

        <div class="card-actions justify-end mt-4">
          <button
            class="st-button st-button--filled"
            onClick={() => handleVerifyDns(verification.id)}
            disabled={isSubmitting}
          >
            {isSubmitting ? "検証中..." : "検証する"}
          </button>
        </div>
      </div>
    </div>
  );

  // 政治資金収支報告書情報入力フォーム
  const FundReportInfoForm = ({
    value,
    onChange,
  }: {
    value: PoliticalFundReportInfo;
    onChange: (v: PoliticalFundReportInfo) => void;
  }) => (
    <div class="st-stack st-stack--md">
      <div class="st-alert st-alert--warning">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          style="width: 1.5rem; height: 1.5rem; flex-shrink: 0;"
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
          本人確認のため、政治資金収支報告書の情報を入力してください。
        </span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="st-field">
          <label class="st-field__label-wrapper">
            <span class="st-field__label">団体名 *</span>
          </label>
          <input
            type="text"
            value={value.organization_name}
            onChange={(e) =>
              onChange({
                ...value,
                organization_name: (e.target as HTMLInputElement).value,
              })}
            class="st-input"
            placeholder="例: 山田太郎後援会"
            required
          />
        </div>
        <div class="st-field">
          <label class="st-field__label-wrapper">
            <span class="st-field__label">代表者名 *</span>
          </label>
          <input
            type="text"
            value={value.representative_name}
            onChange={(e) =>
              onChange({
                ...value,
                representative_name: (e.target as HTMLInputElement).value,
              })}
            class="st-input"
            placeholder="例: 山田太郎"
            required
          />
        </div>
        <div class="st-field">
          <label class="st-field__label-wrapper">
            <span class="st-field__label">届出先 *</span>
          </label>
          <select
            value={value.registration_authority}
            onChange={(e) =>
              onChange({
                ...value,
                registration_authority: (e.target as HTMLSelectElement).value,
              })}
            class="st-select"
            required
          >
            <option value="">選択してください</option>
            {registrationAuthorities.map((auth) => (
              <option key={auth} value={auth}>
                {auth}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );

  // ドメイン変更モードかつ対象団体がある場合
  if (changeDomain && targetOrganization) {
    // DNS TXT認証が必要な申請を探す
    const pendingDnsVerification = organizationManagerVerifications.find(
      (v) =>
        v.request_type === "domain_change" &&
        v.status === "pending" &&
        v.verification_method === "dns_txt",
    );

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

        {/* 現在の認証情報 */}
        <div class="st-card st-card--elevated">
          <div class="st-card__content" style="padding: var(--st-sys-spacing-6);">
            <h3 class="card-title text-base">現在の認証情報</h3>
            <div class="bg-base-200 p-4 rounded-lg">
              <div class="grid grid-cols-2 gap-2 text-sm">
                <div style="color: var(--st-sys-color-on-surface-variant);">団体名</div>
                <div style="font-weight: 500;">{targetOrganization.name}</div>
                <div style="color: var(--st-sys-color-on-surface-variant);">団体種別</div>
                <div>
                  {organizationTypeLabels[targetOrganization.type] ||
                    targetOrganization.type}
                </div>
                <div style="color: var(--st-sys-color-on-surface-variant);">認証ドメイン</div>
                <div class="font-mono">
                  {targetOrganization.manager_verified_domain}
                </div>
                <div style="color: var(--st-sys-color-on-surface-variant);">認証日</div>
                <div>
                  {targetOrganization.manager_verified_at
                    ? new Date(
                      targetOrganization.manager_verified_at,
                    ).toLocaleDateString("ja-JP")
                    : "-"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* DNS TXT認証UI（対象の申請がある場合） */}
        {pendingDnsVerification && (
          <DnsTxtVerificationUI verification={pendingDnsVerification} />
        )}

        {/* 認証コード入力 */}
        {activeVerificationId && (
          <div class="st-card st-card--elevated">
            <div class="st-card__content" style="padding: var(--st-sys-spacing-6);">
              <h3 class="card-title text-base">認証コードを入力</h3>
              <p style="font-size: var(--st-sys-typescale-body-small-size); color: var(--st-sys-color-on-surface-variant); margin-bottom: var(--st-sys-spacing-4);">
                メールに送信された6桁のコードを入力してください。
              </p>
              <form onSubmit={handleVerifyCode}>
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
              </form>
            </div>
          </div>
        )}

        {/* ドメイン変更フォーム */}
        <div class="st-card st-card--elevated">
          <div class="st-card__content" style="padding: var(--st-sys-spacing-6);">
            <h3 class="card-title text-base">ドメイン変更申請</h3>
            <div class="st-alert st-alert--warning" style="margin-bottom: var(--st-sys-spacing-4);">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                style="width: 1.5rem; height: 1.5rem; flex-shrink: 0;"
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
                新しいドメインで認証を行います。承認後、認証ドメインが変更されます。
              </span>
            </div>

            <form onSubmit={handleDomainChangeSubmit} class="st-stack st-stack--md">
              <div class="st-field">
                <label class="st-field__label-wrapper">
                  <span class="st-field__label">
                    新しい公式メールアドレス <span style="color: var(--st-sys-color-error);">*</span>
                  </span>
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) =>
                    setNewEmail((e.target as HTMLInputElement).value)}
                  class="st-input"
                  placeholder="例: info@new-domain.jp"
                  required
                />
                {newEmail && (
                  <label class="st-field__label-wrapper">
                    {newIsLgDomain
                      ? (
                        <span class="label-text-alt text-success">
                          🏛️ lg.jpドメイン - メール認証を使用します
                        </span>
                      )
                      : (
                        <span class="label-text-alt text-warning">
                          🔐 DNS TXT認証が必要です
                        </span>
                      )}
                  </label>
                )}
              </div>

              {/* 政治資金収支報告書情報 */}
              <FundReportInfoForm
                value={newFundInfo}
                onChange={setNewFundInfo}
              />

              <div class="st-flex st-gap-2">
                <button
                  type="submit"
                  class="st-button st-button--filled"
                  disabled={isSubmitting || !newEmail}
                >
                  {isSubmitting ? "送信中..." : "変更を申請"}
                </button>
                <a
                  href={`/profile/organization/${targetOrganization.id}`}
                  class="st-button"
                >
                  キャンセル
                </a>
              </div>
            </form>
          </div>
        </div>

        {/* 申請履歴（ドメイン変更のみ表示） */}
        {organizationManagerVerifications.filter(
              (v) => v.request_type === "domain_change",
            ).length > 0 && (
          <div class="st-card st-card--elevated">
            <div class="st-card__content" style="padding: var(--st-sys-spacing-6);">
              <h3 class="card-title text-base">ドメイン変更申請履歴</h3>
              <div class="space-y-3">
                {organizationManagerVerifications
                  .filter((v) => v.request_type === "domain_change")
                  .map((v) => (
                    <div
                      key={v.id}
                      style="display: flex; align-items: center; justify-content: space-between; padding: var(--st-sys-spacing-4); background: var(--st-sys-color-surface-variant); border-radius: var(--st-sys-shape-corner-large);"
                    >
                      <div>
                        <span style="font-weight: 500;">{v.organization_name}</span>
                        <span style="font-size: var(--st-sys-typescale-body-small-size); color: var(--st-sys-color-on-surface-variant); margin-left: var(--st-sys-spacing-2);">
                          ({v.official_email})
                        </span>
                        <p style="font-size: var(--st-sys-typescale-label-small-size); color: var(--st-sys-color-on-surface-variant);">
                          {new Date(v.created_at).toLocaleDateString("ja-JP")}
                          {v.is_lg_domain && (
                            <span class="st-badge st-badge--sm st-badge--primary" style="margin-left: var(--st-sys-spacing-2);">
                              lg.jp
                            </span>
                          )}
                          {v.verification_method === "dns_txt" && (
                            <span class="st-badge st-badge--sm" style="margin-left: var(--st-sys-spacing-2);">
                              DNS TXT
                            </span>
                          )}
                        </p>
                      </div>
                      <div class="st-flex st-flex--items-center st-gap-2">
                        <span
                          class={`badge ${
                            statusLabels[v.status]?.class || "badge-ghost"
                          }`}
                        >
                          {statusLabels[v.status]?.label || v.status}
                        </span>
                        {v.status === "pending" &&
                          v.verification_method === "email" && (
                          <button
                            class="btn btn-sm btn-primary"
                            onClick={() => handleSendCode(v.id)}
                            disabled={isSubmitting}
                          >
                            認証コードを送信
                          </button>
                        )}
                        {v.status === "email_sent" && (
                          <button
                            class="st-button st-button--outlined st-button--sm"
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
      </div>
    );
  }

  // ドメイン変更モードだが対象団体が見つからない場合
  if (changeDomain && targetOrganizationId && !targetOrganization) {
    return (
      <div class="st-alert st-alert--error">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          style="width: 1.5rem; height: 1.5rem; flex-shrink: 0;"
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div>
          <h3 style="font-weight: 700;">団体が見つかりません</h3>
          <p style="font-size: var(--st-sys-typescale-body-small-size);">
            指定された政治団体が見つからないか、あなたが管理者として認証されていません。
          </p>
          <a href="/profile/organization" class="btn btn-sm mt-2">
            政治団体情報に戻る
          </a>
        </div>
      </div>
    );
  }

  // 通常モード
  // DNS TXT認証が必要な申請を探す
  const pendingDnsVerification = organizationManagerVerifications.find(
    (v) => v.status === "pending" && v.verification_method === "dns_txt",
  );

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

      {/* 管理中の団体一覧 */}
      {managedOrganizations.length > 0 && (
        <div class="st-card st-card--elevated">
          <div class="st-card__content" style="padding: var(--st-sys-spacing-6);">
            <h3 class="card-title text-base">管理している政治団体</h3>
            <div class="space-y-3">
              {managedOrganizations.map((org) => (
                <div
                  key={org.id}
                  style="display: flex; align-items: center; justify-content: space-between; padding: var(--st-sys-spacing-4); background: var(--st-sys-color-surface-variant); border-radius: var(--st-sys-shape-corner-large);"
                >
                  <div class="st-flex st-flex--items-center st-gap-3">
                    <div class="avatar placeholder">
                      <div class="bg-success text-success-content rounded-full w-10">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          style="width: 1.25rem; height: 1.25rem;"
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
                      <span style="font-weight: 500;">{org.name}</span>
                      <span class="badge badge-outline ml-2">
                        {organizationTypeLabels[org.type] || org.type}
                      </span>
                    </div>
                  </div>
                  <span style="font-size: var(--st-sys-typescale-body-small-size); color: var(--st-sys-color-on-surface-variant);">
                    {org.manager_verified_domain}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* DNS TXT認証UI（対象の申請がある場合） */}
      {pendingDnsVerification && (
        <DnsTxtVerificationUI verification={pendingDnsVerification} />
      )}

      {/* 申請履歴 */}
      {organizationManagerVerifications.filter((v) => v.status !== "approved")
            .length > 0 && (
        <div class="st-card st-card--elevated">
          <div class="st-card__content" style="padding: var(--st-sys-spacing-6);">
            <h3 class="card-title text-base">申請履歴</h3>
            <div class="space-y-3">
              {organizationManagerVerifications
                .filter((v) => v.status !== "approved")
                .map((v) => (
                  <div
                    key={v.id}
                    style="display: flex; align-items: center; justify-content: space-between; padding: var(--st-sys-spacing-4); background: var(--st-sys-color-surface-variant); border-radius: var(--st-sys-shape-corner-large);"
                  >
                    <div>
                      <span style="font-weight: 500;">{v.organization_name}</span>
                      <span style="font-size: var(--st-sys-typescale-body-small-size); color: var(--st-sys-color-on-surface-variant); margin-left: var(--st-sys-spacing-2);">
                        ({v.official_email})
                      </span>
                      {v.request_type === "domain_change" && (
                        <span class="badge badge-sm badge-warning ml-2">
                          ドメイン変更
                        </span>
                      )}
                      <p style="font-size: var(--st-sys-typescale-label-small-size); color: var(--st-sys-color-on-surface-variant);">
                        {new Date(v.created_at).toLocaleDateString("ja-JP")}
                        {v.is_lg_domain && (
                          <span class="st-badge st-badge--sm st-badge--primary" style="margin-left: var(--st-sys-spacing-2);">
                            lg.jp
                          </span>
                        )}
                        {v.verification_method === "dns_txt" && (
                          <span class="st-badge st-badge--sm" style="margin-left: var(--st-sys-spacing-2);">
                            DNS TXT
                          </span>
                        )}
                      </p>
                    </div>
                    <div class="st-flex st-flex--items-center st-gap-2">
                      <span
                        class={`badge ${
                          statusLabels[v.status]?.class || "badge-ghost"
                        }`}
                      >
                        {statusLabels[v.status]?.label || v.status}
                      </span>
                      {v.status === "pending" &&
                        v.verification_method === "email" && (
                        <button
                          class="btn btn-sm btn-primary"
                          onClick={() => handleSendCode(v.id)}
                          disabled={isSubmitting}
                        >
                          認証コードを送信
                        </button>
                      )}
                      {v.status === "email_sent" && (
                        <button
                          class="st-button st-button--outlined st-button--sm"
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
        <div class="st-card st-card--elevated">
          <div class="st-card__content" style="padding: var(--st-sys-spacing-6);">
            <h3 class="card-title text-base">認証コードを入力</h3>
            <p style="font-size: var(--st-sys-typescale-body-small-size); color: var(--st-sys-color-on-surface-variant); margin-bottom: var(--st-sys-spacing-4);">
              メールに送信された6桁のコードを入力してください。
            </p>
            <form onSubmit={handleVerifyCode}>
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
            </form>
          </div>
        </div>
      )}

      {/* 新規申請フォーム */}
      {showForm
        ? (
          <div class="st-card st-card--elevated">
            <div class="st-card__content" style="padding: var(--st-sys-spacing-6);">
              <h3 class="card-title text-base">認証申請</h3>
              <form onSubmit={handleSubmit} class="st-stack st-stack--md">
                {/* 検索可能コンボボックス */}
                <div class="st-field" ref={dropdownRef}>
                  <label class="st-field__label-wrapper">
                    <span class="st-field__label">政治団体を検索・選択</span>
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
                      class="st-input" style="width: 100%;"
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
                          <span style="font-size: var(--st-sys-typescale-body-small-size); color: var(--st-sys-color-on-surface-variant); margin-left: var(--st-sys-spacing-2);">
                            （一覧にない場合）
                          </span>
                        </button>
                        {/* 検索結果 */}
                        {filteredOrgs.length > 0
                          ? (
                            filteredOrgs.map((org) => (
                              <button
                                type="button"
                                key={org.id}
                                class={`w-full px-4 py-3 text-left hover:bg-base-200 ${
                                  selectedOrg?.id === org.id
                                    ? "bg-primary/10"
                                    : ""
                                }`}
                                onClick={() => handleSelectOrg(org)}
                              >
                                <span style="font-weight: 500;">{org.name}</span>
                                <span class="badge badge-sm badge-outline ml-2">
                                  {organizationTypeLabels[org.type] || org.type}
                                </span>
                              </button>
                            ))
                          )
                          : searchQuery
                          ? (
                            <div class="px-4 py-3 text-base-content/70">
                              「{searchQuery}」に一致する団体が見つかりません
                            </div>
                          )
                          : null}
                      </div>
                    )}
                  </div>
                  <label class="st-field__label-wrapper">
                    <span class="st-field__helper">
                      既存の政治団体を選択するか、新規作成できます
                    </span>
                  </label>
                </div>

                {/* 新規作成時の入力フィールド */}
                {!selectedOrg && (
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-base-200 rounded-lg">
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
                        placeholder="○○後援会"
                        required={!selectedOrg}
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
                  </div>
                )}

                {/* 共通フィールド */}
                <div class="grid grid-cols-1 gap-4">
                  <div class="st-field">
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
                    {orgEmail && (
                      <label class="st-field__label-wrapper">
                        {isLgDomain
                          ? (
                            <span class="label-text-alt text-success">
                              🏛️ lg.jpドメイン - メール認証を使用します
                            </span>
                          )
                          : (
                            <span class="label-text-alt text-warning">
                              🔐 DNS TXT認証が必要です
                            </span>
                          )}
                      </label>
                    )}
                  </div>
                  <div class="st-field">
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

                {/* 政治資金収支報告書情報 */}
                <FundReportInfoForm value={fundInfo} onChange={setFundInfo} />

                <div class="st-flex st-gap-2">
                  <button
                    type="submit"
                    class="st-button st-button--filled"
                    disabled={isSubmitting || (!selectedOrg && !orgName)}
                  >
                    {isSubmitting ? "送信中..." : "申請する"}
                  </button>
                  <button
                    type="button"
                    class="st-button"
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
        )
        : (
          <div class="st-card st-card--elevated">
            <div class="st-card__content" style="padding: var(--st-sys-spacing-6);">
              <h3 class="card-title text-base">新規認証申請</h3>
              <p style="color: var(--st-sys-color-on-surface-variant); margin-bottom: var(--st-sys-spacing-4);">
                政治団体の管理者として認証されると、その団体の収支台帳を管理できるようになります。
                認証にはlg.jpドメインの場合はメール認証、それ以外はDNS
                TXT認証が必要です。
              </p>
              <button class="st-button st-button--filled" onClick={() => setShowForm(true)}>
                認証を申請する
              </button>
            </div>
          </div>
        )}
    </div>
  );
}
