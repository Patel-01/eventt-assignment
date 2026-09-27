import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildServer } from "./server.js";

test("serves public events and requires authentication for RSVP", async () => {
  const app = await buildServer({ webOrigin: "http://localhost:5173", demoMode: true });
  try {
    const list = await app.inject({ method: "GET", url: "/api/v1/events" });
    assert.equal(list.statusCode, 200);
    assert.ok(list.json().items.length >= 1);
    const eventId = list.json().items[0].id as string;
    const unauthorized = await app.inject({ method: "POST", url: `/api/v1/events/${eventId}/rsvp` });
    assert.equal(unauthorized.statusCode, 401);
    const authorized = await app.inject({ method: "POST", url: `/api/v1/events/${eventId}/rsvp`, headers: { authorization: "Bearer demo-token-guest-1" } });
    assert.equal(authorized.statusCode, 200);
    assert.equal(authorized.json().isAttending, true);
  } finally {
    await app.close();
  }
});

test("publishes the OpenAPI document", async () => {
  const app = await buildServer({ webOrigin: "http://localhost:5173", demoMode: true });
  try {
    const response = await app.inject({ method: "GET", url: "/docs/json" });
    assert.equal(response.statusCode, 200);
    const runtimeDocument = response.json();
    assert.ok(runtimeDocument.paths["/events"]);
    assert.equal(runtimeDocument.paths["/events"].get.summary, "List events");
    assert.ok(runtimeDocument.paths["/events"].post.security);
    assert.equal(runtimeDocument.paths["/health"], undefined);
    assert.equal(runtimeDocument.components.securitySchemes.bearerAuth.scheme, "bearer");
    const contract = JSON.parse(await readFile(new URL("../../../packages/api-contracts/openapi.json", import.meta.url), "utf8")) as { paths: unknown };
    assert.deepEqual(runtimeDocument.paths, contract.paths);
  } finally {
    await app.close();
  }
});

test("serves the web app on nested routes without shadowing API or docs", async () => {
  const webRoot = await mkdtemp(join(tmpdir(), "gather-web-"));
  await writeFile(join(webRoot, "index.html"), "<!doctype html><title>Gather test app</title>");
  const app = await buildServer({ webOrigin: "http://localhost:5173", demoMode: true, webRoot });
  try {
    const page = await app.inject({ method: "GET", url: "/events/evt-sunset-sessions" });
    assert.equal(page.statusCode, 200);
    assert.match(page.headers["content-type"] as string, /text\/html/);
    assert.match(page.body, /Gather test app/);
    assert.equal((await app.inject({ method: "GET", url: "/api/v1/events" })).statusCode, 200);
    assert.equal((await app.inject({ method: "GET", url: "/api/v1/unknown" })).statusCode, 404);
    assert.equal((await app.inject({ method: "GET", url: "/docs/json" })).statusCode, 200);
    assert.equal((await app.inject({ method: "GET", url: "/missing.js" })).statusCode, 404);
  } finally {
    await app.close();
    await rm(webRoot, { recursive: true, force: true });
  }
});

test("allows browser preflight for the full REST method set", async () => {
  const app = await buildServer({ webOrigin: "http://localhost:5173", demoMode: true });
  try {
    const response = await app.inject({
      method: "OPTIONS", url: "/api/v1/events/event-one/rsvp",
      headers: { origin: "http://localhost:5173", "access-control-request-method": "DELETE", "access-control-request-headers": "authorization" },
    });
    assert.equal(response.statusCode, 204);
    assert.match(response.headers["access-control-allow-methods"] as string, /DELETE/);
  } finally {
    await app.close();
  }
});

test("creates and edits an event for its owner and rejects invalid event input", async () => {
  const app = await buildServer({ webOrigin: "http://localhost:5173", demoMode: true });
  try {
    const headers = { authorization: "Bearer demo-token-demo-user" };
    const created = await app.inject({
      method: "POST", url: "/api/v1/events", headers,
      payload: {
        title: "Evening book circle", description: "Bring a book you love and share a little about it with the group.",
        startsAt: new Date(Date.now() + 86_400_000).toISOString(), location: "River Room, Varanasi",
        category: "Community", imageUrl: "https://example.com/book-circle.jpg",
      },
    });
    assert.equal(created.statusCode, 201);
    const eventId = created.json().id as string;
    const updated = await app.inject({ method: "PATCH", url: `/api/v1/events/${eventId}`, headers, payload: { title: "Evening book circle, together" } });
    assert.equal(updated.statusCode, 200);
    assert.equal(updated.json().title, "Evening book circle, together");
    const invalid = await app.inject({ method: "POST", url: "/api/v1/events", headers, payload: { title: "x" } });
    assert.equal(invalid.statusCode, 400);
  } finally {
    await app.close();
  }
});
