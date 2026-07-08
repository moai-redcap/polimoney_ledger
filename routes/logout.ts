import { deleteCookie } from "$std/http/cookie.ts";
import { Handlers } from "fresh/compat";

export const handler: Handlers = {
  GET() {
    const headers = new Headers();
    headers.set("Location", "/login");

    // Cookie を削除
    deleteCookie(headers, "sb-access-token", { path: "/" });
    deleteCookie(headers, "sb-refresh-token", { path: "/" });

    return new Response(null, { status: 302, headers });
  },
};
