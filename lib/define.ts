import { createDefine } from "fresh";

/**
 * アプリケーション共通の State 型
 *
 * ミドルウェアで ctx.state に設定されるプロパティを定義。
 * すべてのルートとミドルウェアで型安全にアクセスできる。
 */
export interface AppState {
  /** 認証済みユーザー情報（Supabase Auth User） */
  // deno-lint-ignore no-explicit-any
  user?: any;
  /** 認証済みユーザーID（ショートカット） */
  userId?: string;
}

/**
 * Fresh 2.x の define ヘルパー
 *
 * ルートやミドルウェアで型推論付きの定義を行うために使用する。
 *
 * @example
 * ```ts
 * import { define } from "../lib/define.ts";
 * import { page } from "fresh";
 *
 * export const handler = define.handlers<{ message: string }>({
 *   GET(ctx) {
 *     return page({ message: "Hello" });
 *   },
 * });
 *
 * export default define.page<typeof handler>(({ data }) => {
 *   return <h1>{data.message}</h1>;
 * });
 * ```
 */
export const define = createDefine<AppState>();
