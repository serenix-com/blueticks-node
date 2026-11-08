import { z } from "zod";
import { BaseResource } from "../base-resource";
import { WaLabelSchema, type WaLabel } from "../types/wa-labels";
import { dataEnvelope } from "../types/page";

const WaLabelListEnvelope = dataEnvelope(z.array(WaLabelSchema));

export class WaLabelsResource extends BaseResource {
  /**
   * List native labels.
   *
   * List ALL of the connected account's native WhatsApp Business labels. Use the returned `id`s with `chats.updateWaLabels` or the `waLabelIds` send field. WhatsApp Business accounts only — a non-Business account returns an empty list. Requires `wa-labels:read`.
   */
  async list(opts: { signal?: AbortSignal } = {}): Promise<WaLabel[]> {
    return this.client.request({
      method: "GET",
      path: "/v1/wa-labels",
      schema: WaLabelListEnvelope,
      signal: opts.signal,
    });
  }
}
