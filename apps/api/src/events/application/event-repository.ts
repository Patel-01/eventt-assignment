import type { CreateEventInput, EventDto, UpdateEventInput } from "@events/api-contracts";

export interface EventRepository {
  list(options: { query?: string; category?: string; userId?: string }): Promise<EventDto[]>;
  findById(id: string, userId?: string): Promise<EventDto | null>;
  create(input: CreateEventInput, host: { id: string; name: string }): Promise<EventDto>;
  update(id: string, input: UpdateEventInput, userId: string): Promise<EventDto | null>;
  setRsvp(id: string, userId: string, attending: boolean): Promise<EventDto | null>;
  listRsvps(userId: string): Promise<EventDto[]>;
}
