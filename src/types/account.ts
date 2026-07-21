import { z } from "zod";

export const AccountSchema = z.object({
  id: z.string(),
  name: z.string(),
  userEmail: z.string().nullish(),
  timezone: z.string().nullish(),
  createdAt: z.string().datetime({ offset: true }),
});

export type Account = z.infer<typeof AccountSchema>;
