import { z } from "zod";

export const ContactSchema = z.object({
  id: z.string(),
  to: z.string(),
  variables: z.record(z.string()),
  addedAt: z.string().datetime({ offset: true }),
});

export type Contact = z.infer<typeof ContactSchema>;

export const AudienceSchema = z.object({
  id: z.string(),
  name: z.string(),
  contactCount: z.number().int(),
  createdAt: z.string().datetime({ offset: true }),
  // Hand-tuned: backend may include nested contacts paging when ?page= is set.
  contacts: z.array(ContactSchema).optional(),
  page: z.number().optional(),
  hasMore: z.boolean().optional(),
});

export type Audience = z.infer<typeof AudienceSchema>;

export const AppendContactsResultSchema = z.object({
  added: z.number(),
  contactCount: z.number(),
});

export type AppendContactsResult = z.infer<typeof AppendContactsResultSchema>;
