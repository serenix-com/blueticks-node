import { z } from "zod";

/** A native WhatsApp Business label on the connected account. */
export const WaLabelSchema = z.object({
  id: z.string(),
  name: z.string().nullish(),
  color: z.string().nullish(),
});

export type WaLabel = z.infer<typeof WaLabelSchema>;
