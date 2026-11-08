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

export const RecurrenceFrequencySchema = z.enum(["daily", "weekly", "monthly", "yearly"]);

export type RecurrenceFrequency = z.infer<typeof RecurrenceFrequencySchema>;

export const WeekdaySchema = z.enum(["MO", "TU", "WE", "TH", "FR", "SA", "SU"]);

export type Weekday = z.infer<typeof WeekdaySchema>;

/** The repeat rule of a recurring scheduled message (absent for one-time messages). */
export const RecurrenceSchema = z.object({
  frequency: RecurrenceFrequencySchema,
  interval: z.number().int(),
  byWeekday: z.array(WeekdaySchema).nullish(),
  endsAfter: z.number().int().nullish(),
  endsOn: z.string().datetime({ offset: true }).nullish(),
  timezone: z.string().nullish(),
});

export type Recurrence = z.infer<typeof RecurrenceSchema>;

/** Outcome of the native WhatsApp Business label assignment requested with a send. */
export const WaLabelsStatusSchema = z.object({
  /** Number of label ids requested. */
  requested: z.number().int(),
  /** Whether WhatsApp accepted the label change. */
  applied: z.boolean(),
  /** Reason the labels were not applied (e.g. `wa_business_required`), else null. */
  error: z.string().nullish(),
});

export type WaLabelsStatus = z.infer<typeof WaLabelsStatusSchema>;

/** Non-fatal advisory attached to a message (e.g. it was queued with no engine online). */
export const MessageWarningSchema = z.object({
  code: z.enum(["no_engine_connected"]),
  message: z.string(),
});

export type MessageWarning = z.infer<typeof MessageWarningSchema>;

/** Reply to an interactive menu (button press or list row selection). */
export interface ButtonReplyParams {
  /** The menu being answered: its message key (`waMessageKey`). */
  replyTo: string;
  /** The id of the menu button to press. Exactly one of `buttonId` / `rowId`. */
  buttonId?: string;
  /** The id of the list row to select. Exactly one of `buttonId` / `rowId`. */
  rowId?: string;
  /** Ignored by the server: the reply text is always taken from the menu itself. */
  buttonTitle?: string;
}

/** Repeat rule accepted when scheduling a recurring message. */
export interface RecurrenceParams {
  frequency: RecurrenceFrequency;
  /** Repeat every N frequency units (1-365, default 1). */
  interval?: number;
  /** Weekdays to send on; only with `frequency: "weekly"`. */
  byWeekday?: Weekday[];
  /** Stop after this many sends (1-366). Exactly one of `endsAfter` / `endsOn` is required. */
  endsAfter?: number;
  /** Stop after this instant (ISO 8601 with offset). Exactly one of `endsAfter` / `endsOn` is required. */
  endsOn?: string;
  /** IANA zone the schedule repeats in. */
  timezone?: string;
}

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
  /** The recipient's display name, or null when the message carries no name. */
  recipientName: z.string().nullish(),
  recurrence: RecurrenceSchema.nullish(),
  waLabels: WaLabelsStatusSchema.nullish(),
  warning: MessageWarningSchema.nullish(),
});

export type MessageResponse = z.infer<typeof MessageResponseSchema>;
