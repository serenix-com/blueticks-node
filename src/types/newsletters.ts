import { z } from "zod";

export const NewsletterVerificationSchema = z.enum(["VERIFIED", "UNVERIFIED"]);

export type NewsletterVerification = z.infer<typeof NewsletterVerificationSchema>;

/** Newsletter row as returned by `GET /v1/newsletters` (keyed by `chatId`). */
export const NewsletterListItemSchema = z.object({
  chatId: z.string(),
  name: z.string(),
  description: z.string().nullish(),
  createdAt: z.string().datetime({ offset: true }).nullish(),
  subscribers: z.number().int().nullish(),
  invite: z.string().nullish(),
  verification: NewsletterVerificationSchema.nullish(),
});

export type NewsletterListItem = z.infer<typeof NewsletterListItemSchema>;

/** Newsletter detail as returned by create / get (keyed by `newsletterId`). */
export const NewsletterSchema = z.object({
  newsletterId: z.string(),
  name: z.string(),
  description: z.string().nullish(),
  createdAt: z.string().datetime({ offset: true }).nullish(),
  subscribers: z.number().int().nullish(),
  invite: z.string().nullish(),
  verification: NewsletterVerificationSchema.nullish(),
});

export type Newsletter = z.infer<typeof NewsletterSchema>;
