import { BaseResource } from "../base-resource";
import { CampaignSchema, type Campaign } from "../types/campaigns";
import {
  pageSchema,
  dataEnvelope,
  buildListQuery,
  type Page,
  type ListParams,
} from "../types/page";

export interface CreateCampaignParams {
  name: string;
  audienceId: string;
  text?: string;
  mediaUrl?: string;
  mediaCaption?: string;
  onMissingVariable?: "fail" | "skip";
}

export interface ListCampaignsParams extends ListParams {
  order?: "asc" | "desc";
}

const CampaignPageSchema = pageSchema(CampaignSchema);
const CampaignEnvelope = dataEnvelope(CampaignSchema);

export class CampaignsResource extends BaseResource {
  /**
   * List campaigns.
   *
   * List the campaigns in your workspace, newest first, each with its live counters (`sentCount`, `deliveredCount`, `readCount`, `failedCount`). Offset-paginated via `limit` + `skip`. Requires `campaigns:read`.
   */
  async list(
    params: ListCampaignsParams & { signal?: AbortSignal } = {},
  ): Promise<Page<Campaign>> {
    const { signal, order, ...listParams } = params;
    const query = buildListQuery(listParams);
    if (order !== undefined) query.order = order;
    return this.client.request({
      method: "GET",
      path: "/v1/campaigns",
      query,
      schema: CampaignPageSchema,
      signal,
    });
  }

  /**
   * Create campaign.
   *
   * Schedule a new bulk-message campaign. Returns the campaign in `pending` state. Requires `campaigns:write`.
   */
  async create(body: CreateCampaignParams, opts: { signal?: AbortSignal } = {}): Promise<Campaign> {
    return this.client.request({
      method: "POST",
      path: "/v1/campaigns",
      schema: CampaignEnvelope,
      body,
      signal: opts.signal,
    });
  }

  /**
   * Get campaign.
   *
   * Retrieve a single campaign by id, including its status and live delivery counters. Poll this to track progress. Requires `campaigns:read`.
   */
  async get(id: string, opts: { signal?: AbortSignal } = {}): Promise<Campaign> {
    return this.client.request({
      method: "GET",
      path: `/v1/campaigns/${encodeURIComponent(id)}`,
      schema: CampaignEnvelope,
      signal: opts.signal,
    });
  }

  /**
   * Pause campaign.
   *
   * Pause a running campaign. 409 if not `running`. Requires `campaigns:write`.
   */
  async pause(id: string, opts: { signal?: AbortSignal } = {}): Promise<Campaign> {
    return this.client.request({
      method: "POST",
      path: `/v1/campaigns/${encodeURIComponent(id)}/pause`,
      schema: CampaignEnvelope,
      signal: opts.signal,
    });
  }

  /**
   * Resume campaign.
   *
   * Resume a paused campaign. 409 if not `paused`. Requires `campaigns:write`.
   */
  async resume(id: string, opts: { signal?: AbortSignal } = {}): Promise<Campaign> {
    return this.client.request({
      method: "POST",
      path: `/v1/campaigns/${encodeURIComponent(id)}/resume`,
      schema: CampaignEnvelope,
      signal: opts.signal,
    });
  }

  /**
   * Cancel campaign.
   *
   * Cancel a campaign. 409 if already terminal. Requires `campaigns:write`.
   */
  async cancel(id: string, opts: { signal?: AbortSignal } = {}): Promise<Campaign> {
    return this.client.request({
      method: "POST",
      path: `/v1/campaigns/${encodeURIComponent(id)}/cancel`,
      schema: CampaignEnvelope,
      signal: opts.signal,
    });
  }
}
