import type { CreateEventInput, EventCategory, EventDto, UpdateEventInput } from "@events/api-contracts";

export type EventRecord = EventDto;

export class Event {
  private constructor(private readonly attributes: EventRecord) {}

  static create(input: CreateEventInput, host: { id: string; name: string }, id: string, now = new Date()): Event {
    const startsAt = new Date(input.startsAt);
    if (startsAt <= now) throw new EventRuleError("An event must start in the future.", 400);
    if (input.endsAt && new Date(input.endsAt) <= startsAt) throw new EventRuleError("End time must be after start time.", 400);
    return new Event({
      id, title: input.title, description: input.description, startsAt: startsAt.toISOString(),
      endsAt: input.endsAt ? new Date(input.endsAt).toISOString() : null, location: input.location,
      category: input.category, imageUrl: input.imageUrl, hostName: host.name, hostId: host.id,
      attendeeCount: 0, attendeeAvatars: [], isAttending: false, createdAt: now.toISOString(),
    });
  }

  static restore(record: EventRecord): Event { return new Event(record); }

  update(input: UpdateEventInput, now = new Date()): Event {
    const startsAt = input.startsAt ? new Date(input.startsAt).toISOString() : this.attributes.startsAt;
    const endsAt = input.endsAt === undefined ? this.attributes.endsAt : input.endsAt ? new Date(input.endsAt).toISOString() : null;
    if (new Date(startsAt) <= now) throw new EventRuleError("An event must start in the future.", 400);
    if (endsAt && new Date(endsAt) <= new Date(startsAt)) throw new EventRuleError("End time must be after start time.", 400);
    return new Event({ ...this.attributes, ...input, startsAt, endsAt });
  }

  toRecord(): EventRecord { return { ...this.attributes }; }
  get id(): string { return this.attributes.id; }
  get hostId(): string | null { return this.attributes.hostId; }
}

export class EventRuleError extends Error {
  constructor(message: string, readonly statusCode: number) { super(message); this.name = "EventRuleError"; }
}

export function isEventCategory(value: string): value is EventCategory {
  return ["Music", "Food", "Arts", "Community", "Wellness", "Technology"].includes(value);
}
