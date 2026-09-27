import type { CreateEventInput, EventDto, UpdateEventInput } from "@events/api-contracts";
import { Event, EventRuleError } from "../domain/event.js";
import type { EventRepository } from "./event-repository.js";

export class EventService {
  constructor(private readonly repository: EventRepository) {}

  list(query?: string, category?: string, userId?: string): Promise<EventDto[]> {
    return this.repository.list({ query, category, userId });
  }

  async get(id: string, userId?: string): Promise<EventDto> {
    const event = await this.repository.findById(id, userId);
    if (!event) throw new EventRuleError("Event not found.", 404);
    return event;
  }

  async create(input: CreateEventInput, host: { id: string; name: string }): Promise<EventDto> {
    Event.create(input, host, "validation-only");
    return this.repository.create(input, host);
  }

  async update(id: string, input: UpdateEventInput, userId: string): Promise<EventDto> {
    const current = await this.repository.findById(id, userId);
    if (!current) throw new EventRuleError("Event not found.", 404);
    if (current.hostId !== userId) throw new EventRuleError("Only the event host can edit this event.", 403);
    Event.restore(current).update(input);
    const updated = await this.repository.update(id, input, userId);
    if (!updated) throw new EventRuleError("Event not found.", 404);
    return updated;
  }

  async rsvp(id: string, userId: string, attending: boolean): Promise<EventDto> {
    const existing = await this.repository.findById(id, userId);
    if (!existing) throw new EventRuleError("Event not found.", 404);
    const event = await this.repository.setRsvp(id, userId, attending);
    if (!event) throw new EventRuleError("Event not found.", 404);
    return event;
  }

  listRsvps(userId: string): Promise<EventDto[]> { return this.repository.listRsvps(userId); }
}
