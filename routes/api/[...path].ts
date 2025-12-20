/**
 * API キャッチオールルート
 *
 * すべての /api/* リクエストを Hono に転送
 */

import { Handlers } from "$fresh/server.ts";
import { api } from "../../src/api/index.ts";

export const handler: Handlers = {
  async GET(req, ctx) {
    return handleRequest(req, ctx);
  },
  async POST(req, ctx) {
    return handleRequest(req, ctx);
  },
  async PUT(req, ctx) {
    return handleRequest(req, ctx);
  },
  async DELETE(req, ctx) {
    return handleRequest(req, ctx);
  },
  async PATCH(req, ctx) {
    return handleRequest(req, ctx);
  },
};

async function handleRequest(
  req: Request,
  ctx: { state: { userId?: string }; params: { path: string } }
): Promise<Response> {
  const url = new URL(req.url);

  // /api/path を /path に変換して Hono に渡す
  const apiPath = "/" + (ctx.params.path || "");
  const honoUrl = new URL(apiPath + url.search, url.origin);

  // 新しいリクエストを作成（Hono 用）
  const honoReq = new Request(honoUrl.toString(), {
    method: req.method,
    headers: req.headers,
    body: req.body,
  });

  // userId を Hono のコンテキストに渡す
  // Hono のミドルウェアで c.set("userId", ...) を使う代わりに
  // リクエストヘッダーに埋め込む
  if (ctx.state.userId) {
    honoReq.headers.set("X-User-Id", ctx.state.userId);
  }

  // Hono アプリにリクエストを転送（ミドルウェアを適用）
  return api.fetch(honoReq, {
    // env として userId を渡す
    userId: ctx.state.userId,
  });
}
