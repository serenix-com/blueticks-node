import { z } from "zod";

/**
 * Single newsletter returned by `GET /v1/newsletters/{id}` and
 * `POST /v1/newsletters`. Keyed by `newsletterId` (the newsletter JID).
 */
export const NewsletterSchema = z.object({
  newsletterId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  createdAt: z.string().datetime({ offset: true }).nullable(),
  subscribers: z.number().int().nullable(),
  invite: z.string().nullable(),
  verification: z.enum(["VERIFIED", "UNVERIFIED"]).nullable(),
});

export type Newsletter = z.infer<typeof NewsletterSchema>;

/**
 * A newsletter row in the `GET /v1/newsletters` paged list. Identical to
 * {@link NewsletterSchema} except rows are keyed by `chatId` (matching how
 * every other list endpoint — chats/contacts/groups — keys its rows).
 */
export const NewsletterListItemSchema = z.object({
  chatId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  createdAt: z.string().datetime({ offset: true }).nullable(),
  subscribers: z.number().int().nullable(),
  invite: z.string().nullable(),
  verification: z.enum(["VERIFIED", "UNVERIFIED"]).nullable(),
});

export type NewsletterListItem = z.infer<typeof NewsletterListItemSchema>;
