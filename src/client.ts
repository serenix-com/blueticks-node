// src/client.ts
import { Transport } from "./transport";
import { BluetickError } from "./errors";
import { VERSION } from "./version";
import { AccountResource } from "./resources/account";
import type { Ping } from "./types/ping";

const DEFAULT_BASE_URL = "https://api.blueticks.co";
const DEFAULT_TIMEOUT = 30000;
const DEFAULT_MAX_RETRIES = 2;

export interface BluetickOptions {
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
  fetch?: typeof fetch;
  userAgent?: string;
}

export class Blueticks {
  readonly account: AccountResource;
  private readonly transport: Transport;
  readonly baseUrl: string;

  constructor(opts: BluetickOptions = {}) {
    const apiKey = opts.apiKey ?? process.env["BLUETICKS_API_KEY"];
    if (!apiKey) {
      throw new BluetickError({
        code: "authentication_required",
        message:
          "No apiKey provided. Pass new Blueticks({ apiKey: ... }) or set BLUETICKS_API_KEY in your environment.",
      });
    }

    this.baseUrl = opts.baseUrl ?? process.env["BLUETICKS_BASE_URL"] ?? DEFAULT_BASE_URL;

    this.transport = new Transport({
      apiKey,
      baseUrl: this.baseUrl,
      timeout: opts.timeout ?? DEFAULT_TIMEOUT,
      maxRetries: opts.maxRetries ?? DEFAULT_MAX_RETRIES,
      userAgentSuffix: opts.userAgent ?? null,
      version: VERSION,
      fetch: opts.fetch,
    });

    this.account = new AccountResource(this);
  }

  async ping(opts: { signal?: AbortSignal } = {}): Promise<Ping> {
    const { PingResource } = await import("./resources/ping");
    return new PingResource(this).retrieve(opts);
  }

  /** @internal */
  request<T>(args: Parameters<Transport["request"]>[0]): Promise<T> {
    return this.transport.request(args) as Promise<T>;
  }
}
