import { z } from "zod";

export const PingConnectionSchema = z.object({
  id: z.string(),
  type: z.enum(["gateway", "regular"]),
  connected: z.literal(true),
});

export type PingConnection = z.infer<typeof PingConnectionSchema>;

export const PingSchema = z.object({
  api: z.literal("ok"),
  account_id: z.string(),
  whatsapp_connections: z.array(PingConnectionSchema),
  message: z.string().optional(),
});

export type Ping = z.infer<typeof PingSchema>;
