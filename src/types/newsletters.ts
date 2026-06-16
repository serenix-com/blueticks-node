import { z } from "zod";

export const NewsletterSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  owner: z.string().nullable(),
  createdAt: z.string().datetime({ offset: true }).nullable(),
  subscribers: z.number().int().nullable(),
  invite: z.string().nullable(),
  verification: z.enum(["VERIFIED", "UNVERIFIED"]).nullable(),
});

export type Newsletter = z.infer<typeof NewsletterSchema>;
