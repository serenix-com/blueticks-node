import { z } from "zod";
import { BaseResource } from "../base-resource";
import {
  AudienceSchema,
  ContactSchema,
  AppendContactsResultSchema,
  type Audience,
  type Contact,
  type AppendContactsResult,
} from "../types/audiences";
import { pageSchema, buildListQuery, type Page, type ListParams } from "../types/page";

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

// Backend may return either an empty body or the deleted resource ref;
// tolerate both to avoid spurious ValidationError for a successful delete.
const VoidSchema = z.unknown().optional();
const AudiencePageSchema = pageSchema(AudienceSchema);

export class AudiencesResource extends BaseResource {
  /** Create an audience, optionally seeded with contacts. */
  async create(body: CreateAudienceParams, opts: { signal?: AbortSignal } = {}): Promise<Audience> {
    return this.client.request({
      method: "POST",
      path: "/v1/audiences",
      schema: AudienceSchema,
      body,
      signal: opts.signal,
    });
  }

  /**
   * List audiences, newest first. Cursor-paginated.
   */
  async list(
    params: ListParams & { signal?: AbortSignal } = {},
  ): Promise<Page<Audience>> {
    const { signal, ...listParams } = params;
    return this.client.request({
      method: "GET",
      path: "/v1/audiences",
      query: buildListQuery(listParams),
      schema: AudiencePageSchema,
      signal,
    });
  }

  /** Retrieve an audience, with paginated contacts. */
  async get(
    id: string,
    opts: { page?: number; signal?: AbortSignal } = {},
  ): Promise<Audience> {
    return this.client.request({
      method: "GET",
      path: `/v1/audiences/${id}`,
      schema: AudienceSchema,
      query: opts.page !== undefined ? { page: opts.page } : undefined,
      signal: opts.signal,
    });
  }

  /** Rename an audience. */
  async update(
    id: string,
    body: UpdateAudienceParams,
    opts: { signal?: AbortSignal } = {},
  ): Promise<Audience> {
    return this.client.request({
      method: "PATCH",
      path: `/v1/audiences/${id}`,
      schema: AudienceSchema,
      body,
      signal: opts.signal,
    });
  }

  /** Delete an audience. */
  async delete(id: string, opts: { signal?: AbortSignal } = {}): Promise<void> {
    await this.client.request({
      method: "DELETE",
      path: `/v1/audiences/${id}`,
      schema: VoidSchema,
      signal: opts.signal,
    });
  }

  /** Append contacts to an audience. */
  async appendContacts(
    id: string,
    contacts: ContactInput[],
    opts: { signal?: AbortSignal } = {},
  ): Promise<AppendContactsResult> {
    return this.client.request({
      method: "POST",
      path: `/v1/audiences/${id}/contacts`,
      schema: AppendContactsResultSchema,
      body: { contacts },
      signal: opts.signal,
    });
  }

  /** Update a single contact in an audience. */
  async updateContact(
    audienceId: string,
    contactId: string,
    body: UpdateContactParams,
    opts: { signal?: AbortSignal } = {},
  ): Promise<Contact> {
    return this.client.request({
      method: "PATCH",
      path: `/v1/audiences/${audienceId}/contacts/${contactId}`,
      schema: ContactSchema,
      body,
      signal: opts.signal,
    });
  }

  /** Remove a contact from an audience. */
  async deleteContact(
    audienceId: string,
    contactId: string,
    opts: { signal?: AbortSignal } = {},
  ): Promise<void> {
    await this.client.request({
      method: "DELETE",
      path: `/v1/audiences/${audienceId}/contacts/${contactId}`,
      schema: VoidSchema,
      signal: opts.signal,
    });
  }
}
