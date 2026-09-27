import assert from "node:assert/strict";
import test from "node:test";
import { EventService } from "./event-service.js";
import { MemoryEventRepository } from "../infrastructure/memory-event-repository.js";
import { EventRuleError } from "../domain/event.js";

test("only the event host can edit an event", async () => {
  const service = new EventService(new MemoryEventRepository());
  const event = (await service.list())[0]!;
  await assert.rejects(() => service.update(event.id, { title: "A changed title" }, "different-user"), (error: unknown) => error instanceof EventRuleError && error.statusCode === 403);
});

test("RSVP is idempotent and can be cancelled", async () => {
  const service = new EventService(new MemoryEventRepository());
  const event = (await service.list())[0]!;
  await service.rsvp(event.id, "guest-1", true);
  await service.rsvp(event.id, "guest-1", true);
  assert.equal((await service.get(event.id, "guest-1")).isAttending, true);
  assert.equal((await service.listRsvps("guest-1")).length, 1);
  await service.rsvp(event.id, "guest-1", false);
  assert.equal((await service.get(event.id, "guest-1")).isAttending, false);
});
