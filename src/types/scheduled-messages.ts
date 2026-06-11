import { z } from "zod";

export const ScheduledMessageStatusSchema = z.enum([
  "scheduled",
  "queued",
  "sending",
  "delivered",
  "read",
  "failed",
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
  status: ScheduledMessageStatusSchema,
  sendAt: z.string().datetime({ offset: true }).nullable(),
  createdAt: z.string().datetime({ offset: true }),
  sentAt: z.string().datetime({ offset: true }).nullable(),
  deliveredAt: z.string().datetime({ offset: true }).nullable(),
  readAt: z.string().datetime({ offset: true }).nullable(),
  failedAt: z.string().datetime({ offset: true }).nullable(),
  failureReason: z.string().nullable(),
  linkPreview: LinkPreviewResponseSchema.optional(),
});

export type ScheduledMessage = z.infer<typeof ScheduledMessageSchema>;
