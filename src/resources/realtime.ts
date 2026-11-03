import { BaseResource } from "../base-resource";
import { RealtimeTokenSchema, type RealtimeToken } from "../types/realtime";
import { dataEnvelope } from "../types/page";

const RealtimeTokenEnvelope = dataEnvelope(RealtimeTokenSchema);

export class RealtimeResource extends BaseResource {
  /**
   * Get MQTT credentials for receiving messages in real time.
   *
   * Trades your API key for an MQTT credential. Useful when there is no public URL to deliver a webhook to — your process dials out and subscribes, so nothing needs to be exposed. The response carries the broker URL, the username and password to connect with, and the topic to subscribe to. The credential does not practically expire, so fetching it once at start-up is enough.
   */
  async token(opts: { signal?: AbortSignal } = {}): Promise<RealtimeToken> {
    return this.client.request({
      method: "POST",
      path: "/v1/realtime/token",
      schema: RealtimeTokenEnvelope,
      signal: opts.signal,
    });
  }
}
