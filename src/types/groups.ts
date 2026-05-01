import { z } from "zod";

export const GroupParticipantSchema = z.object({
  chat_id: z.string(),
  is_admin: z.boolean(),
  is_super_admin: z.boolean(),
  name: z.string().nullable(),
});
export type GroupParticipant = z.infer<typeof GroupParticipantSchema>;

export const GroupSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  description: z.string().nullable(),
  owner: z.string().nullable(),
  created_at: z.string().datetime({ offset: true }).nullable(),
  last_message_at: z.string().datetime({ offset: true }).nullable(),
  participant_count: z.number().int().nullable(),
  announce: z.boolean().nullable(),
  restrict: z.boolean().nullable(),
  participants: z.array(GroupParticipantSchema).nullable(),
});
export type Group = z.infer<typeof GroupSchema>;
