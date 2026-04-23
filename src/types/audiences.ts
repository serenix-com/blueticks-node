import { z } from "zod";

export const ContactSchema = z.object({
  id: z.string(),
  to: z.string(),
  variables: z.record(z.string()),
  added_at: z.string(),
});

export type Contact = z.infer<typeof ContactSchema>;

export const AudienceSchema = z.object({
  id: z.string(),
  name: z.string(),
  contact_count: z.number(),
  created_at: z.string(),
  contacts: z.array(ContactSchema).optional(),
  page: z.number().optional(),
  has_more: z.boolean().optional(),
});

export type Audience = z.infer<typeof AudienceSchema>;

export const AppendContactsResultSchema = z.object({
  added: z.number(),
  contact_count: z.number(),
});

export type AppendContactsResult = z.infer<typeof AppendContactsResultSchema>;
