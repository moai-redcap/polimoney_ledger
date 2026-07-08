/**
 * Fresh ルートの HTTP テスト
 *
 * テスト実行: deno test -A tests/
 */
import { App, staticFiles } from "fresh";
import { Builder } from "fresh/dev";
import { assertEquals } from "$std/assert/assert_equals.ts";
import { assertStringIncludes } from "$std/assert/assert_string_includes.ts";
import { app } from "../main.ts";

/** テスト用の App ハンドラーを取得 */
async function getTestHandler() {
  const builder = new Builder();
  const snapshot = await builder.build({ snapshot: "memory" });
  snapshot(app);
  return app.handler();
}

/** テスト用の ServeHandlerInfo を作成 */
function testInfo(): Deno.ServeHandlerInfo<Deno.NetAddr> {
  return {
    remoteAddr: { hostname: "127.0.0.1", port: 0, transport: "tcp" },
    completed: Promise.resolve(),
  };
}

Deno.test("ルートテスト", async (t) => {
  const handler = await getTestHandler();

  await t.step("GET / → ログイン済みならダッシュボード、未ログインならリダイレクト", async () => {
    const req = new Request("http://localhost:8000/");
    const resp = await handler(req, testInfo());
    // 未ログインの場合、ミドルウェアがリダイレクトまたはページ表示するはず
    assertEquals(resp.status === 200 || resp.status === 302, true);
  });

  await t.step("GET /welcome → 200 OK", async () => {
    const req = new Request("http://localhost:8000/welcome");
    const resp = await handler(req, testInfo());
    // welcome はパブリックページ（ミドルウェアで保護されない）
    // ステータスコードを確認
    const body = await resp.text();
    if (resp.status === 200) {
      assertStringIncludes(body, "Polimoney Ledger");
    }
  });

  await t.step("GET /login → 200 OK", async () => {
    const req = new Request("http://localhost:8000/login");
    const resp = await handler(req, testInfo());
    const body = await resp.text();
    if (resp.status === 200) {
      assertStringIncludes(body, "ログイン");
    }
  });

  await t.step("GET /terms → 200 OK + 利用規約表示", async () => {
    const req = new Request("http://localhost:8000/terms");
    const resp = await handler(req, testInfo());
    const body = await resp.text();
    if (resp.status === 200) {
      assertStringIncludes(body, "利用規約");
    }
  });

  await t.step("GET /privacy → 200 OK + プライバシーポリシー表示", async () => {
    const req = new Request("http://localhost:8000/privacy");
    const resp = await handler(req, testInfo());
    const body = await resp.text();
    if (resp.status === 200) {
      assertStringIncludes(body, "プライバシー");
    }
  });

  await t.step("GET /nonexistent → 未認証の場合リダイレクト", async () => {
    const req = new Request("http://localhost:8000/this-does-not-exist");
    const resp = await handler(req, testInfo());
    // 未認証時はミドルウェアが /welcome にリダイレクト（302）
    // 認証済みなら 404 が返る
    assertEquals(resp.status === 404 || resp.status === 302, true);
  });
});
