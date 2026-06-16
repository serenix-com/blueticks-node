import { z } from "zod";

export const GroupParticipantSchema = z.object({
  chatId: z.string(),
  isAdmin: z.boolean(),
  isSuperAdmin: z.boolean(),
  name: z.string().nullable(),
});
export type GroupParticipant = z.infer<typeof GroupParticipantSchema>;

export const GroupSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  description: z.string().nullable(),
  owner: z.string().nullable(),
  createdAt: z.string().datetime({ offset: true }).nullable(),
  lastMessageAt: z.string().datetime({ offset: true }).nullable(),
  participantCount: z.number().int().nullable(),
  announce: z.boolean().nullable(),
  restrict: z.boolean().nullable(),
  participants: z.array(GroupParticipantSchema).nullable(),
});
export type Group = z.infer<typeof GroupSchema>;
