import { BaseResource } from "../base-resource";
import { UploadLinkSchema, type UploadLink } from "../types/uploads";
import { dataEnvelope } from "../types/page";

/** Body accepted by `POST /v1/uploads`. */
export interface CreateUploadParams {
  /** MIME type of the file you will upload, e.g. `application/pdf`. The PUT must send exactly this `Content-Type`. */
  contentType: string;
  /** Size of the file in bytes. Optional; checked against `maxBytes` up front when given. */
  sizeBytes?: number;
  /** Filename shown on the attachment when the upload is sent. */
  filename?: string;
}

const UploadLinkEnvelope = dataEnvelope(UploadLinkSchema);

export class UploadsResource extends BaseResource {
  /**
   * Create upload link.
   *
   * Returns a signed URL to upload one file directly, plus a `fileId`. 1) `PUT` the raw bytes to `uploadUrl` with the returned `headers`. 2) Send it with `type: "media"` and `mediaFileId: <fileId>`. The URL accepts the PUT for ~15 minutes. The file is deleted 1 hour after it is sent, or ~24 hours after this call if it is never sent. Requires `messages:write`.
   */
  async create(body: CreateUploadParams, opts: { signal?: AbortSignal } = {}): Promise<UploadLink> {
    return this.client.request({
      method: "POST",
      path: "/v1/uploads",
      body,
      schema: UploadLinkEnvelope,
      signal: opts.signal,
    });
  }
}
