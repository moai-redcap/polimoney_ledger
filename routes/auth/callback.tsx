import { Head } from "$fresh/runtime.ts";
import AuthCallback from "../../islands/AuthCallback.tsx";

export default function AuthCallbackPage() {
  return (
    <>
      <Head>
        <title>認証処理中... - Polimoney Ledger</title>
        <link href="/styles.css" rel="stylesheet" />
      </Head>
      <div class="min-h-screen bg-base-200 flex items-center justify-center p-4">
        <div class="card w-full max-w-md bg-base-100 shadow-xl">
          <div class="card-body text-center">
            <AuthCallback />
          </div>
        </div>
      </div>
    </>
  );
}
