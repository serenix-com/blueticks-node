import { BaseResource } from "../base-resource";
import { PingSchema, type Ping } from "../types/ping";

export class PingResource extends BaseResource {
  /**
   * Ping.
   *
   * Connectivity probe. Confirms the Blueticks API is live (`api: "ok"`) and lists the
   * account's connected WhatsApp engines in `whatsapp_connections`, each labelled
   * `gateway` (remote server-side engine) or `regular` (the user's own browser extension).
   * An empty array means no WhatsApp is connected; `message` explains it. No scope required.
   */
  async retrieve(opts: { signal?: AbortSignal } = {}): Promise<Ping> {
    return this.client.request({
      method: "GET",
      path: "/v1/ping",
      schema: PingSchema,
      signal: opts.signal,
    });
  }
}
