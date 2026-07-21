import { BaseResource } from "../base-resource";
import {
  AudienceSchema,
  AppendContactsResultSchema,
  AudienceContactSchema,
  RemovedAudienceContactSchema,
  type Audience,
  type AppendContactsResult,
  type AudienceContact,
  type RemovedAudienceContact,
} from "../types/audiences";
import { DeletedResourceSchema, type DeletedResource } from "../types/deleted";
import {
  pageSchema,
  dataEnvelope,
  buildListQuery,
  type Page,
  type ListParams,
} from "../types/page";

export interface ContactInput {
  to: string;
  variables?: Record<string, string>;
}

export interface CreateAudienceParams {
  name: string;
  contacts?: ContactInput[];
}

export interface UpdateAudienceParams {
  name: string;
}

export interface UpdateContactParams {
  to?: string;
  variables?: Record<string, string>;
}

export interface ListAudiencesParams extends ListParams {
  order?: "asc" | "desc";
}

const AudiencePageSchema = pageSchema(AudienceSchema);
const AudienceEnvelope = dataEnvelope(AudienceSchema);
const AppendContactsResultEnvelope = dataEnvelope(AppendContactsResultSchema);
const AudienceContactEnvelope = dataEnvelope(AudienceContactSchema);
const RemovedAudienceContactEnvelope = dataEnvelope(RemovedAudienceContactSchema);
const DeletedResourceEnvelope = dataEnvelope(DeletedResourceSchema);

export class AudiencesResource extends BaseResource {
  /**
   * List audiences.
   *
   * List the audiences in your workspace, newest first. Offset-paginated via `limit` + `skip`. Requires `audiences:read`.
   */
  async list(
    params: ListAudiencesParams & { signal?: AbortSignal } = {},
  ): Promise<Page<Audience>> {
    const { signal, order, ...listParams } = params;
    const query = buildListQuery(listParams);
    if (order !== undefined) query.order = order;
    return this.client.request({
      method: "GET",
      path: "/v1/audiences",
      query,
      schema: AudiencePageSchema,
      signal,
    });
  }

  /**
   * Create audience.
   *
   * Create a new audience. Returns the audience with `contactCount: 0`. Requires `audiences:write`.
   */
  async create(body: CreateAudienceParams, opts: { signal?: AbortSignal } = {}): Promise<Audience> {
    return this.client.request({
      method: "POST",
      path: "/v1/audiences",
      schema: AudienceEnvelope,
      body,
      signal: opts.signal,
    });
  }

  /**
   * Get audience.
   *
   * Retrieve a single audience by id, including its `contactCount` and variable schema. Requires `audiences:read`.
   */
  async get(id: string, opts: { signal?: AbortSignal } = {}): Promise<Audience> {
    return this.client.request({
      method: "GET",
      path: `/v1/audiences/${encodeURIComponent(id)}`,
      schema: AudienceEnvelope,
      signal: opts.signal,
    });
  }

  /**
   * Update audience.
   *
   * Rename an audience or update its variable schema. Requires `audiences:write`.
   */
  async update(
    id: string,
    body: UpdateAudienceParams,
    opts: { signal?: AbortSignal } = {},
  ): Promise<Audience> {
    return this.client.request({
      method: "PATCH",
      path: `/v1/audiences/${encodeURIComponent(id)}`,
      schema: AudienceEnvelope,
      body,
      signal: opts.signal,
    });
  }

  /**
   * Delete audience.
   *
   * Soft-delete an audience. 409 if it's referenced by an active campaign. Returns the deleted ref. Requires `audiences:write`.
   */
  async delete(id: string, opts: { signal?: AbortSignal } = {}): Promise<DeletedResource> {
    return this.client.request({
      method: "DELETE",
      path: `/v1/audiences/${encodeURIComponent(id)}`,
      schema: DeletedResourceEnvelope,
      signal: opts.signal,
    });
  }

  /**
   * Append contacts to audience.
   *
   * Append contacts to an audience. Duplicates (by `to`) are skipped. Requires `audiences:write`.
   */
  async appendContacts(
    id: string,
    contacts: ContactInput[],
    opts: { signal?: AbortSignal } = {},
  ): Promise<AppendContactsResult> {
    return this.client.request({
      method: "POST",
      path: `/v1/audiences/${encodeURIComponent(id)}/contacts`,
      schema: AppendContactsResultEnvelope,
      body: { contacts },
      signal: opts.signal,
    });
  }

  /**
   * Update audience contact.
   *
   * Edit a contact's phone or variables. Requires `audiences:write`.
   */
  async updateContact(
    audienceId: string,
    contactId: string,
    body: UpdateContactParams,
    opts: { signal?: AbortSignal } = {},
  ): Promise<AudienceContact> {
    return this.client.request({
      method: "PATCH",
      path: `/v1/audiences/${encodeURIComponent(audienceId)}/contacts/${encodeURIComponent(contactId)}`,
      schema: AudienceContactEnvelope,
      body,
      signal: opts.signal,
    });
  }

  /**
   * Remove audience contact.
   *
   * Remove a contact from an audience. Requires `audiences:write`.
   */
  async deleteContact(
    audienceId: string,
    contactId: string,
    opts: { signal?: AbortSignal } = {},
  ): Promise<RemovedAudienceContact> {
    return this.client.request({
      method: "DELETE",
      path: `/v1/audiences/${encodeURIComponent(audienceId)}/contacts/${encodeURIComponent(contactId)}`,
      schema: RemovedAudienceContactEnvelope,
      signal: opts.signal,
    });
  }
}
