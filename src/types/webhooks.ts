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
  "new_message_received_webhook",
  "new_message_received_from_me_webhook",
  "message_reaction_webhook",
  "ack_changed_webhook",
  "participant_joined_via_link_webhook",
  "participant_added_by_admin_webhook",
  "participant_left_group_webhook",
  "participant_kicked_from_group_webhook",
  "group_admin_changed_webhook",
  "group_name_changed_webhook",
  "group_description_changed_webhook",
  "group_message_pinned_webhook",
  "poll_vote_webhook",
  "reply_to_my_message_webhook",
  "message_deleted_revoked_webhook",
  "message_edited_webhook",
]);

export type WebhookEventType = z.infer<typeof WebhookEventTypeSchema>;

export const WebhookSchema = z.object({
  id: z.string(),
  url: z.string(),
  events: z.array(z.string()),
  description: z.string().nullish(),
  status: WebhookStatusSchema,
  createdAt: z.string().datetime({ offset: true }),
  /** HMAC signing secret for verifying deliveries. */
  signingSecret: z.string().nullish(),
});

export type Webhook = z.infer<typeof WebhookSchema>;

/**
 * The JSON body POSTed to your webhook endpoint. Not an API response type, and
 * unlike API responses its keys are the raw wire names (`created_at`).
 */
export const WebhookEventSchema = z.object({
  id: z.string(),
  type: z.string(),
  created_at: z.string(),
  data: z.record(z.unknown()),
});

export type WebhookEvent = z.infer<typeof WebhookEventSchema>;
