import { z } from "zod";

/**
 * Signed upload link returned by `POST /v1/uploads`. PUT the raw file bytes to
 * `uploadUrl` with exactly `headers`, then pass `fileId` as `mediaFileId` on a send.
 */
export const UploadLinkSchema = z.object({
  /** Reference to the upload. Pass it as `mediaFileId` on a media send. */
  fileId: z.string(),
  /** Signed URL. PUT the raw file bytes to it with the headers in `headers`. */
  uploadUrl: z.string(),
  method: z.enum(["PUT"]),
  /** Headers the PUT must carry exactly (the URL is signed over them). */
  headers: z.record(z.string()),
  /** ISO timestamp after which `uploadUrl` no longer accepts the PUT (~15 minutes). */
  expiresAt: z.string(),
  /** ISO timestamp when the file is deleted if no message uses it (~24 hours). */
  deleteAt: z.string(),
  /** Largest file the URL accepts, in bytes. */
  maxBytes: z.number(),
  contentType: z.string(),
});

export type UploadLink = z.infer<typeof UploadLinkSchema>;
