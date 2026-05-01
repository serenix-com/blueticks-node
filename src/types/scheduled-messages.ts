import { z } from "zod";

export const ScheduledMessageSchema = z.object({
  id: z.string(),
  to: z.string().nullable(),
  text: z.string().nullable(),
  media_url: z.string().nullable(),
  media_caption: z.string().nullable(),
  media_filename: z.string().nullable(),
  media_mime_type: z.string().nullable(),
  send_at: z.string().datetime({ offset: true }).nullable(),
  status: z.string().nullable(),
  is_recurring: z.boolean(),
  recurrence_rule: z.string().nullable(),
  created_at: z.string().datetime({ offset: true }).nullable(),
  updated_at: z.string().datetime({ offset: true }).nullable(),
});
export type ScheduledMessage = z.infer<typeof ScheduledMessageSchema>;
