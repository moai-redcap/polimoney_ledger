import { useState } from "preact/hooks";
import JournalForm, {
  type AccountCode,
  type Contact,
  type SubAccount,
} from "./JournalForm.tsx";

interface JournalFormDrawerProps {
  ledgerType: "organization" | "election";
  organizationId: string | null;
  electionId: string | null;
  accountCodes: AccountCode[];
  contacts: Contact[];
  subAccounts: SubAccount[];
}

export default function JournalFormDrawer({
  ledgerType,
  organizationId,
  electionId,
  accountCodes,
  contacts,
  subAccounts,
}: JournalFormDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpen = () => setIsOpen(true);
  const handleClose = () => setIsOpen(false);

  const handleSuccess = () => {
    setIsOpen(false);
    // ページをリロードして一覧を更新
    window.location.reload();
  };

  return (
    <>
      {/* 仕訳登録ボタン */}
      <button type="button" class="btn btn-primary" onClick={handleOpen}>
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
        仕訳を登録
      </button>

      {/* ドロワー（右側から） */}
      {isOpen && (
        <div class="fixed inset-0 z-50 flex justify-end">
          {/* 背景オーバーレイ（クリックしても閉じない） */}
          <div class="absolute inset-0 bg-black/30" />

          {/* ドロワーパネル */}
          <div class="relative w-[85%] max-w-4xl bg-base-100 h-full shadow-xl flex flex-col animate-slide-in-right">
            {/* ヘッダー */}
            <div class="flex items-center justify-between p-4 border-b border-base-300">
              <h2 class="text-lg font-bold">仕訳を登録</h2>
              <button
                type="button"
                class="btn btn-ghost btn-sm btn-square"
                onClick={handleClose}
                aria-label="閉じる"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* コンテンツ（スクロール可能） */}
            <div class="flex-1 overflow-y-auto p-4 pb-24">
              <JournalForm
                ledgerType={ledgerType}
                organizationId={organizationId}
                electionId={electionId}
                accountCodes={accountCodes}
                contacts={contacts}
                subAccounts={subAccounts}
                onSuccess={handleSuccess}
                onCancel={handleClose}
                showFixedButtons={true}
              />
            </div>
          </div>
        </div>
      )}

      {/* アニメーション用スタイル */}
      <style>
        {`
          @keyframes slide-in-right {
            from {
              transform: translateX(100%);
            }
            to {
              transform: translateX(0);
            }
          }
          .animate-slide-in-right {
            animation: slide-in-right 0.2s ease-out;
          }
        `}
      </style>
    </>
  );
}
