// src/resources/ping.ts — STUB; replaced in Task 10 with Zod validation
import { BaseResource } from "../base-resource";
import type { Ping } from "../types/ping";
import { z } from "zod";

const PingSchemaStub = z.object({
  account_id: z.string(),
  key_prefix: z.string(),
  scopes: z.array(z.string()),
});

export class PingResource extends BaseResource {
  async retrieve(opts: { signal?: AbortSignal } = {}): Promise<Ping> {
    return this.client.request({
      method: "GET",
      path: "/v1/ping",
      schema: PingSchemaStub,
      signal: opts.signal,
    });
  }
}
