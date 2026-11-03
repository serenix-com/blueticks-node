import { BaseResource } from "../base-resource";
import {
  IdentitySchema,
  ResolveIdentitiesResultSchema,
  type Identity,
  type ResolveIdentitiesResult,
} from "../types/identity";
import { dataEnvelope } from "../types/page";

const IdentityEnvelope = dataEnvelope(IdentitySchema);
const ResolveIdentitiesEnvelope = dataEnvelope(ResolveIdentitiesResultSchema);

export class IdentityResource extends BaseResource {
  /**
   * Resolve an identity.
   *
   * Resolve a single WhatsApp JID (URL-encoded) — `…@lid`, `…@c.us`, `…@s.whatsapp.net`, or `…@g.us` — to its canonical phone-form identity via the account engine store + cache, scoped to the API-key owner. An unknown identity returns 200 with `resolved:false` (fail closed), never 404; a malformed id returns 400. Requires `contacts:read`.
   */
  async get(id: string, opts: { signal?: AbortSignal } = {}): Promise<Identity> {
    return this.client.request({
      method: "GET",
      path: `/v1/identity/${encodeURIComponent(id)}`,
      schema: IdentityEnvelope,
      signal: opts.signal,
    });
  }

  /**
   * Resolve identities (batch).
   *
   * Resolve up to 100 WhatsApp JIDs to their canonical phone-form identities in one call. Order-preserving. Each element is the same object as `GET /v1/identity/{id}`. Requires `contacts:read`.
   */
  async resolve(
    ids: string[],
    opts: { signal?: AbortSignal } = {},
  ): Promise<ResolveIdentitiesResult> {
    return this.client.request({
      method: "POST",
      path: "/v1/identity/resolve",
      body: { ids },
      schema: ResolveIdentitiesEnvelope,
      signal: opts.signal,
    });
  }
}
