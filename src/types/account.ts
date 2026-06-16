import { z } from "zod";

export const AccountSchema = z.object({
  id: z.string(),
  name: z.string(),
  timezone: z.string().nullable(),
  createdAt: z.string().datetime({ offset: true }),
});

export type Account = z.infer<typeof AccountSchema>;
