import { BaseResource } from "../base-resource";
import { AccountSchema, type Account } from "../types/account";
import { dataEnvelope } from "../types/page";

const AccountEnvelope = dataEnvelope(AccountSchema);

export class AccountResource extends BaseResource {
  /**
   * Get account.
   *
   * Retrieve the account the API key belongs to.
   */
  async retrieve(opts: { signal?: AbortSignal } = {}): Promise<Account> {
    return this.client.request({
      method: "GET",
      path: "/v1/account",
      schema: AccountEnvelope,
      signal: opts.signal,
    });
  }
}
