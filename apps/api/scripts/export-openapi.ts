import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { buildServer } from "../src/server.js";

const server = await buildServer({ webOrigin: "http://localhost:5173", demoMode: true });

try {
  await server.ready();
  const destination = new URL("../../../packages/api-contracts/openapi.json", import.meta.url);
  await writeFile(fileURLToPath(destination), `${JSON.stringify(server.swagger(), null, 2)}\n`, "utf8");
} finally {
  await server.close();
}
