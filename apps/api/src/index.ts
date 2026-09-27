import "dotenv/config";
import { buildServer } from "./server.js";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? "0.0.0.0";
const server = await buildServer({
  webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  demoMode: !process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY,
  webRoot: process.env.NODE_ENV === "production"
    ? process.env.WEB_DIST_DIR ?? resolve(dirname(fileURLToPath(import.meta.url)), "../../web/dist")
    : undefined,
});

try {
  await server.listen({ port, host });
} catch (error) {
  server.log.error(error);
  process.exit(1);
}
