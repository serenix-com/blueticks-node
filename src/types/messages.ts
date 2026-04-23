import { z } from "zod";

export const MessageStatusSchema = z.enum([
  "scheduled",
  "queued",
  "sending",
  "delivered",
  "failed",
]);

export type MessageStatus = z.infer<typeof MessageStatusSchema>;

export const MessageSchema = z.object({
  id: z.string(),
  to: z.string(),
  from: z.string().nullable(),
  text: z.string().nullable(),
  media_url: z.string().nullable(),
  status: MessageStatusSchema,
  send_at: z.string().nullable(),
  created_at: z.string(),
  sent_at: z.string().nullable(),
  delivered_at: z.string().nullable(),
  read_at: z.string().nullable(),
  failed_at: z.string().nullable(),
  failure_reason: z.string().nullable(),
});

export type Message = z.infer<typeof MessageSchema>;
