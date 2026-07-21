import { z } from "zod";

export const AudienceSchema = z.object({
  id: z.string(),
  name: z.string(),
  contactCount: z.number().int(),
  createdAt: z.string().datetime({ offset: true }),
});

export type Audience = z.infer<typeof AudienceSchema>;

export const AppendContactsResultSchema = z.object({
  added: z.number().int(),
  contactCount: z.number().int(),
});

export type AppendContactsResult = z.infer<typeof AppendContactsResultSchema>;

/** A single audience member row, as returned by `PATCH /v1/audiences/{id}/contacts/{contactId}`. */
export const AudienceContactSchema = z.object({
  id: z.string(),
  to: z.string(),
  variables: z.record(z.string()),
  addedAt: z.string().datetime({ offset: true }),
});

export type AudienceContact = z.infer<typeof AudienceContactSchema>;

/** Result of `DELETE /v1/audiences/{id}/contacts/{contactId}`. */
export const RemovedAudienceContactSchema = z.object({
  id: z.string(),
});

export type RemovedAudienceContact = z.infer<typeof RemovedAudienceContactSchema>;
