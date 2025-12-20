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
}

interface Props {
  userId: string;
  verifiedPolitician: Politician | null;
  politicianVerifications: PoliticianVerification[];
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
}: Props) {
  // 政治家認証フォーム
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [url, setUrl] = useState("");
  const [party, setParty] = useState("");

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

  // 申請送信
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
      {verifiedPolitician ? (
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
      ) : (
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
