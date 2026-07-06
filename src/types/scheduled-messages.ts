import { z } from "zod";

export const ScheduledMessageStatusSchema = z.enum([
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

export type ScheduledMessageStatus = z.infer<typeof ScheduledMessageStatusSchema>;

const LinkPreviewResponseSchema = z.object({
  title: z.string().nullable(),
  description: z.string().nullable(),
  canonicalUrl: z.string().nullable(),
  thumbnail: z.string().nullable(),
}).nullable();

export const ScheduledMessageSchema = z.object({
  id: z.string().nullable(),
  key: z.string().nullable(),
  to: z.string(),
  type: z.enum(["text", "media", "poll"]),
  text: z.string().nullable(),
  mediaUrl: z.string().nullable(),
  mediaKind: z
    .enum(["image", "video", "audio", "document", "sticker", "voice", "gif"])
    .nullable(),
  pollQuestion: z.string().nullable(),
  pollOptions: z.array(z.string()).nullable().optional(),
  pollAllowMultiple: z.boolean().nullable().optional(),
  status: ScheduledMessageStatusSchema,
  sendAt: z.string().datetime({ offset: true }).nullable(),
  createdAt: z.string().datetime({ offset: true }),
  confirmedAt: z.string().datetime({ offset: true }).nullable(),
  receivedAt: z.string().datetime({ offset: true }).nullable(),
  readAt: z.string().datetime({ offset: true }).nullable(),
  playedAt: z.string().datetime({ offset: true }).nullable(),
  failedAt: z.string().datetime({ offset: true }).nullable(),
  failureReason: z.string().nullable(),
  linkPreview: LinkPreviewResponseSchema.optional(),
});

export type ScheduledMessage = z.infer<typeof ScheduledMessageSchema>;
