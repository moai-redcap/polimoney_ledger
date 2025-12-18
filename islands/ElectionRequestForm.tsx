import { useState } from "preact/hooks";

const ELECTION_TYPES: Record<string, string> = {
  HR: "衆議院議員選挙",
  HC: "参議院議員選挙",
  PG: "都道府県知事選挙",
  PA: "都道府県議会選挙",
  GM: "市区町村長選挙",
  CM: "市区町村議会選挙",
};

interface ElectionRequestFormProps {
  userEmail?: string;
}

export default function ElectionRequestForm({
  userEmail,
}: ElectionRequestFormProps) {
  // フォームの状態
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [areaDescription, setAreaDescription] = useState("");
  const [electionDate, setElectionDate] = useState("");
  const [email, setEmail] = useState(userEmail || "");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [notes, setNotes] = useState("");

  // UI状態
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    // バリデーション
    if (!name.trim()) {
      setMessage({ type: "error", text: "選挙名を入力してください" });
      setIsSubmitting(false);
      return;
    }

    if (!type) {
      setMessage({ type: "error", text: "選挙種別を選択してください" });
      setIsSubmitting(false);
      return;
    }

    if (!areaDescription.trim()) {
      setMessage({ type: "error", text: "選挙区の説明を入力してください" });
      setIsSubmitting(false);
      return;
    }

    if (!electionDate) {
      setMessage({ type: "error", text: "選挙日を入力してください" });
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/election-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          type,
          area_description: areaDescription.trim(),
          election_date: electionDate,
          requested_by_email: email.trim() || null,
          evidence_url: evidenceUrl.trim() || null,
          notes: notes.trim() || null,
        }),
      });

      if (!response.ok) {
        const json = await response.json();
        throw new Error(json.error || "リクエストの送信に失敗しました");
      }

      setMessage({
        type: "success",
        text: "選挙登録リクエストを送信しました。運営が確認後、承認されると選挙が利用可能になります。",
      });

      // フォームをリセット
      setName("");
      setType("");
      setAreaDescription("");
      setElectionDate("");
      setEvidenceUrl("");
      setNotes("");
    } catch (err) {
      setMessage({
        type: "error",
        text:
          err instanceof Error ? err.message : "リクエストの送信に失敗しました",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} class="space-y-6">
      {/* メッセージ */}
      {message && (
        <div
          class={`alert ${
            message.type === "success" ? "alert-success" : "alert-error"
          }`}
        >
          <span>{message.text}</span>
        </div>
      )}

      {/* 基本情報 */}
      <div class="card bg-base-200">
        <div class="card-body">
          <h3 class="card-title text-base">選挙情報</h3>

          {/* 選挙名 */}
          <div class="form-control">
            <label class="label">
              <span class="label-text">
                選挙名 <span class="text-error">*</span>
              </span>
            </label>
            <input
              type="text"
              class="input input-bordered"
              placeholder="例: 2025年 渋谷区議会議員選挙"
              value={name}
              onInput={(e) => setName((e.target as HTMLInputElement).value)}
              required
            />
            <label class="label">
              <span class="label-text-alt text-base-content/70">
                正式な選挙名を入力してください
              </span>
            </label>
          </div>

          {/* 選挙種別 */}
          <div class="form-control">
            <label class="label">
              <span class="label-text">
                選挙種別 <span class="text-error">*</span>
              </span>
            </label>
            <select
              class="select select-bordered"
              value={type}
              onChange={(e) => setType((e.target as HTMLSelectElement).value)}
              required
            >
              <option value="">選択してください</option>
              {Object.entries(ELECTION_TYPES).map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* 選挙区の説明 */}
          <div class="form-control">
            <label class="label">
              <span class="label-text">
                選挙区・地域の説明 <span class="text-error">*</span>
              </span>
            </label>
            <textarea
              class="textarea textarea-bordered"
              placeholder="例: 東京都渋谷区（定数34名）"
              rows={2}
              value={areaDescription}
              onInput={(e) =>
                setAreaDescription((e.target as HTMLTextAreaElement).value)
              }
              required
            />
            <label class="label">
              <span class="label-text-alt text-base-content/70">
                選挙区の範囲や定数など、選挙を特定できる情報を入力してください
              </span>
            </label>
          </div>

          {/* 選挙日 */}
          <div class="form-control">
            <label class="label">
              <span class="label-text">
                選挙日（投開票日） <span class="text-error">*</span>
              </span>
            </label>
            <input
              type="date"
              class="input input-bordered"
              value={electionDate}
              onInput={(e) =>
                setElectionDate((e.target as HTMLInputElement).value)
              }
              required
            />
          </div>
        </div>
      </div>

      {/* 連絡先・補足情報 */}
      <div class="card bg-base-200">
        <div class="card-body">
          <h3 class="card-title text-base">連絡先・補足情報</h3>

          {/* メールアドレス */}
          <div class="form-control">
            <label class="label">
              <span class="label-text">連絡先メールアドレス</span>
            </label>
            <input
              type="email"
              class="input input-bordered"
              placeholder="example@email.com"
              value={email}
              onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
            />
            <label class="label">
              <span class="label-text-alt text-base-content/70">
                承認結果の連絡や確認が必要な場合に使用します
              </span>
            </label>
          </div>

          {/* 証拠URL */}
          <div class="form-control">
            <label class="label">
              <span class="label-text">参考URL</span>
            </label>
            <input
              type="url"
              class="input input-bordered"
              placeholder="https://..."
              value={evidenceUrl}
              onInput={(e) =>
                setEvidenceUrl((e.target as HTMLInputElement).value)
              }
            />
            <label class="label">
              <span class="label-text-alt text-base-content/70">
                選挙管理委員会のページや告示など、選挙情報を確認できるURLがあれば入力してください
              </span>
            </label>
          </div>

          {/* 備考 */}
          <div class="form-control">
            <label class="label">
              <span class="label-text">備考</span>
            </label>
            <textarea
              class="textarea textarea-bordered"
              placeholder="補足情報があれば入力してください"
              rows={3}
              value={notes}
              onInput={(e) => setNotes((e.target as HTMLTextAreaElement).value)}
            />
          </div>
        </div>
      </div>

      {/* 送信ボタン */}
      <div class="flex gap-4">
        <a href="/elections/new" class="btn btn-outline">
          戻る
        </a>
        <button
          type="submit"
          class={`btn btn-primary flex-1 ${isSubmitting ? "loading" : ""}`}
          disabled={isSubmitting}
        >
          {isSubmitting ? "送信中..." : "登録をリクエスト"}
        </button>
      </div>

      {/* 注意事項 */}
      <div class="alert alert-info">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          class="stroke-current shrink-0 w-6 h-6"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div>
          <p class="font-bold">リクエスト後の流れ</p>
          <ul class="list-disc list-inside text-sm mt-1">
            <li>運営が内容を確認し、承認・却下を判断します</li>
            <li>承認されると、選挙が一覧に追加されます</li>
            <li>通常1〜3営業日以内に処理されます</li>
          </ul>
        </div>
      </div>
    </form>
  );
}
