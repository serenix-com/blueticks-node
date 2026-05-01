import { z } from "zod";

export const CampaignStatusSchema = z.enum([
  "pending",
  "running",
  "paused",
  "complete_sent",
  "complete_delivered",
  "aborted",
]);

export type CampaignStatus = z.infer<typeof CampaignStatusSchema>;

export const CampaignSchema = z.object({
  id: z.string(),
  name: z.string(),
  audience_id: z.string(),
  status: CampaignStatusSchema,
  total_count: z.number().int(),
  sent_count: z.number().int(),
  delivered_count: z.number().int(),
  read_count: z.number().int(),
  failed_count: z.number().int(),
  from: z.string().nullable(),
  created_at: z.string().datetime({ offset: true }),
  started_at: z.string().datetime({ offset: true }).nullable(),
  completed_at: z.string().datetime({ offset: true }).nullable(),
  aborted_at: z.string().datetime({ offset: true }).nullable(),
});

export type Campaign = z.infer<typeof CampaignSchema>;
