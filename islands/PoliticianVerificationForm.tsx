import { useState, useEffect } from "preact/hooks";

interface Politician {
  id: string;
  name: string;
  verified_at: string | null;
  verified_domain: string | null;
}

interface PoliticianVerification {
  id: string;
  name: string;
  official_email: string;
  official_domain: string;
  status: string;
  created_at: string;
  request_type?: string;
  verification_method?: string;
  is_lg_domain?: boolean;
  dns_txt_token?: string;
}

interface CandidateRegistrationInfo {
  election_name: string;
  district: string;
  candidate_name: string;
  registration_date: string;
}

interface PoliticalFundReportInfo {
  organization_name: string;
  representative_name: string;
  registration_authority: string;
}

interface Props {
  userId: string;
  userEmail: string;
  verifiedPolitician: Politician | null;
  politicianVerifications: PoliticianVerification[];
  /** ドメイン変更モード */
  changeDomain?: boolean;
}

const statusLabels: Record<string, { label: string; class: string }> = {
  pending: { label: "認証待ち", class: "badge-warning" },
  email_sent: { label: "メール送信済", class: "badge-info" },
  email_verified: { label: "承認待ち", class: "badge-info" },
  dns_verified: { label: "承認待ち", class: "badge-info" },
  approved: { label: "承認済み", class: "badge-success" },
  rejected: { label: "却下", class: "badge-error" },
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

export default function PoliticianVerificationForm({
  userId,
  userEmail,
  verifiedPolitician,
  politicianVerifications,
  changeDomain = false,
}: Props) {
  // フォーム状態
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [url, setUrl] = useState("");
  const [party, setParty] = useState("");

  // ドメイン判定
  const [isLgDomain, setIsLgDomain] = useState(false);

  // 立候補届出情報 or 政治資金収支報告書情報（どちらか必須）
  const [infoType, setInfoType] = useState<"candidate" | "fund">("candidate");
  const [candidateInfo, setCandidateInfo] = useState<CandidateRegistrationInfo>(
    {
      election_name: "",
      district: "",
      candidate_name: "",
      registration_date: "",
    }
  );
  const [fundInfo, setFundInfo] = useState<PoliticalFundReportInfo>({
    organization_name: "",
    representative_name: "",
    registration_authority: "",
  });

  // ドメイン変更フォーム状態
  const [newEmail, setNewEmail] = useState("");
  const [newInfoType, setNewInfoType] = useState<"candidate" | "fund">(
    "candidate"
  );
  const [newCandidateInfo, setNewCandidateInfo] =
    useState<CandidateRegistrationInfo>({
      election_name: "",
      district: "",
      candidate_name: "",
      registration_date: "",
    });
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
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // メールアドレス変更時にドメイン判定
  useEffect(() => {
    const domain = getDomainFromEmail(email);
    setIsLgDomain(isLgJpDomain(domain));
  }, [email]);

  // 新しいメールアドレス変更時にドメイン判定（ドメイン変更用）
  const [newIsLgDomain, setNewIsLgDomain] = useState(false);
  useEffect(() => {
    const domain = getDomainFromEmail(newEmail);
    setNewIsLgDomain(isLgJpDomain(domain));
  }, [newEmail]);

  // 新規申請送信
  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    const requestBody: Record<string, unknown> = {
      name,
      official_email: email,
      official_url: url || undefined,
      party: party || undefined,
      request_type: "new",
    };

    // 立候補届出情報 or 政治資金収支報告書情報を追加
    if (infoType === "candidate") {
      requestBody.candidate_registration_info = candidateInfo;
    } else {
      requestBody.political_fund_report_info = fundInfo;
    }

    try {
      const response = await fetch("/api/politicians/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
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
    if (!verifiedPolitician) return;

    setIsSubmitting(true);
    setMessage(null);

    const requestBody: Record<string, unknown> = {
      name: verifiedPolitician.name,
      official_email: newEmail,
      politician_id: verifiedPolitician.id,
      request_type: "domain_change",
      previous_domain: verifiedPolitician.verified_domain,
    };

    // 立候補届出情報 or 政治資金収支報告書情報を追加
    if (newInfoType === "candidate") {
      requestBody.candidate_registration_info = newCandidateInfo;
    } else {
      requestBody.political_fund_report_info = newFundInfo;
    }

    try {
      const response = await fetch("/api/politicians/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
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
        `/api/politicians/verify/${verificationId}/send-code`,
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

  // DNS TXT検証
  const handleVerifyDns = async (verificationId: string) => {
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/politicians/verify/${verificationId}/verify-dns`,
        { method: "POST" }
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
        text:
          error instanceof Error ? error.message : "DNS TXT検証に失敗しました",
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
        `/api/politicians/verify/${activeVerificationId}/verify-code`,
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

  // DNS TXT認証UI
  const DnsTxtVerificationUI = ({
    verification,
  }: {
    verification: PoliticianVerification;
  }) => (
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <h3 class="card-title text-base">DNS TXT認証</h3>
        <div class="alert alert-info mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            class="stroke-current shrink-0 w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            ></path>
          </svg>
          <span>
            ドメインの所有権を確認するため、DNS TXTレコードを設定してください。
          </span>
        </div>

        <div class="bg-base-200 p-4 rounded-lg font-mono text-sm space-y-2">
          <div>
            <span class="text-base-content/70">ドメイン:</span>{" "}
            <span class="font-bold">{verification.official_domain}</span>
          </div>
          <div>
            <span class="text-base-content/70">タイプ:</span>{" "}
            <span class="font-bold">TXT</span>
          </div>
          <div>
            <span class="text-base-content/70">値:</span>{" "}
            <code class="bg-base-300 px-2 py-1 rounded break-all">
              polimoney-verify={verification.dns_txt_token}
            </code>
          </div>
        </div>

        <p class="text-sm text-base-content/70 mt-4">
          DNS設定が反映されるまで数分〜数時間かかる場合があります。
          設定後、「検証する」ボタンをクリックしてください。
        </p>

        <div class="card-actions justify-end mt-4">
          <button
            class="btn btn-primary"
            onClick={() => handleVerifyDns(verification.id)}
            disabled={isSubmitting}
          >
            {isSubmitting ? "検証中..." : "検証する"}
          </button>
        </div>
      </div>
    </div>
  );

  // 認証情報入力フォーム
  const VerificationInfoForm = ({
    type,
    setType,
    candidate,
    setCandidate,
    fund,
    setFund,
  }: {
    type: "candidate" | "fund";
    setType: (v: "candidate" | "fund") => void;
    candidate: CandidateRegistrationInfo;
    setCandidate: (v: CandidateRegistrationInfo) => void;
    fund: PoliticalFundReportInfo;
    setFund: (v: PoliticalFundReportInfo) => void;
  }) => (
    <div class="space-y-4">
      <div class="alert alert-warning">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="stroke-current shrink-0 h-6 w-6"
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
        <span>本人確認のため、以下のいずれかの情報を入力してください。</span>
      </div>

      <div class="tabs tabs-boxed">
        <button
          class={`tab ${type === "candidate" ? "tab-active" : ""}`}
          onClick={() => setType("candidate")}
          type="button"
        >
          立候補届出情報
        </button>
        <button
          class={`tab ${type === "fund" ? "tab-active" : ""}`}
          onClick={() => setType("fund")}
          type="button"
        >
          政治資金収支報告書
        </button>
      </div>

      {type === "candidate" ? (
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="form-control">
            <label class="label">
              <span class="label-text">選挙名 *</span>
            </label>
            <input
              type="text"
              value={candidate.election_name}
              onChange={(e) =>
                setCandidate({
                  ...candidate,
                  election_name: (e.target as HTMLInputElement).value,
                })
              }
              class="input input-bordered"
              placeholder="例: 第50回衆議院議員総選挙"
              required
            />
          </div>
          <div class="form-control">
            <label class="label">
              <span class="label-text">選挙区 *</span>
            </label>
            <input
              type="text"
              value={candidate.district}
              onChange={(e) =>
                setCandidate({
                  ...candidate,
                  district: (e.target as HTMLInputElement).value,
                })
              }
              class="input input-bordered"
              placeholder="例: 東京都第1区"
              required
            />
          </div>
          <div class="form-control">
            <label class="label">
              <span class="label-text">氏名 *</span>
            </label>
            <input
              type="text"
              value={candidate.candidate_name}
              onChange={(e) =>
                setCandidate({
                  ...candidate,
                  candidate_name: (e.target as HTMLInputElement).value,
                })
              }
              class="input input-bordered"
              placeholder="例: 山田太郎"
              required
            />
          </div>
          <div class="form-control">
            <label class="label">
              <span class="label-text">届出年月日 *</span>
            </label>
            <input
              type="date"
              value={candidate.registration_date}
              onChange={(e) =>
                setCandidate({
                  ...candidate,
                  registration_date: (e.target as HTMLInputElement).value,
                })
              }
              class="input input-bordered"
              required
            />
          </div>
        </div>
      ) : (
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="form-control">
            <label class="label">
              <span class="label-text">団体名 *</span>
            </label>
            <input
              type="text"
              value={fund.organization_name}
              onChange={(e) =>
                setFund({
                  ...fund,
                  organization_name: (e.target as HTMLInputElement).value,
                })
              }
              class="input input-bordered"
              placeholder="例: 山田太郎後援会"
              required
            />
          </div>
          <div class="form-control">
            <label class="label">
              <span class="label-text">代表者名 *</span>
            </label>
            <input
              type="text"
              value={fund.representative_name}
              onChange={(e) =>
                setFund({
                  ...fund,
                  representative_name: (e.target as HTMLInputElement).value,
                })
              }
              class="input input-bordered"
              placeholder="例: 山田太郎"
              required
            />
          </div>
          <div class="form-control">
            <label class="label">
              <span class="label-text">届出先 *</span>
            </label>
            <select
              value={fund.registration_authority}
              onChange={(e) =>
                setFund({
                  ...fund,
                  registration_authority: (e.target as HTMLSelectElement).value,
                })
              }
              class="select select-bordered"
              required
            >
              <option value="">選択してください</option>
              <option value="総務省">総務省</option>
              <option value="北海道選管">北海道選管</option>
              <option value="青森県選管">青森県選管</option>
              <option value="岩手県選管">岩手県選管</option>
              <option value="宮城県選管">宮城県選管</option>
              <option value="秋田県選管">秋田県選管</option>
              <option value="山形県選管">山形県選管</option>
              <option value="福島県選管">福島県選管</option>
              <option value="茨城県選管">茨城県選管</option>
              <option value="栃木県選管">栃木県選管</option>
              <option value="群馬県選管">群馬県選管</option>
              <option value="埼玉県選管">埼玉県選管</option>
              <option value="千葉県選管">千葉県選管</option>
              <option value="東京都選管">東京都選管</option>
              <option value="神奈川県選管">神奈川県選管</option>
              <option value="新潟県選管">新潟県選管</option>
              <option value="富山県選管">富山県選管</option>
              <option value="石川県選管">石川県選管</option>
              <option value="福井県選管">福井県選管</option>
              <option value="山梨県選管">山梨県選管</option>
              <option value="長野県選管">長野県選管</option>
              <option value="岐阜県選管">岐阜県選管</option>
              <option value="静岡県選管">静岡県選管</option>
              <option value="愛知県選管">愛知県選管</option>
              <option value="三重県選管">三重県選管</option>
              <option value="滋賀県選管">滋賀県選管</option>
              <option value="京都府選管">京都府選管</option>
              <option value="大阪府選管">大阪府選管</option>
              <option value="兵庫県選管">兵庫県選管</option>
              <option value="奈良県選管">奈良県選管</option>
              <option value="和歌山県選管">和歌山県選管</option>
              <option value="鳥取県選管">鳥取県選管</option>
              <option value="島根県選管">島根県選管</option>
              <option value="岡山県選管">岡山県選管</option>
              <option value="広島県選管">広島県選管</option>
              <option value="山口県選管">山口県選管</option>
              <option value="徳島県選管">徳島県選管</option>
              <option value="香川県選管">香川県選管</option>
              <option value="愛媛県選管">愛媛県選管</option>
              <option value="高知県選管">高知県選管</option>
              <option value="福岡県選管">福岡県選管</option>
              <option value="佐賀県選管">佐賀県選管</option>
              <option value="長崎県選管">長崎県選管</option>
              <option value="熊本県選管">熊本県選管</option>
              <option value="大分県選管">大分県選管</option>
              <option value="宮崎県選管">宮崎県選管</option>
              <option value="鹿児島県選管">鹿児島県選管</option>
              <option value="沖縄県選管">沖縄県選管</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );

  // ドメイン変更モードかつ認証済みの場合
  if (changeDomain && verifiedPolitician) {
    // DNS TXT認証が必要な申請を探す
    const pendingDnsVerification = politicianVerifications.find(
      (v) =>
        v.request_type === "domain_change" &&
        v.status === "pending" &&
        v.verification_method === "dns_txt"
    );

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

        {/* 現在の認証情報 */}
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <h3 class="card-title text-base">現在の認証情報</h3>
            <div class="bg-base-200 p-4 rounded-lg">
              <div class="grid grid-cols-2 gap-2 text-sm">
                <div class="text-base-content/70">氏名</div>
                <div class="font-medium">{verifiedPolitician.name}</div>
                <div class="text-base-content/70">認証ドメイン</div>
                <div class="font-mono">
                  {verifiedPolitician.verified_domain}
                </div>
                <div class="text-base-content/70">認証日</div>
                <div>
                  {verifiedPolitician.verified_at
                    ? new Date(
                        verifiedPolitician.verified_at
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

        {/* 認証コード入力（メール認証の場合） */}
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

        {/* ドメイン変更フォーム */}
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <h3 class="card-title text-base">ドメイン変更申請</h3>
            <div class="alert alert-warning mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="stroke-current shrink-0 h-6 w-6"
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

            <form onSubmit={handleDomainChangeSubmit} class="space-y-4">
              <div class="form-control">
                <label class="label">
                  <span class="label-text">
                    新しい公式メールアドレス <span class="text-error">*</span>
                  </span>
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) =>
                    setNewEmail((e.target as HTMLInputElement).value)
                  }
                  class="input input-bordered"
                  placeholder="例: info@new-domain.jp"
                  required
                />
                {newEmail && (
                  <label class="label">
                    {newIsLgDomain ? (
                      <span class="label-text-alt text-success">
                        🏛️ lg.jpドメイン - メール認証を使用します
                      </span>
                    ) : (
                      <span class="label-text-alt text-warning">
                        🔐 DNS TXT認証が必要です
                      </span>
                    )}
                  </label>
                )}
              </div>

              {/* 認証情報入力 */}
              <VerificationInfoForm
                type={newInfoType}
                setType={setNewInfoType}
                candidate={newCandidateInfo}
                setCandidate={setNewCandidateInfo}
                fund={newFundInfo}
                setFund={setNewFundInfo}
              />

              <div class="flex gap-2">
                <button
                  type="submit"
                  class="btn btn-primary"
                  disabled={isSubmitting || !newEmail}
                >
                  {isSubmitting ? "送信中..." : "変更を申請"}
                </button>
                <a href="/profile/politician" class="btn">
                  キャンセル
                </a>
              </div>
            </form>
          </div>
        </div>

        {/* 申請履歴（ドメイン変更のみ表示） */}
        {politicianVerifications.filter(
          (v) => v.request_type === "domain_change"
        ).length > 0 && (
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h3 class="card-title text-base">ドメイン変更申請履歴</h3>
              <div class="space-y-3">
                {politicianVerifications
                  .filter((v) => v.request_type === "domain_change")
                  .map((v) => (
                    <div
                      key={v.id}
                      class="flex items-center justify-between p-4 bg-base-200 rounded-lg"
                    >
                      <div>
                        <span class="text-sm text-base-content/70">
                          {v.official_email}
                        </span>
                        <p class="text-xs text-base-content/50">
                          {new Date(v.created_at).toLocaleDateString("ja-JP")}
                          {v.is_lg_domain && (
                            <span class="badge badge-primary badge-sm ml-2">
                              lg.jp
                            </span>
                          )}
                          {v.verification_method === "dns_txt" && (
                            <span class="badge badge-secondary badge-sm ml-2">
                              DNS TXT
                            </span>
                          )}
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
                            class="btn btn-sm btn-outline"
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

  // 通常モード
  // DNS TXT認証が必要な申請を探す
  const pendingDnsVerification = politicianVerifications.find(
    (v) => v.status === "pending" && v.verification_method === "dns_txt"
  );

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

      {/* 認証済み表示 */}
      {verifiedPolitician && (
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <div class="flex items-center gap-4">
              <div class="avatar placeholder">
                <div class="bg-success text-success-content rounded-full w-16">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-8 w-8"
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
                <h3 class="text-lg font-bold">{verifiedPolitician.name}</h3>
                <p class="text-base-content/70">
                  認証済み（{verifiedPolitician.verified_domain}）
                </p>
                <p class="text-sm text-base-content/50">
                  認証日:{" "}
                  {verifiedPolitician.verified_at
                    ? new Date(
                        verifiedPolitician.verified_at
                      ).toLocaleDateString("ja-JP")
                    : "-"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 未認証の場合、申請フォームを表示 */}
      {!verifiedPolitician && (
        <>
          {/* DNS TXT認証UI（対象の申請がある場合） */}
          {pendingDnsVerification && (
            <DnsTxtVerificationUI verification={pendingDnsVerification} />
          )}

          {/* 申請履歴 */}
          {politicianVerifications.length > 0 && (
            <div class="card bg-base-100 shadow-xl">
              <div class="card-body">
                <h3 class="card-title text-base">申請履歴</h3>
                <div class="space-y-3">
                  {politicianVerifications.map((v) => (
                    <div
                      key={v.id}
                      class="flex items-center justify-between p-4 bg-base-200 rounded-lg"
                    >
                      <div>
                        <span class="font-medium">{v.name}</span>
                        <span class="text-sm text-base-content/70 ml-2">
                          ({v.official_email})
                        </span>
                        <p class="text-xs text-base-content/50">
                          {new Date(v.created_at).toLocaleDateString("ja-JP")}
                          {v.is_lg_domain && (
                            <span class="badge badge-primary badge-sm ml-2">
                              lg.jp
                            </span>
                          )}
                          {v.verification_method === "dns_txt" && (
                            <span class="badge badge-secondary badge-sm ml-2">
                              DNS TXT
                            </span>
                          )}
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
                            class="btn btn-sm btn-outline"
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
                        setVerificationCode(
                          (e.target as HTMLInputElement).value
                        )
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
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="form-control">
                      <label class="label">
                        <span class="label-text">氏名 *</span>
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) =>
                          setName((e.target as HTMLInputElement).value)
                        }
                        class="input input-bordered"
                        placeholder="山田 太郎"
                        required
                      />
                    </div>
                    <div class="form-control">
                      <label class="label">
                        <span class="label-text">公式メールアドレス *</span>
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) =>
                          setEmail((e.target as HTMLInputElement).value)
                        }
                        class="input input-bordered"
                        placeholder="例: info@example.lg.jp"
                        required
                      />
                      {email && (
                        <label class="label">
                          {isLgDomain ? (
                            <span class="label-text-alt text-success">
                              🏛️ lg.jpドメイン - メール認証を使用します
                            </span>
                          ) : (
                            <span class="label-text-alt text-warning">
                              🔐 DNS TXT認証が必要です
                            </span>
                          )}
                        </label>
                      )}
                    </div>
                    <div class="form-control">
                      <label class="label">
                        <span class="label-text">公式サイト URL</span>
                      </label>
                      <input
                        type="url"
                        value={url}
                        onChange={(e) =>
                          setUrl((e.target as HTMLInputElement).value)
                        }
                        class="input input-bordered"
                        placeholder="https://"
                      />
                    </div>
                    <div class="form-control">
                      <label class="label">
                        <span class="label-text">所属政党</span>
                      </label>
                      <input
                        type="text"
                        value={party}
                        onChange={(e) =>
                          setParty((e.target as HTMLInputElement).value)
                        }
                        class="input input-bordered"
                        placeholder="無所属"
                      />
                    </div>
                  </div>

                  {/* 認証情報入力 */}
                  <VerificationInfoForm
                    type={infoType}
                    setType={setInfoType}
                    candidate={candidateInfo}
                    setCandidate={setCandidateInfo}
                    fund={fundInfo}
                    setFund={setFundInfo}
                  />

                  <div class="flex gap-2">
                    <button
                      type="submit"
                      class="btn btn-primary"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "送信中..." : "申請する"}
                    </button>
                    <button
                      type="button"
                      class="btn"
                      onClick={() => setShowForm(false)}
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
                  政治家として認証されると、選挙台帳を作成できるようになります。
                  認証にはlg.jpドメインの場合はメール認証、それ以外はDNS
                  TXT認証が必要です。
                </p>
                <button
                  class="btn btn-primary"
                  onClick={() => setShowForm(true)}
                >
                  認証を申請する
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
