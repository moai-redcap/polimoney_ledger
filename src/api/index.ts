/**
 * Ledger API (Hono)
 *
 * Fresh からルーティングされた API リクエストを処理
 */

import { Hono } from "hono";
import { contactsRouter } from "./routes/contacts.ts";
import { journalsRouter } from "./routes/journals.ts";
import { electionsRouter } from "./routes/elections.ts";
import { organizationsRouter } from "./routes/organizations.ts";
import { politiciansRouter } from "./routes/politicians.ts";
import { membersRouter } from "./routes/members.ts";
import { subAccountsRouter } from "./routes/sub-accounts.ts";
import { profileRouter } from "./routes/profile.ts";
import { syncRouter } from "./routes/sync.ts";
import { uploadRouter } from "./routes/upload.ts";
import { ownershipTransfersRouter } from "./routes/ownership-transfers.ts";
import { electionRequestsRouter } from "./routes/election-requests.ts";
import { organizationRequestsRouter } from "./routes/organization-requests.ts";
import { accountRouter } from "./routes/account.ts";

// Hono アプリを作成
export const api = new Hono<{
  Variables: {
    userId: string;
  };
}>();

// 認証ミドルウェア: Fresh から渡された userId を設定
api.use("*", async (c, next) => {
  const userId = c.req.header("X-User-Id");
  if (userId) {
    c.set("userId", userId);
  }
  await next();
});

// ルーターをマウント
api.route("/contacts", contactsRouter);
api.route("/journals", journalsRouter);
api.route("/elections", electionsRouter);
api.route("/organizations", organizationsRouter);
api.route("/politicians", politiciansRouter);
api.route("/members", membersRouter);
api.route("/sub-accounts", subAccountsRouter);
api.route("/profile", profileRouter);
api.route("/sync", syncRouter);
api.route("/upload", uploadRouter);
api.route("/uploads", uploadRouter); // 互換性のため
api.route("/ownership-transfers", ownershipTransfersRouter);
api.route("/election-requests", electionRequestsRouter);
api.route("/organization-requests", organizationRequestsRouter);
api.route("/account", accountRouter);

// 404 ハンドラー
api.notFound((c) => {
  return c.json({ error: "API endpoint not found" }, 404);
});

// エラーハンドラー
api.onError((err, c) => {
  console.error("[API Error]", err);
  return c.json({ error: "Internal server error" }, 500);
});
