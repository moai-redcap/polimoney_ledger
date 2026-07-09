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
  // SNS
  sns_x: string | null;
  sns_instagram: string | null;
  sns_facebook: string | null;
  sns_tiktok: string | null;
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
  // SNS
  const [snsX, setSnsX] = useState(politician.sns_x || "");
  const [snsInstagram, setSnsInstagram] = useState(
    politician.sns_instagram || "",
  );
  const [snsFacebook, setSnsFacebook] = useState(politician.sns_facebook || "");
  const [snsTiktok, setSnsTiktok] = useState(politician.sns_tiktok || "");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<
    {
      type: "success" | "error";
      text: string;
    } | null
  >(null);

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
          sns_x: snsX.trim() || null,
          sns_instagram: snsInstagram.trim() || null,
          sns_facebook: snsFacebook.trim() || null,
          sns_tiktok: snsTiktok.trim() || null,
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
    <div class="st-stack st-stack--lg">
      {/* 認証情報 */}
      <div class="card bg-success/10 border border-success/30">
        <div class="st-card__content" style="padding: var(--st-sys-spacing-6);">
          <div class="st-flex st-flex--items-center st-gap-3">
            <div class="avatar placeholder">
              <div class="bg-success text-success-content rounded-full w-12">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  style="width: 1.5rem; height: 1.5rem;"
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
              <p style="font-size: var(--st-sys-typescale-body-small-size); color: var(--st-sys-color-on-surface-variant);">
                ドメイン: {politician.verified_domain}
              </p>
              {politician.verified_at && (
                <p style="font-size: var(--st-sys-typescale-label-small-size); color: var(--st-sys-color-on-surface-variant);">
                  認証日:{" "}
                  {new Date(politician.verified_at).toLocaleDateString("ja-JP")}
                </p>
              )}
              <p style="font-size: var(--st-sys-typescale-label-small-size); color: var(--st-sys-color-on-surface-variant); margin-top: var(--st-sys-spacing-1); font-family: monospace;">
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
          class="st-alert"
        >
          <span>{message.text}</span>
        </div>
      )}

      {/* プロフィール写真 */}
      <div class="st-card st-card--elevated">
        <div class="st-card__content" style="padding: var(--st-sys-spacing-6);">
          <h3 class="card-title text-base">プロフィール写真</h3>
          <p style="font-size: var(--st-sys-typescale-body-small-size); color: var(--st-sys-color-on-surface-variant); margin-bottom: var(--st-sys-spacing-4);">
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
      <form onSubmit={handleSubmit} class="st-stack st-stack--lg">
        <div class="st-card st-card--elevated">
          <div class="st-card__content" style="padding: var(--st-sys-spacing-6);">
            <h3 class="card-title text-base">基本情報</h3>
            <p style="font-size: var(--st-sys-typescale-body-small-size); color: var(--st-sys-color-on-surface-variant); margin-bottom: var(--st-sys-spacing-4);">
              <span style="color: var(--st-sys-color-error);">*</span>{" "}
              は必須項目です。この情報は公開ページで表示されます。
            </p>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="st-field">
                <label class="st-field__label-wrapper">
                  <span class="st-field__label">
                    氏名 <span style="color: var(--st-sys-color-error);">*</span>
                  </span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) =>
                    setName((e.target as HTMLInputElement).value)}
                  class="st-input"
                  required
                />
              </div>
              <div class="st-field">
                <label class="st-field__label-wrapper">
                  <span class="st-field__label">ふりがな</span>
                </label>
                <input
                  type="text"
                  value={nameKana}
                  onChange={(e) =>
                    setNameKana((e.target as HTMLInputElement).value)}
                  class="st-input"
                  placeholder="やまだ たろう"
                />
              </div>
              <div class="st-field">
                <label class="st-field__label-wrapper">
                  <span class="st-field__label">所属政党</span>
                </label>
                <input
                  type="text"
                  value={party}
                  onChange={(e) =>
                    setParty((e.target as HTMLInputElement).value)}
                  class="st-input"
                  placeholder="無所属"
                />
              </div>
              <div class="st-field">
                <label class="st-field__label-wrapper">
                  <span class="st-field__label">公式サイト URL</span>
                </label>
                <input
                  type="url"
                  value={officialUrl}
                  onChange={(e) =>
                    setOfficialUrl((e.target as HTMLInputElement).value)}
                  class="st-input"
                  placeholder="https://"
                />
                <label class="st-field__label-wrapper">
                  <span class="st-field__helper">
                    認証済みドメイン ({politician.verified_domain}) のURLを推奨
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* SNS リンク */}
        <div class="st-card st-card--elevated">
          <div class="st-card__content" style="padding: var(--st-sys-spacing-6);">
            <h3 class="card-title text-base">SNS リンク</h3>
            <p style="font-size: var(--st-sys-typescale-body-small-size); color: var(--st-sys-color-on-surface-variant); margin-bottom: var(--st-sys-spacing-4);">
              公式アカウントのURLを入力してください。すべて任意項目です。
            </p>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="st-field">
                <label class="st-field__label-wrapper">
                  <span class="st-field__label">X (Twitter)</span>
                </label>
                <input
                  type="url"
                  value={snsX}
                  onChange={(e) =>
                    setSnsX((e.target as HTMLInputElement).value)}
                  class="st-input"
                  placeholder="https://x.com/username"
                />
              </div>
              <div class="st-field">
                <label class="st-field__label-wrapper">
                  <span class="st-field__label">Instagram</span>
                </label>
                <input
                  type="url"
                  value={snsInstagram}
                  onChange={(e) =>
                    setSnsInstagram((e.target as HTMLInputElement).value)}
                  class="st-input"
                  placeholder="https://instagram.com/username"
                />
              </div>
              <div class="st-field">
                <label class="st-field__label-wrapper">
                  <span class="st-field__label">Facebook</span>
                </label>
                <input
                  type="url"
                  value={snsFacebook}
                  onChange={(e) =>
                    setSnsFacebook((e.target as HTMLInputElement).value)}
                  class="st-input"
                  placeholder="https://facebook.com/pagename"
                />
              </div>
              <div class="st-field">
                <label class="st-field__label-wrapper">
                  <span class="st-field__label">TikTok</span>
                </label>
                <input
                  type="url"
                  value={snsTiktok}
                  onChange={(e) =>
                    setSnsTiktok((e.target as HTMLInputElement).value)}
                  class="st-input"
                  placeholder="https://tiktok.com/@username"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 認証ドメイン変更 */}
        {politician.verified_domain && (
          <div class="st-card st-card--elevated">
            <div class="st-card__content" style="padding: var(--st-sys-spacing-6);">
              <h3 class="card-title text-base">認証ドメイン</h3>
              <p style="font-size: var(--st-sys-typescale-body-small-size); color: var(--st-sys-color-on-surface-variant); margin-bottom: var(--st-sys-spacing-4);">
                公式サイト URL は認証済みドメインである必要があります。
              </p>
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <div>
                  <p style="font-size: var(--st-sys-typescale-body-small-size); color: var(--st-sys-color-on-surface-variant);">現在の認証ドメイン</p>
                  <p class="font-mono text-lg">{politician.verified_domain}</p>
                </div>
                <a
                  href="/verify/politician?change_domain=true"
                  class="st-button st-button--outlined st-button--sm"
                >
                  ドメインを変更
                </a>
              </div>
            </div>
          </div>
        )}

        {/* 送信ボタン */}
        <div class="flex justify-end">
          <button
            type="submit"
            class="st-button st-button--filled"
            disabled={isSubmitting || !name.trim()}
          >
            {isSubmitting ? "保存中..." : "変更を保存"}
          </button>
        </div>
      </form>
    </div>
  );
}
