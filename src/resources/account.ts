import { BaseResource } from "../base-resource";
import { AccountSchema, type Account } from "../types/account";

export class AccountResource extends BaseResource {
  /**
   * Retrieve the authenticated account.
   *
   * Returns the account associated with the API key used for this request.
   */
  async retrieve(opts: { signal?: AbortSignal } = {}): Promise<Account> {
    return this.client.request({
      method: "GET",
      path: "/v1/account",
      schema: AccountSchema,
      signal: opts.signal,
    });
  }
}
