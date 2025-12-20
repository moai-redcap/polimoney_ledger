import { Handlers } from "$fresh/server.ts";
import {
  updateOrganization,
  type UpdateOrganizationInput,
} from "../../../lib/hub-client.ts";

export const handler: Handlers = {
  /**
   * 政治団体詳細を更新（Hub API に転送）
   */
  async PUT(req, ctx) {
    const organizationId = ctx.params.id;
    const userId = ctx.state.userId as string;

    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const body: UpdateOrganizationInput = await req.json();

      // Hub API に転送
      const updated = await updateOrganization(organizationId, body);

      return new Response(
        JSON.stringify({
          success: true,
          data: updated,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error("Error updating organization:", error);
      return new Response(
        JSON.stringify({
          error:
            error instanceof Error
              ? error.message
              : "政治団体の更新に失敗しました",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
};
