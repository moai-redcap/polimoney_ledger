import { useState } from "preact/hooks";

interface Props {
  currentEmail: string;
}

export default function EmailChangeForm({ currentEmail }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();

    if (!newEmail || newEmail === currentEmail) {
      setMessage({
        type: "error",
        text: "新しいメールアドレスを入力してください",
      });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/account/email", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "変更に失敗しました");
      }

      setMessage({
        type: "success",
        text: "確認メールを送信しました。メール内のリンクをクリックして変更を完了してください。",
      });
      setIsEditing(false);
      setNewEmail("");
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "変更に失敗しました",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <h2 class="card-title">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            class="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
            />
          </svg>
          メールアドレス
        </h2>

        {message && (
          <div
            role="alert"
            class={`alert ${
              message.type === "success"
                ? "alert-success"
                : message.type === "info"
                ? "alert-info"
                : "alert-error"
            } mt-2`}
          >
            <span>{message.text}</span>
          </div>
        )}

        {isEditing ? (
          <form onSubmit={handleSubmit} class="space-y-4 mt-2">
            <div class="form-control">
              <label class="label">
                <span class="label-text">現在のメールアドレス</span>
              </label>
              <input
                type="email"
                value={currentEmail}
                class="input input-bordered"
                disabled
              />
            </div>
            <div class="form-control">
              <label class="label">
                <span class="label-text">新しいメールアドレス</span>
              </label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) =>
                  setNewEmail((e.target as HTMLInputElement).value)
                }
                class="input input-bordered"
                placeholder="新しいメールアドレスを入力"
                required
              />
              <label class="label">
                <span class="label-text-alt">確認メールが送信されます</span>
              </label>
            </div>
            <div class="flex gap-2">
              <button
                type="submit"
                class="btn btn-primary"
                disabled={
                  isSubmitting || !newEmail || newEmail === currentEmail
                }
              >
                {isSubmitting ? "送信中..." : "変更を申請"}
              </button>
              <button
                type="button"
                class="btn"
                onClick={() => {
                  setIsEditing(false);
                  setNewEmail("");
                  setMessage(null);
                }}
              >
                キャンセル
              </button>
            </div>
          </form>
        ) : (
          <>
            <p class="text-base-content/70">{currentEmail}</p>
            <div class="card-actions mt-2">
              <button
                class="btn btn-sm btn-outline"
                onClick={() => setIsEditing(true)}
              >
                メールアドレスを変更
              </button>
            </div>
          </>
        )}

        <div class="alert alert-info mt-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            class="stroke-current shrink-0 w-5 h-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span class="text-sm">
            ログインに使用するメールアドレスです。政治家認証・政治団体管理者認証で使用する「公式メールアドレス」とは別です。
          </span>
        </div>
      </div>
    </div>
  );
}
