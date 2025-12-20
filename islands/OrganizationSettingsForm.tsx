import { useState } from "preact/hooks";
import ImageCropper from "./ImageCropper.tsx";

interface OrganizationFormData {
  name: string;
  type: string;
  official_url: string;
  registration_authority: string;
  established_date: string;
  office_address: string;
  representative_name: string;
  accountant_name: string;
  sns_x: string;
  sns_instagram: string;
  sns_facebook: string;
  sns_tiktok: string;
}

interface Props {
  organizationId: string;
  initialData: OrganizationFormData;
  /** 現在のロゴURL */
  currentLogoUrl?: string | null;
  /** 認証済みドメイン */
  verifiedDomain?: string | null;
}

const organizationTypes: { value: string; label: string }[] = [
  { value: "political_party", label: "政党" },
  { value: "support_group", label: "後援会" },
  { value: "fund_management", label: "資金管理団体" },
  { value: "other", label: "その他の政治団体" },
];

export default function OrganizationSettingsForm({
  organizationId,
  initialData,
  currentLogoUrl,
  verifiedDomain,
}: Props) {
  const [formData, setFormData] = useState<OrganizationFormData>(initialData);
  const [logoUrl, setLogoUrl] = useState<string | null>(currentLogoUrl || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleChange = (
    e: Event & {
      currentTarget: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    }
  ) => {
    const { name, value } = e.currentTarget;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/organizations/${organizationId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          // 空文字は null に変換
          official_url: formData.official_url || null,
          registration_authority: formData.registration_authority || null,
          established_date: formData.established_date || null,
          office_address: formData.office_address || null,
          representative_name: formData.representative_name || null,
          accountant_name: formData.accountant_name || null,
          sns_x: formData.sns_x || null,
          sns_instagram: formData.sns_instagram || null,
          sns_facebook: formData.sns_facebook || null,
          sns_tiktok: formData.sns_tiktok || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "更新に失敗しました");
      }

      setMessage({ type: "success", text: "政治団体情報を更新しました" });
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
    <form onSubmit={handleSubmit} class="space-y-6">
      {/* メッセージ表示 */}
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

      {/* ロゴ */}
      <div class="card bg-base-100 shadow">
        <div class="card-body">
          <h2 class="card-title">団体ロゴ</h2>
          <p class="text-sm text-base-content/70 mb-4">
            政治団体のロゴ画像を設定できます。正方形で表示されます。
          </p>
          <ImageCropper
            currentImageUrl={logoUrl}
            shape="square"
            previewSize={96}
            uploadType="organization_logo"
            entityId={organizationId}
            onUploadComplete={(url) => setLogoUrl(url)}
          />
        </div>
      </div>

      {/* 基本情報 */}
      <div class="card bg-base-100 shadow">
        <div class="card-body">
          <h2 class="card-title">基本情報</h2>
          <p class="text-sm text-base-content/70 mb-4">
            <span class="text-error">*</span> は必須項目です。
          </p>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="form-control">
              <label class="label">
                <span class="label-text">団体名 <span class="text-error">*</span></span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                class="input input-bordered"
                required
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text">団体種別 <span class="text-error">*</span></span>
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                class="select select-bordered"
                required
              >
                {organizationTypes.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text">届出先選挙管理委員会</span>
              </label>
              <input
                type="text"
                name="registration_authority"
                value={formData.registration_authority}
                onChange={handleChange}
                class="input input-bordered"
                placeholder="例: 東京都選挙管理委員会"
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text">届出年月日</span>
              </label>
              <input
                type="date"
                name="established_date"
                value={formData.established_date}
                onChange={handleChange}
                class="input input-bordered"
              />
            </div>

            <div class="form-control md:col-span-2">
              <label class="label">
                <span class="label-text">主たる事務所の所在地</span>
              </label>
              <input
                type="text"
                name="office_address"
                value={formData.office_address}
                onChange={handleChange}
                class="input input-bordered"
                placeholder="例: 東京都千代田区"
              />
              <label class="label">
                <span class="label-text-alt text-base-content/70">
                  公開時は都道府県レベルまでの表示となります
                </span>
              </label>
            </div>

            <div class="form-control md:col-span-2">
              <label class="label">
                <span class="label-text">公式サイト URL</span>
              </label>
              <input
                type="url"
                name="official_url"
                value={formData.official_url}
                onChange={handleChange}
                class="input input-bordered"
                placeholder="https://example.com"
              />
              <label class="label">
                <span class="label-text-alt text-base-content/60">
                  認証済みドメインのURLを入力してください
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* 役職者情報 */}
      <div class="card bg-base-100 shadow">
        <div class="card-body">
          <h2 class="card-title">役職者情報</h2>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="form-control">
              <label class="label">
                <span class="label-text">代表者名</span>
              </label>
              <input
                type="text"
                name="representative_name"
                value={formData.representative_name}
                onChange={handleChange}
                class="input input-bordered"
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text">会計責任者名</span>
              </label>
              <input
                type="text"
                name="accountant_name"
                value={formData.accountant_name}
                onChange={handleChange}
                class="input input-bordered"
              />
            </div>
          </div>
        </div>
      </div>

      {/* SNS リンク */}
      <div class="card bg-base-100 shadow">
        <div class="card-body">
          <h2 class="card-title">SNS リンク</h2>
          <p class="text-sm text-base-content/70 mb-4">
            公式アカウントのURLを入力してください。すべて任意項目です。
          </p>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="form-control">
              <label class="label">
                <span class="label-text">X (Twitter)</span>
              </label>
              <input
                type="url"
                name="sns_x"
                value={formData.sns_x}
                onChange={handleChange}
                class="input input-bordered"
                placeholder="https://x.com/username"
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text">Instagram</span>
              </label>
              <input
                type="url"
                name="sns_instagram"
                value={formData.sns_instagram}
                onChange={handleChange}
                class="input input-bordered"
                placeholder="https://instagram.com/username"
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text">Facebook</span>
              </label>
              <input
                type="url"
                name="sns_facebook"
                value={formData.sns_facebook}
                onChange={handleChange}
                class="input input-bordered"
                placeholder="https://facebook.com/pagename"
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text">TikTok</span>
              </label>
              <input
                type="url"
                name="sns_tiktok"
                value={formData.sns_tiktok}
                onChange={handleChange}
                class="input input-bordered"
                placeholder="https://tiktok.com/@username"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 認証ドメイン変更 */}
      {verifiedDomain && (
        <div class="card bg-base-100 shadow">
          <div class="card-body">
            <h2 class="card-title">認証ドメイン</h2>
            <p class="text-sm text-base-content/70 mb-4">
              公式サイト URL は認証済みドメインである必要があります。
            </p>
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-base-content/70">現在の認証ドメイン</p>
                <p class="font-mono text-lg">{verifiedDomain}</p>
              </div>
              <a
                href="/verify/organization-manager?change_domain=true"
                class="btn btn-outline btn-sm"
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
          class={`btn btn-primary ${isSubmitting ? "loading" : ""}`}
          disabled={isSubmitting}
        >
          {isSubmitting ? "更新中..." : "変更を保存"}
        </button>
      </div>
    </form>
  );
}
