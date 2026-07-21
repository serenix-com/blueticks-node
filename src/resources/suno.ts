import { BaseResource } from "../base-resource";
import {
  SongClipSchema,
  GenerateSongResponseSchema,
  CreateUploadResponseSchema,
  SunoAccountSchema,
  type SongClip,
  type GenerateSongResponse,
  type CreateUploadResponse,
  type SunoAccount,
} from "../types/suno";
import { dataEnvelope } from "../types/page";

export interface GenerateSongParams {
  lyrics: string;
  style: string;
  negativeStyle?: string;
  vocalGender?: "m" | "f";
  weirdness?: number;
  styleInfluence?: number;
  audioInfluence?: number;
  instrumental?: boolean;
  model?: string;
  title?: string;
  uploadId?: string;
  captchaToken?: string;
}

export interface UploadReferenceParams {
  audioUrl?: string;
  audioBase64?: string;
  fileName?: string;
}

const GenerateSongEnvelope = dataEnvelope(GenerateSongResponseSchema);
const SongClipEnvelope = dataEnvelope(SongClipSchema);
const CreateUploadEnvelope = dataEnvelope(CreateUploadResponseSchema);
const SunoAccountEnvelope = dataEnvelope(SunoAccountSchema);

export class SunoResource extends BaseResource {
  /**
   * Generate song.
   *
   * Submit a song generation to Suno from `lyrics` + `style`, optionally steering `vocalGender`, `weirdness`, `styleInfluence`, and a reference recording (`uploadId` from POST /v1/suno/uploads, with `audioInfluence` controlling how closely the cover follows it). Returns two clip variants — poll each with `getSong` until `status` is `complete`. Requires `suno:write`.
   */
  async generateSong(
    body: GenerateSongParams,
    opts: { signal?: AbortSignal } = {},
  ): Promise<GenerateSongResponse> {
    return this.client.request({
      method: "POST",
      path: "/v1/suno/songs",
      body,
      schema: GenerateSongEnvelope,
      signal: opts.signal,
    });
  }

  /**
   * Get song.
   *
   * Poll a single generated clip by id. When `status` is `complete`, `audioUrl` (MP3) and `imageUrl` are populated. Requires `suno:read`.
   */
  async getSong(id: string, opts: { signal?: AbortSignal } = {}): Promise<SongClip> {
    return this.client.request({
      method: "GET",
      path: `/v1/suno/songs/${encodeURIComponent(id)}`,
      schema: SongClipEnvelope,
      signal: opts.signal,
    });
  }

  /**
   * Upload reference audio.
   *
   * Upload an audio recording (via `audioUrl` or base64 `audioBase64`) to Suno. Returns an `uploadId` to pass to `generateSong` as `uploadId` to cover/transform it. Max 500 MB. Requires `suno:write`.
   */
  async uploadReference(
    body: UploadReferenceParams,
    opts: { signal?: AbortSignal } = {},
  ): Promise<CreateUploadResponse> {
    return this.client.request({
      method: "POST",
      path: "/v1/suno/uploads",
      body,
      schema: CreateUploadEnvelope,
      signal: opts.signal,
    });
  }

  /**
   * Get Suno account.
   *
   * Remaining credits, monthly usage, and plan on the connected Suno account. Requires `suno:read`.
   */
  async account(opts: { signal?: AbortSignal } = {}): Promise<SunoAccount> {
    return this.client.request({
      method: "GET",
      path: "/v1/suno/account",
      schema: SunoAccountEnvelope,
      signal: opts.signal,
    });
  }
}
