import { useEffect, useState } from "preact/hooks";

export default function AuthCallback() {
  const [status, setStatus] = useState<"processing" | "success" | "error">(
    "processing"
  );
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // URLのハッシュフラグメントからトークンを取得
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);

        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");
        const errorDescription = params.get("error_description");

        if (errorDescription) {
          throw new Error(decodeURIComponent(errorDescription));
        }

        if (!accessToken) {
          throw new Error("認証トークンが見つかりません");
        }

        // サーバーにトークンを送信してセッションを設定
        const response = await fetch("/api/auth/callback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            access_token: accessToken,
            refresh_token: refreshToken,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "認証に失敗しました");
        }

        setStatus("success");

        // 少し待ってからダッシュボードにリダイレクト
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 1500);
      } catch (error) {
        setStatus("error");
        setErrorMessage(
          error instanceof Error ? error.message : "認証に失敗しました"
        );
      }
    };

    handleCallback();
  }, []);

  if (status === "processing") {
    return (
      <>
        <span class="loading loading-spinner loading-lg text-primary"></span>
        <h1 class="text-xl font-bold mt-4">認証処理中...</h1>
        <p class="text-base-content/60 mt-2">
          しばらくお待ちください。
        </p>
      </>
    );
  }

  if (status === "success") {
    return (
      <>
        <div class="text-5xl mb-4">✅</div>
        <h1 class="text-xl font-bold">認証が完了しました</h1>
        <p class="text-base-content/60 mt-2">
          ダッシュボードにリダイレクトします...
        </p>
      </>
    );
  }

  return (
    <>
      <div class="text-5xl mb-4">❌</div>
      <h1 class="text-xl font-bold text-error">認証に失敗しました</h1>
      <p class="text-base-content/60 mt-2">{errorMessage}</p>
      <div class="mt-6 space-y-2">
        <a href="/login" class="btn btn-primary w-full">
          ログインページへ
        </a>
        <a href="/register" class="btn btn-outline w-full">
          新規登録
        </a>
      </div>
    </>
  );
}
