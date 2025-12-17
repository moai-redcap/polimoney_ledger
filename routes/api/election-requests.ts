import { Handlers } from "$fresh/server.ts";
import {
  createElectionRequest,
  type CreateElectionRequestInput,
} from "../../lib/hub-client.ts";

export const handler: Handlers = {
  async POST(req) {
    try {
      const body = (await req.json()) as CreateElectionRequestInput;

      // バリデーション
      if (
        !body.name ||
        !body.type ||
        !body.area_description ||
        !body.election_date
      ) {
        return new Response(
          JSON.stringify({
            error: "name, type, area_description, election_date は必須です",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // 選挙タイプのバリデーション
      const validTypes = ["HR", "HC", "PG", "CM", "GM"];
      if (!validTypes.includes(body.type)) {
        return new Response(
          JSON.stringify({
            error: `type は ${validTypes.join(
              ", "
            )} のいずれかである必要があります`,
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Hub API にリクエストを送信
      const result = await createElectionRequest(body);

      return new Response(JSON.stringify({ data: result }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Election request creation failed:", error);
      return new Response(
        JSON.stringify({
          error:
            error instanceof Error
              ? error.message
              : "リクエストの作成に失敗しました",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
};
