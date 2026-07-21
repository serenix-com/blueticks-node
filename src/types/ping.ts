import { z } from "zod";

export const PingConnectionSchema = z.object({
  id: z.string(),
  type: z.enum(["gateway", "regular"]),
  connected: z.literal(true),
});

export type PingConnection = z.infer<typeof PingConnectionSchema>;

export const PingSchema = z.object({
  api: z.literal("ok"),
  accountId: z.string(),
  whatsappConnections: z.array(PingConnectionSchema),
  message: z.string().nullish(),
});

export type Ping = z.infer<typeof PingSchema>;
