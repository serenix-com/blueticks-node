# blueticks-node regeneration conventions

This file is the authoritative spec for a subagent regenerating the Node/TS
SDK from `openapi.json`. The subagent sees this file, the OpenAPI spec, and
the current contents of the regenerated paths — nothing else.

## 1. Boundaries

### You MAY write:

- `src/resources/*.ts`, `src/resources/index.ts`
- `src/types/*.ts`, `src/types/index.ts`
- `test/<resource>.test.ts` — one per resource file
- `src/client.ts` — ONLY the following are allowed:
  - Add/remove `this.<resource> = new <ResourceClass>(this)` attachments in the constructor.
  - Add/remove `async <method>(...)` helper methods that delegate to a resource (e.g., `ping()`).
  - Update return-type annotations on helper methods (e.g., `Promise<Ping>`).
  - Keep `import type { ... } from "./types/<name>"` lines in sync.
  - Add/remove static `import { <Resource>Resource } from "./resources/<name>"` lines.
  - The `ping()` convenience method uses a dynamic `await import("./resources/ping")` call
    inside the method body to keep `PingResource` out of the eager bundle. Preserve this
    pattern: do NOT convert it to a static top-level import. All other resource attachments
    (like `this.account = new AccountResource(this)`) DO use static top-level imports. Use
    the lazy form only for helper methods whose target resource is not also attached as a
    `this.<name>` property — i.e., the lazy form is reserved for one-off delegate methods.
  Do NOT touch: constructor body (apiKey/baseUrl/transport wiring), `request<T>`, env-var logic.

### You MUST NOT touch:

- `src/transport.ts`, `src/errors.ts`, `src/base-resource.ts`, `src/version.ts`, `src/index.ts`
- `test/client.test.ts`, `test/transport.test.ts`, `test/errors.test.ts`
- `test/helpers/**`
- `package.json`, `tsconfig*.json`, `tsup.config.ts`, `vitest.config.ts`, `.eslintrc.cjs`
- `.github/workflows/**`
- `README.md`, `CHANGELOG.md`, `LICENSE`
- `CLAUDE.md` (this file)

## 2. Types (OpenAPI schema → Zod schema + inferred TS type)

One file per response schema at `src/types/<kebab-name>.ts`. Each file exports:
- A Zod schema (named `<Name>Schema`, e.g., `AccountSchema`).
- An inferred TS type (named `<Name>`, e.g., `Account`) via `z.infer<typeof <Name>Schema>`.

### Unknown-field behavior

Use Zod's default `.object()` behavior for response schemas — unknown keys are
silently stripped. This matches the Python SDK's `ConfigDict(extra="ignore")`.
Do NOT call `.strict()` (rejects unknown keys → users with newer backend + older
SDK get ValidationError instead of graceful degradation) or `.passthrough()`
(preserves unknown keys but they are not in the inferred TS type, forcing callers
to cast).

### Type mapping

| OpenAPI | Zod | Inferred TS |
| --- | --- | --- |
| `string` | `z.string()` | `string` |
| `string, format: date-time` | `z.string().datetime({ offset: true })` | `string` |
| `string, format: uuid` | `z.string().uuid()` | `string` |
| `string, format: email` | `z.string().email()` | `string` |
| `string, format: uri` | `z.string().url()` | `string` |
| `integer` | `z.number().int()` | `number` |
| `number` | `z.number()` | `number` |
| `boolean` | `z.boolean()` | `boolean` |
| `array, items: <T>` | `z.array(<TSchema>)` | `T[]` |
| `object` (inline) | nested `z.object({...})` | nested interface |
| `nullable: true` | `<T>.nullable()` | `T \| null` |
| `enum: [a, b, c]` | `z.enum(["a","b","c"])` | `'a' \| 'b' \| 'c'` |

**Datetime offset:** The `{ offset: true }` option makes the schema accept both `Z`
(UTC) and explicit offset forms (`+HH:MM`). This protects against backend changes
that emit timestamps with a user's local timezone. Do NOT omit the option — it is
necessary for forward-compatibility.

**Field names are snake_case** — matches the wire format. The SDK NEVER renames server fields. Only SDK-internal types (errors, constructor options) use camelCase.

**Date-time values stay as `string`** in the inferred TS type. No auto-parsing to `Date`.

### `src/types/index.ts`

Re-export every schema + type pair alphabetically:

```ts
export { AccountSchema, type Account } from "./account";
export { PingSchema, type Ping } from "./ping";
```

### Example

```ts
// src/types/account.ts
import { z } from "zod";

export const AccountSchema = z.object({
  id: z.string(),
  name: z.string(),
  timezone: z.string().nullable(),
  created_at: z.string().datetime({ offset: true }),
});

export type Account = z.infer<typeof AccountSchema>;
```

## 3. Resources (OpenAPI operation → TS method)

One file per first-path-segment under `/v1/`:

- `/v1/account`, `/v1/account/*` → `src/resources/account.ts`
- `/v1/ping` → `src/resources/ping.ts`

Each file exports one class extending `BaseResource`:

```ts
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
```

### Method-name mapping

| Feathers | TS | When |
| --- | --- | --- |
| `find` | `list` | response is paginated (top-level `data` array + `pagination`) |
| `find` | `retrieve` | response is a single object |
| `get` | `retrieve` | always |
| `create` | `create` | always |
| `patch` | `update` | always |
| `remove` | `delete` | always |

### Signatures

- Path params: positional arguments.
- Query + body + per-call options: single `opts?: { ... signal?: AbortSignal }` object.
- Return type: `Promise<T>` where `T` is the inferred type from the schema.
- Body goes through `this.client.request({ ... })` — resources NEVER call `fetch` directly.

### JSDoc docstring rule

Use the operation's `summary` + `\n *\n * ` + `description`, verbatim. If
`summary` is absent, use the first sentence of `description` as summary; the
rest as body. If both are absent, use `"<Method name in Title Case>."` with
no body.

### `src/resources/index.ts`

Re-export every resource class alphabetically:

```ts
export { AccountResource } from "./account";
export { PingResource } from "./ping";
```

## 4. Tests

One `test/<resource>.test.ts` per resource. Uses `mockFetch` + `jsonResponse`
from `test/helpers/mock-fetch.ts` (hand-written, stable).

### Per method: three tests

**Happy path.** Mock the transport to return a valid response body:
- If the OpenAPI operation's response schema includes an `example` field, use it verbatim.
- Otherwise, synthesize a minimal fixture covering every required field with plausible values: strings realistic, timestamps in ISO 8601 with `Z` suffix, IDs in `<prefix>_<short>` convention used by Blueticks. At least one non-default value per non-ID field so the test verifies parsing, not just construction.

Assert the method returns the typed model with the expected field values
(`typeof result.id === "string"`, deep-equal on key fields).

**Error path.** Mock the transport to return 401 with the standard envelope.
Assert `AuthenticationError` is raised with `code`, `message`, `requestId` all set.

**Missing-required-field test.** Mock returns `{}`. Assert `ValidationError`
(re-exported `ZodError`) is raised.

### Example test

```ts
import { describe, it, expect } from "vitest";
import { Blueticks, AuthenticationError, ValidationError } from "../src";
import { mockFetch, jsonResponse } from "./helpers/mock-fetch";

describe("client.account.retrieve", () => {
  it("returns typed model on 200", async () => {
    const c = new Blueticks({
      apiKey: "bt_test_x",
      baseUrl: "https://example.test",
      fetch: mockFetch((req) => {
        expect(req.method).toBe("GET");
        expect(new URL(req.url).pathname).toBe("/v1/account");
        return jsonResponse(200, {
          id: "acc_1",
          name: "Acme",
          timezone: "America/New_York",
          created_at: "2026-04-22T10:00:00Z",
        });
      }),
    });
    const result = await c.account.retrieve();
    expect(typeof result.id).toBe("string");
    expect(result.name).toBe("Acme");
  });

  // ... 401 + {} tests
});
```

## 5. After regeneration

The controller (`regenerate.sh` via `tools/regenerate-node.sh`) runs:

```bash
npm ci
npm run lint
npm run typecheck
npm run build
npm test -- --run
```

All must pass; on failure the script aborts and a human decides next steps
(fix CLAUDE.md, not the generated output).
