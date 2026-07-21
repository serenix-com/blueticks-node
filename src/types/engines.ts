import { z } from "zod";

export const EngineSchema = z.object({
  id: z.string(),
  type: z.enum(["gateway", "regular"]),
  connected: z.boolean(),
  state: z.string().nullish(),
  stream: z.string().nullish(),
  hasSynced: z.boolean().nullish(),
});

export type Engine = z.infer<typeof EngineSchema>;
