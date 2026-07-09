import { Head } from "fresh/runtime";
import AuthCallback from "../../islands/AuthCallback.tsx";

export default function AuthCallbackPage() {
  return (
    <>
      <Head>
        <title>認証処理中... - Polimoney Ledger</title>
        <link href="/styles.css" rel="stylesheet" />
      </Head>
      <div style="min-height: 100vh; background: var(--st-sys-color-surface); display: flex; align-items: center; justify-content: center; padding: var(--st-sys-spacing-4);">
        <div class="st-card st-card--elevated" style="width: 100%; max-width: 28rem;">
          <div class="card-body text-center">
            <AuthCallback />
          </div>
        </div>
      </div>
    </>
  );
}
