import { z } from "zod";

/**
 * WhatsApp contact (from the connected account's address book).
 * Named `WhatsAppContact` to avoid clashing with an audience member row,
 * which is a different concept.
 */
export const WhatsAppContactSchema = z.object({
  chatId: z.string(),
  name: z.string().nullish(),
  isBusiness: z.boolean().nullish(),
});

export type WhatsAppContact = z.infer<typeof WhatsAppContactSchema>;
