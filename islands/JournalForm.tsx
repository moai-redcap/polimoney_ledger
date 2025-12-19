import { useEffect, useState } from "preact/hooks";
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
  is_public_subsidy_eligible?: boolean;
}

// 公費負担対象の勘定科目コード
const PUBLIC_SUBSIDY_ELIGIBLE_CODES = [
  "EXP_PRINTING_ELEC", // 印刷費
  "EXP_ADVERTISING_ELEC", // 広告費
];

export interface Contact {
  id: string;
  name: string;
  contact_type: string; // 'person' | 'corporation'
  address?: string | null;
  occupation?: string | null;
}

// 5万円超の基準額
const THRESHOLD_AMOUNT = 50000;

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

  // 追加情報（選挙台帳・公費負担用）
  const [publicSubsidyAmount, setPublicSubsidyAmount] = useState("");
  const [isFullPublicSubsidy, setIsFullPublicSubsidy] = useState(false);

  // その他
  const [nonMonetaryBasis, setNonMonetaryBasis] = useState("");
  const [notes, setNotes] = useState("");
  const [isReceiptHardToCollect, setIsReceiptHardToCollect] = useState(false);
  const [receiptHardToCollectReason, setReceiptHardToCollectReason] = useState(
    "",
  );

  // 証憑ファイル
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  // 資産取得
  const [isAssetAcquisition, setIsAssetAcquisition] = useState(false);
  const [assetType, setAssetType] = useState("");

  // UI状態
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<
    {
      type: "success" | "error";
      text: string;
    } | null
  >(null);

  // 勘定科目をタイプ別にフィルタ
  const assetAccounts = accountCodes.filter((a) => a.type === "asset");
  const expenseAccounts = accountCodes.filter((a) => a.type === "expense");
  const revenueAccounts = accountCodes.filter(
    (a) => a.type === "revenue" || a.type === "equity",
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

  // 公費負担対象科目かどうかを判定
  const isPublicSubsidyEligible = (accountCode: string) => {
    return PUBLIC_SUBSIDY_ELIGIBLE_CODES.includes(accountCode);
  };

  // 現在選択中の科目が公費対象かどうか
  const showPublicSubsidyField = ledgerType === "election" &&
    entryType === "expense" &&
    isPublicSubsidyEligible(debitAccountCode);

  // 全額公費負担モードの場合の特別処理
  // - 日付は任意
  // - 支払元（貸方）は自動的に「公費負担」勘定を使用
  const PUBLIC_SUBSIDY_ACCOUNT_CODE = "SUBSIDY_PUBLIC";

  // 全額公費負担チェック時の金額同期
  useEffect(() => {
    if (isFullPublicSubsidy && publicSubsidyAmount) {
      setAmount(publicSubsidyAmount);
      // 貸方を自動設定
      setCreditAccountCode(PUBLIC_SUBSIDY_ACCOUNT_CODE);
    }
  }, [isFullPublicSubsidy, publicSubsidyAmount]);

  // 科目が公費対象外になったら全額公費負担をリセット
  useEffect(() => {
    if (!showPublicSubsidyField) {
      setIsFullPublicSubsidy(false);
    }
  }, [showPublicSubsidyField]);

  // 選択中の関係者情報を取得
  const selectedContact = contactsList.find((c) => c.id === contactId);

  // 5万円超の検証警告
  const amountNum = Number(amount) || 0;
  const isOver50k = amountNum > THRESHOLD_AMOUNT;

  // 住所未入力警告（支出5万円超 または 収入5万円超）
  const showAddressWarning = isOver50k &&
    entryType !== "transfer" &&
    selectedContact &&
    !selectedContact.address;

  // 職業未入力警告（収入で個人から5万円超）
  const showOccupationWarning = isOver50k &&
    entryType === "revenue" &&
    selectedContact &&
    selectedContact.contact_type === "person" &&
    !selectedContact.occupation;

  // 資産種別の選択肢
  const assetTypes = [
    { value: "land", label: "土地" },
    { value: "building", label: "建物" },
    { value: "vehicle", label: "車両・動産" },
    { value: "securities", label: "有価証券" },
    { value: "facility_rights", label: "施設利用権" },
    { value: "deposit", label: "敷金・保証金" },
  ];

  // 資産取得チェックが外れたら資産種別をリセット
  useEffect(() => {
    if (!isAssetAcquisition) {
      setAssetType("");
    }
  }, [isAssetAcquisition]);

  // 送信処理（下書き or 登録）
  const handleSubmitWithStatus = async (status: "draft" | "approved") => {
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

    // 資産取得の場合は資産種別が必須
    if (isAssetAcquisition && !assetType) {
      setMessage({ type: "error", text: "資産種別を選択してください" });
      setIsSubmitting(false);
      return;
    }

    // 証憑を添付できない場合は理由が必須
    if (isReceiptHardToCollect && !receiptHardToCollectReason.trim()) {
      setMessage({
        type: "error",
        text: "証憑を添付できない理由を入力してください",
      });
      setIsSubmitting(false);
      return;
    }

    // 証憑を添付する場合はファイルが必須（下書きでない場合）
    if (status === "approved" && !isReceiptHardToCollect && !receiptFile) {
      setMessage({
        type: "error",
        text: "証憑ファイルを選択してください",
      });
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
          journal_date: date || null,
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
          amount_public_subsidy: publicSubsidyAmount
            ? Number(publicSubsidyAmount)
            : 0,
          is_receipt_hard_to_collect: isReceiptHardToCollect,
          receipt_hard_to_collect_reason: isReceiptHardToCollect
            ? receiptHardToCollectReason
            : null,
          status: status,
          is_asset_acquisition: isAssetAcquisition,
          asset_type: isAssetAcquisition ? assetType : null,
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

      const result = await response.json();
      const journalId = result.data?.id;

      // 証憑ファイルがある場合はアップロード
      if (receiptFile && journalId) {
        try {
          const formData = new FormData();
          formData.append("file", receiptFile);
          formData.append("journal_id", journalId);

          const uploadResponse = await fetch("/api/receipts", {
            method: "POST",
            body: formData,
          });

          if (!uploadResponse.ok) {
            console.error("証憑のアップロードに失敗しました");
            setMessage({
              type: "success",
              text: status === "draft"
                ? "下書きを保存しました（証憑のアップロードに失敗）"
                : "仕訳を登録しました（証憑のアップロードに失敗）",
            });
          } else {
            setMessage({
              type: "success",
              text: status === "draft"
                ? "下書きを保存しました"
                : "仕訳と証憑を登録しました",
            });
          }
        } catch (uploadErr) {
          console.error("Receipt upload error:", uploadErr);
          setMessage({
            type: "success",
            text: status === "draft"
              ? "下書きを保存しました（証憑のアップロードに失敗）"
              : "仕訳を登録しました（証憑のアップロードに失敗）",
          });
        }
      } else {
        setMessage({
          type: "success",
          text: status === "draft"
            ? "下書きを保存しました"
            : "仕訳を登録しました",
        });
      }

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
      setPublicSubsidyAmount("");
      setIsFullPublicSubsidy(false);
      setIsReceiptHardToCollect(false);
      setReceiptHardToCollectReason("");
      setReceiptFile(null);
      setIsAssetAcquisition(false);
      setAssetType("");

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

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    await handleSubmitWithStatus("approved");
  };

  const handleSaveDraft = async () => {
    await handleSubmitWithStatus("draft");
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
                  日付{" "}
                  {!isFullPublicSubsidy && <span class="text-error">*</span>}
                  {isFullPublicSubsidy && (
                    <span class="text-base-content/60">（任意）</span>
                  )}
                </span>
              </label>
              <input
                type="date"
                class="input input-bordered"
                value={date}
                onChange={(e) => setDate((e.target as HTMLInputElement).value)}
                required={!isFullPublicSubsidy}
              />
              {isFullPublicSubsidy && (
                <label class="label">
                  <span class="label-text-alt text-info">
                    全額公費負担（業者直接請求）の場合、日付不明でも登録できます
                  </span>
                </label>
              )}
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
                  setAmount((e.target as HTMLInputElement).value)}
                required
                disabled={isFullPublicSubsidy}
              />
              {isFullPublicSubsidy && (
                <label class="label">
                  <span class="label-text-alt text-info">
                    公費負担額から自動設定
                  </span>
                </label>
              )}
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
                setDescription((e.target as HTMLInputElement).value)}
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
                    setContactId((e.target as HTMLSelectElement).value)}
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

              {/* 5万円超の警告表示 */}
              {showAddressWarning && (
                <div class="alert alert-warning mt-2 py-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="stroke-current shrink-0 h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <span class="text-sm">
                    5万円超の{entryType === "expense" ? "支出" : "寄附"}には
                    <strong>住所</strong>の記載が必要です。
                    関係者情報を編集して住所を追加してください。
                  </span>
                </div>
              )}

              {showOccupationWarning && (
                <div class="alert alert-warning mt-2 py-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="stroke-current shrink-0 h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <span class="text-sm">
                    5万円超の個人からの寄附には<strong>職業</strong>
                    の記載が必要です。
                    関係者情報を編集して職業を追加してください。
                  </span>
                </div>
              )}
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
                        (e.target as HTMLSelectElement).value,
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
                          (e.target as HTMLSelectElement).value,
                        )}
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

              {/* 全額公費負担の場合は支払元を自動設定 */}
              {isFullPublicSubsidy
                ? (
                  <div class="space-y-2">
                    <div class="form-control">
                      <label class="label">
                        <span class="label-text">支払元</span>
                      </label>
                      <div class="input input-bordered bg-base-200 flex items-center text-base-content/70">
                        公費負担（自動設定）
                      </div>
                      <label class="label">
                        <span class="label-text-alt text-info">
                          全額公費負担のため、候補者の資産からの支出はありません
                        </span>
                      </label>
                    </div>
                  </div>
                )
                : (
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
                            (e.target as HTMLSelectElement).value,
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
                              (e.target as HTMLSelectElement).value,
                            )}
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
                )}
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
                        (e.target as HTMLSelectElement).value,
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
                        (e.target as HTMLSelectElement).value,
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
                          (e.target as HTMLSelectElement).value,
                        )}
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
                        (e.target as HTMLSelectElement).value,
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
                        (e.target as HTMLSelectElement).value,
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

          {/* 公費負担額（選挙台帳 + 公費対象科目の場合のみ） */}
          {showPublicSubsidyField && (
            <div class="space-y-4">
              <div class="form-control">
                <label class="label">
                  <span class="label-text">
                    公費負担額
                    <span class="ml-2 badge badge-info badge-sm">
                      公費対象科目
                    </span>
                    {isFullPublicSubsidy && (
                      <span class="text-error ml-1">*</span>
                    )}
                  </span>
                </label>
                <input
                  type="number"
                  class="input input-bordered"
                  placeholder="0"
                  min="0"
                  value={publicSubsidyAmount}
                  onChange={(e) =>
                    setPublicSubsidyAmount(
                      (e.target as HTMLInputElement).value,
                    )}
                  required={isFullPublicSubsidy}
                />
              </div>

              {/* 全額公費負担チェックボックス */}
              <div class="form-control">
                <label class="label cursor-pointer justify-start gap-3 p-3 border rounded-lg hover:bg-base-200">
                  <input
                    type="checkbox"
                    class="checkbox checkbox-info"
                    checked={isFullPublicSubsidy}
                    onChange={(e) =>
                      setIsFullPublicSubsidy(
                        (e.target as HTMLInputElement).checked,
                      )}
                  />
                  <div>
                    <span class="label-text font-medium">
                      全額公費負担（業者直接請求）
                    </span>
                    <span class="label-text-alt block text-base-content/60">
                      候補者を介さず業者が直接請求する場合
                    </span>
                  </div>
                </label>
              </div>

              {isFullPublicSubsidy && (
                <div class="alert alert-info">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    class="stroke-current shrink-0 w-6 h-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    >
                    </path>
                  </svg>
                  <div>
                    <p class="font-medium">全額公費負担モード</p>
                    <ul class="text-sm mt-1 list-disc list-inside">
                      <li>日付は任意（不明な場合は空欄可）</li>
                      <li>金額は公費負担額から自動設定</li>
                      <li>支払元は「公費負担」に自動設定</li>
                    </ul>
                  </div>
                </div>
              )}
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
                      (e.target as HTMLInputElement).value,
                    )}
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
                    setPoliticalFundAmount(
                      (e.target as HTMLInputElement).value,
                    )}
                />
              </div>
            </div>
          )}

          {/* 資産取得（支出の場合のみ表示） */}
          {entryType === "expense" && (
            <div class="form-control">
              <label class="label cursor-pointer justify-start gap-3 p-3 border rounded-lg hover:bg-base-200">
                <input
                  type="checkbox"
                  class="checkbox checkbox-accent"
                  checked={isAssetAcquisition}
                  onChange={(e) =>
                    setIsAssetAcquisition(
                      (e.target as HTMLInputElement).checked,
                    )}
                />
                <div>
                  <span class="label-text font-medium">資産取得</span>
                  <span class="label-text-alt block text-base-content/60">
                    土地・建物・車両等の資産を取得した場合にチェック
                  </span>
                </div>
              </label>
            </div>
          )}

          {/* 資産種別（資産取得にチェックがある場合のみ） */}
          {isAssetAcquisition && (
            <div class="form-control">
              <label class="label">
                <span class="label-text">
                  資産種別 <span class="text-error">*</span>
                </span>
              </label>
              <select
                class="select select-bordered"
                value={assetType}
                onChange={(e) =>
                  setAssetType((e.target as HTMLSelectElement).value)}
                required
              >
                <option value="">選択してください</option>
                {assetTypes.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <label class="label">
                <span class="label-text-alt text-info">
                  収支報告書の「資産等」に記載されます
                </span>
              </label>
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
                setNonMonetaryBasis((e.target as HTMLInputElement).value)}
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
                setNotes((e.target as HTMLTextAreaElement).value)}
            />
          </div>

          {/* 証憑 */}
          <div class="form-control">
            <label class="label">
              <span class="label-text">
                証憑 <span class="text-error">*</span>
              </span>
            </label>
            <div class="flex flex-col gap-2">
              <label class="label cursor-pointer justify-start gap-2 p-3 border rounded-lg hover:bg-base-200">
                <input
                  type="radio"
                  name="receipt_option"
                  class="radio radio-primary"
                  checked={!isReceiptHardToCollect}
                  onChange={() => setIsReceiptHardToCollect(false)}
                />
                <div>
                  <span class="label-text font-medium">証憑を添付する</span>
                  <span class="label-text-alt block text-base-content/60">
                    領収書、契約書、利用明細書など
                  </span>
                </div>
              </label>
              <label class="label cursor-pointer justify-start gap-2 p-3 border rounded-lg hover:bg-base-200">
                <input
                  type="radio"
                  name="receipt_option"
                  class="radio radio-warning"
                  checked={isReceiptHardToCollect}
                  onChange={() => setIsReceiptHardToCollect(true)}
                />
                <div>
                  <span class="label-text font-medium">
                    証憑を添付できない
                  </span>
                  <span class="label-text-alt block text-base-content/60">
                    自動販売機、交通費など
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* 証憑ファイル選択 */}
          {!isReceiptHardToCollect && (
            <div class="form-control">
              <label class="label">
                <span class="label-text">
                  証憑ファイル <span class="text-error">*</span>
                </span>
              </label>
              <input
                type="file"
                class="file-input file-input-bordered w-full"
                accept="image/*,.pdf"
                onChange={(e) => {
                  const files = (e.target as HTMLInputElement).files;
                  if (files && files.length > 0) {
                    setReceiptFile(files[0]);
                  }
                }}
              />
              {receiptFile && (
                <div class="mt-2 flex items-center gap-2 text-sm text-success">
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
                      d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                    />
                  </svg>
                  <span>{receiptFile.name}</span>
                  <button
                    type="button"
                    class="btn btn-ghost btn-xs"
                    onClick={() => setReceiptFile(null)}
                  >
                    取消
                  </button>
                </div>
              )}
              {!receiptFile && (
                <label class="label">
                  <span class="label-text-alt text-warning">
                    証憑のスキャン画像またはPDFを選択してください
                  </span>
                </label>
              )}
            </div>
          )}

          {/* 証憑を添付できない理由 */}
          {isReceiptHardToCollect && (
            <div class="form-control">
              <label class="label">
                <span class="label-text">
                  添付できない理由 <span class="text-error">*</span>
                </span>
              </label>
              <input
                type="text"
                class="input input-bordered"
                placeholder="例: 自動販売機での購入のため"
                value={receiptHardToCollectReason}
                onChange={(e) =>
                  setReceiptHardToCollectReason(
                    (e.target as HTMLInputElement).value,
                  )}
                required
              />
              <label class="label">
                <span class="label-text-alt text-base-content/60">
                  理由は収支報告書に記載されます
                </span>
              </label>
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
      {showFixedButtons
        ? (
          // ドロワー用：下部固定ボタン
          <div class="fixed bottom-0 left-0 right-0 w-[85%] max-w-4xl ml-auto bg-base-100 border-t border-base-300 p-4 flex justify-end gap-2">
            <button type="button" class="btn btn-ghost" onClick={onCancel}>
              キャンセル
            </button>
            <button
              type="button"
              class={`btn btn-outline ${isSubmitting ? "loading" : ""}`}
              disabled={isSubmitting}
              onClick={handleSaveDraft}
            >
              {isSubmitting ? "保存中..." : "下書き保存"}
            </button>
            <button
              type="submit"
              class={`btn btn-primary ${isSubmitting ? "loading" : ""}`}
              disabled={isSubmitting}
            >
              {isSubmitting ? "登録中..." : "仕訳を登録"}
            </button>
          </div>
        )
        : (
          // 通常表示
          <div class="flex justify-end gap-2">
            {onCancel && (
              <button type="button" class="btn btn-ghost" onClick={onCancel}>
                キャンセル
              </button>
            )}
            <button
              type="button"
              class={`btn btn-outline ${isSubmitting ? "loading" : ""}`}
              disabled={isSubmitting}
              onClick={handleSaveDraft}
            >
              {isSubmitting ? "保存中..." : "下書き保存"}
            </button>
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
