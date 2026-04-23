import { BaseResource } from "../base-resource";
import { PingSchema, type Ping } from "../types/ping";

export class PingResource extends BaseResource {
  /**
   * Health check.
   *
   * Returns basic info about the authenticated API key.
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
