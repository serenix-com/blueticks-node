import { z } from "zod";
import { WaMessageKeySchema, LinkPreviewSchema } from "./scheduled-messages";

/** Generic `{ ok: true }` envelope returned by message side-effect endpoints. */
export const OkResultSchema = z.object({
  ok: z.literal(true),
});

export type OkResult = z.infer<typeof OkResultSchema>;

/** Message kinds accepted by the `messageTypes` filter on `GET /v1/messages`. */
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

/** A message quoted (replied-to) by another message. */
export const PublicQuotedMessageSchema = z.object({
  waMessageKey: WaMessageKeySchema,
  text: z.string().nullish(),
  type: z.string().nullish(),
  author: z.string().nullish(),
});

export type PublicQuotedMessage = z.infer<typeof PublicQuotedMessageSchema>;

/** A WhatsApp message as read back from the engine store. */
export const PublicMessageSchema = z.object({
  waMessageKey: WaMessageKeySchema,
  chatId: z.string(),
  from: z.string(),
  author: z.string().nullish(),
  senderName: z.string().nullish(),
  timestamp: z.string().datetime({ offset: true }).nullish(),
  text: z.string().nullish(),
  type: z.string(),
  fromMe: z.boolean(),
  ack: z.number().int().nullish(),
  mediaUrl: z.string().nullish(),
  filename: z.string().nullish(),
  linkPreview: LinkPreviewSchema.nullish(),
  quotedMessage: PublicQuotedMessageSchema.nullish(),
});

export type PublicMessage = z.infer<typeof PublicMessageSchema>;

/**
 * Response of `GET /v1/messages/ack/{waMessageKey}`. WhatsApp ack value:
 * -1=error, 0=pending, 1=server, 2=device, 3=read, 4=played; absent when no
 * engine response.
 */
export const MessageAckSchema = z.object({
  ack: z.number().int().nullish(),
});

export type MessageAck = z.infer<typeof MessageAckSchema>;

/** Single entry in a `POST /v1/messages/acks` response. */
export const BatchMessageAckEntrySchema = z.object({
  key: z.string(),
  ack: z.number().int().nullish(),
  found: z.boolean(),
});

export type BatchMessageAckEntry = z.infer<typeof BatchMessageAckEntrySchema>;

export const MediaUnavailableReasonSchema = z.enum([
  "expired",
  "fetching",
  "awaiting_sender",
  "error",
  "no_media",
]);

export type MediaUnavailableReason = z.infer<typeof MediaUnavailableReasonSchema>;

/** Response of `GET /v1/messages/media/{waMessageKey}`. */
export const MediaSchema = z.object({
  url: z.string().nullish(),
  mimetype: z.string().nullish(),
  filename: z.string().nullish(),
  dataBase64: z.string().nullish(),
  // false when the bytes are a WA-generated preview JPEG rather than the
  // original (#113 — own-sent newsletter media). Absent/true when genuine.
  originalQuality: z.boolean().nullish(),
  // Reason the bytes could not be downloaded. Absent on success.
  mediaUnavailable: MediaUnavailableReasonSchema.nullish(),
});

export type Media = z.infer<typeof MediaSchema>;

/** Response of `POST /v1/messages/load_older/{chatId}`. */
export const LoadOlderResultSchema = z.object({
  totalMessages: z.number().int().nullish(),
  added: z.number().int().nullish(),
  canLoadMore: z.boolean(),
  historyUnavailable: z.boolean(),
  error: z.string().nullish(),
});

export type LoadOlderResult = z.infer<typeof LoadOlderResultSchema>;

/** A pinned message row from `GET /v1/messages/pinned/{chatId}`. */
export const PinnedMessageSchema = z.object({
  key: z.string(),
  chatId: z.string(),
  text: z.string().nullish(),
});

export type PinnedMessage = z.infer<typeof PinnedMessageSchema>;
