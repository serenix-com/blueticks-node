# blueticks — Node/TypeScript client for the Blueticks API

Official Node.js SDK for [Blueticks](https://blueticks.co).

## Install

```bash
npm install blueticks
```

## Quickstart

```ts
import { Blueticks } from "blueticks";

const client = new Blueticks({ apiKey: "BLUETICKS_API_KEY" });
const ping = await client.ping();
const account = await client.account.retrieve();
console.log(account.name);
```

See https://docs.blueticks.co for full documentation.

## Verify webhooks

```ts
import { verifyWebhook, WebhookVerificationError } from "blueticks";

// rawBody must be the raw request body (string or Buffer), not re-serialized JSON.
try {
  const event = verifyWebhook(rawBody, req.headers, process.env.BLUETICKS_WEBHOOK_SECRET!);
  console.log(event.type, event.data);
} catch (err) {
  if (err instanceof WebhookVerificationError) return res.sendStatus(400);
  throw err;
}
```

Pass `{ tolerance: 600 }` as a fourth argument to change the 300 second
timestamp window. The event keeps the wire field names (`created_at`).

## Supported runtimes

Node.js 18, 20, and 22. ESM and CommonJS.
