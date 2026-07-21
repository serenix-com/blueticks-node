import { z } from "zod";

/** WhatsApp message key attached to a sent/queued message. */
export const WaMessageKeySchema = z.object({
  fromMe: z.boolean(),
  remote: z.string().nullish(),
  id: z.string().nullish(),
  _serialized: z.string().nullish(),
  participant: z.string().nullish(),
});

export type WaMessageKey = z.infer<typeof WaMessageKeySchema>;

/** Rich link-preview card attached to a message. */
export const LinkPreviewSchema = z.object({
  title: z.string().nullish(),
  description: z.string().nullish(),
  canonicalUrl: z.string().nullish(),
  thumbnail: z.string().nullish(),
});

export type LinkPreview = z.infer<typeof LinkPreviewSchema>;

export const MessageKindSchema = z.enum(["text", "media", "poll"]);

export type MessageKind = z.infer<typeof MessageKindSchema>;

export const MediaKindSchema = z.enum([
  "image",
  "video",
  "audio",
  "document",
  "sticker",
  "voice",
  "gif",
]);

export type MediaKind = z.infer<typeof MediaKindSchema>;

export const MessageStatusSchema = z.enum([
  "pending",
  "before-wa-send",
  "bt-sent",
  "sending",
  "sent",
  "sent_pending_ack",
  "confirmed",
  "delivered",
  "received",
  "read",
  "played",
  "cancelled",
  "error",
  "failed",
  "expired",
]);

export type MessageStatus = z.infer<typeof MessageStatusSchema>;

/**
 * A sent or scheduled message, as returned by the Scheduled Messages
 * endpoints and by `POST /v1/messages/{chatId}` (direct send).
 */
export const MessageResponseSchema = z.object({
  id: z.string().nullish(),
  waMessageKey: WaMessageKeySchema.nullish(),
  to: z.string(),
  type: MessageKindSchema,
  text: z.string().nullish(),
  mediaUrl: z.string().nullish(),
  mediaKind: MediaKindSchema.nullish(),
  pollQuestion: z.string().nullish(),
  pollOptions: z.array(z.string()).nullish(),
  pollAllowMultiple: z.boolean().nullish(),
  status: MessageStatusSchema,
  sendAt: z.string().datetime({ offset: true }).nullish(),
  createdAt: z.string().datetime({ offset: true }),
  confirmedAt: z.string().datetime({ offset: true }).nullish(),
  receivedAt: z.string().datetime({ offset: true }).nullish(),
  readAt: z.string().datetime({ offset: true }).nullish(),
  playedAt: z.string().datetime({ offset: true }).nullish(),
  failedAt: z.string().datetime({ offset: true }).nullish(),
  failureReason: z.string().nullish(),
  secret: z.string().nullish(),
  linkPreview: LinkPreviewSchema.nullish(),
});

export type MessageResponse = z.infer<typeof MessageResponseSchema>;
