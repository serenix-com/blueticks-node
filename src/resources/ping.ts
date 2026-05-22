import { BaseResource } from "../base-resource";
import { PingSchema, type Ping } from "../types/ping";

export class PingResource extends BaseResource {
  /**
   * Ping.
   *
   * Probe the API: returns the account ID, key prefix, and granted scopes for the authenticated API key. Useful as a connection test and to inspect what an integration is allowed to do. No scope required.
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
