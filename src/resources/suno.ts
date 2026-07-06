import { BaseResource } from "../base-resource";
import {
  SunoClipSchema,
  SunoGenerationSchema,
  SunoUploadSchema,
  SunoAccountSchema,
  type SunoClip,
  type SunoGeneration,
  type SunoUpload,
  type SunoAccount,
} from "../types/suno";

export interface GenerateSongParams {
  /** The song lyrics. Maps to Suno `prompt`. Ignored when `instrumental` is true. */
  lyrics: string;
  /** Style / genre text, e.g. "pop ballad, acoustic guitar". Maps to Suno `tags`. */
  style: string;
  /** Styles to steer away from. Maps to Suno `negative_tags`. */
  negativeStyle?: string;
  /** Preferred vocal gender: "m" (male) or "f" (female). Omit to let Suno decide. */
  vocalGender?: "m" | "f";
  /** Creative deviation 0–1 (Suno "Weirdness"). */
  weirdness?: number;
  /** How strongly the style is applied, 0–1 (Suno "Style Influence"). */
  styleInfluence?: number;
  /** How closely a cover follows the reference recording, 0–1. Only meaningful when `uploadId` is set. */
  audioInfluence?: number;
  /** Generate without vocals. Maps to Suno `make_instrumental`. */
  instrumental?: boolean;
  /** Model version, e.g. "v5.5" or "v4". Defaults to v5.5. */
  model?: string;
  /** Optional song title. */
  title?: string;
  /** Reference-audio id from POST /v1/suno/uploads, to cover/transform your own recording. */
  uploadId?: string;
  /** Cloudflare Turnstile token for cover generations (when `uploadId` is set). Optional when the server has a solver configured. */
  captchaToken?: string;
}

export interface UploadAudioParams {
  /** Public URL of the reference audio to fetch and upload. Provide this OR `audioBase64`. */
  audioUrl?: string;
  /** Base64-encoded audio bytes. Provide this OR `audioUrl`. */
  audioBase64?: string;
  /** Original file name, used for the extension (defaults to "audio.mp3"). */
  fileName?: string;
}

export class SunoResource extends BaseResource {
  /**
   * Generate song.
   *
   * Submit a song generation to Suno from `lyrics` + `style`, optionally steering `vocalGender`, `weirdness`, `styleInfluence`, and a reference recording (`uploadId` from POST /v1/suno/uploads, with `audioInfluence` controlling how closely the cover follows it). Returns two clip variants — poll each with `GET /v1/suno/songs/{id}` until `status` is `complete`. Requires `suno:write`.
   */
  async generateSong(
    body: GenerateSongParams,
    opts: { signal?: AbortSignal } = {},
  ): Promise<SunoGeneration> {
    return this.client.request({
      method: "POST",
      path: "/v1/suno/songs",
      body,
      schema: SunoGenerationSchema,
      signal: opts.signal,
    });
  }

  /**
   * Get song.
   *
   * Poll a single generated clip by id. When `status` is `complete`, `audioUrl` (MP3) and `imageUrl` are populated. Requires `suno:read`.
   */
  async getSong(id: string, opts: { signal?: AbortSignal } = {}): Promise<SunoClip> {
    return this.client.request({
      method: "GET",
      path: `/v1/suno/songs/${encodeURIComponent(id)}`,
      schema: SunoClipSchema,
      signal: opts.signal,
    });
  }

  /**
   * Upload reference audio.
   *
   * Upload an audio recording (via `audioUrl` or base64 `audioBase64`) to Suno. Returns an `uploadId` to pass to POST /v1/suno/songs as `uploadId` to cover/transform it. Max 500 MB. Requires `suno:write`.
   */
  async uploadAudio(
    body: UploadAudioParams,
    opts: { signal?: AbortSignal } = {},
  ): Promise<SunoUpload> {
    return this.client.request({
      method: "POST",
      path: "/v1/suno/uploads",
      body,
      schema: SunoUploadSchema,
      signal: opts.signal,
    });
  }

  /**
   * Get Suno account.
   *
   * Remaining credits, monthly usage, and plan on the connected Suno account. Requires `suno:read`.
   */
  async getAccount(opts: { signal?: AbortSignal } = {}): Promise<SunoAccount> {
    return this.client.request({
      method: "GET",
      path: "/v1/suno/account",
      schema: SunoAccountSchema,
      signal: opts.signal,
    });
  }
}
