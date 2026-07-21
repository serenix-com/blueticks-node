import { BaseResource } from "../base-resource";
import { PingSchema, type Ping } from "../types/ping";
import { dataEnvelope } from "../types/page";

const PingEnvelope = dataEnvelope(PingSchema);

export class PingResource extends BaseResource {
  /**
   * Ping.
   *
   * Health and connectivity probe. Confirms the Blueticks API server is live (`api: "ok"`) and lists the WhatsApp engines currently connected to this account in `whatsappConnections`. Each connection is labelled `gateway` (a remote, server-side engine — the Blueticks 24/7 gateway / baileys pod) or `regular` (the user's own WhatsApp Web browser extension). An empty `whatsappConnections` array means no WhatsApp is connected — this is not an error, and `message` explains it. Requires a valid API key; no scope required.
   */
  async retrieve(opts: { signal?: AbortSignal } = {}): Promise<Ping> {
    return this.client.request({
      method: "GET",
      path: "/v1/ping",
      schema: PingEnvelope,
      signal: opts.signal,
    });
  }
}
