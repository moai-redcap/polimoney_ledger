import { Handlers } from "$fresh/server.ts";
import { verifyPoliticianEmail } from "../../../../../lib/hub-client.ts";

export const handler: Handlers = {
  /**
   * 認証コードを検証
   */
  async POST(req, ctx) {
    const verificationId = ctx.params.id;
    const userId = ctx.state.userId as string;

    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const body = await req.json();
      const result = await verifyPoliticianEmail(verificationId, body.code, {
        userId,
      });

      return new Response(JSON.stringify({ success: true, ...result }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error verifying code:", error);
      return new Response(
        JSON.stringify({
          error:
            error instanceof Error ? error.message : "認証コードが無効です",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
};
