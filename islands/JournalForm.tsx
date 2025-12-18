import { useState, useEffect } from "preact/hooks";
import AddContactModal from "./AddContactModal.tsx";

// ============================================
// 型定義
// ============================================

export interface AccountCode {
  code: string;
  name: string;
  type: string; // 'asset', 'liability', 'equity', 'revenue', 'expense'
  report_category: string;
  ledger_type: string;
}

export interface Contact {
  id: string;
  name: string;
  contact_type: string; // 'person' | 'corporation'
}

export interface SubAccount {
  id: string;
  name: string;
  parent_account_code: string;
}

type EntryType = "expense" | "revenue" | "transfer";

interface JournalFormProps {
  ledgerType: "organization" | "election";
  organizationId: string | null;
  electionId: string | null;
  accountCodes: AccountCode[];
  contacts: Contact[];
  subAccounts: SubAccount[];
  onSuccess?: () => void;
  onCancel?: () => void;
  showFixedButtons?: boolean;
}

// ============================================
// メインコンポーネント
// ============================================

export default function JournalForm({
  ledgerType,
  organizationId,
  electionId,
  accountCodes,
  contacts: initialContacts,
  subAccounts,
  onSuccess,
  onCancel,
  showFixedButtons = false,
}: JournalFormProps) {
  // 基本情報
  const [entryType, setEntryType] = useState<EntryType>("expense");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");

  // 関係者（内部状態として管理）
  const [contactsList, setContactsList] = useState<Contact[]>(initialContacts);
  const [contactId, setContactId] = useState("");
  const [showAddContact, setShowAddContact] = useState(false);

  // 勘定科目
  const [debitAccountCode, setDebitAccountCode] = useState("");
  const [creditAccountCode, setCreditAccountCode] = useState("");
  const [debitSubAccountId, setDebitSubAccountId] = useState("");
  const [creditSubAccountId, setCreditSubAccountId] = useState("");

  // 追加情報（選挙台帳用）
  const [classification, setClassification] = useState<
    "pre-campaign" | "campaign"
  >("campaign");

  // 追加情報（政治団体用）
  const [politicalGrantAmount, setPoliticalGrantAmount] = useState("");
  const [politicalFundAmount, setPoliticalFundAmount] = useState("");

  // その他
  const [nonMonetaryBasis, setNonMonetaryBasis] = useState("");
  const [notes, setNotes] = useState("");
  const [isReceiptHardToCollect, setIsReceiptHardToCollect] = useState(false);
  const [receiptHardToCollectReason, setReceiptHardToCollectReason] =
    useState("");

  // UI状態
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // 勘定科目をタイプ別にフィルタ
  const assetAccounts = accountCodes.filter((a) => a.type === "asset");
  const expenseAccounts = accountCodes.filter((a) => a.type === "expense");
  const revenueAccounts = accountCodes.filter(
    (a) => a.type === "revenue" || a.type === "equity"
  );

  // 取引タイプ変更時に勘定科目をリセット
  useEffect(() => {
    setDebitAccountCode("");
    setCreditAccountCode("");
    setDebitSubAccountId("");
    setCreditSubAccountId("");
  }, [entryType]);

  // 補助科目のフィルタ
  const getSubAccountsFor = (accountCode: string) => {
    return subAccounts.filter((s) => s.parent_account_code === accountCode);
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    // バリデーション
    if (!debitAccountCode || !creditAccountCode) {
      setMessage({ type: "error", text: "勘定科目を選択してください" });
      setIsSubmitting(false);
      return;
    }

    // 振替以外は関係者が必須
    if (entryType !== "transfer" && !contactId) {
      setMessage({ type: "error", text: "関係者を選択してください" });
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/journals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organization_id: organizationId,
          election_id: electionId,
          journal_date: date,
          description,
          contact_id: entryType !== "transfer" ? contactId : null,
          classification: ledgerType === "election" ? classification : null,
          non_monetary_basis: nonMonetaryBasis || null,
          notes: notes || null,
          amount_political_grant: politicalGrantAmount
            ? Number(politicalGrantAmount)
            : 0,
          amount_political_fund: politicalFundAmount
            ? Number(politicalFundAmount)
            : 0,
          is_receipt_hard_to_collect: isReceiptHardToCollect,
          receipt_hard_to_collect_reason: isReceiptHardToCollect
            ? receiptHardToCollectReason
            : null,
          // 仕訳明細
          entries: [
            {
              account_code: debitAccountCode,
              sub_account_id: debitSubAccountId || null,
              debit_amount: Number(amount),
              credit_amount: 0,
            },
            {
              account_code: creditAccountCode,
              sub_account_id: creditSubAccountId || null,
              debit_amount: 0,
              credit_amount: Number(amount),
            },
          ],
        }),
      });

      if (!response.ok) {
        const json = await response.json();
        throw new Error(json.error || "登録に失敗しました");
      }

      setMessage({ type: "success", text: "仕訳を登録しました" });

      // フォームをリセット
      setDescription("");
      setAmount("");
      setContactId("");
      setDebitAccountCode("");
      setCreditAccountCode("");
      setDebitSubAccountId("");
      setCreditSubAccountId("");
      setNonMonetaryBasis("");
      setNotes("");
      setPoliticalGrantAmount("");
      setPoliticalFundAmount("");
      setIsReceiptHardToCollect(false);
      setReceiptHardToCollectReason("");

      // コールバックを呼び出すかリロード
      if (onSuccess) {
        onSuccess();
      } else {
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "登録に失敗しました",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} class="space-y-6">
      {/* ============================================ */}
      {/* 取引タイプ切り替え */}
      {/* ============================================ */}
      <div class="flex gap-2">
        <button
          type="button"
          class={`btn ${entryType === "expense" ? "btn-error" : "btn-outline"}`}
          onClick={() => setEntryType("expense")}
        >
          支出
        </button>
        <button
          type="button"
          class={`btn ${
            entryType === "revenue" ? "btn-primary" : "btn-outline"
          }`}
          onClick={() => setEntryType("revenue")}
        >
          収入
        </button>
        <button
          type="button"
          class={`btn ${
            entryType === "transfer" ? "btn-secondary" : "btn-outline"
          }`}
          onClick={() => setEntryType("transfer")}
        >
          振替
        </button>
      </div>

      {/* ============================================ */}
      {/* 基本情報 */}
      {/* ============================================ */}
      <div class="card bg-base-200">
        <div class="card-body">
          <h3 class="card-title text-base">基本情報</h3>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 日付 */}
            <div class="form-control">
              <label class="label">
                <span class="label-text">
                  日付 <span class="text-error">*</span>
                </span>
              </label>
              <input
                type="date"
                class="input input-bordered"
                value={date}
                onChange={(e) => setDate((e.target as HTMLInputElement).value)}
                required
              />
            </div>

            {/* 金額 */}
            <div class="form-control">
              <label class="label">
                <span class="label-text">
                  金額 <span class="text-error">*</span>
                </span>
              </label>
              <input
                type="number"
                class="input input-bordered"
                placeholder="0"
                min="0"
                value={amount}
                onChange={(e) =>
                  setAmount((e.target as HTMLInputElement).value)
                }
                required
              />
            </div>
          </div>

          {/* 摘要 */}
          <div class="form-control">
            <label class="label">
              <span class="label-text">
                摘要 <span class="text-error">*</span>
              </span>
            </label>
            <input
              type="text"
              class="input input-bordered"
              placeholder="例: 事務所家賃 5月分"
              value={description}
              onChange={(e) =>
                setDescription((e.target as HTMLInputElement).value)
              }
              required
            />
          </div>

          {/* 関係者（振替以外で表示） */}
          {entryType !== "transfer" && (
            <div class="form-control">
              <label class="label">
                <span class="label-text">
                  関係者（支払先・寄付者など） <span class="text-error">*</span>
                </span>
              </label>
              <div class="flex gap-2">
                <select
                  class="select select-bordered flex-1"
                  value={contactId}
                  onChange={(e) =>
                    setContactId((e.target as HTMLSelectElement).value)
                  }
                  required
                >
                  <option value="">選択してください</option>
                  {contactsList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}{" "}
                      {c.contact_type === "corporation" ? "（法人）" : ""}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  class="btn btn-outline"
                  onClick={() => setShowAddContact(true)}
                  title="関係者を追加"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    class="w-5 h-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 4.5v15m7.5-7.5h-15"
                    />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ============================================ */}
      {/* 勘定科目 */}
      {/* ============================================ */}
      <div class="card bg-base-200">
        <div class="card-body">
          <h3 class="card-title text-base">勘定科目</h3>

          {/* 支出の場合 */}
          {entryType === "expense" && (
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-2">
                <div class="form-control">
                  <label class="label">
                    <span class="label-text">
                      支出科目（何に使ったか） <span class="text-error">*</span>
                    </span>
                  </label>
                  <select
                    class="select select-bordered"
                    value={debitAccountCode}
                    onChange={(e) => {
                      setDebitAccountCode(
                        (e.target as HTMLSelectElement).value
                      );
                      setDebitSubAccountId("");
                    }}
                    required
                  >
                    <option value="">選択してください</option>
                    {expenseAccounts.map((a) => (
                      <option key={a.code} value={a.code}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
                {debitAccountCode &&
                  getSubAccountsFor(debitAccountCode).length > 0 && (
                    <div class="form-control">
                      <label class="label">
                        <span class="label-text">補助科目</span>
                      </label>
                      <select
                        class="select select-bordered select-sm"
                        value={debitSubAccountId}
                        onChange={(e) =>
                          setDebitSubAccountId(
                            (e.target as HTMLSelectElement).value
                          )
                        }
                      >
                        <option value="">（なし）</option>
                        {getSubAccountsFor(debitAccountCode).map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
              </div>

              <div class="space-y-2">
                <div class="form-control">
                  <label class="label">
                    <span class="label-text">
                      支払元（どの資産から払ったか）{" "}
                      <span class="text-error">*</span>
                    </span>
                  </label>
                  <select
                    class="select select-bordered"
                    value={creditAccountCode}
                    onChange={(e) => {
                      setCreditAccountCode(
                        (e.target as HTMLSelectElement).value
                      );
                      setCreditSubAccountId("");
                    }}
                    required
                  >
                    <option value="">選択してください</option>
                    {assetAccounts.map((a) => (
                      <option key={a.code} value={a.code}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
                {creditAccountCode &&
                  getSubAccountsFor(creditAccountCode).length > 0 && (
                    <div class="form-control">
                      <label class="label">
                        <span class="label-text">補助科目</span>
                      </label>
                      <select
                        class="select select-bordered select-sm"
                        value={creditSubAccountId}
                        onChange={(e) =>
                          setCreditSubAccountId(
                            (e.target as HTMLSelectElement).value
                          )
                        }
                      >
                        <option value="">（なし）</option>
                        {getSubAccountsFor(creditAccountCode).map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
              </div>
            </div>
          )}

          {/* 収入の場合 */}
          {entryType === "revenue" && (
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-2">
                <div class="form-control">
                  <label class="label">
                    <span class="label-text">
                      入金先（どの資産が増えたか）{" "}
                      <span class="text-error">*</span>
                    </span>
                  </label>
                  <select
                    class="select select-bordered"
                    value={debitAccountCode}
                    onChange={(e) => {
                      setDebitAccountCode(
                        (e.target as HTMLSelectElement).value
                      );
                      setDebitSubAccountId("");
                    }}
                    required
                  >
                    <option value="">選択してください</option>
                    {assetAccounts.map((a) => (
                      <option key={a.code} value={a.code}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div class="space-y-2">
                <div class="form-control">
                  <label class="label">
                    <span class="label-text">
                      収入科目（何による収入か）{" "}
                      <span class="text-error">*</span>
                    </span>
                  </label>
                  <select
                    class="select select-bordered"
                    value={creditAccountCode}
                    onChange={(e) => {
                      setCreditAccountCode(
                        (e.target as HTMLSelectElement).value
                      );
                      setCreditSubAccountId("");
                    }}
                    required
                  >
                    <option value="">選択してください</option>
                    {revenueAccounts.map((a) => (
                      <option key={a.code} value={a.code}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
                {creditAccountCode &&
                  getSubAccountsFor(creditAccountCode).length > 0 && (
                    <div class="form-control">
                      <label class="label">
                        <span class="label-text">補助科目</span>
                      </label>
                      <select
                        class="select select-bordered select-sm"
                        value={creditSubAccountId}
                        onChange={(e) =>
                          setCreditSubAccountId(
                            (e.target as HTMLSelectElement).value
                          )
                        }
                      >
                        <option value="">（なし）</option>
                        {getSubAccountsFor(creditAccountCode).map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
              </div>
            </div>
          )}

          {/* 振替の場合 */}
          {entryType === "transfer" && (
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-2">
                <div class="form-control">
                  <label class="label">
                    <span class="label-text">
                      振替元（どの資産から） <span class="text-error">*</span>
                    </span>
                  </label>
                  <select
                    class="select select-bordered"
                    value={creditAccountCode}
                    onChange={(e) => {
                      setCreditAccountCode(
                        (e.target as HTMLSelectElement).value
                      );
                      setCreditSubAccountId("");
                    }}
                    required
                  >
                    <option value="">選択してください</option>
                    {assetAccounts.map((a) => (
                      <option key={a.code} value={a.code}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div class="space-y-2">
                <div class="form-control">
                  <label class="label">
                    <span class="label-text">
                      振替先（どの資産へ） <span class="text-error">*</span>
                    </span>
                  </label>
                  <select
                    class="select select-bordered"
                    value={debitAccountCode}
                    onChange={(e) => {
                      setDebitAccountCode(
                        (e.target as HTMLSelectElement).value
                      );
                      setDebitSubAccountId("");
                    }}
                    required
                  >
                    <option value="">選択してください</option>
                    {assetAccounts.map((a) => (
                      <option key={a.code} value={a.code}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ============================================ */}
      {/* 追加情報 */}
      {/* ============================================ */}
      <div class="card bg-base-200">
        <div class="card-body">
          <h3 class="card-title text-base">追加情報</h3>

          {/* 活動区分（選挙台帳の場合のみ） */}
          {ledgerType === "election" && (
            <div class="form-control">
              <label class="label">
                <span class="label-text">活動区分</span>
              </label>
              <div class="flex gap-4">
                <label class="label cursor-pointer gap-2">
                  <input
                    type="radio"
                    name="classification"
                    class="radio radio-primary"
                    checked={classification === "pre-campaign"}
                    onChange={() => setClassification("pre-campaign")}
                  />
                  <span class="label-text">立候補準備</span>
                </label>
                <label class="label cursor-pointer gap-2">
                  <input
                    type="radio"
                    name="classification"
                    class="radio radio-primary"
                    checked={classification === "campaign"}
                    onChange={() => setClassification("campaign")}
                  />
                  <span class="label-text">選挙運動</span>
                </label>
              </div>
            </div>
          )}

          {/* 政党交付金/基金（政治団体の場合のみ） */}
          {ledgerType === "organization" && (
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="form-control">
                <label class="label">
                  <span class="label-text">政党交付金充当額</span>
                </label>
                <input
                  type="number"
                  class="input input-bordered"
                  placeholder="0"
                  min="0"
                  value={politicalGrantAmount}
                  onChange={(e) =>
                    setPoliticalGrantAmount(
                      (e.target as HTMLInputElement).value
                    )
                  }
                />
              </div>
              <div class="form-control">
                <label class="label">
                  <span class="label-text">政党基金充当額</span>
                </label>
                <input
                  type="number"
                  class="input input-bordered"
                  placeholder="0"
                  min="0"
                  value={politicalFundAmount}
                  onChange={(e) =>
                    setPoliticalFundAmount((e.target as HTMLInputElement).value)
                  }
                />
              </div>
            </div>
          )}

          {/* 金銭以外の見積の根拠 */}
          <div class="form-control">
            <label class="label">
              <span class="label-text">金銭以外の見積の根拠</span>
            </label>
            <input
              type="text"
              class="input input-bordered"
              placeholder="現物寄付等の場合に記入"
              value={nonMonetaryBasis}
              onChange={(e) =>
                setNonMonetaryBasis((e.target as HTMLInputElement).value)
              }
            />
          </div>

          {/* 備考 */}
          <div class="form-control">
            <label class="label">
              <span class="label-text">備考</span>
            </label>
            <textarea
              class="textarea textarea-bordered"
              placeholder="任意入力"
              rows={2}
              value={notes}
              onChange={(e) =>
                setNotes((e.target as HTMLTextAreaElement).value)
              }
            />
          </div>

          {/* 領収証徴収困難 */}
          <div class="form-control">
            <label class="label cursor-pointer justify-start gap-2">
              <input
                type="checkbox"
                class="checkbox"
                checked={isReceiptHardToCollect}
                onChange={(e) =>
                  setIsReceiptHardToCollect(
                    (e.target as HTMLInputElement).checked
                  )
                }
              />
              <span class="label-text">領収証を徴し難い</span>
              <span class="label-text-alt text-base-content/60">
                （自動販売機での購入など）
              </span>
            </label>
          </div>

          {isReceiptHardToCollect && (
            <div class="form-control">
              <label class="label">
                <span class="label-text">
                  領収証を徴し難い理由 <span class="text-error">*</span>
                </span>
              </label>
              <input
                type="text"
                class="input input-bordered"
                placeholder="例: 自動販売機での購入のため"
                value={receiptHardToCollectReason}
                onChange={(e) =>
                  setReceiptHardToCollectReason(
                    (e.target as HTMLInputElement).value
                  )
                }
                required={isReceiptHardToCollect}
              />
            </div>
          )}
        </div>
      </div>

      {/* ============================================ */}
      {/* メッセージ */}
      {/* ============================================ */}
      {message && (
        <div
          class={`alert ${
            message.type === "success" ? "alert-success" : "alert-error"
          }`}
        >
          <span>{message.text}</span>
        </div>
      )}

      {/* ============================================ */}
      {/* 送信ボタン（通常表示 or 固定表示） */}
      {/* ============================================ */}
      {showFixedButtons ? (
        // ドロワー用：下部固定ボタン
        <div class="fixed bottom-0 left-0 right-0 max-w-xl ml-auto bg-base-100 border-t border-base-300 p-4 flex justify-end gap-2">
          <button
            type="button"
            class="btn btn-ghost"
            onClick={onCancel}
          >
            キャンセル
          </button>
          <button
            type="submit"
            class={`btn btn-primary ${isSubmitting ? "loading" : ""}`}
            disabled={isSubmitting}
          >
            {isSubmitting ? "登録中..." : "仕訳を登録"}
          </button>
        </div>
      ) : (
        // 通常表示
        <div class="flex justify-end gap-2">
          {onCancel && (
            <button type="button" class="btn btn-ghost" onClick={onCancel}>
              キャンセル
            </button>
          )}
          <button
            type="submit"
            class={`btn btn-primary ${isSubmitting ? "loading" : ""}`}
            disabled={isSubmitting}
          >
            {isSubmitting ? "登録中..." : "仕訳を登録"}
          </button>
        </div>
      )}

      {/* 関係者追加モーダル */}
      <AddContactModal
        isOpen={showAddContact}
        onClose={() => setShowAddContact(false)}
        onSuccess={(newContact) => {
          // 新しい関係者をリストに追加
          setContactsList((prev) => [...prev, newContact]);
          // 新しく追加した関係者を選択状態にする
          setContactId(newContact.id);
        }}
      />
    </form>
  );
}
