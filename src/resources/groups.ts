import { z } from "zod";
import { BaseResource } from "../base-resource";
import {
  GroupSchema,
  GroupListItemSchema,
  type Group,
  type GroupListItem,
} from "../types/groups";
import {
  pageSchema,
  dataEnvelope,
  buildListQuery,
  type Page,
  type ListParams,
} from "../types/page";

export interface ListGroupsParams extends ListParams {
  searchToken?: string;
  includeArchive?: boolean;
}

export interface CreateGroupParams {
  name: string;
  participants: string[];
}

export interface UpdateGroupParams {
  name?: string;
  settings?: {
    announce?: boolean;
    restrict?: boolean;
    editInfoAdminsOnly?: boolean;
    description?: string;
  };
}

export interface AddMembersParams {
  chatId?: string;
  participants?: string[];
}

export interface SetPictureParams {
  fileDataUrl?: string;
  url?: string;
  fileName?: string;
  fileMimeType?: string;
}

const GroupListItemPageSchema = pageSchema(GroupListItemSchema);
const GroupEnvelope = dataEnvelope(GroupSchema);

export class GroupsResource extends BaseResource {
  /**
   * List groups.
   *
   * List the groups the connected WhatsApp engine sees. Supports offset pagination (`limit`+`skip`) and an optional case-insensitive substring search on the group name via `searchToken`.
   */
  async list(
    params: ListGroupsParams & { signal?: AbortSignal } = {},
  ): Promise<Page<GroupListItem>> {
    const { signal, searchToken, includeArchive, ...listParams } = params;
    const query = buildListQuery(listParams);
    if (searchToken !== undefined) query.searchToken = searchToken;
    if (includeArchive !== undefined) query.includeArchive = includeArchive;
    return this.client.request({
      method: "GET",
      path: "/v1/groups",
      query,
      schema: GroupListItemPageSchema,
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
      schema: GroupEnvelope,
      signal: opts.signal,
    });
  }

  /**
   * Get group.
   *
   * Retrieve a single group by its `@g.us` id, including its subject, description, and (with `?include=participants`) its participant list. Requires `groups:read`.
   */
  async get(
    groupId: string,
    opts: { include?: "participants"; signal?: AbortSignal } = {},
  ): Promise<Group> {
    return this.client.request({
      method: "GET",
      path: `/v1/groups/${encodeURIComponent(groupId)}`,
      query: opts.include !== undefined ? { include: opts.include } : undefined,
      schema: GroupEnvelope,
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
      schema: GroupEnvelope,
      signal: opts.signal,
    });
  }

  /**
   * Add member to group.
   *
   * Add a participant to the group by chatId (JID) or phone number in international format (e.g. +14155551234). Requires `groups:write`.
   */
  async addMembers(
    groupId: string,
    body: AddMembersParams,
    opts: { signal?: AbortSignal } = {},
  ): Promise<Group> {
    return this.client.request({
      method: "POST",
      path: `/v1/groups/${encodeURIComponent(groupId)}/members`,
      body,
      schema: GroupEnvelope,
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
      schema: z.void(),
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
      schema: GroupEnvelope,
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
      schema: GroupEnvelope,
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
      schema: GroupEnvelope,
      signal: opts.signal,
    });
  }

  /**
   * Set group picture.
   *
   * Replace the group picture. Provide the image as `fileDataUrl` (base64 data URL, PNG/JPEG, ≤20 MiB) or `url` (https). You can also upload a file as `multipart/form-data` with a `file` part. Requires `groups:write`.
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
      schema: GroupEnvelope,
      signal: opts.signal,
    });
  }
}
