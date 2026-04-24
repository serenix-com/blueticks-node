import { z } from "zod";

export const ChatSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  is_group: z.boolean(),
  last_message_at: z.string().datetime({ offset: true }).nullable(),
  unread_count: z.number().int().nullable(),
});
export type Chat = z.infer<typeof ChatSchema>;

export const ParticipantSchema = z.object({
  chat_id: z.string(),
  is_admin: z.boolean(),
  is_super_admin: z.boolean().optional(),
});
export type Participant = z.infer<typeof ParticipantSchema>;

export const ChatMessageSchema = z.object({
  key: z.string(),
  chat_id: z.string(),
  from: z.string(),
  timestamp: z.string().datetime({ offset: true }).nullable(),
  text: z.string().nullable(),
  type: z.string(),
  from_me: z.boolean(),
  ack: z.number().int().nullable(),
  media_url: z.string().nullable(),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const ChatMediaSchema = z.object({
  url: z.string().nullable(),
  mimetype: z.string().nullable(),
  filename: z.string().nullable(),
  data_base64: z.string().nullable(),
});
export type ChatMedia = z.infer<typeof ChatMediaSchema>;
