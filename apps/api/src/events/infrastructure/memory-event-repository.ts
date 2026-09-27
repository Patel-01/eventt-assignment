import type { CreateEventInput, EventDto, UpdateEventInput } from "@events/api-contracts";
import { Event, EventRuleError } from "../domain/event.js";
import type { EventRepository } from "../application/event-repository.js";

const now = Date.now();
const hours = (value: number) => new Date(now + value * 3_600_000).toISOString();
const seed: EventDto[] = [
  { id: "evt-sunset-sessions", title: "Sunset Sessions: Rooftop Jazz", description: "A golden-hour rooftop gathering with a live jazz trio, local pours, and a skyline view worth lingering over. Come early for the sunset; stay for the second set.", startsAt: hours(48), endsAt: hours(51), location: "The Terrace, Varanasi", category: "Music", imageUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1400&q=85", hostName: "Maya Sharma", hostId: "demo-host", attendeeCount: 34, attendeeAvatars: ["https://i.pravatar.cc/80?img=47", "https://i.pravatar.cc/80?img=12", "https://i.pravatar.cc/80?img=33"], isAttending: false, createdAt: hours(-72) },
  { id: "evt-supper-club", title: "The Sunday Supper Club", description: "A shared table, a seasonal menu, and good conversation. Chef Nisha is cooking a five-course meal inspired by the markets of the old city. Dietary needs welcome with advance notice.", startsAt: hours(72), endsAt: hours(76), location: "Courtyard Kitchen, Assi Ghat", category: "Food", imageUrl: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1400&q=85", hostName: "Nisha Verma", hostId: "demo-host", attendeeCount: 18, attendeeAvatars: ["https://i.pravatar.cc/80?img=44", "https://i.pravatar.cc/80?img=5", "https://i.pravatar.cc/80?img=49"], isAttending: false, createdAt: hours(-96) },
  { id: "evt-clay-and-chai", title: "Clay & Chai: A Slow Morning", description: "Try your hand at the potter's wheel in a relaxed beginner workshop. We'll shape a small cup, share fresh chai, and let the morning unfold at its own pace. All materials included.", startsAt: hours(96), endsAt: hours(99), location: "Blue Pottery Studio, Lanka", category: "Arts", imageUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=1400&q=85", hostName: "Aarav Studio", hostId: "demo-host", attendeeCount: 11, attendeeAvatars: ["https://i.pravatar.cc/80?img=11", "https://i.pravatar.cc/80?img=28"], isAttending: false, createdAt: hours(-120) },
  { id: "evt-river-cleanup", title: "A Little Love for the Ganga", description: "Join neighbors for a gentle morning cleanup along the riverfront. Gloves, bags, and breakfast are on us. Bring a friend, comfortable shoes, and the energy to leave the place a little better.", startsAt: hours(120), endsAt: hours(122), location: "Assi Ghat Steps", category: "Community", imageUrl: "https://images.unsplash.com/photo-1531058020387-3be344556be6?auto=format&fit=crop&w=1400&q=85", hostName: "Ganga Collective", hostId: "demo-host", attendeeCount: 42, attendeeAvatars: ["https://i.pravatar.cc/80?img=3", "https://i.pravatar.cc/80?img=23", "https://i.pravatar.cc/80?img=60"], isAttending: false, createdAt: hours(-144) },
  { id: "evt-morning-flow", title: "Morning Flow by the River", description: "Find a little room to breathe with a slow, all-levels yoga flow as the city wakes up. Mats and herbal tea provided. No experience needed — just come as you are.", startsAt: hours(144), endsAt: hours(146), location: "Tulsi Ghat", category: "Wellness", imageUrl: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1400&q=85", hostName: "Ira Wellness", hostId: "demo-host", attendeeCount: 26, attendeeAvatars: ["https://i.pravatar.cc/80?img=32", "https://i.pravatar.cc/80?img=16"], isAttending: false, createdAt: hours(-168) },
  { id: "evt-builders-brunch", title: "Builders & Breakfast", description: "A no-slides meetup for people making things with AI. Bring a half-formed idea, a recent failure, or just an appetite. We'll do short intros, then let the conversations happen naturally.", startsAt: hours(168), endsAt: hours(171), location: "The Reading Room, Sigra", category: "Technology", imageUrl: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1400&q=85", hostName: "Pankaj Verma", hostId: "demo-host", attendeeCount: 21, attendeeAvatars: ["https://i.pravatar.cc/80?img=68", "https://i.pravatar.cc/80?img=14"], isAttending: false, createdAt: hours(-192) },
];

export class MemoryEventRepository implements EventRepository {
  private events = new Map(seed.map((event) => [event.id, structuredClone(event)]));
  private rsvps = new Set<string>();

  async list({ query, category, userId }: { query?: string; category?: string; userId?: string }): Promise<EventDto[]> {
    return [...this.events.values()]
      .filter((event) => !category || category === "All" || event.category === category)
      .filter((event) => !query || `${event.title} ${event.description} ${event.location}`.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
      .map((event) => this.withAttendance(event, userId));
  }

  async findById(id: string, userId?: string): Promise<EventDto | null> {
    const event = this.events.get(id);
    return event ? this.withAttendance(event, userId) : null;
  }

  async create(input: CreateEventInput, host: { id: string; name: string }): Promise<EventDto> {
    const id = `evt-${crypto.randomUUID()}`;
    const event = Event.create(input, host, id).toRecord();
    this.events.set(id, event);
    return event;
  }

  async update(id: string, input: UpdateEventInput, userId: string): Promise<EventDto | null> {
    const current = this.events.get(id);
    if (!current) return null;
    if (current.hostId !== userId) throw new EventRuleError("Only the event host can edit this event.", 403);
    const updated = Event.restore(current).update(input).toRecord();
    this.events.set(id, updated);
    return updated;
  }

  async setRsvp(id: string, userId: string, attending: boolean): Promise<EventDto | null> {
    const event = this.events.get(id);
    if (!event) return null;
    const key = `${id}:${userId}`;
    if (attending) this.rsvps.add(key); else this.rsvps.delete(key);
    return this.withAttendance(event, userId);
  }

  async listRsvps(userId: string): Promise<EventDto[]> {
    return [...this.events.values()].filter((event) => this.rsvps.has(`${event.id}:${userId}`)).map((event) => this.withAttendance(event, userId));
  }

  private withAttendance(event: EventDto, userId?: string): EventDto {
    const count = [...this.rsvps].filter((entry) => entry.startsWith(`${event.id}:`)).length;
    return { ...event, attendeeCount: event.attendeeCount + count, isAttending: Boolean(userId && this.rsvps.has(`${event.id}:${userId}`)) };
  }
}
