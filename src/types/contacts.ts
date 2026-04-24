import { z } from "zod";

/**
 * WhatsApp contact (from the user's phone address book).
 * Named `WhatsAppContact` to avoid clashing with audiences' Contact type
 * (which is an audience member row, a different concept).
 */
export const WhatsAppContactSchema = z.object({
  chat_id: z.string(),
  name: z.string().nullable(),
  is_business: z.boolean(),
});
export type WhatsAppContact = z.infer<typeof WhatsAppContactSchema>;

export const ProfilePictureSchema = z.object({
  url: z.string().nullable(),
});
export type ProfilePicture = z.infer<typeof ProfilePictureSchema>;
