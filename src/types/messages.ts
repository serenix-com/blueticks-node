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
  /** Where the message was read from: the live store (`vault`) or a backup. */
  source: z.enum(["vault", "backup"]).nullish(),
  /**
   * Correlation token the sender attached at send time (the `secret` given on
   * send). Present only on messages sent through this API.
   */
  secret: z.string().nullish(),
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

/**
 * How far back a chat is now loaded. `oldestLoadedIso` is the deterministic
 * answer to "have I reached far enough back?".
 */
export const LoadCoverageSchema = z.object({
  /** Epoch MILLISECONDS of the oldest currently-loaded message; omitted when unknown. */
  oldestLoadedTimestamp: z.number().nullish(),
  /** ISO 8601 form of `oldestLoadedTimestamp`. */
  oldestLoadedIso: z.string().nullish(),
});

export type LoadCoverage = z.infer<typeof LoadCoverageSchema>;

/** Response of `POST /v1/messages/load_older/{chatId}`. */
export const LoadOlderResultSchema = z.object({
  totalMessages: z.number().int().nullish(),
  /** Total messages added across the pages this call executed (sum). */
  added: z.number().int().nullish(),
  /** From the LAST executed page: true = more history may still be pulled. */
  canLoadMore: z.boolean(),
  historyUnavailable: z.boolean(),
  /** First fatal error across the executed pages; null when the pull succeeded. */
  error: z.string().nullish(),
  /** How many older pages this call actually pulled (1..pages). */
  pagesExecuted: z.number().int().nullish(),
  /** How far back the chat is now loaded. */
  coverage: LoadCoverageSchema.nullish(),
});

export type LoadOlderResult = z.infer<typeof LoadOlderResultSchema>;

/** A pinned message row from `GET /v1/messages/pinned/{chatId}`. */
export const PinnedMessageSchema = z.object({
  key: z.string(),
  chatId: z.string(),
  text: z.string().nullish(),
});

export type PinnedMessage = z.infer<typeof PinnedMessageSchema>;
