import { App, staticFiles } from "fresh";

import "$std/dotenv/load.ts";

export const app = new App()
  .use(staticFiles())
  .fsRoutes();

if (import.meta.main) {
  await app.listen({ port: 3721, hostname: "0.0.0.0" });
}
