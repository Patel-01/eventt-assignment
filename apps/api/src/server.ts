import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { jsonSchemaTransform, serializerCompiler, validatorCompiler, type ZodTypeProvider } from "fastify-type-provider-zod";
import { existsSync } from "node:fs";
import { extname } from "node:path";
import { eventRoutes } from "./events/http/event-routes.js";

export type ServerConfig = {
  webOrigin: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  demoMode: boolean;
  webRoot?: string;
};

export async function buildServer(config: ServerConfig) {
  const app = Fastify({ logger: true }).withTypeProvider<ZodTypeProvider>();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  await app.register(cors, {
    origin: config.webOrigin.split(",").map((origin) => origin.trim()),
    methods: ["GET", "HEAD", "POST", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  });
  await app.register(swagger, {
    openapi: {
      info: { title: "Gather Events API", description: "Versioned API for event discovery and RSVPs.", version: "1.0.0" },
      servers: [{ url: "/api/v1" }],
      tags: [{ name: "events" }, { name: "rsvps" }],
      components: {
        securitySchemes: {
          bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT", description: "Supabase access token." },
        },
      },
    },
    transform: jsonSchemaTransform,
  });
  await app.register(swaggerUi, { routePrefix: "/docs" });
  app.get("/health", { schema: { hide: true } }, async () => ({ status: "ok", service: "gather-events-api" }));
  await app.register(eventRoutes, { prefix: "/api/v1", config: { ...config } });

  if (config.webRoot && existsSync(config.webRoot)) {
    await app.register(fastifyStatic, { root: config.webRoot, prefix: "/", wildcard: false });
    app.setNotFoundHandler((request, reply) => {
      const pathname = request.url.split("?", 1)[0] ?? request.url;
      const reservedPrefixes = ["/api", "/docs", "/health"];
      if (reservedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)) || extname(pathname)) {
        return reply.code(404).send({ error: "Not found." });
      }
      return reply.type("text/html").sendFile("index.html");
    });
  }
  return app;
}
