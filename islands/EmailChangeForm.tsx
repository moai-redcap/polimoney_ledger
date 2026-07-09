import { useState } from "preact/hooks";

interface Props {
  currentEmail: string;
}

export default function EmailChangeForm({ currentEmail }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<
    {
      type: "success" | "error" | "info";
      text: string;
    } | null
  >(null);

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
        text:
          "確認メールを送信しました。メール内の「メールアドレスを確認する」ボタンをクリックして変更を完了してください。※メールは noreply@mail.app.supabase.io から届きます。",
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

  const alertClass = (type: string) => {
    switch (type) {
      case "success":
        return "st-alert st-alert--success";
      case "info":
        return "st-alert st-alert--info";
      default:
        return "st-alert st-alert--error";
    }
  };

  return (
    <div class="st-card st-card--elevated">
      <div class="st-card__content" style="padding: var(--st-sys-spacing-6);">
        <h2 class="st-card__title">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            style="width: 1.5rem; height: 1.5rem;"
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
            class={alertClass(message.type)}
            style="margin-top: var(--st-sys-spacing-2);"
          >
            <div class="st-alert__content">{message.text}</div>
          </div>
        )}

        {isEditing
          ? (
            <form onSubmit={handleSubmit} class="st-stack st-stack--md" style="margin-top: var(--st-sys-spacing-2);">
              <div class="st-field">
                <label class="st-field__label">現在のメールアドレス</label>
                <input
                  type="email"
                  value={currentEmail}
                  class="st-input"
                  disabled
                />
              </div>
              <div class="st-field">
                <label class="st-field__label">新しいメールアドレス</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) =>
                    setNewEmail((e.target as HTMLInputElement).value)}
                  class="st-input"
                  placeholder="新しいメールアドレスを入力"
                  required
                />
                <span class="st-field__helper">確認メールが送信されます</span>
              </div>
              <div class="st-flex st-gap-2">
                <button
                  type="submit"
                  class="st-button st-button--filled"
                  disabled={isSubmitting || !newEmail ||
                    newEmail === currentEmail}
                >
                  {isSubmitting ? "送信中..." : "変更を申請"}
                </button>
                <button
                  type="button"
                  class="st-button st-button--text"
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
          )
          : (
            <>
              <p style="color: var(--st-sys-color-on-surface-variant);">{currentEmail}</p>
              <div class="st-card__actions" style="margin-top: var(--st-sys-spacing-2);">
                <button
                  class="st-button st-button--outlined st-button--sm"
                  onClick={() => setIsEditing(true)}
                >
                  メールアドレスを変更
                </button>
              </div>
            </>
          )}

        <div class="st-alert st-alert--info" style="margin-top: var(--st-sys-spacing-4);">
          <div class="st-alert__icon">ℹ️</div>
          <div class="st-alert__content" style="font-size: var(--st-sys-typescale-body-small-size);">
            ログインに使用するメールアドレスです。政治家認証・政治団体管理者認証で使用する「連絡メールアドレス」とは別です。
          </div>
        </div>
      </div>
    </div>
  );
}
