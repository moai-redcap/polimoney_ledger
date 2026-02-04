import { useState } from "preact/hooks";

interface AddContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (contact: {
    id: string;
    name: string;
    contact_type: string;
    hub_organization_id?: string;
  }) => void;
}

type ContactType = "person" | "corporation" | "political_organization";

export default function AddContactModal({
  isOpen,
  onClose,
  onSuccess,
}: AddContactModalProps) {
  const [contactType, setContactType] = useState<ContactType>("person");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [occupation, setOccupation] = useState("");

  // 政治団体用
  const [hubOrganizationId, setHubOrganizationId] = useState("");
  const [isFetchingOrg, setIsFetchingOrg] = useState(false);
  const [orgFetchError, setOrgFetchError] = useState<string | null>(null);

  // プライバシー設定
  const [isNamePrivate, setIsNamePrivate] = useState(false);
  const [isAddressPrivate, setIsAddressPrivate] = useState(false);
  const [isOccupationPrivate, setIsOccupationPrivate] = useState(false);
  const [privacyReasonType, setPrivacyReasonType] = useState<
    "personal_info" | "other"
  >("personal_info");
  const [privacyReasonOther, setPrivacyReasonOther] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasPrivacySetting =
    isNamePrivate || isAddressPrivate || isOccupationPrivate;

  // 政治団体情報をHub APIから取得
  const fetchOrganizationInfo = async () => {
    if (!hubOrganizationId.trim()) {
      setOrgFetchError("政治団体IDを入力してください");
      return;
    }

    setIsFetchingOrg(true);
    setOrgFetchError(null);

    try {
      const response = await fetch(
        `/api/hub-organizations/${hubOrganizationId.trim()}`
      );

      if (!response.ok) {
        const json = await response.json();
        throw new Error(json.error || "政治団体情報の取得に失敗しました");
      }

      const result = await response.json();
      const org = result.data;

      // 取得した情報をフォームに自動入力
      setName(org.name);
      if (org.office_address) {
        setAddress(org.office_address);
      }

      setOrgFetchError(null);
    } catch (err) {
      setOrgFetchError(
        err instanceof Error ? err.message : "取得に失敗しました"
      );
    } finally {
      setIsFetchingOrg(false);
    }
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact_type: contactType,
          name,
          address: address || null,
          occupation: occupation || null,
          hub_organization_id:
            contactType === "political_organization"
              ? hubOrganizationId.trim()
              : null,
          is_name_private: isNamePrivate,
          is_address_private: isAddressPrivate,
          is_occupation_private: isOccupationPrivate,
          privacy_reason_type: hasPrivacySetting ? privacyReasonType : null,
          privacy_reason_other:
            hasPrivacySetting && privacyReasonType === "other"
              ? privacyReasonOther
              : null,
        }),
      });

      if (!response.ok) {
        const json = await response.json();
        throw new Error(json.error || "登録に失敗しました");
      }

      const result = await response.json();
      onSuccess({
        id: result.data.id,
        name: result.data.name,
        contact_type: result.data.contact_type,
        hub_organization_id: result.data.hub_organization_id,
      });

      // フォームをリセット
      resetForm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "登録に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setContactType("person");
    setName("");
    setAddress("");
    setOccupation("");
    setHubOrganizationId("");
    setOrgFetchError(null);
    setIsNamePrivate(false);
    setIsAddressPrivate(false);
    setIsOccupationPrivate(false);
    setPrivacyReasonType("personal_info");
    setPrivacyReasonOther("");
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // 種別変更時にフォームをリセット
  const handleContactTypeChange = (newType: ContactType) => {
    setContactType(newType);
    setName("");
    setAddress("");
    setOccupation("");
    setHubOrganizationId("");
    setOrgFetchError(null);
  };

  if (!isOpen) return null;

  return (
    <div class="modal modal-open">
      <div class="modal-box max-w-lg">
        <h3 class="font-bold text-lg mb-4">関係者を追加</h3>

        <form onSubmit={handleSubmit} class="space-y-4">
          {/* 種別 */}
          <div class="form-control">
            <label class="label">
              <span class="label-text">
                種別 <span class="text-error">*</span>
              </span>
            </label>
            <div class="flex flex-wrap gap-4">
              <label class="label cursor-pointer gap-2">
                <input
                  type="radio"
                  name="contactType"
                  class="radio radio-primary"
                  checked={contactType === "person"}
                  onChange={() => handleContactTypeChange("person")}
                />
                <span class="label-text">個人</span>
              </label>
              <label class="label cursor-pointer gap-2">
                <input
                  type="radio"
                  name="contactType"
                  class="radio radio-primary"
                  checked={contactType === "corporation"}
                  onChange={() => handleContactTypeChange("corporation")}
                />
                <span class="label-text">法人</span>
              </label>
              <label class="label cursor-pointer gap-2">
                <input
                  type="radio"
                  name="contactType"
                  class="radio radio-secondary"
                  checked={contactType === "political_organization"}
                  onChange={() =>
                    handleContactTypeChange("political_organization")
                  }
                />
                <span class="label-text">政治団体</span>
              </label>
            </div>
          </div>

          {/* 政治団体ID入力（政治団体の場合のみ） */}
          {contactType === "political_organization" && (
            <div class="form-control">
              <label class="label">
                <span class="label-text">
                  政治団体ID <span class="text-error">*</span>
                </span>
              </label>
              <div class="flex gap-2">
                <input
                  type="text"
                  class="input input-bordered flex-1"
                  placeholder="例: 12345678-1234-1234-1234-123456789012"
                  value={hubOrganizationId}
                  onChange={(e) =>
                    setHubOrganizationId((e.target as HTMLInputElement).value)
                  }
                  required
                />
                <button
                  type="button"
                  class={`btn btn-secondary ${isFetchingOrg ? "loading" : ""}`}
                  onClick={fetchOrganizationInfo}
                  disabled={isFetchingOrg || !hubOrganizationId.trim()}
                >
                  {isFetchingOrg ? "" : "取得"}
                </button>
              </div>
              {orgFetchError && (
                <label class="label">
                  <span class="label-text-alt text-error">{orgFetchError}</span>
                </label>
              )}
              <label class="label">
                <span class="label-text-alt text-base-content/60">
                  Hub DBに登録されている政治団体のIDを入力してください
                </span>
              </label>
            </div>
          )}

          {/* 名前 */}
          <div class="form-control">
            <label class="label">
              <span class="label-text">
                {contactType === "person"
                  ? "氏名"
                  : contactType === "corporation"
                  ? "法人名"
                  : "団体名"}{" "}
                <span class="text-error">*</span>
              </span>
            </label>
            <input
              type="text"
              class="input input-bordered"
              placeholder={
                contactType === "person"
                  ? "例: 山田 太郎"
                  : contactType === "corporation"
                  ? "例: 株式会社○○"
                  : "例: ○○後援会"
              }
              value={name}
              onChange={(e) => setName((e.target as HTMLInputElement).value)}
              required
              disabled={
                contactType === "political_organization" && isFetchingOrg
              }
            />
          </div>

          {/* 住所 */}
          <div class="form-control">
            <label class="label">
              <span class="label-text">住所</span>
            </label>
            <input
              type="text"
              class="input input-bordered"
              placeholder="例: 東京都千代田区..."
              value={address}
              onChange={(e) => setAddress((e.target as HTMLInputElement).value)}
              disabled={
                contactType === "political_organization" && isFetchingOrg
              }
            />
          </div>

          {/* 職業（個人の場合のみ） */}
          {contactType === "person" && (
            <div class="form-control">
              <label class="label">
                <span class="label-text">職業</span>
              </label>
              <input
                type="text"
                class="input input-bordered"
                placeholder="例: 会社員"
                value={occupation}
                onChange={(e) =>
                  setOccupation((e.target as HTMLInputElement).value)
                }
              />
            </div>
          )}

          {/* プライバシー設定（政治団体以外） */}
          {contactType !== "political_organization" && (
            <>
              <div class="divider text-sm mt-2 mb-0">プライバシー設定</div>

              <div class="space-y-2 pt-2">
                <label class="label cursor-pointer justify-start gap-2">
                  <input
                    type="checkbox"
                    class="checkbox checkbox-sm"
                    checked={isNamePrivate}
                    onChange={(e) =>
                      setIsNamePrivate((e.target as HTMLInputElement).checked)
                    }
                  />
                  <span class="label-text">氏名を非公開にする</span>
                </label>

                <label class="label cursor-pointer justify-start gap-2">
                  <input
                    type="checkbox"
                    class="checkbox checkbox-sm"
                    checked={isAddressPrivate}
                    onChange={(e) =>
                      setIsAddressPrivate(
                        (e.target as HTMLInputElement).checked
                      )
                    }
                  />
                  <span class="label-text">住所を非公開にする</span>
                </label>

                {contactType === "person" && (
                  <label class="label cursor-pointer justify-start gap-2">
                    <input
                      type="checkbox"
                      class="checkbox checkbox-sm"
                      checked={isOccupationPrivate}
                      onChange={(e) =>
                        setIsOccupationPrivate(
                          (e.target as HTMLInputElement).checked
                        )
                      }
                    />
                    <span class="label-text">職業を非公開にする</span>
                  </label>
                )}
              </div>

              {/* プライバシー理由（非公開設定がある場合） */}
              {hasPrivacySetting && (
                <div class="form-control">
                  <label class="label">
                    <span class="label-text">非公開の理由</span>
                  </label>
                  <select
                    class="select select-bordered"
                    value={privacyReasonType}
                    onChange={(e) =>
                      setPrivacyReasonType(
                        (e.target as HTMLSelectElement).value as
                          | "personal_info"
                          | "other"
                      )
                    }
                  >
                    <option value="personal_info">個人情報保護のため</option>
                    <option value="other">その他</option>
                  </select>

                  {privacyReasonType === "other" && (
                    <input
                      type="text"
                      class="input input-bordered mt-2"
                      placeholder="理由を入力"
                      value={privacyReasonOther}
                      onChange={(e) =>
                        setPrivacyReasonOther(
                          (e.target as HTMLInputElement).value
                        )
                      }
                    />
                  )}
                </div>
              )}
            </>
          )}

          {/* エラー表示 */}
          {error && (
            <div class="alert alert-error">
              <span>{error}</span>
            </div>
          )}

          {/* ボタン */}
          <div class="modal-action">
            <button type="button" class="btn btn-ghost" onClick={handleClose}>
              キャンセル
            </button>
            <button
              type="submit"
              class={`btn btn-primary ${isSubmitting ? "loading" : ""}`}
              disabled={isSubmitting}
            >
              {isSubmitting ? "登録中..." : "登録"}
            </button>
          </div>
        </form>
      </div>
      <div class="modal-backdrop fixed inset-0" onClick={handleClose} />
    </div>
  );
}
