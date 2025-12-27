import { useState } from "preact/hooks";

interface Contact {
  id: string;
  contact_type: "person" | "corporation" | "political_organization";
  name: string;
  address: string | null;
  occupation: string | null;
  hub_organization_id: string | null;
  is_name_private: boolean;
  is_address_private: boolean;
  is_occupation_private: boolean;
  privacy_reason_type: string | null;
  privacy_reason_other: string | null;
  created_at: string;
}

interface ContactManagerProps {
  initialContacts: Contact[];
}

type ModalMode = "closed" | "add" | "edit";

export default function ContactManager({
  initialContacts,
}: ContactManagerProps) {
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [modalMode, setModalMode] = useState<ModalMode>("closed");
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // フォームの状態
  const [formData, setFormData] = useState({
    contact_type: "person" as
      | "person"
      | "corporation"
      | "political_organization",
    name: "",
    address: "",
    occupation: "",
    hub_organization_id: "",
    is_name_private: false,
    is_address_private: false,
    is_occupation_private: false,
    privacy_reason_type: "" as "" | "personal_info" | "other",
    privacy_reason_other: "",
  });

  // 政治団体Hub連携用
  const [isFetchingOrg, setIsFetchingOrg] = useState(false);
  const [orgFetchError, setOrgFetchError] = useState<string | null>(null);

  const resetForm = () => {
    setFormData({
      contact_type: "person",
      name: "",
      address: "",
      occupation: "",
      hub_organization_id: "",
      is_name_private: false,
      is_address_private: false,
      is_occupation_private: false,
      privacy_reason_type: "",
      privacy_reason_other: "",
    });
    setOrgFetchError(null);
    setError(null);
  };

  // 政治団体情報をHub APIから取得
  const fetchOrganizationInfo = async () => {
    if (!formData.hub_organization_id.trim()) {
      setOrgFetchError("政治団体IDを入力してください");
      return;
    }

    setIsFetchingOrg(true);
    setOrgFetchError(null);

    try {
      const response = await fetch(
        `/api/hub-organizations/${formData.hub_organization_id.trim()}`
      );

      if (!response.ok) {
        const json = await response.json();
        throw new Error(json.error || "政治団体情報の取得に失敗しました");
      }

      const result = await response.json();
      const org = result.data;

      // 取得した情報をフォームに自動入力
      setFormData((prev) => ({
        ...prev,
        name: org.name,
        address: org.office_address || prev.address,
      }));

      setOrgFetchError(null);
    } catch (err) {
      setOrgFetchError(
        err instanceof Error ? err.message : "取得に失敗しました"
      );
    } finally {
      setIsFetchingOrg(false);
    }
  };

  const openAddModal = () => {
    resetForm();
    setEditingContact(null);
    setModalMode("add");
  };

  const openEditModal = (contact: Contact) => {
    setFormData({
      contact_type: contact.contact_type,
      name: contact.name,
      address: contact.address || "",
      occupation: contact.occupation || "",
      is_name_private: contact.is_name_private,
      is_address_private: contact.is_address_private,
      is_occupation_private: contact.is_occupation_private,
      privacy_reason_type:
        (contact.privacy_reason_type as "" | "personal_info" | "other") || "",
      privacy_reason_other: contact.privacy_reason_other || "",
    });
    setEditingContact(contact);
    setModalMode("edit");
  };

  const closeModal = () => {
    setModalMode("closed");
    setEditingContact(null);
    resetForm();
  };

  const hasPrivacySetting =
    formData.is_name_private ||
    formData.is_address_private ||
    formData.is_occupation_private;

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // バリデーション
    if (!formData.name.trim()) {
      setError("氏名/団体名は必須です");
      setIsLoading(false);
      return;
    }

    if (hasPrivacySetting && !formData.privacy_reason_type) {
      setError("非公開設定がある場合は理由を選択してください");
      setIsLoading(false);
      return;
    }

    if (
      formData.privacy_reason_type === "other" &&
      !formData.privacy_reason_other.trim()
    ) {
      setError("その他の理由を入力してください");
      setIsLoading(false);
      return;
    }

    const requestData = {
      contact_type: formData.contact_type,
      name: formData.name.trim(),
      address: formData.address.trim() || null,
      occupation:
        formData.contact_type === "person"
          ? formData.occupation.trim() || null
          : null,
      is_name_private: formData.is_name_private,
      is_address_private: formData.is_address_private,
      is_occupation_private:
        formData.contact_type === "person"
          ? formData.is_occupation_private
          : false,
      privacy_reason_type: hasPrivacySetting
        ? formData.privacy_reason_type
        : null,
      privacy_reason_other:
        hasPrivacySetting && formData.privacy_reason_type === "other"
          ? formData.privacy_reason_other.trim()
          : null,
    };

    try {
      if (modalMode === "add") {
        const res = await fetch("/api/contacts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestData),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "登録に失敗しました");
        }

        const { data } = await res.json();
        setContacts(
          [...contacts, data].sort((a, b) => a.name.localeCompare(b.name))
        );
      } else if (modalMode === "edit" && editingContact) {
        const res = await fetch(`/api/contacts/${editingContact.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestData),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "更新に失敗しました");
        }

        const { data } = await res.json();
        setContacts(
          contacts
            .map((c) => (c.id === editingContact.id ? data : c))
            .sort((a, b) => a.name.localeCompare(b.name))
        );
      }

      closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (contact: Contact) => {
    if (!confirm(`「${contact.name}」を削除しますか？`)) {
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/contacts/${contact.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "削除に失敗しました");
      }

      setContacts(contacts.filter((c) => c.id !== contact.id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "削除に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {/* ヘッダー */}
      <div class="flex justify-between items-center mb-6">
        <div>
          <p class="text-base-content/70">
            仕訳で使用する関係者（寄附者、支払先、銀行など）を管理します。
          </p>
        </div>
        <button class="btn btn-primary" onClick={openAddModal}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5 mr-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 4v16m8-8H4"
            />
          </svg>
          新規登録
        </button>
      </div>

      {/* 関係者一覧 */}
      {contacts.length === 0 ? (
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body items-center text-center py-12">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-16 w-16 text-base-content/30 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <h3 class="text-lg font-semibold">
              関係者がまだ登録されていません
            </h3>
            <p class="text-base-content/70">
              「新規登録」ボタンから関係者を追加してください。
            </p>
          </div>
        </div>
      ) : (
        <div class="card bg-base-100 shadow-xl">
          <div class="overflow-x-auto">
            <table class="table">
              <thead>
                <tr>
                  <th>種別</th>
                  <th>氏名/団体名</th>
                  <th>住所</th>
                  <th>職業</th>
                  <th>非公開</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((contact) => (
                  <tr key={contact.id} class="hover">
                    <td>
                      <span
                        class={`badge ${
                          contact.contact_type === "person"
                            ? "badge-info"
                            : contact.contact_type === "political_organization"
                            ? "badge-secondary"
                            : "badge-warning"
                        }`}
                      >
                        {contact.contact_type === "person"
                          ? "個人"
                          : contact.contact_type === "political_organization"
                          ? "政治団体"
                          : "法人"}
                      </span>
                    </td>
                    <td class="font-medium">{contact.name}</td>
                    <td class="text-sm text-base-content/70 max-w-xs truncate">
                      {contact.address || "-"}
                    </td>
                    <td class="text-sm text-base-content/70">
                      {contact.contact_type === "person"
                        ? contact.occupation || "-"
                        : "-"}
                    </td>
                    <td>
                      {(contact.is_name_private ||
                        contact.is_address_private ||
                        contact.is_occupation_private) && (
                        <span class="badge badge-ghost badge-sm">あり</span>
                      )}
                    </td>
                    <td>
                      <div class="flex gap-2">
                        <button
                          class="btn btn-ghost btn-sm"
                          onClick={() => openEditModal(contact)}
                        >
                          編集
                        </button>
                        <button
                          class="btn btn-ghost btn-sm text-error"
                          onClick={() => handleDelete(contact)}
                          disabled={isLoading}
                        >
                          削除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* モーダル */}
      {modalMode !== "closed" && (
        <dialog class="modal modal-open">
          <div class="modal-box max-w-2xl">
            <h3 class="font-bold text-lg mb-4">
              {modalMode === "add" ? "関係者の新規登録" : "関係者の編集"}
            </h3>

            {error && (
              <div class="alert alert-error mb-4">
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* 種別 */}
              <div class="form-control mb-4">
                <label class="label">
                  <span class="label-text font-medium">種別</span>
                </label>
                <div class="join">
                  <input
                    class="join-item btn"
                    type="radio"
                    name="contact_type"
                    aria-label="個人"
                    checked={formData.contact_type === "person"}
                    onChange={() =>
                      setFormData({ ...formData, contact_type: "person" })
                    }
                  />
                  <input
                    class="join-item btn"
                    type="radio"
                    name="contact_type"
                    aria-label="法人/団体"
                    checked={formData.contact_type === "corporation"}
                    onChange={() =>
                      setFormData({ ...formData, contact_type: "corporation" })
                    }
                  />
                  <input
                    class="join-item btn"
                    type="radio"
                    name="contact_type"
                    aria-label="政治団体"
                    checked={formData.contact_type === "political_organization"}
                    onChange={() =>
                      setFormData({
                        ...formData,
                        contact_type: "political_organization",
                      })
                    }
                  />
                </div>
              </div>

              {/* 政治団体ID入力（政治団体の場合のみ） */}
              {formData.contact_type === "political_organization" && (
                <div class="form-control mb-4">
                  <label class="label">
                    <span class="label-text font-medium">
                      政治団体ID <span class="text-error ml-1">*</span>
                    </span>
                  </label>
                  <div class="flex gap-2">
                    <input
                      type="text"
                      class="input input-bordered flex-1"
                      placeholder="例: 12345678-1234-1234-1234-123456789012"
                      value={formData.hub_organization_id}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          hub_organization_id: (e.target as HTMLInputElement)
                            .value,
                        })
                      }
                    />
                    <button
                      type="button"
                      class={`btn btn-secondary ${
                        isFetchingOrg ? "loading" : ""
                      }`}
                      onClick={fetchOrganizationInfo}
                      disabled={
                        isFetchingOrg || !formData.hub_organization_id.trim()
                      }
                    >
                      {isFetchingOrg ? "" : "取得"}
                    </button>
                  </div>
                  {orgFetchError && (
                    <label class="label">
                      <span class="label-text-alt text-error">
                        {orgFetchError}
                      </span>
                    </label>
                  )}
                  <label class="label">
                    <span class="label-text-alt text-base-content/60">
                      Hub DBに登録されている政治団体のIDを入力してください
                    </span>
                  </label>
                </div>
              )}

              {/* 氏名/団体名 */}
              <div class="form-control mb-4">
                <label class="label">
                  <span class="label-text font-medium">
                    {formData.contact_type === "person"
                      ? "氏名"
                      : "団体名/法人名"}
                    <span class="text-error ml-1">*</span>
                  </span>
                </label>
                <input
                  type="text"
                  class="input input-bordered"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      name: (e.target as HTMLInputElement).value,
                    })
                  }
                  placeholder={
                    formData.contact_type === "person"
                      ? "山田 太郎"
                      : "株式会社〇〇"
                  }
                />
                <label class="label">
                  <span class="label-text-alt flex items-center gap-1">
                    <input
                      type="checkbox"
                      class="checkbox checkbox-xs"
                      checked={formData.is_name_private}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          is_name_private: (e.target as HTMLInputElement)
                            .checked,
                        })
                      }
                    />
                    非公開にする
                  </span>
                </label>
              </div>

              {/* 住所 */}
              <div class="form-control mb-4">
                <label class="label">
                  <span class="label-text font-medium">住所</span>
                </label>
                <input
                  type="text"
                  class="input input-bordered"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: (e.target as HTMLInputElement).value,
                    })
                  }
                  placeholder="東京都千代田区..."
                />
                <label class="label">
                  <span class="label-text-alt flex items-center gap-1">
                    <input
                      type="checkbox"
                      class="checkbox checkbox-xs"
                      checked={formData.is_address_private}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          is_address_private: (e.target as HTMLInputElement)
                            .checked,
                        })
                      }
                    />
                    非公開にする
                  </span>
                  <span class="label-text-alt text-warning">
                    5万円超の支出/寄附には住所が必要です
                  </span>
                </label>
              </div>

              {/* 職業（個人のみ） */}
              {formData.contact_type === "person" && (
                <div class="form-control mb-4">
                  <label class="label">
                    <span class="label-text font-medium">職業</span>
                  </label>
                  <input
                    type="text"
                    class="input input-bordered"
                    value={formData.occupation}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        occupation: (e.target as HTMLInputElement).value,
                      })
                    }
                    placeholder="会社員"
                  />
                  <label class="label">
                    <span class="label-text-alt flex items-center gap-1">
                      <input
                        type="checkbox"
                        class="checkbox checkbox-xs"
                        checked={formData.is_occupation_private}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            is_occupation_private: (
                              e.target as HTMLInputElement
                            ).checked,
                          })
                        }
                      />
                      非公開にする
                    </span>
                    <span class="label-text-alt text-warning">
                      5万円超の個人寄附には職業が必要です
                    </span>
                  </label>
                </div>
              )}

              {/* 非公開理由（非公開設定がある場合のみ） */}
              {hasPrivacySetting && (
                <div class="form-control mb-4">
                  <label class="label">
                    <span class="label-text font-medium">
                      非公開理由<span class="text-error ml-1">*</span>
                    </span>
                  </label>
                  <select
                    class="select select-bordered"
                    value={formData.privacy_reason_type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        privacy_reason_type: (e.target as HTMLSelectElement)
                          .value as "" | "personal_info" | "other",
                      })
                    }
                  >
                    <option value="">選択してください</option>
                    <option value="personal_info">個人情報保護のため</option>
                    <option value="other">その他</option>
                  </select>

                  {formData.privacy_reason_type === "other" && (
                    <textarea
                      class="textarea textarea-bordered mt-2"
                      placeholder="具体的な理由を入力"
                      value={formData.privacy_reason_other}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          privacy_reason_other: (
                            e.target as HTMLTextAreaElement
                          ).value,
                        })
                      }
                    />
                  )}
                </div>
              )}

              {/* ボタン */}
              <div class="modal-action">
                <button
                  type="button"
                  class="btn btn-ghost"
                  onClick={closeModal}
                  disabled={isLoading}
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  class="btn btn-primary"
                  disabled={isLoading}
                >
                  {isLoading && (
                    <span class="loading loading-spinner loading-sm" />
                  )}
                  {modalMode === "add" ? "登録" : "更新"}
                </button>
              </div>
            </form>
          </div>
          <form method="dialog" class="modal-backdrop">
            <button onClick={closeModal}>close</button>
          </form>
        </dialog>
      )}
    </div>
  );
}
