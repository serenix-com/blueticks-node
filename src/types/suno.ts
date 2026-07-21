import { z } from "zod";

export const SongClipStatusSchema = z.enum([
  "submitted",
  "queued",
  "running",
  "streaming",
  "complete",
  "error",
]);

export type SongClipStatus = z.infer<typeof SongClipStatusSchema>;

/** A single generated Suno clip. */
export const SongClipSchema = z.object({
  id: z.string(),
  status: SongClipStatusSchema,
  audioUrl: z.string().nullish(),
  imageUrl: z.string().nullish(),
  title: z.string().nullish(),
  durationSec: z.number().nullish(),
  model: z.string().nullish(),
  errorType: z.string().nullish(),
  errorMessage: z.string().nullish(),
});

export type SongClip = z.infer<typeof SongClipSchema>;

/** Response of `POST /v1/suno/songs`. */
export const GenerateSongResponseSchema = z.object({
  jobId: z.string(),
  clips: z.array(SongClipSchema),
});

export type GenerateSongResponse = z.infer<typeof GenerateSongResponseSchema>;

/** Response of `POST /v1/suno/uploads`. */
export const CreateUploadResponseSchema = z.object({
  uploadId: z.string(),
  status: z.string(),
});

export type CreateUploadResponse = z.infer<typeof CreateUploadResponseSchema>;

/** Response of `GET /v1/suno/account`. */
export const SunoAccountSchema = z.object({
  creditsLeft: z.number(),
  monthlyLimit: z.number().nullish(),
  monthlyUsage: z.number().nullish(),
  plan: z.string().nullish(),
});

export type SunoAccount = z.infer<typeof SunoAccountSchema>;
