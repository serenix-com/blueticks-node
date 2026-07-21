import { z } from "zod";

export const GroupParticipantSchema = z.object({
  chatId: z.string(),
  isAdmin: z.boolean(),
  isSuperAdmin: z.boolean(),
  name: z.string().nullish(),
});

export type GroupParticipant = z.infer<typeof GroupParticipantSchema>;

/** Full group detail, as returned by create / get / update / member ops. */
export const GroupSchema = z.object({
  id: z.string(),
  name: z.string().nullish(),
  description: z.string().nullish(),
  owner: z.string().nullish(),
  createdAt: z.string().datetime({ offset: true }).nullish(),
  lastMessageAt: z.string().datetime({ offset: true }).nullish(),
  participantCount: z.number().int().nullish(),
  announce: z.boolean().nullish(),
  restrict: z.boolean().nullish(),
  participants: z.array(GroupParticipantSchema).nullish(),
});

export type Group = z.infer<typeof GroupSchema>;

/** Condensed group row, as returned by `GET /v1/groups` and `GET /v1/contacts/{id}/common_groups`. */
export const GroupListItemSchema = z.object({
  id: z.string(),
  name: z.string().nullish(),
  description: z.string().nullish(),
  owner: z.string().nullish(),
  createdAt: z.string().datetime({ offset: true }).nullish(),
  lastMessageAt: z.string().datetime({ offset: true }).nullish(),
  participantCount: z.number().int().nullish(),
  restrict: z.boolean().nullish(),
});

export type GroupListItem = z.infer<typeof GroupListItemSchema>;
