import { z } from "zod";

export const ChatTypeSchema = z.enum(["contact", "group", "newsletter"]);

export type ChatType = z.infer<typeof ChatTypeSchema>;

/**
 * A WhatsApp chat (conversation) — a 1:1 contact, a group, or a channel —
 * as seen by the connected engine.
 */
export const ChatSchema = z.object({
  chatId: z.string(),
  name: z.string().nullish(),
  chatType: ChatTypeSchema,
  pinned: z.boolean().nullish(),
  archived: z.boolean().nullish(),
  lastMessageAt: z.string().datetime({ offset: true }).nullish(),
  unreadCount: z.number().int().nullish(),
  markedUnread: z.boolean(),
  lastMessageText: z.string().nullish(),
  lastMessageFromMe: z.boolean().nullish(),
});

export type Chat = z.infer<typeof ChatSchema>;

/** One member of a WhatsApp group, with their admin standing. */
export const ParticipantSchema = z.object({
  chatId: z.string(),
  name: z.string().nullish(),
  isAdmin: z.boolean(),
  isSuperAdmin: z.boolean().nullish(),
});

export type Participant = z.infer<typeof ParticipantSchema>;

/** `{ ok: true }` envelope returned by chat side-effect endpoints. */
export const ChatMutationResultSchema = z.object({
  ok: z.literal(true),
});

export type ChatMutationResult = z.infer<typeof ChatMutationResultSchema>;
