#!/usr/bin/env -S deno run -A --watch=static/,routes/

import "$std/dotenv/load.ts";

import { Builder } from "jsr:@fresh/core@^2.3.3/dev";

const builder = new Builder();

if (Deno.args.includes("build")) {
  const applySnapshot = await builder.build();
  const { app } = await import("./main.ts");
  applySnapshot(app);
} else {
  await builder.listen(async () => (await import("./main.ts")).app);
}
