import { useState } from "preact/hooks";

interface JournalFormProps {
  organizationId: string | null;
  electionId: string | null;
}

// 勘定科目
const ACCOUNT_CODES = {
  revenue: [
    { code: "REV_INDIVIDUAL", name: "個人からの寄附" },
    { code: "REV_CORPORATE", name: "法人からの寄附" },
    { code: "REV_POLITICAL_PARTY", name: "政党からの寄附" },
    { code: "REV_OTHER_ORG", name: "その他団体からの寄附" },
    { code: "REV_DUES", name: "党費・会費" },
    { code: "REV_DONATION_IN_KIND", name: "寄附（金銭以外）" },
    { code: "REV_OTHER", name: "その他の収入" },
  ],
  expense: [
    { code: "EXP_PERSONNEL", name: "人件費" },
    { code: "EXP_OFFICE", name: "事務所費" },
    { code: "EXP_UTILITIES", name: "光熱水費" },
    { code: "EXP_COMMUNICATION", name: "通信費" },
    { code: "EXP_TRAVEL", name: "交通費" },
    { code: "EXP_PRINTING", name: "印刷費" },
    { code: "EXP_ADVERTISING", name: "広告宣伝費" },
    { code: "EXP_MEETING", name: "会議費" },
    { code: "EXP_SUPPLIES", name: "備品・消耗品費" },
    { code: "EXP_RESEARCH", name: "調査研究費" },
    { code: "EXP_OTHER", name: "その他の支出" },
  ],
};

export default function JournalForm({
  organizationId,
  electionId,
}: JournalFormProps) {
  const [type, setType] = useState<"revenue" | "expense">("expense");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [accountCode, setAccountCode] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const accounts = type === "revenue" ? ACCOUNT_CODES.revenue : ACCOUNT_CODES.expense;

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/journals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organization_id: organizationId,
          election_id: electionId,
          journal_date: date,
          description,
          entries: [
            {
              account_code: accountCode,
              debit_amount: type === "expense" ? Number(amount) : 0,
              credit_amount: type === "revenue" ? Number(amount) : 0,
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
      setAccountCode("");
      setAmount("");
      setDescription("");

      // ページをリロードして一覧を更新
      setTimeout(() => {
        window.location.reload();
      }, 1000);
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
    <form onSubmit={handleSubmit}>
      {/* 収入/支出切り替え */}
      <div class="flex gap-2 mb-4">
        <label class="label cursor-pointer gap-2">
          <input
            type="radio"
            name="type"
            class="radio radio-primary"
            checked={type === "revenue"}
            onChange={() => {
              setType("revenue");
              setAccountCode("");
            }}
          />
          <span class="label-text text-primary font-medium">収入</span>
        </label>
        <label class="label cursor-pointer gap-2">
          <input
            type="radio"
            name="type"
            class="radio radio-error"
            checked={type === "expense"}
            onChange={() => {
              setType("expense");
              setAccountCode("");
            }}
          />
          <span class="label-text text-error font-medium">支出</span>
        </label>
      </div>

      {/* 入力フィールド */}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {/* 日付 */}
        <div class="form-control">
          <label class="label">
            <span class="label-text">
              発生日 <span class="text-error">*</span>
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

        {/* 勘定科目 */}
        <div class="form-control">
          <label class="label">
            <span class="label-text">
              勘定科目 <span class="text-error">*</span>
            </span>
          </label>
          <select
            class="select select-bordered"
            value={accountCode}
            onChange={(e) =>
              setAccountCode((e.target as HTMLSelectElement).value)
            }
            required
          >
            <option value="">選択してください</option>
            {accounts.map((acc) => (
              <option key={acc.code} value={acc.code}>
                {acc.name}
              </option>
            ))}
          </select>
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
            onChange={(e) => setAmount((e.target as HTMLInputElement).value)}
            required
          />
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
            placeholder="例: 事務用品購入"
            value={description}
            onChange={(e) =>
              setDescription((e.target as HTMLInputElement).value)
            }
            required
          />
        </div>
      </div>

      {/* メッセージ */}
      {message && (
        <div
          class={`alert ${
            message.type === "success" ? "alert-success" : "alert-error"
          } mb-4`}
        >
          <span>{message.text}</span>
        </div>
      )}

      {/* 送信ボタン */}
      <div class="flex justify-end">
        <button
          type="submit"
          class={`btn btn-primary ${isSubmitting ? "loading" : ""}`}
          disabled={isSubmitting}
        >
          {isSubmitting ? "登録中..." : "登録"}
        </button>
      </div>
    </form>
  );
}
