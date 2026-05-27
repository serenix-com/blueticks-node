import { z } from "zod";

export const MessageStatusSchema = z.enum([
  "scheduled",
  "queued",
  "sending",
  "delivered",
  "read",
  "failed",
]);

export type MessageStatus = z.infer<typeof MessageStatusSchema>;

const LinkPreviewResponseSchema = z.object({
  title: z.string().nullable(),
  description: z.string().nullable(),
  canonical_url: z.string().nullable(),
  thumbnail: z.string().nullable(),
}).nullable();

export const MessageSchema = z.object({
  id: z.string(),
  key: z.string().nullable(),
  to: z.string(),
  from: z.string().nullable(),
  type: z.enum(["text", "media", "poll"]),
  text: z.string().nullable(),
  media_url: z.string().nullable(),
  media_kind: z
    .enum(["image", "video", "audio", "document", "sticker", "voice", "gif"])
    .nullable(),
  poll_question: z.string().nullable(),
  status: MessageStatusSchema,
  send_at: z.string().datetime({ offset: true }).nullable(),
  created_at: z.string().datetime({ offset: true }),
  sent_at: z.string().datetime({ offset: true }).nullable(),
  delivered_at: z.string().datetime({ offset: true }).nullable(),
  read_at: z.string().datetime({ offset: true }).nullable(),
  failed_at: z.string().datetime({ offset: true }).nullable(),
  failure_reason: z.string().nullable(),
  link_preview: LinkPreviewResponseSchema.optional(),
});

export type Message = z.infer<typeof MessageSchema>;
