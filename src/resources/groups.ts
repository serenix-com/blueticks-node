import { z } from "zod";
import { BaseResource } from "../base-resource";
import { GroupSchema, type Group } from "../types/groups";
import { pageSchema, buildListQuery, type Page, type ListParams } from "../types/page";

const VoidSchema = z.undefined();
const GroupPageSchema = pageSchema(GroupSchema);

export interface CreateGroupParams {
  name: string;
  participants: string[];
}
export interface UpdateGroupParams {
  name?: string;
  settings?: {
    announce?: boolean;
    restrict?: boolean;
    /** Replace the group description/topic. 1–2048 chars. */
    description?: string;
  };
}
export interface AddMemberParams {
  chatId: string;
}
export interface SetPictureParams {
  fileDataUrl: string;
  fileName?: string;
  fileMimeType?: string;
}

export class GroupsResource extends BaseResource {
  /**
   * List groups.
   *
   * List the groups the connected WhatsApp engine sees. Supports cursor pagination (`limit`+`cursor`) and an optional case-insensitive substring search on the group name via `q`.
   */
  async list(
    params: ListParams & { q?: string; signal?: AbortSignal } = {},
  ): Promise<Page<Group>> {
    const { signal, q, ...rest } = params;
    const query = buildListQuery(rest) as Record<string, string | number>;
    if (q !== undefined) query.q = q;
    return this.client.request({
      method: "GET",
      path: "/v1/groups",
      query,
      schema: GroupPageSchema,
      signal,
    });
  }

  /**
   * Create group.
   *
   * Create a WhatsApp group with the given name and initial participants. Requires `groups:write`.
   */
  async create(body: CreateGroupParams, opts: { signal?: AbortSignal } = {}): Promise<Group> {
    return this.client.request({
      method: "POST",
      path: "/v1/groups",
      body,
      schema: GroupSchema,
      signal: opts.signal,
    });
  }

  /**
   * Retrieve group.
   *
   * Fetch group metadata by JID. Requires `groups:read`.
   */
  async get(groupId: string, opts: { signal?: AbortSignal } = {}): Promise<Group> {
    return this.client.request({
      method: "GET",
      path: `/v1/groups/${encodeURIComponent(groupId)}`,
      schema: GroupSchema,
      signal: opts.signal,
    });
  }

  /**
   * Update group.
   *
   * Update group metadata. Provide at least one of `name` or `settings`. Requires `groups:write`.
   */
  async update(
    groupId: string,
    body: UpdateGroupParams,
    opts: { signal?: AbortSignal } = {},
  ): Promise<Group> {
    return this.client.request({
      method: "PATCH",
      path: `/v1/groups/${encodeURIComponent(groupId)}`,
      body,
      schema: GroupSchema,
      signal: opts.signal,
    });
  }

  /**
   * Add member to group.
   *
   * Add a participant to the group by chatId (JID) or phone number in international format (e.g. +14155551234). Requires `groups:write`.
   */
  async addMember(
    groupId: string,
    body: AddMemberParams,
    opts: { signal?: AbortSignal } = {},
  ): Promise<Group> {
    return this.client.request({
      method: "POST",
      path: `/v1/groups/${encodeURIComponent(groupId)}/members`,
      body,
      schema: GroupSchema,
      signal: opts.signal,
    });
  }

  /**
   * Remove member from group.
   *
   * Remove a participant from the group. Requires `groups:write`.
   */
  async removeMember(
    groupId: string,
    chatId: string,
    opts: { signal?: AbortSignal } = {},
  ): Promise<Group> {
    return this.client.request({
      method: "DELETE",
      path: `/v1/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(chatId)}`,
      schema: GroupSchema,
      signal: opts.signal,
    });
  }

  /**
   * Promote member to admin.
   *
   * Grant admin privileges to a group member. Requires `groups:write`.
   */
  async promoteAdmin(
    groupId: string,
    chatId: string,
    opts: { signal?: AbortSignal } = {},
  ): Promise<Group> {
    return this.client.request({
      method: "POST",
      path: `/v1/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(chatId)}/admin`,
      schema: GroupSchema,
      signal: opts.signal,
    });
  }

  /**
   * Demote admin to member.
   *
   * Revoke admin privileges from a group member. Requires `groups:write`.
   */
  async demoteAdmin(
    groupId: string,
    chatId: string,
    opts: { signal?: AbortSignal } = {},
  ): Promise<Group> {
    return this.client.request({
      method: "DELETE",
      path: `/v1/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(chatId)}/admin`,
      schema: GroupSchema,
      signal: opts.signal,
    });
  }

  /**
   * Set group picture.
   *
   * Replace the group picture. Body is a base64 data URL (PNG/JPEG, ≤20 MiB). Requires `groups:write`.
   */
  async setPicture(
    groupId: string,
    body: SetPictureParams,
    opts: { signal?: AbortSignal } = {},
  ): Promise<Group> {
    return this.client.request({
      method: "PUT",
      path: `/v1/groups/${encodeURIComponent(groupId)}/picture`,
      body,
      schema: GroupSchema,
      signal: opts.signal,
    });
  }

  /**
   * Leave group.
   *
   * Leave the group as the authenticated identity. Idempotent — succeeds with 204 even if already not a member. Requires `groups:write`.
   */
  async leave(groupId: string, opts: { signal?: AbortSignal } = {}): Promise<void> {
    await this.client.request({
      method: "DELETE",
      path: `/v1/groups/${encodeURIComponent(groupId)}/members/me`,
      schema: VoidSchema,
      signal: opts.signal,
    });
  }
}
