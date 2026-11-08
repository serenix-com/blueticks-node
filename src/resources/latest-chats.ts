import { BaseResource } from "../base-resource";
import { LatestChatsResultSchema, type LatestChatsResult } from "../types/latest-chats";
import { addEngineTargetQuery, dataEnvelope, type EngineTargetParams } from "../types/page";

/** Query accepted by `GET /v1/latest-chats`. */
export interface ListLatestChatsParams extends EngineTargetParams {
  /** Total chats to return, pinned first then most-recent (1-200, default 50). */
  numberOfChats?: number;
  /** Latest messages to include per chat, newest-first (0-100, default 20). */
  numberOfMessages?: number;
}

const LatestChatsEnvelope = dataEnvelope(LatestChatsResultSchema);

export class LatestChatsResource extends BaseResource {
  /**
   * Get latest chats & messages.
   *
   * Returns the most-recent non-archived chats (pinned first), each with its latest messages (newest-first). One call — no per-chat round-trips. Requires `chats:read`.
   */
  async list(
    params: ListLatestChatsParams & { signal?: AbortSignal } = {},
  ): Promise<LatestChatsResult> {
    const { signal, numberOfChats, numberOfMessages } = params;
    const query: Record<string, string | number | boolean | undefined> = {};
    if (numberOfChats !== undefined) query.numberOfChats = numberOfChats;
    if (numberOfMessages !== undefined) query.numberOfMessages = numberOfMessages;
    addEngineTargetQuery(query, params);
    return this.client.request({
      method: "GET",
      path: "/v1/latest-chats",
      query,
      schema: LatestChatsEnvelope,
      signal,
    });
  }
}
