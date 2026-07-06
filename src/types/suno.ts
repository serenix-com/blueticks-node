import { z } from "zod";

export const SunoClipStatusSchema = z.enum([
  "submitted",
  "queued",
  "running",
  "streaming",
  "complete",
  "error",
]);
export type SunoClipStatus = z.infer<typeof SunoClipStatusSchema>;

/**
 * A single generated song variant. Poll it by id with
 * `GET /v1/suno/songs/{id}` until `status` is `complete` (or `error`).
 */
export const SunoClipSchema = z.object({
  id: z.string(),
  status: SunoClipStatusSchema,
  audioUrl: z.string().nullable(),
  imageUrl: z.string().nullable(),
  title: z.string().nullable(),
  durationSec: z.number().nullable(),
  model: z.string().nullable(),
  errorType: z.string().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
});
export type SunoClip = z.infer<typeof SunoClipSchema>;

/** Result of submitting a generation — a batch id plus its clip variants. */
export const SunoGenerationSchema = z.object({
  jobId: z.string(),
  clips: z.array(SunoClipSchema),
});
export type SunoGeneration = z.infer<typeof SunoGenerationSchema>;

/** Result of uploading reference audio. */
export const SunoUploadSchema = z.object({
  uploadId: z.string(),
  status: z.string(),
});
export type SunoUpload = z.infer<typeof SunoUploadSchema>;

/** Credits, monthly usage, and plan on the connected Suno account. */
export const SunoAccountSchema = z.object({
  creditsLeft: z.number(),
  monthlyLimit: z.number().nullable(),
  monthlyUsage: z.number().nullable(),
  plan: z.string().nullable(),
});
export type SunoAccount = z.infer<typeof SunoAccountSchema>;
