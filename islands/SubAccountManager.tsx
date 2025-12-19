import { useState } from "preact/hooks";

interface SubAccount {
  id: string;
  ledger_type: "political_organization" | "election";
  parent_account_code: string;
  name: string;
  created_at: string;
}

interface AccountMaster {
  code: string;
  name: string;
  type: string;
  report_category: string;
  available_ledger_types: string[];
}

interface SubAccountManagerProps {
  initialSubAccounts: SubAccount[];
  accountMaster: AccountMaster[];
}

type ModalMode = "closed" | "add" | "edit";

export default function SubAccountManager({
  initialSubAccounts,
  accountMaster,
}: SubAccountManagerProps) {
  const [subAccounts, setSubAccounts] =
    useState<SubAccount[]>(initialSubAccounts);
  const [modalMode, setModalMode] = useState<ModalMode>("closed");
  const [editingSubAccount, setEditingSubAccount] = useState<SubAccount | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // フィルター
  const [filterLedgerType, setFilterLedgerType] = useState<string>("all");

  // フォームの状態
  const [formData, setFormData] = useState({
    ledger_type: "political_organization" as
      | "political_organization"
      | "election",
    parent_account_code: "",
    name: "",
  });

  // 勘定科目をフィルタリング（補助科目を設定できる科目のみ）
  const getFilteredAccounts = (ledgerType: string) => {
    return accountMaster.filter((account) => {
      // 支出科目のみ補助科目を設定可能
      if (!account.code.startsWith("EXP_")) return false;
      // 台帳タイプでフィルタリング
      const type =
        ledgerType === "political_organization"
          ? "political_organization"
          : "election";
      return account.available_ledger_types?.includes(type);
    });
  };

  // 勘定科目名を取得
  const getAccountName = (code: string) => {
    return accountMaster.find((a) => a.code === code)?.name || code;
  };

  // 表示用にフィルタリングされた補助科目
  const filteredSubAccounts =
    filterLedgerType === "all"
      ? subAccounts
      : subAccounts.filter((s) => s.ledger_type === filterLedgerType);

  // 勘定科目ごとにグループ化
  const groupedSubAccounts = filteredSubAccounts.reduce(
    (groups, subAccount) => {
      const key = subAccount.parent_account_code;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(subAccount);
      return groups;
    },
    {} as Record<string, SubAccount[]>
  );

  const resetForm = () => {
    setFormData({
      ledger_type: "political_organization",
      parent_account_code: "",
      name: "",
    });
    setError(null);
  };

  const openAddModal = () => {
    resetForm();
    setEditingSubAccount(null);
    setModalMode("add");
  };

  const openEditModal = (subAccount: SubAccount) => {
    setFormData({
      ledger_type: subAccount.ledger_type,
      parent_account_code: subAccount.parent_account_code,
      name: subAccount.name,
    });
    setEditingSubAccount(subAccount);
    setModalMode("edit");
  };

  const closeModal = () => {
    setModalMode("closed");
    setEditingSubAccount(null);
    resetForm();
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // バリデーション
    if (!formData.name.trim()) {
      setError("補助科目名は必須です");
      setIsLoading(false);
      return;
    }

    if (modalMode === "add" && !formData.parent_account_code) {
      setError("勘定科目を選択してください");
      setIsLoading(false);
      return;
    }

    try {
      if (modalMode === "add") {
        const res = await fetch("/api/sub-accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ledger_type: formData.ledger_type,
            parent_account_code: formData.parent_account_code,
            name: formData.name.trim(),
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "登録に失敗しました");
        }

        const { data } = await res.json();
        setSubAccounts(
          [...subAccounts, data].sort((a, b) =>
            a.parent_account_code.localeCompare(b.parent_account_code)
          )
        );
      } else if (modalMode === "edit" && editingSubAccount) {
        const res = await fetch(`/api/sub-accounts/${editingSubAccount.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: formData.name.trim() }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "更新に失敗しました");
        }

        const { data } = await res.json();
        setSubAccounts(
          subAccounts.map((s) => (s.id === editingSubAccount.id ? data : s))
        );
      }

      closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (subAccount: SubAccount) => {
    if (!confirm(`「${subAccount.name}」を削除しますか？`)) {
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/sub-accounts/${subAccount.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "削除に失敗しました");
      }

      setSubAccounts(subAccounts.filter((s) => s.id !== subAccount.id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "削除に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {/* ヘッダー */}
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <p class="text-base-content/70">
            勘定科目の内訳を細分化するための補助科目を管理します。
          </p>
        </div>
        <div class="flex gap-2">
          <select
            class="select select-bordered select-sm"
            value={filterLedgerType}
            onChange={(e) =>
              setFilterLedgerType((e.target as HTMLSelectElement).value)
            }
          >
            <option value="all">すべて</option>
            <option value="political_organization">政治団体用</option>
            <option value="election">選挙用</option>
          </select>
          <button class="btn btn-primary btn-sm" onClick={openAddModal}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4 mr-1"
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
      </div>

      {/* 補助科目一覧 */}
      {Object.keys(groupedSubAccounts).length === 0 ? (
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
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
              />
            </svg>
            <h3 class="text-lg font-semibold">
              補助科目がまだ登録されていません
            </h3>
            <p class="text-base-content/70">
              「新規登録」ボタンから補助科目を追加してください。
            </p>
          </div>
        </div>
      ) : (
        <div class="space-y-4">
          {Object.entries(groupedSubAccounts).map(([accountCode, items]) => (
            <div key={accountCode} class="card bg-base-100 shadow-xl">
              <div class="card-body">
                <h3 class="card-title text-base">
                  {getAccountName(accountCode)}
                  <span class="badge badge-ghost">{accountCode}</span>
                </h3>
                <div class="overflow-x-auto">
                  <table class="table table-sm">
                    <thead>
                      <tr>
                        <th>補助科目名</th>
                        <th>台帳タイプ</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((subAccount) => (
                        <tr key={subAccount.id} class="hover">
                          <td class="font-medium">{subAccount.name}</td>
                          <td>
                            <span
                              class={`badge badge-sm ${
                                subAccount.ledger_type ===
                                "political_organization"
                                  ? "badge-info"
                                  : "badge-warning"
                              }`}
                            >
                              {subAccount.ledger_type ===
                              "political_organization"
                                ? "政治団体"
                                : "選挙"}
                            </span>
                          </td>
                          <td>
                            <div class="flex gap-2 justify-end">
                              <button
                                class="btn btn-ghost btn-xs"
                                onClick={() => openEditModal(subAccount)}
                              >
                                編集
                              </button>
                              <button
                                class="btn btn-ghost btn-xs text-error"
                                onClick={() => handleDelete(subAccount)}
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
            </div>
          ))}
        </div>
      )}

      {/* モーダル */}
      {modalMode !== "closed" && (
        <dialog class="modal modal-open">
          <div class="modal-box">
            <h3 class="font-bold text-lg mb-4">
              {modalMode === "add" ? "補助科目の新規登録" : "補助科目の編集"}
            </h3>

            {error && (
              <div class="alert alert-error mb-4">
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* 台帳タイプ（追加時のみ） */}
              {modalMode === "add" && (
                <div class="form-control mb-4">
                  <label class="label">
                    <span class="label-text font-medium">台帳タイプ</span>
                  </label>
                  <div class="join">
                    <input
                      class="join-item btn btn-sm"
                      type="radio"
                      name="ledger_type"
                      aria-label="政治団体"
                      checked={
                        formData.ledger_type === "political_organization"
                      }
                      onChange={() => {
                        setFormData({
                          ...formData,
                          ledger_type: "political_organization",
                          parent_account_code: "",
                        });
                      }}
                    />
                    <input
                      class="join-item btn btn-sm"
                      type="radio"
                      name="ledger_type"
                      aria-label="選挙"
                      checked={formData.ledger_type === "election"}
                      onChange={() => {
                        setFormData({
                          ...formData,
                          ledger_type: "election",
                          parent_account_code: "",
                        });
                      }}
                    />
                  </div>
                </div>
              )}

              {/* 勘定科目（追加時のみ） */}
              {modalMode === "add" && (
                <div class="form-control mb-4">
                  <label class="label">
                    <span class="label-text font-medium">
                      勘定科目<span class="text-error ml-1">*</span>
                    </span>
                  </label>
                  <select
                    class="select select-bordered"
                    value={formData.parent_account_code}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        parent_account_code: (e.target as HTMLSelectElement)
                          .value,
                      })
                    }
                  >
                    <option value="">選択してください</option>
                    {getFilteredAccounts(formData.ledger_type).map(
                      (account) => (
                        <option key={account.code} value={account.code}>
                          {account.name}
                        </option>
                      )
                    )}
                  </select>
                </div>
              )}

              {/* 編集時は勘定科目を表示のみ */}
              {modalMode === "edit" && editingSubAccount && (
                <div class="form-control mb-4">
                  <label class="label">
                    <span class="label-text font-medium">勘定科目</span>
                  </label>
                  <input
                    type="text"
                    class="input input-bordered"
                    value={getAccountName(
                      editingSubAccount.parent_account_code
                    )}
                    disabled
                  />
                </div>
              )}

              {/* 補助科目名 */}
              <div class="form-control mb-4">
                <label class="label">
                  <span class="label-text font-medium">
                    補助科目名<span class="text-error ml-1">*</span>
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
                  placeholder="例: 電気代、ガソリン代"
                />
              </div>

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
