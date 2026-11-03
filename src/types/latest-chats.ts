import { z } from "zod";
import { ChatSchema } from "./chats";
import { PublicMessageSchema } from "./messages";

/** A chat together with its latest messages (newest first). */
export const LatestChatSchema = ChatSchema.extend({
  messages: z.array(PublicMessageSchema),
});

export type LatestChat = z.infer<typeof LatestChatSchema>;

/** Response of `GET /v1/latest-chats`. */
export const LatestChatsResultSchema = z.object({
  chats: z.array(LatestChatSchema),
  totalChats: z.number().int(),
  numberOfChats: z.number().int(),
  numberOfMessages: z.number().int(),
});

export type LatestChatsResult = z.infer<typeof LatestChatsResultSchema>;
