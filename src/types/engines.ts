import { z } from "zod";

export const EngineStatusSchema = z.object({
  connected: z.boolean(),
  state: z.string().nullable(),
  stream: z.string().nullable(),
  has_synced: z.boolean().nullable(),
});
export type EngineStatus = z.infer<typeof EngineStatusSchema>;

export const WhatsAppMeSchema = z.object({
  phone: z.string().nullable(),
  name: z.string().nullable(),
  platform: z.string().nullable(),
});
export type WhatsAppMe = z.infer<typeof WhatsAppMeSchema>;
