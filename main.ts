import { App } from "fresh";

import "$std/dotenv/load.ts";

export const app = new App({ root: import.meta.url });

if (import.meta.main) {
  await app.listen({ port: 3721, hostname: "0.0.0.0" });
}
