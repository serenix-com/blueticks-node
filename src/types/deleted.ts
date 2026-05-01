import { z } from "zod";

/**
 * Standard envelope returned by `DELETE /v1/{resource}/{id}` endpoints
 * (audiences, scheduled-messages, webhooks). Confirms the deletion and
 * echoes back the resource id.
 */
export const DeletedResourceSchema = z.object({
  id: z.string(),
  deleted: z.literal(true),
});

export type DeletedResource = z.infer<typeof DeletedResourceSchema>;
