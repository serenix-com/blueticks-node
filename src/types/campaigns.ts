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
  total_count: z.number(),
  sent_count: z.number(),
  delivered_count: z.number(),
  read_count: z.number(),
  failed_count: z.number(),
  from: z.string().nullable(),
  created_at: z.string(),
  started_at: z.string().nullable(),
  completed_at: z.string().nullable(),
  aborted_at: z.string().nullable(),
});

export type Campaign = z.infer<typeof CampaignSchema>;
