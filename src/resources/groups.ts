import { z } from "zod";
import { BaseResource } from "../base-resource";
import { GroupSchema, type Group } from "../types/groups";

const OkSchema = z.object({ ok: z.boolean() }).passthrough();

export interface CreateGroupParams {
  name: string;
  participants: string[];
}
export interface UpdateGroupParams {
  name?: string;
  settings?: { announce?: boolean; restrict?: boolean };
}
export interface SetPictureParams {
  file_data_url: string;
  file_name?: string;
  file_mime_type?: string;
}

export class GroupsResource extends BaseResource {
  /** Create a new group with an initial participant list. */
  async create(body: CreateGroupParams, opts: { signal?: AbortSignal } = {}): Promise<Group> {
    return this.client.request({
      method: "POST",
      path: "/v1/groups",
      body,
      schema: GroupSchema,
      signal: opts.signal,
    });
  }

  /** Retrieve group metadata by JID. */
  async get(groupId: string, opts: { signal?: AbortSignal } = {}): Promise<Group> {
    return this.client.request({
      method: "GET",
      path: `/v1/groups/${encodeURIComponent(groupId)}`,
      schema: GroupSchema,
      signal: opts.signal,
    });
  }

  /** Rename the group and/or update admin-only settings. */
  async update(
    groupId: string,
    body: UpdateGroupParams,
    opts: { signal?: AbortSignal } = {},
  ) {
    return this.client.request({
      method: "PATCH",
      path: `/v1/groups/${encodeURIComponent(groupId)}`,
      body,
      schema: OkSchema,
      signal: opts.signal,
    });
  }

  /** Invite a contact to the group. */
  async addMember(groupId: string, body: { chat_id: string }, opts: { signal?: AbortSignal } = {}) {
    return this.client.request({
      method: "POST",
      path: `/v1/groups/${encodeURIComponent(groupId)}/members`,
      body,
      schema: OkSchema,
      signal: opts.signal,
    });
  }

  /** Remove a participant from the group. */
  async removeMember(groupId: string, chatId: string, opts: { signal?: AbortSignal } = {}) {
    return this.client.request({
      method: "DELETE",
      path: `/v1/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(chatId)}`,
      schema: OkSchema,
      signal: opts.signal,
    });
  }

  /** Grant admin rights to a participant. */
  async promoteAdmin(groupId: string, chatId: string, opts: { signal?: AbortSignal } = {}) {
    return this.client.request({
      method: "POST",
      path: `/v1/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(chatId)}/admin`,
      schema: OkSchema,
      signal: opts.signal,
    });
  }

  /** Revoke admin rights from a participant. */
  async demoteAdmin(groupId: string, chatId: string, opts: { signal?: AbortSignal } = {}) {
    return this.client.request({
      method: "DELETE",
      path: `/v1/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(chatId)}/admin`,
      schema: OkSchema,
      signal: opts.signal,
    });
  }

  /** Upload a new group avatar (base64 data URL). */
  async setPicture(groupId: string, body: SetPictureParams, opts: { signal?: AbortSignal } = {}) {
    return this.client.request({
      method: "PUT",
      path: `/v1/groups/${encodeURIComponent(groupId)}/picture`,
      body,
      schema: OkSchema,
      signal: opts.signal,
    });
  }

  /** Leave the group (as the authenticated user). */
  async leave(groupId: string, opts: { signal?: AbortSignal } = {}) {
    return this.client.request({
      method: "DELETE",
      path: `/v1/groups/${encodeURIComponent(groupId)}/members/me`,
      schema: OkSchema,
      signal: opts.signal,
    });
  }
}
