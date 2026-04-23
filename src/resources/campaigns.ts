import { z } from "zod";
import { BaseResource } from "../base-resource";
import { CampaignSchema, type Campaign } from "../types/campaigns";

export interface CreateCampaignParams {
  name: string;
  audience_id: string;
  text?: string;
  media_url?: string;
  media_caption?: string;
  from?: string;
  on_missing_variable?: "fail" | "skip";
}

const CampaignListSchema = z.array(CampaignSchema);

export class CampaignsResource extends BaseResource {
  /** Create a campaign targeting an audience. */
  async create(body: CreateCampaignParams, opts: { signal?: AbortSignal } = {}): Promise<Campaign> {
    return this.client.request({
      method: "POST",
      path: "/v1/campaigns",
      schema: CampaignSchema,
      body,
      signal: opts.signal,
    });
  }

  /** List all campaigns. */
  async list(opts: { signal?: AbortSignal } = {}): Promise<Campaign[]> {
    return this.client.request({
      method: "GET",
      path: "/v1/campaigns",
      schema: CampaignListSchema,
      signal: opts.signal,
    });
  }

  /** Retrieve a campaign by id. */
  async get(id: string, opts: { signal?: AbortSignal } = {}): Promise<Campaign> {
    return this.client.request({
      method: "GET",
      path: `/v1/campaigns/${id}`,
      schema: CampaignSchema,
      signal: opts.signal,
    });
  }

  /** Pause a running campaign. */
  async pause(id: string, opts: { signal?: AbortSignal } = {}): Promise<Campaign> {
    return this.client.request({
      method: "POST",
      path: `/v1/campaigns/${id}/pause`,
      schema: CampaignSchema,
      signal: opts.signal,
    });
  }

  /** Resume a paused campaign. */
  async resume(id: string, opts: { signal?: AbortSignal } = {}): Promise<Campaign> {
    return this.client.request({
      method: "POST",
      path: `/v1/campaigns/${id}/resume`,
      schema: CampaignSchema,
      signal: opts.signal,
    });
  }

  /** Cancel (abort) a campaign. */
  async cancel(id: string, opts: { signal?: AbortSignal } = {}): Promise<Campaign> {
    return this.client.request({
      method: "POST",
      path: `/v1/campaigns/${id}/cancel`,
      schema: CampaignSchema,
      signal: opts.signal,
    });
  }
}
