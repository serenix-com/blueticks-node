import { z } from "zod";

export const PhoneValidationSchema = z.object({
  valid: z.boolean(),
  formatted_chat_id: z.string().nullable(),
});
export type PhoneValidation = z.infer<typeof PhoneValidationSchema>;

export const LinkPreviewSchema = z.object({
  title: z.string().nullable(),
  description: z.string().nullable(),
  thumbnail: z.string().nullable(),
  canonical_url: z.string().nullable(),
});
export type LinkPreview = z.infer<typeof LinkPreviewSchema>;
