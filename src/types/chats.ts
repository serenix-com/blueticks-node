import { z } from "zod";

export const ChatSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  isGroup: z.boolean(),
  isNewsletter: z.boolean(),
  lastMessageAt: z.string().datetime({ offset: true }).nullable(),
  unreadCount: z.number().int().nullable(),
  markedUnread: z.boolean(),
});
export type Chat = z.infer<typeof ChatSchema>;

export const ParticipantSchema = z.object({
  chatId: z.string(),
  name: z.string().nullable().optional(),
  isAdmin: z.boolean(),
  isSuperAdmin: z.boolean().optional(),
});
export type Participant = z.infer<typeof ParticipantSchema>;

/**
 * Cursor-paginated participant list returned by
 * `GET /v1/chats/{chatId}/participants`. For DMs the list contains a single
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

/** `{ chatId }` envelope returned by `POST /v1/chats/{chatId}/open`. */
export const ChatRefSchema = z.object({
  chatId: z.string(),
});
export type ChatRef = z.infer<typeof ChatRefSchema>;

/**
 * Response of `GET /v1/messages/ack/{waMessageKey}`. WhatsApp ack
 * value: -1=error, 0=pending, 1=server, 2=device, 3=read, 4=played; null
 * when no engine response.
 */
export const MessageAckSchema = z.object({
  ack: z.number().int().nullable(),
});
export type MessageAck = z.infer<typeof MessageAckSchema>;

/** Response of `POST /v1/messages/load_older/{chatId}`. */
export const LoadOlderMessagesResponseSchema = z.object({
  totalMessages: z.number().int().nullable(),
  added: z.number().int().nullable(),
  canLoadMore: z.boolean(),
});
export type LoadOlderMessagesResponse = z.infer<typeof LoadOlderMessagesResponseSchema>;

/**
 * Single entry in a `POST /v1/messages/acks` response. WhatsApp ack
 * value: -1=error, 0=pending, 1=server, 2=device, 3=read, 4=played; null
 * when no engine response.
 */
export const BatchMessageAckEntrySchema = z.object({
  key: z.string(),
  ack: z.number().int().nullable(),
});
export type BatchMessageAckEntry = z.infer<typeof BatchMessageAckEntrySchema>;

/** Response of `POST /v1/messages/acks`. */
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
  chatId: z.string(),
  from: z.string(),
  timestamp: z.string().datetime({ offset: true }).nullable(),
  text: z.string().nullable(),
  type: z.string(),
  fromMe: z.boolean(),
  ack: z.number().int().nullable(),
  mediaUrl: z.string().nullable(),
  caption: z.string().nullable(),
  filename: z.string().nullable(),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

/**
 * Single entry in a `GET /v1/messages/pinned/{chatId}` response — a currently
 * pinned message in the chat.
 */
export const PinnedMessageSchema = z.object({
  key: z.string(),
  chatId: z.string(),
  text: z.string().nullable(),
});
export type PinnedMessage = z.infer<typeof PinnedMessageSchema>;

export const MediaUnavailableReasonSchema = z.enum([
  "expired",
  "fetching",
  "awaiting_sender",
  "error",
  "no_media",
]);
export type MediaUnavailableReason = z.infer<typeof MediaUnavailableReasonSchema>;

/**
 * Flat body for `POST /v1/messages/{chatId}`. Same shape as
 * `SendMessageRequest` (scheduled-messages) minus `to` (taken from the URL
 * path) and `sendAt` (this endpoint is fire-and-forget). `type` is a
 * required validation-only discriminator (`text` | `media` | `poll`); the
 * media/poll fields are flat (e.g. `mediaUrl`, `pollOptions`) and `text`
 * doubles as the media caption.
 */
export interface SendInChatRequest {
  /** Validation discriminator: which family of fields is required. */
  type: "text" | "media" | "poll";
  /** Text body (type=text) or media caption (type=media). 1–4096 chars. */
  text?: string;
  /** Media source URL (https only). Exactly one of mediaUrl / mediaBase64 for media sends. */
  mediaUrl?: string;
  /** Raw media bytes, base64-encoded. Alternative to `mediaUrl`. */
  mediaBase64?: string;
  /** Media kind. Optional — falls back to engine auto-detection. */
  mediaKind?: "image" | "video" | "audio" | "document" | "sticker" | "voice" | "gif";
  /** Filename to attach to the media (type=media). */
  mediaFilename?: string;
  /** Poll question (type=poll). Required for poll sends. */
  pollQuestion?: string;
  /** Poll options (type=poll). 2–12 items. */
  pollOptions?: string[];
  /** Allow selecting multiple poll options (type=poll). Default false. */
  pollAllowMultiple?: boolean;
  /** Wire `key` of a prior message to quote-reply (from MessageResponse.key). */
  replyTo?: string;
  /** JIDs to mention. `displays` is the rendered name list. */
  mentions?: {
    ids: string[];
    displays?: string[];
  };
}

export const ChatMediaSchema = z.object({
  url: z.string().nullable(),
  mimetype: z.string().nullable(),
  filename: z.string().nullable(),
  dataBase64: z.string().nullable(),
  // false when WA returned a preview JPEG instead of the original (#113 —
  // own-sent newsletter media). null/absent when bytes are the genuine
  // original from the sender.
  originalQuality: z.boolean().nullable(),
  // Reason the bytes couldn't be retrieved. null/absent on success.
  mediaUnavailable: MediaUnavailableReasonSchema.nullable(),
});
export type ChatMedia = z.infer<typeof ChatMediaSchema>;
