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

/**
 * Cursor-paginated participant list returned by
 * `GET /v1/chats/{chat_id}/participants`. For DMs the list contains a single
 * counterparty; for group chats it is a paginated slice of members.
 */
export const ParticipantListSchema = z.object({
  data: z.array(ParticipantSchema),
  has_more: z.boolean(),
  next_cursor: z.string().nullable(),
});
export type ParticipantList = z.infer<typeof ParticipantListSchema>;

/** Generic `{ ok: true }` envelope returned by side-effect endpoints. */
export const OkResponseSchema = z.object({
  ok: z.literal(true),
});
export type OkResponse = z.infer<typeof OkResponseSchema>;

/** `{ chat_id }` envelope returned by `POST /v1/chats/{chat_id}/open`. */
export const ChatRefSchema = z.object({
  chat_id: z.string(),
});
export type ChatRef = z.infer<typeof ChatRefSchema>;

/**
 * Response of `GET /v1/chats/{chat_id}/messages/{key}/ack`. WhatsApp ack
 * value: -1=error, 0=pending, 1=server, 2=device, 3=read, 4=played; null
 * when no engine response.
 */
export const MessageAckSchema = z.object({
  ack: z.number().int().nullable(),
});
export type MessageAck = z.infer<typeof MessageAckSchema>;

/** Response of `POST /v1/chats/{chat_id}/messages/load_older`. */
export const LoadOlderMessagesResponseSchema = z.object({
  total_messages: z.number().int().nullable(),
  added: z.number().int().nullable(),
  can_load_more: z.boolean(),
});
export type LoadOlderMessagesResponse = z.infer<typeof LoadOlderMessagesResponseSchema>;

/** Response of `GET /v1/chats/{chat_id}/messages/{key}/media_url`. */
export const MediaUrlResponseSchema = z.object({
  url: z.string().nullable(),
});
export type MediaUrlResponse = z.infer<typeof MediaUrlResponseSchema>;

/**
 * Single entry in a `POST /v1/chats/message_acks` response. WhatsApp ack
 * value: -1=error, 0=pending, 1=server, 2=device, 3=read, 4=played; null
 * when no engine response.
 */
export const BatchMessageAckEntrySchema = z.object({
  key: z.string(),
  ack: z.number().int().nullable(),
});
export type BatchMessageAckEntry = z.infer<typeof BatchMessageAckEntrySchema>;

/** Response of `POST /v1/chats/message_acks`. */
export const BatchMessageAcksResponseSchema = z.object({
  data: z.array(BatchMessageAckEntrySchema),
});
export type BatchMessageAcksResponse = z.infer<typeof BatchMessageAcksResponseSchema>;

export const MessageTypeSchema = z.enum([
  "chat",
  "image",
  "video",
  "document",
  "audio",
  "ptt",
  "sticker",
  "gif",
  "ptv",
  "poll_creation",
  "location",
  "vcard",
  "revoked",
]);
export type MessageType = z.infer<typeof MessageTypeSchema>;

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
  caption: z.string().nullable(),
  filename: z.string().nullable(),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const MediaUnavailableReasonSchema = z.enum([
  "expired",
  "fetching",
  "awaiting_sender",
  "error",
  "no_media",
]);
export type MediaUnavailableReason = z.infer<typeof MediaUnavailableReasonSchema>;

export const ChatMediaSchema = z.object({
  url: z.string().nullable(),
  mimetype: z.string().nullable(),
  filename: z.string().nullable(),
  data_base64: z.string().nullable(),
  // false when WA returned a preview JPEG instead of the original (#113 —
  // own-sent newsletter media). null/absent when bytes are the genuine
  // original from the sender.
  original_quality: z.boolean().nullable(),
  // Reason the bytes couldn't be retrieved. null/absent on success.
  media_unavailable: MediaUnavailableReasonSchema.nullable(),
});
export type ChatMedia = z.infer<typeof ChatMediaSchema>;
