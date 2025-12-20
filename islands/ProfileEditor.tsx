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
      setError("姓名を入力してください");
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
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <h2 class="card-title">プロフィール</h2>

        {error && (
          <div class="alert alert-error">
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div class="alert alert-success">
            <span>{success}</span>
          </div>
        )}

        <div class="space-y-4 mt-4">
          {/* 姓名（本名） */}
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">姓名（本名）</span>
            </label>
            {isEditing ? (
              <div class="flex gap-2">
                <input
                  type="text"
                  class="input input-bordered flex-1"
                  value={displayName}
                  onChange={(e) =>
                    setDisplayName((e.target as HTMLInputElement).value)
                  }
                  placeholder="山田 太郎"
                />
                <button
                  class="btn btn-ghost"
                  onClick={handleCancel}
                  disabled={isLoading}
                >
                  キャンセル
                </button>
                <button
                  class="btn btn-primary"
                  onClick={handleSave}
                  disabled={isLoading}
                >
                  {isLoading && (
                    <span class="loading loading-spinner loading-sm" />
                  )}
                  保存
                </button>
              </div>
            ) : (
              <div class="flex gap-2">
                <input
                  type="text"
                  class="input input-bordered flex-1 bg-base-200"
                  value={displayName || "（未設定）"}
                  disabled
                />
                <button
                  class="btn btn-ghost"
                  onClick={() => setIsEditing(true)}
                >
                  編集
                </button>
              </div>
            )}
            <label class="label">
              <span class="label-text-alt text-base-content/60">
                政治家認証やメンバー一覧に表示されます。本名を入力してください。
              </span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
