import { z } from "zod";

export const EngineStatusSchema = z.object({
  connected: z.boolean(),
  state: z.string().nullable(),
  stream: z.string().nullable(),
  hasSynced: z.boolean().nullable(),
});
export type EngineStatus = z.infer<typeof EngineStatusSchema>;
