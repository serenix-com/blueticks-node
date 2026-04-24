import { z } from "zod";

export const GroupSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  description: z.string().nullable(),
  owner: z.string().nullable(),
  created_at: z.string().datetime({ offset: true }).nullable(),
  participant_count: z.number().int().nullable(),
  announce: z.boolean().nullable(),
  restrict: z.boolean().nullable(),
});
export type Group = z.infer<typeof GroupSchema>;
