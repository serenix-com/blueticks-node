import { BaseResource } from "../base-resource";
import { EngineStatusSchema, type EngineStatus } from "../types/engines";

export class EnginesResource extends BaseResource {
  /**
   * Get engine status.
   *
   * Inspect or control the WhatsApp engine connected to the workspace.
   */
  async status(opts: { signal?: AbortSignal } = {}): Promise<EngineStatus> {
    return this.client.request({
      method: "GET",
      path: "/v1/engines",
      schema: EngineStatusSchema,
      signal: opts.signal,
    });
  }
}
