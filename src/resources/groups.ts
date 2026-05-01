import { z } from "zod";
import { BaseResource } from "../base-resource";
import { GroupSchema, type Group } from "../types/groups";

const VoidSchema = z.undefined();

export interface CreateGroupParams {
  name: string;
  participants: string[];
}
export interface UpdateGroupParams {
  name?: string;
  settings?: { announce?: boolean; restrict?: boolean };
}
export interface AddMemberParams {
  chat_id: string;
}
export interface SetPictureParams {
  file_data_url: string;
  file_name?: string;
  file_mime_type?: string;
}

export class GroupsResource extends BaseResource {
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
   * Add a participant to the group by chat_id (JID) or +E.164 phone. Requires `groups:write`.
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
