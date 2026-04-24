import { BaseResource } from "../base-resource";
import {
  LinkPreviewSchema,
  PhoneValidationSchema,
  type LinkPreview,
  type PhoneValidation,
} from "../types/utils";

export class UtilsResource extends BaseResource {
  /** Validate a phone number or chat-id; returns the engine's canonical form. */
  async validatePhone(
    body: { phone_or_chat_id: string },
    opts: { signal?: AbortSignal } = {},
  ): Promise<PhoneValidation> {
    return this.client.request({
      method: "POST",
      path: "/v1/utils/validate_phone",
      body,
      schema: PhoneValidationSchema,
      signal: opts.signal,
    });
  }

  /** Fetch OpenGraph-style metadata for a URL (engine-rendered). */
  async linkPreview(
    params: { url: string; signal?: AbortSignal },
  ): Promise<LinkPreview> {
    const { signal, ...rest } = params;
    return this.client.request({
      method: "GET",
      path: "/v1/utils/link_preview",
      query: rest as Record<string, string>,
      schema: LinkPreviewSchema,
      signal,
    });
  }
}
