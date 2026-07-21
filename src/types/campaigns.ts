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
  cmpId: z.string(),
  name: z.string(),
  audienceId: z.string(),
  status: CampaignStatusSchema,
  totalCount: z.number().int(),
  sentCount: z.number().int(),
  deliveredCount: z.number().int(),
  readCount: z.number().int(),
  failedCount: z.number().int(),
  createdAt: z.string().datetime({ offset: true }),
  startedAt: z.string().datetime({ offset: true }).nullish(),
  completedAt: z.string().datetime({ offset: true }).nullish(),
  abortedAt: z.string().datetime({ offset: true }).nullish(),
});

export type Campaign = z.infer<typeof CampaignSchema>;
