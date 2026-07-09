import { useEffect, useState } from "preact/hooks";

// ポリシーバージョン（更新時にインクリメント）
const CURRENT_POLICY_VERSION = "2025-01-01";
const STORAGE_KEY = "policy_acknowledged_version";

export default function PolicyBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // ローカルストレージから確認済みバージョンを取得
    const acknowledgedVersion = localStorage.getItem(STORAGE_KEY);

    // 現在のバージョンと比較して表示するか決定
    if (acknowledgedVersion !== CURRENT_POLICY_VERSION) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    // 確認済みとして保存
    localStorage.setItem(STORAGE_KEY, CURRENT_POLICY_VERSION);
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div style="background: var(--st-sys-color-primary-container); color: var(--st-sys-color-on-primary-container); padding: var(--st-sys-spacing-3) var(--st-sys-spacing-4);">
      <div style="display: flex; align-items: center; justify-content: space-between; max-width: 56rem; margin: 0 auto;">
        <div class="st-flex st-flex--items-center st-gap-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            style="width: 1.25rem; height: 1.25rem; flex-shrink: 0;"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
            />
          </svg>
          <p style="font-size: var(--st-sys-typescale-body-small-size);">
            プライバシーポリシーが更新されました。
            <a
              href="/privacy"
              style="text-decoration: underline; font-weight: 500; margin-left: var(--st-sys-spacing-1);"
            >
              詳細を確認
            </a>
          </p>
        </div>
        <button
          onClick={handleDismiss}
          class="st-button st-button--text st-button--sm st-button--icon"
          aria-label="閉じる"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            style="width: 1.25rem; height: 1.25rem;"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M6 18 18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
