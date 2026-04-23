import { z } from "zod";

export const PingSchema = z.object({
  account_id: z.string(),
  key_prefix: z.string(),
  scopes: z.array(z.string()),
});

export type Ping = z.infer<typeof PingSchema>;
