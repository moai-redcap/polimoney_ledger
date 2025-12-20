import { useState } from "preact/hooks";
import ImageCropper from "./ImageCropper.tsx";

interface Politician {
  id: string;
  name: string;
  name_kana: string | null;
  official_url: string | null;
  party: string | null;
  photo_url: string | null;
  verified_at: string | null;
  verified_domain: string | null;
}

interface Props {
  politician: Politician;
}

export default function PoliticianProfileForm({ politician }: Props) {
  const [photoUrl, setPhotoUrl] = useState(politician.photo_url);
  const [name, setName] = useState(politician.name);
  const [nameKana, setNameKana] = useState(politician.name_kana || "");
  const [officialUrl, setOfficialUrl] = useState(politician.official_url || "");
  const [party, setParty] = useState(politician.party || "");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/profile/politician`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          name_kana: nameKana.trim() || null,
          official_url: officialUrl.trim() || null,
          party: party.trim() || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "更新に失敗しました");
      }

      setMessage({ type: "success", text: "政治家情報を更新しました" });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "更新に失敗しました",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div class="space-y-6">
      {/* 認証情報 */}
      <div class="card bg-success/10 border border-success/30">
        <div class="card-body">
          <div class="flex items-center gap-3">
            <div class="avatar placeholder">
              <div class="bg-success text-success-content rounded-full w-12">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-6 w-6"
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
              <p class="font-bold text-success">認証済み</p>
              <p class="text-sm text-base-content/70">
                ドメイン: {politician.verified_domain}
              </p>
              {politician.verified_at && (
                <p class="text-xs text-base-content/50">
                  認証日:{" "}
                  {new Date(politician.verified_at).toLocaleDateString("ja-JP")}
                </p>
              )}
              <p class="text-xs text-base-content/50 mt-1 font-mono">
                政治家ID: {politician.id}
              </p>
            </div>
          </div>
        </div>
      </div>

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

      {/* プロフィール写真 */}
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h3 class="card-title text-base">プロフィール写真</h3>
          <p class="text-sm text-base-content/70 mb-4">
            Polimoney の政治家ページで表示される顔写真です。円形で表示されます。
          </p>
          <ImageCropper
            currentImageUrl={photoUrl}
            shape="circle"
            previewSize={128}
            uploadType="politician_photo"
            entityId={politician.id}
            onUploadComplete={(url) => setPhotoUrl(url)}
          />
        </div>
      </div>

      {/* 編集フォーム */}
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h3 class="card-title text-base">基本情報</h3>
          <p class="text-sm text-base-content/70 mb-4">
            この情報は公開ページで表示されます。
          </p>

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
                  required
                />
              </div>
              <div class="form-control">
                <label class="label">
                  <span class="label-text">ふりがな</span>
                </label>
                <input
                  type="text"
                  value={nameKana}
                  onChange={(e) =>
                    setNameKana((e.target as HTMLInputElement).value)
                  }
                  class="input input-bordered"
                  placeholder="やまだ たろう"
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
              <div class="form-control">
                <label class="label">
                  <span class="label-text">公式サイト URL</span>
                </label>
                <input
                  type="url"
                  value={officialUrl}
                  onChange={(e) =>
                    setOfficialUrl((e.target as HTMLInputElement).value)
                  }
                  class="input input-bordered"
                  placeholder="https://"
                />
              </div>
            </div>

            <div class="card-actions justify-end mt-6">
              <button
                type="submit"
                class="btn btn-primary"
                disabled={isSubmitting || !name.trim()}
              >
                {isSubmitting ? "保存中..." : "変更を保存"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
