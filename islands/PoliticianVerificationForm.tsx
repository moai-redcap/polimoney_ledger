import { useState } from "preact/hooks";

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
  status: string;
  created_at: string;
  request_type?: string;
}

interface Props {
  userId: string;
  verifiedPolitician: Politician | null;
  politicianVerifications: PoliticianVerification[];
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

export default function PoliticianVerificationForm({
  userId,
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

  // ドメイン変更フォーム状態
  const [newEmail, setNewEmail] = useState("");

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

  // 新規申請送信
  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/politicians/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          official_email: email,
          official_url: url || undefined,
          party: party || undefined,
          request_type: "new",
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
    if (!verifiedPolitician) return;

    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/politicians/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: verifiedPolitician.name,
          official_email: newEmail,
          politician_id: verifiedPolitician.id,
          request_type: "domain_change",
          previous_domain: verifiedPolitician.verified_domain,
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

  // 認証コード送信
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

  // ドメイン変更モードかつ認証済みの場合
  if (changeDomain && verifiedPolitician) {
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
                新しいドメインでメール認証を行います。承認後、認証ドメインが変更されます。
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
                <label class="label">
                  <span class="label-text-alt text-base-content/60">
                    変更先ドメインのメールアドレスを入力してください
                  </span>
                </label>
              </div>
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
                        {v.status === "pending" && (
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
                        {v.status === "pending" && (
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
                      <label class="label">
                        <span class="label-text-alt">
                          公式サイトと同じドメインのメールアドレス
                        </span>
                      </label>
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
                  認証には公式メールアドレスでの確認が必要です。
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
