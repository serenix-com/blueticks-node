import { z } from "zod";

export const WebhookStatusSchema = z.enum(["enabled", "disabled"]);

export type WebhookStatus = z.infer<typeof WebhookStatusSchema>;

export const WebhookEventTypeSchema = z.enum([
  "message.queued",
  "message.sending",
  "message.delivered",
  "message.failed",
  "message.read",
  "session.connected",
  "session.disconnected",
  "campaign.started",
  "campaign.paused",
  "campaign.resumed",
  "campaign.completed",
  "campaign.aborted",
]);

export type WebhookEventType = z.infer<typeof WebhookEventTypeSchema>;

export const WebhookSchema = z.object({
  id: z.string(),
  url: z.string(),
  events: z.array(z.string()),
  description: z.string().nullable(),
  status: WebhookStatusSchema,
  created_at: z.string().datetime({ offset: true }),
});

export type Webhook = z.infer<typeof WebhookSchema>;

export const WebhookCreateResultSchema = WebhookSchema.extend({
  secret: z.string(),
});

export type WebhookCreateResult = z.infer<typeof WebhookCreateResultSchema>;

export const WebhookEventSchema = z.object({
  id: z.string(),
  type: z.string(),
  created_at: z.string(),
  data: z.record(z.unknown()),
});

export type WebhookEvent = z.infer<typeof WebhookEventSchema>;
