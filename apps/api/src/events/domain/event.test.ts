import assert from "node:assert/strict";
import test from "node:test";
import { Event, EventRuleError } from "./event.js";

const input = {
  title: "A small gathering",
  description: "A cozy evening with good people and a little live music.",
  startsAt: "2026-10-02T19:00:00.000Z",
  endsAt: "2026-10-02T21:00:00.000Z",
  location: "The Terrace, Varanasi",
  category: "Music" as const,
  imageUrl: "https://example.com/event.jpg",
};

test("creates an event with host ownership and default RSVP values", () => {
  const event = Event.create(input, { id: "host-1", name: "Asha" }, "event-1", new Date("2026-09-26T00:00:00Z")).toRecord();
  assert.equal(event.hostId, "host-1");
  assert.equal(event.attendeeCount, 0);
  assert.equal(event.isAttending, false);
});

test("rejects an event in the past", () => {
  assert.throws(() => Event.create({ ...input, startsAt: "2026-09-25T19:00:00.000Z" }, { id: "host-1", name: "Asha" }, "event-1"), (error: unknown) => error instanceof EventRuleError && error.statusCode === 400);
});

test("rejects an end time that is not after the start time", () => {
  assert.throws(() => Event.create({ ...input, endsAt: input.startsAt }, { id: "host-1", name: "Asha" }, "event-1", new Date("2026-09-26T00:00:00Z")), (error: unknown) => error instanceof EventRuleError);
});

test("validates update invariants as well as create invariants", () => {
  const event = Event.create(input, { id: "host-1", name: "Asha" }, "event-1", new Date("2026-09-26T00:00:00Z"));
  assert.throws(() => event.update({ startsAt: "2026-10-03T19:00:00.000Z", endsAt: "2026-10-03T18:00:00.000Z" }, new Date("2026-09-26T00:00:00Z")), EventRuleError);
});
