import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { createEventSchema, eventListSchema, eventSchema, errorSchema, updateEventSchema } from "@events/api-contracts";
import { EventService } from "../application/event-service.js";
import { EventRuleError } from "../domain/event.js";
import { MemoryEventRepository } from "../infrastructure/memory-event-repository.js";
import { SupabaseEventRepository } from "../infrastructure/supabase-event-repository.js";
import { z } from "zod";

type ApiConfig = { supabaseUrl?: string; supabaseAnonKey?: string; demoMode: boolean };
type Principal = { id: string; name: string; accessToken?: string };

const eventIdParams = z.object({ eventId: z.string().min(1) });
const listQuery = z.object({ q: z.string().optional(), category: z.string().optional() });

export const eventRoutes: FastifyPluginAsyncZod<{ config: ApiConfig }> = async (app, { config }) => {
  const memoryRepository = new MemoryEventRepository();

  const principalFor = async (authorization?: string): Promise<Principal | null> => {
    const token = authorization?.replace(/^Bearer\s+/i, "");
    if (!token) return null;
    if (token.startsWith("demo-token-") && config.demoMode) {
      const id = token.slice("demo-token-".length) || "demo-user";
      return { id, name: id === "demo-user" ? "Pankaj Verma" : "Event Guest" };
    }
    if (!config.supabaseUrl || !config.supabaseAnonKey) return null;
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, { auth: { persistSession: false } });
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return null;
    const name = typeof data.user.user_metadata?.full_name === "string" ? data.user.user_metadata.full_name : data.user.email?.split("@")[0] ?? "Event host";
    return { id: data.user.id, name, accessToken: token };
  };

  const serviceFor = (principal?: Principal | null) => {
    const repository = config.supabaseUrl && config.supabaseAnonKey
      ? SupabaseEventRepository.create(config.supabaseUrl, config.supabaseAnonKey, principal?.accessToken)
      : memoryRepository;
    return new EventService(repository);
  };

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof EventRuleError) return reply.code(error.statusCode).send({ error: error.message });
    if (typeof error === "object" && error !== null && "validation" in error && error.validation) return reply.code(400).send({ error: "Please check the event details.", details: error.validation });
    if (typeof error === "object" && error !== null && "statusCode" in error && typeof error.statusCode === "number" && error.statusCode < 500) {
      return reply.code(error.statusCode).send({ error: "The request could not be parsed." });
    }
    app.log.error(error);
    return reply.code(500).send({ error: "Something went wrong. Please try again." });
  });

  app.get("/events", { schema: { summary: "List events", description: "Browse public events with optional text and category filters.", tags: ["events"], querystring: listQuery, response: { 200: eventListSchema } } }, async (request) => {
    const query = listQuery.parse(request.query);
    const principal = await principalFor(request.headers.authorization);
    const items = await serviceFor(principal).list(query.q, query.category, principal?.id);
    return { items, total: items.length };
  });

  app.get("/events/:eventId", { schema: { summary: "Get event details", tags: ["events"], params: eventIdParams, response: { 200: eventSchema, 404: errorSchema } } }, async (request) => {
    const { eventId } = eventIdParams.parse(request.params);
    const principal = await principalFor(request.headers.authorization);
    return serviceFor(principal).get(eventId, principal?.id);
  });

  app.post("/events", { schema: { summary: "Create an event", tags: ["events"], body: createEventSchema, response: { 201: eventSchema, 400: errorSchema, 401: errorSchema }, security: [{ bearerAuth: [] }] } }, async (request, reply) => {
    const principal = await principalFor(request.headers.authorization);
    if (!principal) throw new EventRuleError("Sign in to create an event.", 401);
    return reply.code(201).send(await serviceFor(principal).create(createEventSchema.parse(request.body), principal));
  });

  app.patch("/events/:eventId", { schema: { summary: "Update an event", tags: ["events"], params: eventIdParams, body: updateEventSchema, response: { 200: eventSchema, 400: errorSchema, 401: errorSchema, 403: errorSchema, 404: errorSchema }, security: [{ bearerAuth: [] }] } }, async (request) => {
    const { eventId } = eventIdParams.parse(request.params);
    const principal = await principalFor(request.headers.authorization);
    if (!principal) throw new EventRuleError("Sign in to edit an event.", 401);
    return serviceFor(principal).update(eventId, updateEventSchema.parse(request.body), principal.id);
  });

  app.post("/events/:eventId/rsvp", { schema: { summary: "RSVP to an event", tags: ["rsvps"], params: eventIdParams, response: { 200: eventSchema, 401: errorSchema, 404: errorSchema }, security: [{ bearerAuth: [] }] } }, async (request) => {
    const { eventId } = eventIdParams.parse(request.params);
    const principal = await principalFor(request.headers.authorization);
    if (!principal) throw new EventRuleError("Sign in to RSVP.", 401);
    return serviceFor(principal).rsvp(eventId, principal.id, true);
  });

  app.delete("/events/:eventId/rsvp", { schema: { summary: "Cancel an RSVP", tags: ["rsvps"], params: eventIdParams, response: { 200: eventSchema, 401: errorSchema, 404: errorSchema }, security: [{ bearerAuth: [] }] } }, async (request) => {
    const { eventId } = eventIdParams.parse(request.params);
    const principal = await principalFor(request.headers.authorization);
    if (!principal) throw new EventRuleError("Sign in to manage your RSVP.", 401);
    return serviceFor(principal).rsvp(eventId, principal.id, false);
  });

  app.get("/me/rsvps", { schema: { summary: "List my RSVPs", tags: ["rsvps"], response: { 200: eventListSchema, 401: errorSchema }, security: [{ bearerAuth: [] }] } }, async (request) => {
    const principal = await principalFor(request.headers.authorization);
    if (!principal) throw new EventRuleError("Sign in to view your RSVPs.", 401);
    const items = await serviceFor(principal).listRsvps(principal.id);
    return { items, total: items.length };
  });
};
