import { useState } from "preact/hooks";

interface ProfileEditorProps {
  initialDisplayName: string;
}

export default function ProfileEditor({
  initialDisplayName,
}: ProfileEditorProps) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSave = async () => {
    if (!displayName.trim()) {
      setError("氏名を入力してください");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: displayName.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "更新に失敗しました");
      }

      setSuccess("プロフィールを更新しました");
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setDisplayName(initialDisplayName);
    setIsEditing(false);
    setError(null);
  };

  return (
    <div class="st-card st-card--elevated">
      <div class="st-card__content" style="padding: var(--st-sys-spacing-6);">
        <h2 class="st-card__title">プロフィール</h2>

        {error && (
          <div class="st-alert st-alert--error" style="margin-top: var(--st-sys-spacing-2);">
            <div class="st-alert__content">{error}</div>
          </div>
        )}

        {success && (
          <div class="st-alert st-alert--success" style="margin-top: var(--st-sys-spacing-2);">
            <div class="st-alert__content">{success}</div>
          </div>
        )}

        <div class="st-stack st-stack--md" style="margin-top: var(--st-sys-spacing-4);">
          {/* 氏名（本名） */}
          <div class="st-field">
            <label class="st-field__label" style="font-weight: 500;">氏名（本名）</label>
            {isEditing
              ? (
                <div class="st-flex st-gap-2">
                  <input
                    type="text"
                    class="st-input"
                    style="flex: 1;"
                    value={displayName}
                    onChange={(e) =>
                      setDisplayName((e.target as HTMLInputElement).value)}
                    placeholder="山田 太郎"
                  />
                  <button
                    class="st-button st-button--text"
                    onClick={handleCancel}
                    disabled={isLoading}
                  >
                    キャンセル
                  </button>
                  <button
                    class="st-button st-button--filled"
                    onClick={handleSave}
                    disabled={isLoading}
                  >
                    保存
                  </button>
                </div>
              )
              : (
                <div class="st-flex st-gap-2">
                  <input
                    type="text"
                    class="st-input"
                    style="flex: 1;"
                    value={displayName || "（未設定）"}
                    disabled
                  />
                  <button
                    class="st-button st-button--text"
                    onClick={() => setIsEditing(true)}
                  >
                    編集
                  </button>
                </div>
              )}
            <span class="st-field__helper">
              政治家認証やメンバー一覧に表示されます。本名を入力してください。
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
