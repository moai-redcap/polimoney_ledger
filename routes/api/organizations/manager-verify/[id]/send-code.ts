import { Handlers } from "$fresh/server.ts";
import { sendOrganizationManagerVerificationCode } from "../../../../../lib/hub-client.ts";

export const handler: Handlers = {
  /**
   * 認証コードを送信
   */
  async POST(_req, ctx) {
    const verificationId = ctx.params.id;
    const userId = ctx.state.userId as string;

    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const result = await sendOrganizationManagerVerificationCode(
        verificationId
      );

      return new Response(JSON.stringify({ success: true, ...result }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error sending verification code:", error);
      return new Response(
        JSON.stringify({
          error:
            error instanceof Error
              ? error.message
              : "認証コードの送信に失敗しました",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
};
