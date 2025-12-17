import { Head } from "$fresh/runtime.ts";

export default function Error404() {
  return (
    <>
      <Head>
        <title>404 - Page not found</title>
      </Head>
      <div class="min-h-screen bg-base-200 flex items-center justify-center">
        <div class="text-center">
          <h1 class="text-9xl font-bold text-primary">404</h1>
          <p class="text-2xl font-semibold mt-4">ページが見つかりません</p>
          <p class="text-base-content/70 mt-2">
            お探しのページは存在しないか、移動した可能性があります。
          </p>
          <a href="/" class="btn btn-primary mt-6">
            ホームに戻る
          </a>
        </div>
      </div>
    </>
  );
}
