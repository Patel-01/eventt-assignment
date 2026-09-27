import { z } from "zod";

export const eventCategorySchema = z.enum(["Music", "Food", "Arts", "Community", "Wellness", "Technology"]);
export type EventCategory = z.infer<typeof eventCategorySchema>;

export const eventSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }).nullable(),
  location: z.string(),
  category: eventCategorySchema,
  imageUrl: z.string().url(),
  hostName: z.string(),
  hostId: z.string().nullable(),
  attendeeCount: z.number().int().nonnegative(),
  attendeeAvatars: z.array(z.string().url()),
  isAttending: z.boolean(),
  createdAt: z.string().datetime(),
});
export type EventDto = z.infer<typeof eventSchema>;

export const createEventSchema = z.object({
  title: z.string().trim().min(4).max(90),
  description: z.string().trim().min(20).max(2000),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().nullable().optional(),
  location: z.string().trim().min(3).max(160),
  category: eventCategorySchema,
  imageUrl: z.string().url(),
});
export type CreateEventInput = z.infer<typeof createEventSchema>;

export const updateEventSchema = createEventSchema.partial().extend({
  title: z.string().trim().min(4).max(90).optional(),
  description: z.string().trim().min(20).max(2000).optional(),
  location: z.string().trim().min(3).max(160).optional(),
});
export type UpdateEventInput = z.infer<typeof updateEventSchema>;

export const eventListSchema = z.object({ items: z.array(eventSchema), total: z.number().int().nonnegative() });
export const errorSchema = z.object({ error: z.string(), details: z.unknown().optional() });
