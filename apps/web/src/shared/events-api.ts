import { createEventSchema, eventListSchema, eventSchema, type CreateEventInput, type EventDto, type UpdateEventInput } from "@events/api-contracts";
import { isDemoMode } from "./supabase-client.js";

const apiBase = (import.meta.env.VITE_API_URL as string | undefined) ?? (import.meta.env.PROD ? "/api/v1" : "http://localhost:4000/api/v1");

export class ApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); this.name = "ApiError"; }
}

async function request<T>(path: string, token: string | null, schema: { parse: (input: unknown) => T }, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: { ...(init?.body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init?.headers },
  });
  const data: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data === "object" && data && "error" in data && typeof data.error === "string" ? data.error : "The request could not be completed.";
    throw new ApiError(message, response.status);
  }
  return schema.parse(data);
}

export const eventsApi = {
  async list(token: string | null, query = "", category = "All") {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (category !== "All") params.set("category", category);
    const result = await request(`/events${params.size ? `?${params}` : ""}`, token, eventListSchema);
    return result.items;
  },
  get: (id: string, token: string | null) => request(`/events/${id}`, token, eventSchema),
  create: (input: CreateEventInput, token: string) => request("/events", token, eventSchema, { method: "POST", body: JSON.stringify(createEventSchema.parse(input)) }),
  update: (id: string, input: UpdateEventInput, token: string) => request(`/events/${id}`, token, eventSchema, { method: "PATCH", body: JSON.stringify(input) }),
  rsvp: (id: string, token: string, attending: boolean) => request(`/events/${id}/rsvp`, token, eventSchema, { method: attending ? "POST" : "DELETE" }),
  myRsvps: async (token: string) => (await request(`/me/rsvps`, token, eventListSchema)).items,
  demoMode: isDemoMode,
};

export type { EventDto };
