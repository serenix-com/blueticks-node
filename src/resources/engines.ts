import { z } from "zod";
import { BaseResource } from "../base-resource";
import { EngineStatusSchema, WhatsAppMeSchema, type EngineStatus, type WhatsAppMe } from "../types/engines";

const OkSchema = z.object({ ok: z.boolean() }).passthrough();

export class EnginesResource extends BaseResource {
  /** Current connection status of the user's WhatsApp engine. */
  async status(opts: { signal?: AbortSignal } = {}): Promise<EngineStatus> {
    return this.client.request({
      method: "GET",
      path: "/v1/engines",
      schema: EngineStatusSchema,
      signal: opts.signal,
    });
  }

  /** Authenticated WhatsApp account profile (phone, name, platform). */
  async me(opts: { signal?: AbortSignal } = {}): Promise<WhatsAppMe> {
    return this.client.request({
      method: "GET",
      path: "/v1/engines/me",
      schema: WhatsAppMeSchema,
      signal: opts.signal,
    });
  }

  /** Force the engine to log out of WhatsApp Web. */
  async logout(opts: { signal?: AbortSignal } = {}) {
    return this.client.request({
      method: "POST",
      path: "/v1/engines/logout",
      schema: OkSchema,
      signal: opts.signal,
    });
  }

  /** Force the engine's WhatsApp Web tab to reload. */
  async reload(opts: { signal?: AbortSignal } = {}) {
    return this.client.request({
      method: "POST",
      path: "/v1/engines/reload",
      schema: OkSchema,
      signal: opts.signal,
    });
  }
}
