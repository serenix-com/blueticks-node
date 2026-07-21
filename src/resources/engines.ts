import { z } from "zod";
import { BaseResource } from "../base-resource";
import { EngineSchema, type Engine } from "../types/engines";
import { dataEnvelope } from "../types/page";

const EngineListEnvelope = dataEnvelope(z.array(EngineSchema));

export class EnginesResource extends BaseResource {
  /**
   * List engines.
   *
   * List the WhatsApp engines connected to this workspace — one entry per online engine (a workspace with two paired WhatsApp Web tabs returns two entries). Each entry carries its own `id` (the engine session's MQTT presence client id, same id space as ping's `whatsapp_connections[].id`), its `type` (`gateway` or `regular`), and its connectivity status. When no engine is connected, `data` is an empty array — this is not an error.
   */
  async list(opts: { signal?: AbortSignal } = {}): Promise<Engine[]> {
    return this.client.request({
      method: "GET",
      path: "/v1/engines",
      schema: EngineListEnvelope,
      signal: opts.signal,
    });
  }
}
