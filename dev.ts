#!/usr/bin/env -S deno run -A --watch=static/,routes/

import "$std/dotenv/load.ts";

import { Builder } from "jsr:@fresh/core@^2.3.3/dev";
import { copy } from "$std/fs/copy.ts";

// Sawtooth CSS をビルド生成物として static/ に配置
const sawtoothSrc = "../../../kotsumo/github/sawtooth-css/dist/sawtooth.css";
try {
  await copy(sawtoothSrc, "./static/sawtooth.css", { overwrite: true });
  console.log("[Sawtooth] CSS copied to static/sawtooth.css");
} catch (e) {
  console.warn(`[Sawtooth] CSS copy skipped: ${e}`);
}

const builder = new Builder();

if (Deno.args.includes("build")) {
  const applySnapshot = await builder.build();
  const { app } = await import("./main.ts");
  applySnapshot(app);
} else {
  await builder.listen(async () => (await import("./main.ts")).app);
}
