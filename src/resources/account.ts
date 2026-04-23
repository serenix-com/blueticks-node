// src/resources/account.ts — STUB; replaced in Task 10 with Zod validation
import { BaseResource } from "../base-resource";
import type { Account } from "../types/account";
import { z } from "zod";

const AccountSchemaStub = z.object({
  id: z.string(),
  name: z.string(),
  timezone: z.string().nullable(),
  created_at: z.string(),
});

export class AccountResource extends BaseResource {
  async retrieve(opts: { signal?: AbortSignal } = {}): Promise<Account> {
    return this.client.request({
      method: "GET",
      path: "/v1/account",
      schema: AccountSchemaStub,
      signal: opts.signal,
    });
  }
}
