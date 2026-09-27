import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { CreateEventInput, EventDto, UpdateEventInput } from "@events/api-contracts";
import type { EventRepository } from "../application/event-repository.js";
import { Event, EventRuleError } from "../domain/event.js";

type EventRow = {
  id: string; title: string; description: string; starts_at: string; ends_at: string | null;
  location: string; category: EventDto["category"]; image_url: string; host_name: string;
  host_id: string | null; created_at: string; attendee_count: number;
};

export class SupabaseEventRepository implements EventRepository {
  private constructor(private readonly client: SupabaseClient) {}

  static create(url: string, anonKey: string, accessToken?: string): SupabaseEventRepository {
    const client = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
    });
    return new SupabaseEventRepository(client);
  }

  async list({ query, category, userId }: { query?: string; category?: string; userId?: string }): Promise<EventDto[]> {
    let request = this.client.from("events").select("*").order("starts_at", { ascending: true });
    if (category && category !== "All") request = request.eq("category", category);
    if (query) request = request.ilike("title", `%${query}%`);
    const { data, error } = await request;
    if (error) throw new Error(`Could not load events: ${error.message}`);
    const rsvpIds = userId ? await this.getRsvpIds(userId) : new Set<string>();
    return (data ?? []).map((row) => this.toDto(row as EventRow, rsvpIds));
  }

  async findById(id: string, userId?: string): Promise<EventDto | null> {
    const { data, error } = await this.client.from("events").select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(`Could not load event: ${error.message}`);
    if (!data) return null;
    const rsvpIds = userId ? await this.getRsvpIds(userId) : new Set<string>();
    return this.toDto(data as EventRow, rsvpIds);
  }

  async create(input: CreateEventInput, host: { id: string; name: string }): Promise<EventDto> {
    const event = Event.create(input, host, crypto.randomUUID()).toRecord();
    const { data, error } = await this.client.from("events").insert(this.toRow(event)).select("*").single();
    if (error) throw new Error(`Could not create event: ${error.message}`);
    return this.toDto(data as EventRow, new Set());
  }

  async update(id: string, input: UpdateEventInput, userId: string): Promise<EventDto | null> {
    const current = await this.findById(id, userId);
    if (!current) return null;
    if (current.hostId !== userId) throw new EventRuleError("Only the event host can edit this event.", 403);
    const updated = Event.restore(current).update(input).toRecord();
    const { data, error } = await this.client.from("events").update(this.toRow(updated)).eq("id", id).select("*").maybeSingle();
    if (error) throw new Error(`Could not update event: ${error.message}`);
    return data ? this.toDto(data as EventRow, new Set()) : null;
  }

  async setRsvp(id: string, userId: string, attending: boolean): Promise<EventDto | null> {
    if (attending) {
      const { error } = await this.client.from("event_rsvps").upsert({ event_id: id, user_id: userId }, { onConflict: "event_id,user_id", ignoreDuplicates: true });
      if (error) throw new Error(`Could not RSVP: ${error.message}`);
    } else {
      const { error } = await this.client.from("event_rsvps").delete().eq("event_id", id).eq("user_id", userId);
      if (error) throw new Error(`Could not cancel RSVP: ${error.message}`);
    }
    return this.findById(id, userId);
  }

  async listRsvps(userId: string): Promise<EventDto[]> {
    const { data, error } = await this.client.from("event_rsvps").select("event_id, events(*)").eq("user_id", userId);
    if (error) throw new Error(`Could not load RSVPs: ${error.message}`);
    return (data ?? []).flatMap((row) => row.events ? [this.toDto(row.events as unknown as EventRow, new Set([row.event_id]))] : []);
  }

  private async getRsvpIds(userId: string): Promise<Set<string>> {
    const { data, error } = await this.client.from("event_rsvps").select("event_id").eq("user_id", userId);
    if (error) throw new Error(`Could not load RSVP state: ${error.message}`);
    return new Set((data ?? []).map((row) => row.event_id));
  }

  private toDto(row: EventRow, attending: Set<string>): EventDto {
    return {
      id: row.id, title: row.title, description: row.description, startsAt: row.starts_at, endsAt: row.ends_at,
      location: row.location, category: row.category, imageUrl: row.image_url, hostName: row.host_name,
      hostId: row.host_id, attendeeCount: row.attendee_count,
      attendeeAvatars: ["https://i.pravatar.cc/80?img=47", "https://i.pravatar.cc/80?img=12", "https://i.pravatar.cc/80?img=33"],
      isAttending: attending.has(row.id), createdAt: row.created_at,
    };
  }

  private toRow(event: EventDto) {
    return {
      id: event.id, title: event.title, description: event.description, starts_at: event.startsAt,
      ends_at: event.endsAt, location: event.location, category: event.category, image_url: event.imageUrl,
      host_name: event.hostName, host_id: event.hostId,
    };
  }
}
